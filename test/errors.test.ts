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
    it("coloca cada rango donde dice el roadmap", () => {
        expect(errorFamilyForCode(536)).toBe("auth");
        expect(errorFamilyForCode(810)).toBe("file");
        expect(errorFamilyForCode(1101)).toBe("organization");
        expect(errorFamilyForCode(2205)).toBe("integration");
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
