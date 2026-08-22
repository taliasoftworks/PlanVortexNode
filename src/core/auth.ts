/**
 * La autenticación: `client_credentials` contra `POST /oauth/token`, con el token en memoria.
 *
 * La librería **no habla con Keycloak** (§ decisión 2 del roadmap). El proveedor de identidad no es
 * parte del contrato público: el integrador configura una sola URL, `api.planvortex.com`, y el día
 * que cambiemos de proveedor no se entera nadie.
 *
 * LO QUE HAY QUE ENTENDER ANTES DE TOCAR ESTE FICHERO:
 *
 *  - **Un token, no veinte.** Diez llamadas en paralelo con el token caducado tienen que pedir UNA
 *    petición de token, no diez. El freno del servidor son 30 intentos por minuto y por `client_id`
 *    (§ fase 1): sin el cerrojo, un arranque con veinte peticiones se come el cupo él solito.
 *  - **Se refresca ANTES de caducar**, con 60 s de margen. Un token que caduca a mitad de vuelo se
 *    convierte en un 400 con `code: 501` que el integrador no puede prevenir.
 *  - **El error de esta ruta tiene forma de OAuth2**, `{error, error_description}`, no el
 *    `{code, message, data}` del resto del API. Es la única excepción del servidor y aquí se
 *    traduce a {@link PlanVortexAuthenticationError}.
 */
import { PlanVortexAuthenticationError, isPlanVortexError } from "./errors.js";
import type { HttpClient } from "./http.js";

/** Lo que devuelve `POST /oauth/token`. Ni `refresh_token` ni `id_token`: no existen aquí. */
export interface ClientCredentialsToken {
    access_token: string;
    token_type: string;
    /** Segundos de vida. Keycloak da 300 hoy, pero es dato del servidor: nunca se asume. */
    expires_in: number;
    scope?: string;
}

/**
 * De dónde sale el `Authorization` de cada petición. Dos implementaciones: las credenciales de app
 * ({@link ClientCredentialsAuth}) y el token temporal de conexión ({@link StaticTokenAuth}).
 */
export interface AuthProvider {
    /** El token a poner en `Authorization: Bearer`. Pide uno nuevo si hace falta. */
    getToken(): Promise<string>;
    /** Tira el token cacheado. Lo llama el cliente cuando el servidor responde 501 o 522. */
    invalidate(): void;
}

/** Margen con el que se pide un token nuevo antes de que caduque el que hay. */
export const TOKEN_REFRESH_MARGIN_MS = 60_000;

/** La ruta de la fachada OAuth2. Relativa a la `baseUrl`, que ya lleva el `/v1.0.0`. */
export const TOKEN_PATH = "/oauth/token";

/**
 * Un token ya emitido, que no se renueva: el `temporal_connect_token` con el que una PERSONA conecta
 * su cuenta social (§ trampa 2 del roadmap).
 *
 * Dura una hora, va atado a **una** organización y no se puede refrescar — cuando caduca, la app
 * emite otro. Por eso `invalidate()` no hace nada: no hay nada que volver a pedir.
 */
export class StaticTokenAuth implements AuthProvider {
    constructor(private readonly token: string) {}

    getToken(): Promise<string> {
        return Promise.resolve(this.token);
    }

    invalidate(): void {
        //A propósito vacío: un token temporal no se renueva solo.
    }
}

export interface ClientCredentialsAuthOptions {
    clientId: string;
    clientSecret: string;
    scope?: string | undefined;
    /**
     * Reloj inyectable. Existe para poder probar la caducidad sin esperar cinco minutos ni tocar los
     * timers globales.
     *
     * @internal
     */
    now?: () => number;
}

export class ClientCredentialsAuth implements AuthProvider {
    private readonly now: () => number;
    private cached: { token: string; expiresAt: number } | undefined;
    /** La petición de token en vuelo. Es el cerrojo: mientras exista, todos esperan a ésta. */
    private pending: Promise<string> | undefined;

    constructor(
        private readonly http: HttpClient,
        private readonly options: ClientCredentialsAuthOptions,
    ) {
        this.now = options.now ?? Date.now;
    }

    async getToken(): Promise<string> {
        const cached = this.cached;
        if (cached && cached.expiresAt - this.now() > TOKEN_REFRESH_MARGIN_MS) {
            return cached.token;
        }
        //Sin esto, veinte llamadas en paralelo con el token caducado son veinte peticiones de token.
        this.pending ??= this.fetchToken().finally(() => {
            this.pending = undefined;
        });
        return this.pending;
    }

    invalidate(): void {
        this.cached = undefined;
    }

    private async fetchToken(): Promise<string> {
        const body = new URLSearchParams({
            grant_type: "client_credentials",
            client_id: this.options.clientId,
            client_secret: this.options.clientSecret,
        });
        if (this.options.scope) {
            body.set("scope", this.options.scope);
        }

        let token: ClientCredentialsToken;
        try {
            const response = await this.http.request<ClientCredentialsToken>({
                method: "POST",
                path: TOKEN_PATH,
                body,
                //Es el único POST reintentable de la librería: pedir un token no crea nada.
                idempotent: true,
            });
            token = response.data;
        } catch (error) {
            throw toAuthenticationError(error);
        }

        if (!token?.access_token) {
            throw new PlanVortexAuthenticationError(
                "server_error",
                "El endpoint de token respondió sin access_token",
            );
        }

        //`expires_in` es del servidor y podría no venir; una hora es lo que dura el token más largo
        //que emite hoy, así que como suelo es conservador y el 501 lo cubre igual.
        const lifetimeMs = (Number(token.expires_in) > 0 ? Number(token.expires_in) : 3600) * 1000;
        this.cached = { token: token.access_token, expiresAt: this.now() + lifetimeMs };
        return token.access_token;
    }
}

/** El cuerpo de error de OAuth2, que es lo que devuelve —y sólo devuelve— el endpoint de token. */
interface OAuthErrorBody {
    error?: unknown;
    error_description?: unknown;
}

/**
 * Traduce lo que salga del endpoint de token.
 *
 * Un fallo de red se deja pasar tal cual: no es que las credenciales estén mal, es que no hubo
 * conversación, y confundir las dos cosas manda al integrador a revisar un secreto que está bien.
 */
export function toAuthenticationError(error: unknown): unknown {
    if (!isPlanVortexError(error) || error.status === undefined) {
        return error;
    }
    const body = error.data as OAuthErrorBody;
    const oauthError = typeof body.error === "string" ? body.error : "invalid_client";
    const description = typeof body.error_description === "string" ? body.error_description : error.message;

    return new PlanVortexAuthenticationError(oauthError, description, {
        status: error.status,
        ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
        ...(error.retryAfter === undefined ? {} : { retryAfter: error.retryAfter }),
        cause: error,
    });
}
