import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
    AccountError,
    AuthError,
    NO_ERROR_CODE,
    PlanLimitError,
    PlanVortexAuthenticationError,
    PlanVortexConnectionError,
    PlanVortexError,
    PublicationError,
    createErrorFromResponse,
    errorFamilyForCode,
    isPlanVortexError,
    isTokenError,
} from "../src/core/errors.js";

/** Como llega un error del servidor: SIEMPRE 400, con el codigo dentro del cuerpo. */
function apiError(code: number, message = "boom", data: Record<string, unknown> = {}) {
    return createErrorFromResponse({ body: { code, message, data }, status: 400 });
}

describe("la clasificacion de errores", () => {
    /**
     * La prueba que resume la trampa 1: cuatro problemas completamente distintos, los cuatro con el
     * mismo status. Si la libreria mirase el status, los cuatro serian el mismo error.
     */
    it("clasifica por code aunque el status sea el mismo 400", () => {
        expect(apiError(501)).toBeInstanceOf(AuthError);
        expect(apiError(703)).toBeInstanceOf(AccountError);
        expect(apiError(1301)).toBeInstanceOf(PlanLimitError);
        expect(apiError(902)).toBeInstanceOf(PublicationError);
    });

    it("mete los dos rangos de cupo en la misma clase", () => {
        expect(apiError(1301)).toBeInstanceOf(PlanLimitError);
        expect(apiError(1405)).toBeInstanceOf(PlanLimitError);
    });

    /**
     * El rango de publicaciones llega hasta 986, no hasta 960. Los codigos por encima del 960 no
     * son ninguna rareza: son las cinco redes ultimas (Bluesky, Discord, Telegram, Threads y
     * Slack) y los DOS FRENOS DE RITMO que sustituyeron al cupo mensual. Fuera de familia, el 978
     * llegaba como un error generico y quien lo recibia no tenia forma de saber que la respuesta
     * es esperar.
     */
    it("clasifica los frenos de ritmo como publicacion, no como desconocidos", () => {
        expect(apiError(978)).toBeInstanceOf(PublicationError);
        expect(apiError(979)).toBeInstanceOf(PublicationError);
        expect(errorFamilyForCode(978)).toBe("publication");
        expect(errorFamilyForCode(975)).toBe("publication");
    });

    /**
     * Slack estreno el 980-986, y el 980 —la app no esta en el canal— es el error mas comun de
     * toda la red: es lo que contesta un canal privado al que nadie ha invitado al bot. Nacio por
     * encima del techo que tenia el rango, que es exactamente lo que ya paso con el 978.
     */
    it("clasifica los codigos de Slack como publicacion", () => {
        expect(apiError(980)).toBeInstanceOf(PublicationError);
        expect(apiError(986)).toBeInstanceOf(PublicationError);
        expect(errorFamilyForCode(980)).toBe("publication");
        expect(errorFamilyForCode(986)).toBe("publication");
    });

    /**
     * Pinterest estreno el 987-996, por encima del techo del rango: la TERCERA vez que pasa, despues
     * del 978 y del 980. El 987 —la publicacion no dice en que tablero va— es el mas comun, y el
     * 991 es el que mas importa clasificar bien: es Pinterest frenando a la aplicacion, llega 429
     * con `Retry-After`, y fuera de familia no habia forma de saber que la respuesta es esperar.
     */
    it("clasifica los codigos de Pinterest como publicacion", () => {
        expect(apiError(987)).toBeInstanceOf(PublicationError);
        expect(apiError(996)).toBeInstanceOf(PublicationError);
        const throttled = createErrorFromResponse({ body: { code: 991 }, status: 429, retryAfter: 30 });
        expect(throttled).toBeInstanceOf(PublicationError);
        expect(throttled.retryAfter).toBe(30);
    });

    /**
     * Tres codigos que el servidor ya emitia y que la libreria tiraba a la clase base: 547 (el
     * identificador de una app no se cambia), 548 (fallo al rotar el secreto, el mismo metodo que
     * trajo la 0.11.0) y 716 (la sesion de Bluesky la esta renovando otro proceso: reintentar).
     */
    it("clasifica los codigos de apps y el de la sesion de Bluesky", () => {
        expect(apiError(547)).toBeInstanceOf(AuthError);
        expect(apiError(548)).toBeInstanceOf(AuthError);
        //549-554: el selector de cuentas del integrador y su sesion de conexion (551, 552, 553).
        expect(apiError(551)).toBeInstanceOf(AuthError);
        expect(apiError(554)).toBeInstanceOf(AuthError);
        expect(apiError(716)).toBeInstanceOf(AccountError);
    });

    /**
     * Los tres codigos que trajo abrir la API publica a todos los planes, y los tres nacieron por
     * encima del techo de su rango: 545 (ritmo por plan, que sale 429), 546 (correo sin verificar
     * al crear una app) y 1308 (cuantas apps caben en el plan).
     */
    it("clasifica los codigos de la API abierta", () => {
        expect(apiError(545)).toBeInstanceOf(AuthError);
        expect(apiError(546)).toBeInstanceOf(AuthError);
        expect(apiError(1308)).toBeInstanceOf(PlanLimitError);
    });

    /**
     * El catalogo del servidor crece cada mes. Un codigo que esta libreria no conoce NO puede
     * romper: sale como base, con su code y su message intactos.
     */
    it("no rompe con un codigo desconocido", () => {
        const error = apiError(9999, "algo nuevo");
        expect(error).toBeInstanceOf(PlanVortexError);
        expect(error.constructor).toBe(PlanVortexError);
        expect(error.code).toBe(9999);
        expect(error.message).toBe("algo nuevo");
        expect(error.family).toBe("unknown");
    });

    it("conserva data, status y el x-request-id", () => {
        const error = createErrorFromResponse({
            body: { code: 902, message: "texto largo", data: { max: 300 } },
            status: 400,
            requestId: "abc-123",
        });
        expect(error.data).toEqual({ max: 300 });
        expect(error.status).toBe(400);
        expect(error.requestId).toBe("abc-123");
    });

    /** Un 502 de un proxy no trae `code`: no es un error de dominio y no puede fingir serlo. */
    it("no inventa un codigo cuando la respuesta no lo trae", () => {
        const error = createErrorFromResponse({ body: "<html>502</html>", status: 502 });
        expect(error.code).toBe(NO_ERROR_CODE);
        expect(error.family).toBe("http");
        expect(error.data).toEqual({ body: "<html>502</html>" });
    });

    it("mantiene el nombre de la clase en el error", () => {
        expect(apiError(1301).name).toBe("PlanLimitError");
        expect(new PlanVortexConnectionError("sin red").name).toBe("PlanVortexConnectionError");
    });
});

