/**
 * `planvortex/webhooks` — los eventos que PlanVortex manda a tu app, y cómo comprobar que son suyos.
 *
 * Va en su propio punto de entrada porque quien recibe webhooks casi nunca es el mismo proceso que
 * publica: un endpoint de Express no tiene por qué cargar el cliente entero.
 *
 * DOS COSAS QUE TUMBAN A TODO EL MUNDO, y por eso están escritas antes que el código:
 *
 *  1. **El cuerpo es un ARRAY de cambios**, no un objeto. Recorre lo que llega.
 *  2. **La firma se calcula sobre el cuerpo CRUDO.** Si tu framework ya parseó el JSON y lo vuelves
 *     a serializar, los bytes no son los mismos y la firma no cuadra nunca. En Express hace falta
 *     `express.raw({ type: "application/json" })` delante — o dejar que
 *     {@link planvortexWebhooks} lea el flujo él mismo, que es lo que hace si no encuentra cuerpo.
 *
 * Y una tercera que no tumba, pero cuesta dinero: **PlanVortex no reintenta una entrega fallida.**
 * Un 500 tuyo pierde el evento. Si tu trabajo es lento, encólalo y responde.
 */
import crypto from "node:crypto";

import { NO_ERROR_CODE, PlanVortexError } from "../core/errors.js";
import type { Comment, Message, SocialNetwork } from "../types.js";

// -------------------------------------------------------------------------------------------
// El contrato: cabeceras y eventos
// -------------------------------------------------------------------------------------------

/**
 * Las dos cabeceras de firma que PlanVortex manda, con el HMAC del cuerpo crudo hecho con el
 * `client_secret` de la app. El valor lleva el algoritmo delante: `sha256=<hex>`.
 *
 * Verifica la de 256 si puedes; la de sha1 está por compatibilidad con quien ya integraba webhooks
 * al estilo de Meta.
 */
export const WEBHOOK_SIGNATURE_HEADERS = {
    sha1: "x-hub-signature",
    sha256: "x-hub-signature-256",
} as const;

/** Los algoritmos con los que viaja firmada una entrega. */
export type WebhookAlgorithm = keyof typeof WEBHOOK_SIGNATURE_HEADERS;

/**
 * Los eventos que hoy se entregan de verdad, comprobados uno a uno contra el servidor.
 *
 * Salen de dos sitios: `ALLOWED_WEBHOOKS_NOTIFICATIONS` para los que levanta PlanVortex
 * (`new_account`, `change_state_account`, `integration_error`) y `WEBHOOKS_TO_HANDLE` para los que
 * llegan de la red y sobreviven al filtro. **La lista crece**, así que un `field` desconocido se
 * ignora en vez de romper: para eso está {@link UnknownWebhookChange}.
 */
