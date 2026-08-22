/**
 * El catálogo de errores de PlanVortex, por rangos, y las clases que salen de él.
 *
 * LA REGLA, y no es negociable: **los errores se clasifican por `body.code`, nunca por el status
 * HTTP.** Todo error de dominio viaja con un 400 — un token caducado, una cuenta desconectada, el
 * cupo del plan agotado y un texto demasiado largo son los cuatro un 400. Sólo el 520 (permisos)
 * sale 401 y un fallo inesperado sale 500. Un `if (response.status === 401) refreshToken()` sería
 * un bug silencioso: los códigos de token, 501 y 522, viajan dentro de un 400.
 *
 * El catálogo del servidor crece cada mes, así que un código fuera de estos rangos NO es un error
 * del cliente: cae en la clase base con su `code` y su `message` intactos. Nunca se traga y nunca
 * se renombra.
 */

export type PlanVortexErrorRange = {
    /** Primer código del rango, incluido */
    from: number;
    /** Último código del rango, incluido */
    to: number;
    /** Qué familia de problemas es */
    family: string;
};

export const PLANVORTEX_ERROR_RANGES: readonly PlanVortexErrorRange[] = [
    { from: 500, to: 541, family: "auth" },
    { from: 601, to: 612, family: "user" },
    { from: 700, to: 715, family: "account" },
    { from: 800, to: 810, family: "file" },
    { from: 900, to: 960, family: "publication" },
    { from: 1000, to: 1003, family: "general" },
    { from: 1100, to: 1111, family: "organization" },
    { from: 1200, to: 1207, family: "role" },
    { from: 1300, to: 1307, family: "plan_limit" },
    { from: 1400, to: 1408, family: "plan_limit" },
    { from: 1500, to: 1512, family: "messaging" },
    { from: 1600, to: 1601, family: "contact" },
    { from: 1900, to: 1906, family: "payment" },
    { from: 2000, to: 2099, family: "product" },
    { from: 2100, to: 2199, family: "ai_plan" },
    { from: 2200, to: 2299, family: "integration" },
] as const;

/**
 * El `code` que lleva un error que **no** trae código del servidor: un fallo de red, un timeout, un
 * 502 de un proxy con cuerpo HTML, o el propio constructor quejándose de la configuración.
 *
 * El servidor no emite nunca el 0, así que sirve de centinela sin pisar el catálogo. Cuál de esos
 * casos es se distingue por `family`: `connection`, `http`, `oauth` o `config`.
 */
export const NO_ERROR_CODE = 0;

/**
 * Los dos códigos que significan "tu token ya no sirve". Los dos llegan **dentro de un 400**, que es
 * justo por lo que existe esta constante: quien mire el status no los va a encontrar.
 *
 * El 520 (permisos) NO está aquí a propósito: sale 401, pero pedir un token nuevo no lo arregla — a
 * la app le faltan permisos, y con un token recién emitido le seguirán faltando.
 */
export const TOKEN_ERROR_CODES: readonly number[] = [501, 522];

/** Opciones de construcción de un error. Todas opcionales: un error siempre se puede construir. */
export interface PlanVortexErrorOptions {
    /** El `data` del cuerpo — lo que el servidor adjuntó con `.withData({...})`. `{}` si no vino nada. */
    data?: Record<string, unknown>;
    /** Status HTTP. `undefined` cuando la petición no llegó a tener respuesta. */
    status?: number;
    /** `x-request-id` de la respuesta, si el despliegue lo pone delante. */
    requestId?: string;
    /** Segundos de la cabecera `Retry-After`, cuando la hay. */
    retryAfter?: number;
    /** El error original (un `TypeError` de `fetch`, por ejemplo). */
    cause?: unknown;
    /**
     * Familia, sólo para los errores que NO salen del catálogo: `connection`, `http`, `oauth` y
     * `config`. Los de dominio la deducen de su `code` y no la pasan nunca.
     */
    family?: string;
}

/**
 * La base de todo lo que lanza esta librería.
 *
 * Un `catch (e) { if (e instanceof PlanVortexError) }` los coge todos: los de dominio, los de red y
 * los de configuración. Para afinar están las subclases y el `code`.
 */
