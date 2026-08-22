import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { PLANVORTEX_API_URL, PLANVORTEX_ERROR_RANGES, VERSION } from "../src/index.js";
import { WEBHOOK_EVENTS, WEBHOOK_SIGNATURE_HEADERS } from "../src/webhooks/index.js";

/* eslint-disable @typescript-eslint/no-explicit-any -- se navega un documento OpenAPI en crudo */
const openapi = JSON.parse(
    readFileSync(fileURLToPath(new URL("../openapi/planvortex.openapi.json", import.meta.url)), "utf8"),
) as any;

const packageJson = JSON.parse(
    readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as { version: string; dependencies?: Record<string, string>; exports: Record<string, unknown> };

describe("el paquete", () => {
    /**
     * `VERSION` viaja en el `User-Agent` de cada peticion, asi que un numero viejo ahi es un
     * numero viejo en nuestros logs justo el dia que haya que saber que version falla.
     */
    it("publica la misma version que el package.json", () => {
        expect(VERSION).toBe(packageJson.version);
    });

    /**
     * Cero dependencias en runtime (decision 6 del roadmap): una libreria de integracion que
     * arrastra quince transitivas es una libreria que da problemas de auditoria en casa del
     * cliente. Todo lo que hace falta esta en el Node moderno.
     */
    it("no tiene ninguna dependencia en runtime", () => {
        expect(packageJson.dependencies ?? {}).toEqual({});
    });

    /** Los dos puntos de entrada, cada uno con sus dos formatos y sus dos juegos de tipos */
    it("declara los dos puntos de entrada", () => {
        expect(Object.keys(packageJson.exports).sort()).toEqual([".", "./package.json", "./webhooks"]);
    });

    it("apunta al API publico y a su unica version", () => {
        expect(PLANVORTEX_API_URL).toBe("https://api.planvortex.com/v1.0.0");
    });
});

describe("el catalogo de errores", () => {
    it("no solapa rangos y va ordenado", () => {
        for (let index = 1; index < PLANVORTEX_ERROR_RANGES.length; index++) {
            const previous = PLANVORTEX_ERROR_RANGES[index - 1]!;
            const current = PLANVORTEX_ERROR_RANGES[index]!;
            expect(previous.to).toBeLessThan(current.from);
        }
    });

    /**
     * Los codigos que MAS importan, porque son los que un cliente clasificaria mal si mirase el
     * status: los de token viajan dentro de un 400.
     */
    it("coloca los codigos de token en la familia de autenticacion", () => {
        for (const code of [501, 520, 522]) {
            const range = PLANVORTEX_ERROR_RANGES.find((entry) => code >= entry.from && code <= entry.to);
            expect(range?.family).toBe("auth");
        }
    });
});

describe("los webhooks", () => {
    it("declaran las dos cabeceras de firma", () => {
        expect(WEBHOOK_SIGNATURE_HEADERS).toEqual({
            sha1: "x-hub-signature",
            sha256: "x-hub-signature-256",
        });
    });

    /**
     * La constante contra el SPEC, no contra una lista escrita a mano.
     *
     * La que habia era de cinco eventos y estaba mal en los dos sentidos: le faltaban los tres de
     * mensajeria que si se entregan (`messaging_postbacks`, `messaging_seen`, `messaging_error`)
     * y el spec, a su vez, anunciaba dos que no se entregan nunca (`message_reactions` y
     * `mentions`, que `WEBHOOKS_TO_HANDLE` descarta). Atandola aqui, el dia que el servidor
     * entregue un evento nuevo la unica forma de que esto siga en verde es actualizar las dos
     * cosas — que es justo el trato que tiene SOCIAL_LIMITS en el backend.
     */
    it("declaran los mismos eventos que el spec, y ninguno mas", () => {
        const schemas = openapi.components.schemas;
        const fromSpec = [
            ...schemas.CommentsWebhookChange.properties.field.enum,
            ...schemas.CommentsIntegrationWebhookChange.properties.field.enum,
        ];
        expect([...WEBHOOK_EVENTS].sort()).toEqual(fromSpec.sort());
    });

    /**
     * Los dos tipos son uno por algo: una integracion no cuelga de ninguna cuenta, asi que el
     * cambio que la anuncia no puede traer `id_account` ni `social_network`. Si algun dia
     * alguien los "unifica", esto se pone rojo antes de que la union discriminada deje de servir.
     */
    it("separan el cambio de una integracion del de una cuenta", () => {
        const account = openapi.components.schemas.CommentsWebhookChange;
        const integration = openapi.components.schemas.CommentsIntegrationWebhookChange;

        expect(account.required).toContain("id_account");
        expect(account.required).toContain("social_network");
        expect(Object.keys(integration.properties)).not.toContain("id_account");
        expect(Object.keys(integration.properties)).not.toContain("social_network");
    });
});
