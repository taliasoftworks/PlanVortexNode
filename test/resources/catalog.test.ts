/**
 * El catálogo (capa 2). Lo que se pin aquí, además del contrato de cada ruta:
 *
 *  - Que se cachea. Es la razón de existir del recurso: un compositor que valide mientras se
 *    escribe pediría `/social_limits` en cada tecla.
 *  - Que un fallo NO se cachea, que es el error clásico de una caché escrita a la ligera: un
 *    502 de un despliegue en marcha dejaría la instancia rota para siempre.
 *  - Que `allowed_social_messages` va en POST, que es raro y es lo que hay.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ContractHarness } from "../helpers/contract.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

describe("catalog", () => {
    it("pide las redes soportadas", async () => {
        const calls = api.mock("get", "/social_networks", ["instagram", "bluesky"]);
        const pv = api.client();

        await expect(pv.catalog.socialNetworks()).resolves.toEqual(["instagram", "bluesky"]);
        expect(calls[0]?.method).toBe("GET");
        expect(calls[0]?.path).toBe("/social_networks");
    });

    it("pide los límites y las capacidades por su ruta", async () => {
        const limits = api.mock("get", "/social_limits", { characters: { bluesky: 300 } });
        const capabilities = api.mock("get", "/social_capabilities", {
            whatsapp: {
                publications: false,
                messages: true,
                products: true,
                webhooks: true,
                persistent_menu: true,
                comments: false,
            },
        });
        const actions = api.mock("get", "/social_comment_actions", {
            instagram: { reply: true, hide: true, delete_own: true, delete_others: false },
        });
        const pv = api.client();

        const [socialLimits, socialCapabilities, commentActions] = await Promise.all([
            pv.catalog.socialLimits(),
            pv.catalog.socialCapabilities(),
            pv.catalog.socialCommentActions(),
        ]);

        expect(socialLimits.characters?.bluesky).toBe(300);
        expect(socialCapabilities.whatsapp?.publications).toBe(false);
        expect(commentActions.instagram?.delete_others).toBe(false);
        expect([limits, capabilities, actions].map((c) => c.length)).toEqual([1, 1, 1]);
    });

    it("pide los aspect ratios y el tope de reintentos", async () => {
        api.mock("get", "/allowed_aspect_ratios", { instagram: { values: [1], text: ["1:1"] } });
        api.mock("get", "/publication_limits", { max_retries: 3 });
        const pv = api.client();

        await expect(pv.catalog.allowedAspectRatios()).resolves.toEqual({
            instagram: { values: [1], text: ["1:1"] },
        });
        await expect(pv.catalog.publicationLimits()).resolves.toEqual({ max_retries: 3 });
    });

    /** No es un capricho de estilo: la ruta del servidor es un POST. Un GET aquí es un 404. */
    it("pide las redes con mensajería en POST", async () => {
        const calls = api.mock("post", "/allowed_social_messages", ["whatsapp", "instagram"]);
        const pv = api.client();

        await expect(pv.catalog.allowedSocialMessages()).resolves.toEqual(["whatsapp", "instagram"]);
        expect(calls[0]?.method).toBe("POST");
        //Sin cuerpo: la ruta no lee nada del body.
        expect(calls[0]?.body).toBeUndefined();
    });

    it("cachea: dos llamadas, una petición", async () => {
        const calls = api.mock("get", "/social_limits", { characters: { instagram: 2200 } });
        const pv = api.client();

        await pv.catalog.socialLimits();
        await pv.catalog.socialLimits();

        expect(calls).toHaveLength(1);
    });

    /** Diez llamadas a la vez con la caché vacía tienen que compartir UNA petición, no lanzar diez. */
    it("cachea la promesa, no el resultado: llamadas simultáneas comparten petición", async () => {
        const calls = api.mock("get", "/social_networks", ["instagram"]);
        const pv = api.client();

        await Promise.all(Array.from({ length: 10 }, () => pv.catalog.socialNetworks()));

        expect(calls).toHaveLength(1);
    });

    it("no cachea un fallo: el siguiente intento vuelve a pedirlo", async () => {
        const failing = api.mock("get", "/social_networks", { code: 1000, message: "vaya" }, 400);
        const pv = api.client();

        await expect(pv.catalog.socialNetworks()).rejects.toThrow();
        expect(failing).toHaveLength(1);

        api.mock("get", "/social_networks", ["instagram"]);
        await expect(pv.catalog.socialNetworks()).resolves.toEqual(["instagram"]);
    });

    it("clearCache vuelve a pedirlo todo", async () => {
        const first = api.mock("get", "/social_limits", { characters: { instagram: 2200 } });
        const pv = api.client();

        await pv.catalog.socialLimits();
        pv.catalog.clearCache();
        await pv.catalog.socialLimits();

        expect(first).toHaveLength(2);
    });

    it("las redes que publican son un array y se cachean como el resto del catálogo", async () => {
        const calls = api.mock("get", "/allowed_social_publications", ["instagram", "bluesky"]);
        const pv = api.client();

        await expect(pv.catalog.allowedSocialPublications()).resolves.toEqual(["instagram", "bluesky"]);
        await pv.catalog.allowedSocialPublications();

        //Es la lista que decide si una cuenta puede tener publicaciones: WhatsApp y Google Business
        //no están, y por eso no se puede deducir de `/social_networks`.
        expect(calls).toHaveLength(1);
    });
});