describe("los codigos de token", () => {
    /** Son los dos que disparan el unico reintento con token nuevo, y los dos viajan en un 400. */
    it("reconoce el 501 y el 522", () => {
        expect(isTokenError(apiError(501))).toBe(true);
        expect(isTokenError(apiError(522))).toBe(true);
    });

    /**
     * El 520 sale 401 y es el unico que lo hace, pero NO es un error de token: a la app le faltan
     * permisos, y con un token recien pedido le seguirian faltando.
     */
    it("no toma el 520 por un token caducado", () => {
        expect(isTokenError(createErrorFromResponse({ body: { code: 520 }, status: 401 }))).toBe(false);
    });

    it("no se traga cualquier cosa", () => {
        expect(isTokenError(new Error("otra cosa"))).toBe(false);
        expect(isPlanVortexError(new Error("otra cosa"))).toBe(false);
    });
});

describe("las familias del catalogo", () => {
    /**
     * LA RAIZ de los tres tests de arriba: cada vez que el servidor estrenaba codigos por encima del
     * techo de un rango —978, 980, 987—, esta libreria los clasificaba mal durante semanas y nada
     * avisaba. Las tablas de error del spec commiteado nombran cada codigo que un endpoint puede
     * devolver, asi que todos tienen que caer en alguna familia. Si esto falla tras un
     * `npm run generate`, sube el techo del rango en `PLANVORTEX_ERROR_RANGES`.
     */
    it("da familia a todos los codigos que documenta el spec", () => {
        const spec = readFileSync(new URL("../openapi/planvortex.openapi.json", import.meta.url), "utf8");
        const codes = new Set([...spec.matchAll(/\| `(\d{3,4})` \|/g)].map((match) => Number(match[1])));
        expect(codes.size).toBeGreaterThan(100);
        const orphans = [...codes].filter((code) => errorFamilyForCode(code) === undefined);
        expect(orphans).toEqual([]);
    });

    it("coloca cada rango donde dice el roadmap", () => {
        expect(errorFamilyForCode(536)).toBe("auth");
        expect(errorFamilyForCode(810)).toBe("file");
        expect(errorFamilyForCode(1101)).toBe("organization");
        expect(errorFamilyForCode(2205)).toBe("integration");
        //La versión por CUENTA del 945: la misma familia que él
        expect(errorFamilyForCode(945)).toBe("publication");
        expect(errorFamilyForCode(2600)).toBe("publication");
        expect(errorFamilyForCode(3000)).toBeUndefined();
    });
});

describe("el error de OAuth2", () => {
    /**
     * El endpoint de token es la unica ruta del API con otra forma de error. Su codigo del catalogo
     * (538-541) NO viaja en el cuerpo, asi que la libreria no se lo inventa.
     */
    it("guarda el error de OAuth2 sin fabricar un code", () => {
        const error = new PlanVortexAuthenticationError("invalid_client", "Invalid client credentials", {
            status: 401,
        });
        expect(error.oauthError).toBe("invalid_client");
        expect(error.code).toBe(NO_ERROR_CODE);
        expect(error.family).toBe("oauth");
        expect(error).toBeInstanceOf(PlanVortexError);
    });
});