export const WEBHOOK_EVENTS = [
    "new_account",
    "change_state_account",
    "messages",
    "messaging_postbacks",
    "messaging_seen",
    "messaging_error",
    "comments",
    "integration_error",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

// -------------------------------------------------------------------------------------------
// Los tipos de los eventos
// -------------------------------------------------------------------------------------------

/** Lo que trae todo cambio que cuelga de una CUENTA, pase lo que pase. */
export interface AccountWebhookChangeBase {
    id_account: string;
    id_organization: string;
    social_network: SocialNetwork;
    /**
     * El cambio tal y como lo mandó la red social, sin tocar. Ausente en los que levanta
     * PlanVortex por su cuenta, como `new_account`.
     */
    originalChange?: Record<string, unknown>;
}

/** Una cuenta se conectó, o cambió de estado: dejó de funcionar, se refrescó, se desconectó. */
export interface AccountStateChange extends AccountWebhookChangeBase {
    field: "new_account" | "change_state_account";
}

/**
 * Algo pasó en la mensajería: llegó un mensaje, el contacto pulsó un botón, leyó la conversación,
 * o la red rechazó uno de los nuestros.
 *
 * `messageObj` llega **poblado** —`contact_id`, `from_contact_id` y `message_options.files` traen
 * el objeto entero— y puede **faltar** en `messaging_seen` y `messaging_error`, porque el mensaje
 * que se reconoce puede no ser uno de los nuestros. Para leerlo sin escribir el `typeof` en cada
 * sitio están `messageContact`, `messageContactId` y `messageFiles` del paquete principal.
 */
export interface MessageChange extends AccountWebhookChangeBase {
    field: "messages" | "messaging_postbacks" | "messaging_seen" | "messaging_error";
    messageObj?: Message;
    /** El contacto del otro lado. Un comentario no tiene, y por eso aquí sí y allí no. */
    id_contact?: string;
}

/**
 * Llegó un comentario.
 *
 * Viaja en `commentObj` y **nunca** en `messageObj`: un comentario no es un mensaje, no tiene
 * contacto y cuelga de una publicación. Falta cuando el autor borró uno que no teníamos: el aviso
 * sale igual, con `originalChange`, pero no hay nada que marcar.
 *
 * **Meta repite entregas.** El mismo comentario puede llegar más de una vez; deduplica por
 * `commentObj.external_id`.
 */
export interface CommentChange extends AccountWebhookChangeBase {
    field: "comments";
    commentObj?: Comment;
}

/**
 * Una integración dejó de funcionar: un token de Drive revocado, un feed que ya no contesta, el
 * cupo de publicaciones agotado.
 *
 * **No trae `id_account` ni `social_network`**, y por eso es un tipo aparte: una integración cuelga
 * de la organización, no de ninguna cuenta.
 */
export interface IntegrationErrorChange {
    field: "integration_error";
    id_integration: string;
    id_organization: string;
    /** `google_drive` o `rss` hoy. La lista crece. */
    provider: string;
    /** El código del catálogo de PlanVortex que dice qué pasó. Los de integraciones van del 2200 al 2299. */
    error_code: number;
}

/**
 * Un `field` que esta versión del paquete todavía no conoce.
 *
 * Está en la unión a propósito: el enum del servidor crece y una librería que rechazara lo que no
 * entiende rompería el día que se añade un evento. Si necesitas los campos de uno nuevo antes de
 * que el paquete los tipe, haz el `cast` tú.
 */
export interface UnknownWebhookChange {
    field: string;
}

/**
 * Un cambio de los que llegan en el array.
 *
 * Se discrimina por `field`. Ojo con el `switch`: como {@link UnknownWebhookChange} declara
 * `field: string`, TypeScript no lo puede descartar de una rama concreta, así que un `case` te deja
 * `CommentChange | UnknownWebhookChange`. Para estrechar de verdad están los predicados
 * {@link isCommentChange} y compañía, que es la forma recomendada.
 */
export type WebhookChange =
    AccountStateChange | MessageChange | CommentChange | IntegrationErrorChange | UnknownWebhookChange;

const ACCOUNT_STATE_EVENTS = new Set<string>(["new_account", "change_state_account"]);
const MESSAGE_EVENTS = new Set<string>([
    "messages",
    "messaging_postbacks",
    "messaging_seen",
    "messaging_error",
]);

/** Una cuenta se conectó o cambió de estado. */
export function isAccountStateChange(change: WebhookChange): change is AccountStateChange {
    return ACCOUNT_STATE_EVENTS.has(change.field);
}

/** Algo pasó en la mensajería. Incluye el visto y el rechazo de la red, no sólo el mensaje nuevo. */
export function isMessageChange(change: WebhookChange): change is MessageChange {
    return MESSAGE_EVENTS.has(change.field);
}

/** Llegó un comentario. */
export function isCommentChange(change: WebhookChange): change is CommentChange {
    return change.field === "comments";
}

/** Una integración dejó de funcionar. */
export function isIntegrationErrorChange(change: WebhookChange): change is IntegrationErrorChange {
    return change.field === "integration_error";
}

// -------------------------------------------------------------------------------------------
// Errores
// -------------------------------------------------------------------------------------------

/**
 * La firma no cuadra, o no venía ninguna.
 *
 * Hereda de `PlanVortexError` para que un `catch (e) { if (e instanceof PlanVortexError) }` los
 * coja todos. Lleva `family: "webhook"` y {@link NO_ERROR_CODE}, porque no sale del catálogo del
 * servidor: lo levanta esta librería.
 */
export class WebhookSignatureError extends PlanVortexError {
    constructor(message: string) {
        super(NO_ERROR_CODE, message, { family: "webhook" });
    }
}

/**
 * El cuerpo no es lo que tiene que ser: no son bytes crudos, no es JSON, o no es un array.
 *
 * El caso que se lleva casi todas las apariciones es el primero, y siempre por lo mismo: un
 * `express.json()` delante en vez de un `express.raw()`.
 */
export class WebhookBodyError extends PlanVortexError {
    constructor(message: string) {
        super(NO_ERROR_CODE, message, { family: "webhook" });
    }
}

// -------------------------------------------------------------------------------------------
// Verificación
// -------------------------------------------------------------------------------------------

/** El cuerpo crudo, en cualquiera de las formas en que un framework lo deja a mano. */
export type RawWebhookBody = string | Buffer | Uint8Array;

export interface VerifyWebhookSignatureOptions {
    /** El cuerpo **crudo**, tal y como llegó. Un objeto ya parseado no vale y lanza. */
    payload: RawWebhookBody;
    /** El valor de la cabecera, con `sha256=` delante o sin él. */
    signature: string | string[] | undefined;
    /** El `client_secret` de tu app: el mismo con el que pides el token. */
    secret: string;
    /** Con cuál de las dos cabeceras estás comparando. Por defecto `sha256`. */
    algorithm?: WebhookAlgorithm;
}

/**
 * ¿Firmó PlanVortex este cuerpo con el secreto de tu app?
 *
 * Devuelve `true` o `false` y **no lanza** por una firma mal formada, ausente o de otra longitud:
 * todo eso es un `false`. Lanza sólo si le pasas algo que no son bytes (§ {@link WebhookBodyError})
 * o te dejas el secreto, que son fallos de tu código y no del que llama a tu endpoint.
 *
 * La comparación es de tiempo constante (`crypto.timingSafeEqual`). Las longitudes se comprueban
 * antes: el HMAC de un algoritmo siempre mide lo mismo, así que la longitud no es secreto, y sin
 * esa comprobación `timingSafeEqual` **lanzaría** ante una firma recortada — que es exactamente lo
 * que mandaría alguien probando el endpoint.
 */
export function verifyWebhookSignature(options: VerifyWebhookSignatureOptions): boolean {
    const { payload, signature, secret, algorithm = "sha256" } = options;
    if (!secret) {
        throw new WebhookBodyError("Falta el client_secret con el que verificar la firma.");
    }
    const body = toBuffer(payload);
    const received = normalizeSignature(signature, algorithm);
    if (!received) {
        return false;
    }
    const expected = crypto.createHmac(algorithm, secret).update(body).digest("hex");
    if (expected.length !== received.length) {
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(received, "utf8"));
}

/**
 * Deja la firma en hex pelado, o `undefined` si no sirve.
 *
 * Acepta `sha256=<hex>` y el hex a secas, pero **rechaza el prefijo de otro algoritmo**: comparar
 * un sha1 contra el sha256 esperado no cuadraría nunca, y devolver `false` sin más escondería que
 * lo que pasa es que se está leyendo la cabecera equivocada.
 */
function normalizeSignature(
    signature: string | string[] | undefined,
    algorithm: WebhookAlgorithm,
): string | undefined {
    const value = Array.isArray(signature) ? signature[0] : signature;
    if (typeof value !== "string" || !value) {
        return undefined;
    }
    const separator = value.indexOf("=");
    if (separator === -1) {
        return value;
    }
    return value.slice(0, separator) === algorithm ? value.slice(separator + 1) : undefined;
}

function toBuffer(payload: RawWebhookBody): Buffer {
    if (typeof payload === "string") {
        return Buffer.from(payload, "utf8");
    }
    if (Buffer.isBuffer(payload)) {
        return payload;
    }
    if (payload instanceof Uint8Array) {
        return Buffer.from(payload);
    }
    throw new WebhookBodyError(
        "El cuerpo del webhook tiene que ser los BYTES que llegaron (Buffer, Uint8Array o string), " +
            "no el JSON ya parseado: la firma se calcula sobre esos bytes y volver a serializar el " +
            'objeto los cambia. En Express: express.raw({ type: "application/json" }).',
    );
}

// -------------------------------------------------------------------------------------------
// El camino agnóstico: bytes + cabeceras -> cambios
// -------------------------------------------------------------------------------------------

/** Las cabeceras tal y como las da cada framework: un objeto plano o un `Headers` de fetch. */
export type WebhookHeaders =
    Record<string, string | string[] | undefined> | { get(name: string): string | null };

export interface HandleWebhookRequestOptions {
    /** El cuerpo **crudo**. En Hono, Next o Fastify: `await request.text()`. */
    body: RawWebhookBody;
    headers: WebhookHeaders;
    /** El `client_secret` de tu app. */
    secret: string;
    /**
     * Con qué cabecera verificar. Por defecto se usa la de `sha256` si viene y se cae a la de
     * `sha1` sólo si no está.
     */
    algorithm?: WebhookAlgorithm;
}

/**
 * Verifica la firma y devuelve los cambios, sin saber nada de tu framework.
 *
 * Es lo que hay debajo de {@link planvortexWebhooks} y lo que se usa fuera de Express:
 *
 * ```ts
 * const changes = handleWebhookRequest({
 *     body: await request.text(),
 *     headers: request.headers,
 *     secret: process.env.PLANVORTEX_CLIENT_SECRET!,
 * });
 * ```
 *
 * @throws {WebhookSignatureError} si no viene firma o no cuadra.
 * @throws {WebhookBodyError} si el cuerpo no son bytes, no es JSON, o no es un array.
 */
export function handleWebhookRequest(options: HandleWebhookRequestOptions): WebhookChange[] {
    const { body, headers, secret, algorithm } = options;

    const chosen = algorithm ?? (readHeader(headers, WEBHOOK_SIGNATURE_HEADERS.sha256) ? "sha256" : "sha1");
    const signature = readHeader(headers, WEBHOOK_SIGNATURE_HEADERS[chosen]);
    if (!signature) {
        throw new WebhookSignatureError(
            `La entrega no trae la cabecera ${WEBHOOK_SIGNATURE_HEADERS[chosen]}. ` +
                "Si estás detrás de un proxy, comprueba que no la esté quitando.",
        );
    }
    if (!verifyWebhookSignature({ payload: body, signature, secret, algorithm: chosen })) {
        throw new WebhookSignatureError(
            `La firma ${WEBHOOK_SIGNATURE_HEADERS[chosen]} no cuadra con el cuerpo recibido. ` +
                "Las dos causas de siempre: el cuerpo no es el crudo, o el secreto no es el de esta app.",
        );
    }
    return parseWebhookPayload(body);
}

/**
 * Parsea el cuerpo de una entrega **ya verificada** y devuelve los cambios.
 *
 * Sepárala de la verificación sólo si tienes una razón: llamarla a secas es aceptar cualquier
 * cosa que llegue a tu endpoint. Comprueba que sea un array porque el error natural —tratar el
 * cuerpo como un objeto— no da ningún síntoma hasta que se lee un campo que siempre es `undefined`.
 */
export function parseWebhookPayload(body: RawWebhookBody): WebhookChange[] {
    const text = toBuffer(body).toString("utf8");
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch (cause) {
        throw new WebhookBodyError(`El cuerpo del webhook no es JSON válido: ${(cause as Error).message}`);
    }
    if (!Array.isArray(parsed)) {
        throw new WebhookBodyError(
            "El cuerpo del webhook es un ARRAY de cambios, y ha llegado " +
                `${parsed === null ? "null" : typeof parsed}. Recorre lo que llega.`,
        );
    }
    return parsed as WebhookChange[];
}

/** Lee una cabecera de un objeto plano o de un `Headers`, sin depender de mayúsculas. */
function readHeader(headers: WebhookHeaders, name: string): string | undefined {
    if (headers && typeof (headers as { get?: unknown }).get === "function") {
        return (headers as { get(header: string): string | null }).get(name) ?? undefined;
    }
    const record = headers as Record<string, string | string[] | undefined>;
    const direct = record[name] ?? record[name.toLowerCase()];
    const found =
        direct ?? Object.entries(record).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
    return Array.isArray(found) ? found[0] : found;
}

// -------------------------------------------------------------------------------------------
// El middleware de Express
// -------------------------------------------------------------------------------------------

/**
 * Lo mínimo que este middleware necesita de una petición.
 *
 * Se declara aquí en vez de importar los tipos de Express **para no depender de Express**: el
 * paquete no tiene dependencias de runtime y no va a tener una de tipos. Un `Request` de verdad
 * cumple esto de sobra, así que el middleware encaja en `app.post(...)` sin un solo `cast`.
 */
export interface WebhookRequestLike {
    headers: Record<string, string | string[] | undefined>;
    /** Lo que haya dejado el body parser, si había alguno. */
    body?: unknown;
}

/** Lo mínimo que este middleware necesita de una respuesta. Vale un `Response` de Express y un `ServerResponse` pelado. */
export interface WebhookResponseLike {
    statusCode: number;
    end(chunk?: string): void;
}

export interface PlanVortexWebhooksOptions {
    /** El `client_secret` de tu app. */
    secret: string;
    /**
     * Qué hacer con los cambios. Se espera a que termine antes de responder, así que si tu trabajo
     * es lento, encólalo aquí y vuelve: PlanVortex no reintenta una entrega que se cae.
     */
    onChanges: (changes: WebhookChange[], request: WebhookRequestLike) => void | Promise<void>;
    /** Para enterarte de una firma que no cuadra, que si no es silenciosa. */
    onError?: (error: Error, request: WebhookRequestLike) => void;
    /** Fuerza una de las dos cabeceras. Por defecto `sha256` si viene, y `sha1` si no. */
    algorithm?: WebhookAlgorithm;
}

/**
 * Middleware de Express que verifica la firma y te entrega los cambios.
 *
 * ```ts
 * app.post(
 *     "/webhooks/planvortex",
 *     planvortexWebhooks({
 *         secret: process.env.PLANVORTEX_CLIENT_SECRET!,
 *         onChanges: async (changes) => {
 *             for (const change of changes) {
 *                 if (isCommentChange(change)) await moderate(change.commentObj);
 *             }
 *         },
 *     }),
 * );
 * ```
 *
 * **No hace falta `express.raw()` delante**: si no encuentra cuerpo, lee el flujo él mismo. Lo que
 * no puede es arreglar un `express.json()` global, porque ése ya se bebió los bytes y los devuelve
 * convertidos en objeto — ahí responde 400 diciendo exactamente eso.
 *
 * Responde él: 200 si todo fue bien, 401 si la firma no cuadra o falta, 400 si el cuerpo no sirve,
 * y 500 si tu `onChanges` lanza (que además llega a `next`, para que lo vea tu manejador de
 * errores). Por eso va al final de la cadena y no lleva un `next()` de paso.
 */
export function planvortexWebhooks(
    options: PlanVortexWebhooksOptions,
): (request: WebhookRequestLike, response: WebhookResponseLike, next: (error?: unknown) => void) => void {
    const { secret, onChanges, onError, algorithm } = options;

    return (request, response, next) => {
        void (async () => {
            let changes: WebhookChange[];
            try {
                const body = await resolveRawBody(request);
                changes = handleWebhookRequest({
                    body,
                    headers: request.headers,
                    secret,
                    ...(algorithm ? { algorithm } : {}),
                });
            } catch (error) {
                onError?.(error as Error, request);
                response.statusCode = error instanceof WebhookSignatureError ? 401 : 400;
                response.end();
                return;
            }

            try {
                await onChanges(changes, request);
            } catch (error) {
                onError?.(error as Error, request);
                response.statusCode = 500;
                response.end();
                next(error);
                return;
            }

            response.statusCode = 200;
            response.end();
        })();
    };
}

/**
 * Los bytes de la petición, vengan de donde vengan.
 *
 * Tres casos, y el tercero es el que más disgustos da: si `body` ya es un objeto, alguien parseó
 * el JSON antes y los bytes originales **ya no existen**. No se puede recuperar volviendo a
 * serializar —el orden de las claves y los espacios no tienen por qué coincidir— así que lo único
 * honesto es decirlo.
 */
async function resolveRawBody(request: WebhookRequestLike): Promise<RawWebhookBody> {
    const body = request.body;
    if (typeof body === "string" || Buffer.isBuffer(body) || body instanceof Uint8Array) {
        return body;
    }
    if (body === undefined || body === null) {
        const streamed = await readStream(request);
        if (streamed) {
            return streamed;
        }
    }
    return toBuffer(body as RawWebhookBody);
}

async function readStream(request: WebhookRequestLike): Promise<Buffer | undefined> {
    const iterable = request as unknown as AsyncIterable<Uint8Array>;
    if (typeof iterable?.[Symbol.asyncIterator] !== "function") {
        return undefined;
    }
    const chunks: Uint8Array[] = [];
    for await (const chunk of iterable) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}
