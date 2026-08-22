/**
 * El transporte: `fetch`, timeouts, reintentos y hooks. No sabe nada de autenticación —de eso va
 * `auth.ts`— ni de recursos. Todo lo que sale de la librería hacia el API pasa por aquí, incluida
 * la petición de token, que es lo que hace que el `User-Agent`, el timeout y el backoff sean uno
 * solo y no dos implementaciones que se separan con el tiempo.
 *
 * LAS DOS REGLAS DE REINTENTO, que son las que evitan un desastre silencioso:
 *
 *  1. **Un 400 con código de dominio NO se reintenta nunca.** Repetir "el texto es demasiado largo"
 *     no lo arregla, y en este API todos los errores de dominio son 400 (§ trampa 1 del roadmap).
 *     Sólo se reintentan 429, 502, 503 y 504, que son los que dicen "vuelve luego".
 *  2. **Un POST que llegó al servidor NO se reintenta.** Publicar dos veces es peor que fallar, y
 *     no hay clave de idempotencia en el API todavía. Un POST sólo se repite cuando el fallo es de
 *     los que demuestran que la petición ni salió —DNS, conexión rechazada— y jamás por un 5xx,
 *     que es la respuesta de un servidor que sí la recibió.
 */
import { PlanVortexConnectionError, createErrorFromResponse } from "./errors.js";
import type { PlanVortexError } from "./errors.js";

/** `fetch` con la firma que usamos. Se puede sustituir en tests o para meter un proxy. */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Lo que `fetch` acepta como cuerpo. Se saca de `RequestInit` en vez de nombrar `BodyInit`: ese tipo
 * es global en el DOM pero no en `@types/node`, y el paquete compila sólo con los tipos de Node.
 */
type RequestBody = NonNullable<RequestInit["body"]>;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Valores admitidos en la query. `undefined` y `null` se omiten; un array repite la clave. */
export type QueryValue =
    string | number | boolean | Date | null | undefined | readonly (string | number | boolean)[];

export interface RetryConfig {
    /** Cuántas veces se REPITE una petición fallida. `0` desactiva los reintentos. */
    maxRetries: number;
    /** Espera base del backoff exponencial, en ms. La real es aleatoria entre 0 y el tope. */
    baseDelayMs: number;
    /**
     * Tope de espera entre intentos, en ms.
     *
     * Además de recortar el backoff, decide qué hacer con un `Retry-After` largo: si el servidor
     * pide más que esto, la librería **no** espera — lanza el error con `retryAfter` puesto y deja
     * que el integrador decida. Un `Retry-After: 300` del freno del token endpoint no puede
     * traducirse en una llamada que se queda cinco minutos colgada.
     */
    maxDelayMs: number;
}

export const DEFAULT_RETRY: RetryConfig = {
    maxRetries: 2,
    baseDelayMs: 500,
    maxDelayMs: 8_000,
};

/** 120 s, como el panel: subir y publicar un vídeo es lento de verdad. */
export const DEFAULT_TIMEOUT_MS = 120_000;

/** Los únicos status que se reintentan. Un 400, un 401 o un 404 no se arreglan repitiéndolos. */
const RETRYABLE_STATUS = new Set([408, 429, 502, 503, 504]);

/**
 * Códigos de error de red que demuestran que la petición **no llegó**: no hay servidor, no hay DNS
 * o la conexión fue rechazada antes de mandar nada. Son los únicos con los que se repite un POST.
 *
 * `ECONNRESET`, `ETIMEDOUT` y un abort por timeout NO están aquí a propósito: pueden pasar después
 * de que el servidor recibiera el cuerpo, y entonces repetir el POST publica dos veces.
 */
const PRE_FLIGHT_NETWORK_CODES = new Set([
    "ECONNREFUSED",
    "ENOTFOUND",
    "EAI_AGAIN",
    "EHOSTUNREACH",
    "ENETUNREACH",
]);

export interface RequestInfo {
    method: HttpMethod;
    url: string;
    /** 1 la primera vez. */
    attempt: number;
}

export interface ResponseInfo extends RequestInfo {
    status: number;
    /** Milisegundos de ese intento. */
    durationMs: number;
}

export interface RetryInfo extends RequestInfo {
    /** Espera antes del siguiente intento, en ms. */
    delayMs: number;
    /** El status que provocó el reintento, o `undefined` si fue un fallo de red. */
    status: number | undefined;
    /** El error de red, si lo hubo. */
    error: unknown;
}

/**
 * Ganchos para el logger del integrador. Son síncronos a propósito: si uno lanza, lanza en su
 * llamada, no en medio del reintento.
 */
export interface HttpHooks {
    onRequest?: (info: RequestInfo) => void;
    onResponse?: (info: ResponseInfo) => void;
    onRetry?: (info: RetryInfo) => void;
}

export interface HttpClientConfig {
    /** Sin barra final. */
    baseUrl: string;
    timeoutMs?: number;
    retry?: Partial<RetryConfig>;
    hooks?: HttpHooks;
    fetch?: FetchLike;
    /** Cabeceras fijas de todas las peticiones — el `User-Agent`, por ejemplo. */
    headers?: Record<string, string>;
}