export class PlanVortexError extends Error {
    /** El `code` del cuerpo, tal cual. {@link NO_ERROR_CODE} si el error no viene del catálogo. */
    readonly code: number;
    /** La familia del rango: `auth`, `publication`, `plan_limit`... Ver {@link PLANVORTEX_ERROR_RANGES}. */
    readonly family: string;
    /** El `data` del cuerpo. */
    readonly data: Record<string, unknown>;
    /** Status HTTP, o `undefined` si nunca hubo respuesta. */
    readonly status: number | undefined;
    /** `x-request-id`, si el despliegue lo pone. Hoy el servidor no lo emite; un proxy delante sí. */
    readonly requestId: string | undefined;
    /** Segundos que pidió esperar la cabecera `Retry-After`, si llegó. */
    readonly retryAfter: number | undefined;

    constructor(code: number, message: string, options: PlanVortexErrorOptions = {}) {
        super(message, options.cause === undefined ? undefined : { cause: options.cause });
        this.name = new.target.name;
        this.code = code;
        this.family = options.family ?? errorFamilyForCode(code) ?? "unknown";
        this.data = options.data ?? {};
        this.status = options.status;
        this.requestId = options.requestId;
        this.retryAfter = options.retryAfter;
    }
}

/** 500-541 — tokens, apps de cliente, permisos. Incluye el 501 y el 522, los de token caducado. */
export class AuthError extends PlanVortexError {}
/** 601-612 — el usuario final. */
export class UserError extends PlanVortexError {}
/** 700-715 — cuentas sociales: desconectada, sin permisos en la red, sin refrescar. */
export class AccountError extends PlanVortexError {}
/** 800-810 — ficheros: formato no admitido, demasiado grande, conversión fallida. */
export class FileError extends PlanVortexError {}
/** 900-960 — publicaciones, incluidos los límites por red (caracteres, imágenes, duración). */
export class PublicationError extends PlanVortexError {}
/** 1100-1111 — organizaciones, y el token temporal atado a una sola de ellas (1101). */
export class OrganizationError extends PlanVortexError {}
/**
 * 1300-1307 y 1400-1408 — el cupo del plan, del cliente o de la organización.
 *
 * Es el error que un integrador **sí** quiere distinguir: no se arregla reintentando, se arregla
 * cambiando de plan. Por eso los dos rangos comparten clase.
 */
export class PlanLimitError extends PlanVortexError {}
/** 1500-1512 — conversaciones, mensajes y plantillas. Exige plan de pago. */
export class MessagingError extends PlanVortexError {}
/** 1600-1601 — contactos. */
export class ContactError extends PlanVortexError {}
/** 2000-2099 — catálogos y productos (sólo Facebook e Instagram). */
export class ProductError extends PlanVortexError {}
/** 2100-2199 — planes de publicaciones generados con IA. */
export class AiPlanError extends PlanVortexError {}
/** 2200-2299 — integraciones: Google Drive, RSS. */
export class IntegrationError extends PlanVortexError {}

/**
 * La petición no llegó a tener respuesta: DNS, conexión rechazada, socket cortado o timeout.
 *
 * No lleva código del catálogo porque el servidor nunca llegó a opinar.
 */
export class PlanVortexConnectionError extends PlanVortexError {
    /** `true` si lo que se agotó fue nuestro propio timeout, no la red. */
    readonly timeout: boolean;

    constructor(message: string, options: PlanVortexErrorOptions & { timeout?: boolean } = {}) {
        super(NO_ERROR_CODE, message, { ...options, family: "connection" });
        this.timeout = options.timeout ?? false;
    }
}

/**
 * `POST /oauth/token` rechazó las credenciales.
 *
 * Es el ÚNICO sitio del API con forma de error distinta: `{error, error_description}` de OAuth2, no
 * el `{code, message, data}` de todo lo demás. Y por eso el `code` es {@link NO_ERROR_CODE}: el
 * servidor tiene códigos para esto (538-541) pero **no los manda en el cuerpo**, así que ponerlos
 * aquí sería inventarse algo que nadie dijo. Lo que sí viaja es `oauthError`.
 */