export interface HttpRequest {
    method: HttpMethod;
    /** Empieza por `/`, relativo a `baseUrl`. */
    path: string;
    query?: Record<string, QueryValue>;
    /**
     * `FormData`, `URLSearchParams` o `string` viajan tal cual; cualquier otra cosa se serializa a
     * JSON. `undefined` es "sin cuerpo".
     */
    body?: unknown;
    headers?: Record<string, string>;
    timeoutMs?: number;
    /** Del integrador, para cancelar. Se combina con el timeout interno. */
    signal?: AbortSignal | undefined;
    /**
     * Fuerza que la petición se pueda reintentar aunque sea un POST. Sólo para POSTs que no crean
     * nada — hoy, `POST /oauth/token`.
     */
    idempotent?: boolean;
    /** `none` salta el parseo del cuerpo. Por defecto se intenta JSON. */
    parse?: "json" | "none";
}

export interface HttpResponse<T> {
    data: T;
    status: number;
    headers: Headers;
    /** `x-request-id`, cuando el despliegue lo pone. */
    requestId: string | undefined;
}

/** Los métodos que se pueden repetir sin cambiar nada en el servidor. */
function isIdempotent(request: HttpRequest): boolean {
    return request.idempotent ?? request.method !== "POST";
}

/** Saca el `code` de un error de red de undici, que lo esconde en `cause`. */
function networkErrorCode(error: unknown): string | undefined {
    const cause = (error as { cause?: unknown })?.cause;
    const code = (cause as { code?: unknown })?.code ?? (error as { code?: unknown })?.code;
    return typeof code === "string" ? code : undefined;
}

/** `Retry-After` llega en segundos o como fecha HTTP. Devuelve segundos, o `undefined`. */
export function parseRetryAfter(header: string | null, now: number = Date.now()): number | undefined {
    if (!header) {
        return undefined;
    }
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return seconds;
    }
    const date = Date.parse(header);
    if (Number.isNaN(date)) {
        return undefined;
    }
    return Math.max(0, Math.round((date - now) / 1000));
}

function buildQuery(query: Record<string, QueryValue> | undefined): string {
    if (!query) {
        return "";
    }
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) {
            continue;
        }
        if (Array.isArray(value)) {
            //El servidor lee los arrays como clave repetida (`?state=pending&state=error`).
            for (const item of value) {
                params.append(key, String(item));
            }
            continue;
        }
        params.append(key, value instanceof Date ? value.toISOString() : String(value));
    }
    const serialized = params.toString();
    return serialized ? `?${serialized}` : "";
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export class HttpClient {
    private readonly baseUrl: string;
    private readonly timeoutMs: number;
    private readonly retry: RetryConfig;
    private readonly hooks: HttpHooks;
    private readonly fetchImpl: FetchLike;
    private readonly baseHeaders: Record<string, string>;

    constructor(config: HttpClientConfig) {
        this.baseUrl = config.baseUrl.replace(/\/+$/, "");
        this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.retry = { ...DEFAULT_RETRY, ...config.retry };
        this.hooks = config.hooks ?? {};
        //`globalThis.fetch` sin ligar al objeto global revienta en Node con "Illegal invocation".
        this.fetchImpl = config.fetch ?? ((input, init) => globalThis.fetch(input, init));
        //En minúsculas para que no convivan `User-Agent` y `user-agent` en la misma petición.
        this.baseHeaders = Object.fromEntries(
            Object.entries(config.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
        );
    }

    async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
        const url = `${this.baseUrl}${request.path}${buildQuery(request.query)}`;
        const { body, headers } = this.prepareBody(request);
        const timeoutMs = request.timeoutMs ?? this.timeoutMs;
        const retryable = isIdempotent(request);

        let attempt = 0;
        for (;;) {
            attempt++;
            this.hooks.onRequest?.({ method: request.method, url, attempt });
            const startedAt = Date.now();

            let response: Response;
            try {
                response = await this.send(url, request, body, headers, timeoutMs);
            } catch (error) {
                const failure = this.toConnectionError(error, request, timeoutMs);
                //Un POST sólo se repite si el fallo demuestra que la petición ni salió.
                const canRetry = retryable || PRE_FLIGHT_NETWORK_CODES.has(networkErrorCode(error) ?? "");
                if (!canRetry || attempt > this.retry.maxRetries) {
                    throw failure;
                }
                const delayMs = this.backoff(attempt);
                this.hooks.onRetry?.({
                    method: request.method,
                    url,
                    attempt,
                    delayMs,
                    status: undefined,
                    error,
                });
                await sleep(delayMs);
                continue;
            }

            this.hooks.onResponse?.({
                method: request.method,
                url,
                attempt,
                status: response.status,
                durationMs: Date.now() - startedAt,
            });

            const requestId = response.headers.get("x-request-id") ?? undefined;

            if (response.ok) {
                return {
                    data: (await this.parseBody(response, request)) as T,
                    status: response.status,
                    headers: response.headers,
                    requestId,
                };
            }

            const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
            const shouldRetry =
                retryable && RETRYABLE_STATUS.has(response.status) && attempt <= this.retry.maxRetries;
            const waitMs = retryAfter === undefined ? this.backoff(attempt) : retryAfter * 1000;

            //Un `Retry-After` más largo que el tope no se espera: se devuelve el error con el dato
            //dentro para que lo decida quien llama.
            if (!shouldRetry || waitMs > this.retry.maxDelayMs) {
                throw await this.toApiError(response, requestId, retryAfter);
            }

            //El cuerpo se descarta, pero hay que consumirlo para que undici libere la conexión.
            await response.arrayBuffer().catch(() => undefined);
            this.hooks.onRetry?.({
                method: request.method,
                url,
                attempt,
                delayMs: waitMs,
                status: response.status,
                error: undefined,
            });
            await sleep(waitMs);
        }
    }

    /** Backoff exponencial con jitter completo: aleatorio entre 0 y el tope de ese intento. */
    private backoff(attempt: number): number {
        const ceiling = Math.min(this.retry.maxDelayMs, this.retry.baseDelayMs * 2 ** (attempt - 1));
        return Math.round(Math.random() * ceiling);
    }

    private prepareBody(request: HttpRequest): {
        body: RequestBody | undefined;
        headers: Record<string, string>;
    } {
        const headers: Record<string, string> = { accept: "application/json", ...this.baseHeaders };
        for (const [key, value] of Object.entries(request.headers ?? {})) {
            headers[key.toLowerCase()] = value;
        }

        if (request.body === undefined) {
            return { body: undefined, headers };
        }
        //`FormData` pone su propio `content-type` con el boundary: tocarlo rompe el multipart.
        if (request.body instanceof FormData || request.body instanceof URLSearchParams) {
            return { body: request.body, headers };
        }
        if (typeof request.body === "string" || request.body instanceof Uint8Array) {
            return { body: request.body as RequestBody, headers };
        }
        headers["content-type"] = "application/json";
        return { body: JSON.stringify(request.body), headers };
    }

    private async send(
        url: string,
        request: HttpRequest,
        body: RequestBody | undefined,
        headers: Record<string, string>,
        timeoutMs: number,
    ): Promise<Response> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(new PlanVortexTimeout()), timeoutMs);
        //`AbortSignal.any` no existe hasta Node 20.3 y el paquete admite Node 20 entero, así que la
        //señal del integrador se enlaza a mano.
        const external = request.signal;
        const forward = () => controller.abort(external?.reason);
        if (external) {
            if (external.aborted) {
                clearTimeout(timer);
                throw external.reason;
            }
            external.addEventListener("abort", forward, { once: true });
        }

        try {
            return await this.fetchImpl(url, {
                method: request.method,
                ...(body === undefined ? {} : { body }),
                headers,
                signal: controller.signal,
            });
        } catch (error) {
            //Según la implementación de `fetch`, un abort rechaza con la razón o con un
            //`AbortError` genérico. Mirando la razón, el timeout se reconoce en los dos casos.
            if (controller.signal.reason instanceof PlanVortexTimeout && !external?.aborted) {
                throw controller.signal.reason;
            }
            throw error;
        } finally {
            clearTimeout(timer);
            external?.removeEventListener("abort", forward);
        }
    }

    /**
     * Un abort tiene dos orígenes y sólo uno es nuestro: si canceló el integrador, su error sale tal
     * cual —envolverlo le rompería el `if (e.name === "AbortError")` que tenga escrito.
     */
    private toConnectionError(error: unknown, request: HttpRequest, timeoutMs: number): unknown {
        if (error instanceof PlanVortexTimeout || (error as { name?: string })?.name === "TimeoutError") {
            return new PlanVortexConnectionError(
                `${request.method} ${request.path} agotó el timeout de ${timeoutMs} ms`,
                { timeout: true, cause: error },
            );
        }
        if (request.signal?.aborted) {
            return error;
        }
        const code = networkErrorCode(error);
        return new PlanVortexConnectionError(
            `${request.method} ${request.path} no pudo conectar${code ? ` (${code})` : ""}`,
            { timeout: false, cause: error },
        );
    }

    private async toApiError(
        response: Response,
        requestId: string | undefined,
        retryAfter: number | undefined,
    ): Promise<PlanVortexError> {
        const body = await this.readBody(response);
        return createErrorFromResponse({ body, status: response.status, requestId, retryAfter });
    }

    private async parseBody(response: Response, request: HttpRequest): Promise<unknown> {
        if (request.parse === "none" || response.status === 204) {
            return undefined;
        }
        return this.readBody(response);
    }

    /** JSON si se puede; si no, el texto crudo. Un cuerpo vacío es `undefined`, nunca un throw. */
    private async readBody(response: Response): Promise<unknown> {
        const text = await response.text().catch(() => "");
        if (!text) {
            return undefined;
        }
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }
}

/** Marca interna para distinguir NUESTRO timeout de un abort del integrador. */
class PlanVortexTimeout extends Error {
    constructor() {
        super("PlanVortex request timeout");
        this.name = "TimeoutError";
    }
}