export class PlanVortexAuthenticationError extends PlanVortexError {
    /** `invalid_client`, `invalid_request`, `unsupported_grant_type`, `slow_down` o `server_error`. */
    readonly oauthError: string;

    constructor(oauthError: string, description: string, options: PlanVortexErrorOptions = {}) {
        super(NO_ERROR_CODE, description, { ...options, family: "oauth" });
        this.oauthError = oauthError;
    }
}

/**
 * La librería está mal configurada y no ha llegado a salir de casa: sin credenciales, o instanciada
 * en un navegador (§ trampa 9 del roadmap).
 */
export class PlanVortexConfigError extends PlanVortexError {
    constructor(message: string) {
        super(NO_ERROR_CODE, message, { family: "config" });
    }
}

/** La familia a la que pertenece un código, o `undefined` si cae fuera del catálogo conocido. */
export function errorFamilyForCode(code: number): string | undefined {
    return PLANVORTEX_ERROR_RANGES.find((range) => code >= range.from && code <= range.to)?.family;
}

/**
 * Familia -> clase. Las que faltan —`general`, `role`, `payment` y cualquier rango nuevo— caen a
 * propósito en la clase base: existen en el servidor pero no son superficie de integración, y darles
 * clase propia sería prometer un `instanceof` que luego habría que mantener.
 */
const FAMILY_CLASSES: Record<string, typeof PlanVortexError> = {
    auth: AuthError,
    user: UserError,
    account: AccountError,
    file: FileError,
    publication: PublicationError,
    organization: OrganizationError,
    plan_limit: PlanLimitError,
    messaging: MessagingError,
    contact: ContactError,
    product: ProductError,
    ai_plan: AiPlanError,
    integration: IntegrationError,
};

/** El cuerpo de error del API: `{code, message, data}`. */
export interface ApiErrorBody {
    code: number;
    message?: string;
    data?: Record<string, unknown>;
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
    return typeof body === "object" && body !== null && typeof (body as ApiErrorBody).code === "number";
}

/**
 * Convierte una respuesta de error en la clase que le toca.
 *
 * Un cuerpo sin `code` —un 502 de un proxy, la página HTML de un balanceador— no es un error de
 * dominio: sale como clase base con `family: "http"` y el cuerpo entero en `data`, que es además lo
 * que necesita `auth.ts` para reconocer el `{error, error_description}` de OAuth2.
 */
export function createErrorFromResponse(input: {
    body: unknown;
    status: number;
    requestId?: string | undefined;
    retryAfter?: number | undefined;
}): PlanVortexError {
    const options: PlanVortexErrorOptions = {
        status: input.status,
        ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
        ...(input.retryAfter === undefined ? {} : { retryAfter: input.retryAfter }),
    };

    if (isApiErrorBody(input.body)) {
        const family = errorFamilyForCode(input.body.code);
        const ErrorClass = (family === undefined ? undefined : FAMILY_CLASSES[family]) ?? PlanVortexError;
        return new ErrorClass(input.body.code, input.body.message ?? "PlanVortex error", {
            ...options,
            data: input.body.data ?? {},
        });
    }

    return new PlanVortexError(NO_ERROR_CODE, `HTTP ${input.status}`, {
        ...options,
        family: "http",
        data:
            typeof input.body === "object" && input.body !== null
                ? (input.body as Record<string, unknown>)
                : { body: input.body },
    });
}

/** ¿Es un error de esta librería? Útil en un `catch` donde no apetece importar la clase. */
export function isPlanVortexError(error: unknown): error is PlanVortexError {
    return error instanceof PlanVortexError;
}

/**
 * ¿Dice este error que el token ya no sirve? (los códigos 501 y 522, los dos dentro de un 400).
 *
 * Es lo que dispara el único reintento con token nuevo del cliente.
 */
export function isTokenError(error: unknown): boolean {
    return isPlanVortexError(error) && TOKEN_ERROR_CODES.includes(error.code);
}
