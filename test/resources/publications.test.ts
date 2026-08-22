/**
 * Publicaciones (capa 2): el camino que vende `/developers`.
 *
 * Lo que se pin aquí son las trampas que la fase 6 encontró auditando el spec, porque son las que
 * no fallan de forma ruidosa:
 *
 *  - El sobre: `{publication}` y `{publications, total}`. El spec decía `{upload}` y
 *    `{uploads, total}` —copiados de uploads-swagger—, así que un método escrito con el spec
 *    antiguo habría devuelto `undefined` sin dar error.
 *  - `publication_errors` es un ARRAY. El spec lo daba por objeto.
 *  - `files` vuelve poblado y `id_account` cambia de forma según la operación.
 *  - El filtro de red va en `social_network`. El spec anunciaba `account_type`, que el servidor no
 *    lee: filtrar por él devuelve la lista entera y sin avisar.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { accountId } from "../../src/index.js";
import { ContractHarness } from "../helpers/contract.js";
import {
    ACCOUNT_ID,
    ORG_ID,
    PUBLICATION_ID,
    account,
    listedPublication,
    publication,
    upload,
} from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

describe("publications.create", () => {
    it("manda los identificadores de fichero y la fecha en ISO", async () => {
        const calls = api.mock("post", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/publish`, {
            publication,
        });
        const pv = api.client();

        const created = await pv.publications.create(ORG_ID, ACCOUNT_ID, {
            social_network: "instagram",
            text: "Nuevo horno, nuevas hogazas",
            files: [upload._id],
            publish_date: new Date("2026-09-01T10:00:00.000Z"),
        });

        expect(calls[0]?.body).toEqual({
            social_network: "instagram",
            text: "Nuevo horno, nuevas hogazas",
            files: [upload._id],
            publish_date: "2026-09-01T10:00:00.000Z",
        });
        expect(created._id).toBe(PUBLICATION_ID);
    });

    /** `files` sale como ids y vuelve poblado. Es asimétrico y es lo que hace el servidor. */
    it("devuelve los ficheros ya resueltos, no los identificadores que se mandaron", async () => {
        api.mock("post", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/publish`, { publication });
        const pv = api.client();

        const created = await pv.publications.create(ORG_ID, ACCOUNT_ID, {
            social_network: "instagram",
            files: [upload._id],
        });

        expect(created.files[0]?.public_path).toBe(upload.public_path);
    });

    /**
     * Una publicación inválida NO llega como error: llega como un 200 con `state: "withErrors"`.
     * Un integrador que sólo mire el `try/catch` la da por publicada.
     */
    it("entrega la publicación fallida como respuesta correcta, no como excepción", async () => {
        api.mock("post", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/publish`, {
            publication: {
                ...publication,
                state: "withErrors",
                publication_errors: [{ code: 915, message: "Sin texto ni ficheros" }],
            },
        });
        const pv = api.client();

        const created = await pv.publications.create(ORG_ID, ACCOUNT_ID, { social_network: "instagram" });

        expect(created.state).toBe("withErrors");
        expect(created.publication_errors[0]?.code).toBe(915);
    });
});

describe("publications.list", () => {
    it("desenvuelve `{publications, total}`", async () => {
        api.mock("get", `/organizations/${ORG_ID}/publish`, {
            publications: [listedPublication],
            total: 37,
        });
        const pv = api.client();

        const page = await pv.publications.list(ORG_ID);

        expect(page.total).toBe(37);
        expect(page.data).toHaveLength(1);
    });

    /** El spec anunciaba `account_type` y el servidor lee `social_network`. */
    it("filtra por red con `social_network`, repitiendo la clave", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/publish`, { publications: [], total: 0 });
        const pv = api.client();

        await pv.publications.list(ORG_ID, {
            social_network: ["instagram", "bluesky"],
            state: ["ready", "withErrors"],
            accounts: [ACCOUNT_ID],
            limit: 20,
            offset: 40,
            search: "hogaza",
            orderByPublish: true,
            from_date: new Date("2026-08-01T00:00:00.000Z"),
        });

        expect(calls[0]?.query).toEqual({
            social_network: ["instagram", "bluesky"],
            state: ["ready", "withErrors"],
            accounts: [ACCOUNT_ID],
            limit: ["20"],
            offset: ["40"],
            search: ["hogaza"],
            orderByPublish: ["true"],
            from_date: ["2026-08-01T00:00:00.000Z"],
        });
        expect(calls[0]?.query.account_type).toBeUndefined();
    });

    /** `orderByPublish: false` no cambia nada en el servidor: mandarlo es ruido en el log. */
    it("no manda los filtros que no se han pedido", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/publish`, { publications: [], total: 0 });
        const pv = api.client();

        await pv.publications.list(ORG_ID, { orderByPublish: false });

        expect(calls[0]?.query).toEqual({});
    });

    /**
     * `iterate` corta cuando la página viene más corta que el `limit`, no cuando ha leído `total`.
     * `total` se cuenta con una consulta aparte, así que en una colección que se mueve no cuadra
     * con lo que devuelven las páginas: fiarse de él daría o un bucle infinito o una página menos.
     */
    it("encadena páginas y para cuando una viene corta, sin fiarse de `total`", async () => {
        const pages = [
            { publications: [listedPublication, listedPublication], total: 99 },
            { publications: [listedPublication], total: 99 },
        ];
        const calls = api.mockSequence("get", `/organizations/${ORG_ID}/publish`, pages);
        const pv = api.client();

        const seen = [];
        for await (const item of pv.publications.iterate(ORG_ID, { limit: 2 })) {
            seen.push(item);
        }

        expect(seen).toHaveLength(3);
        expect(calls.map((call) => call.query.offset)).toEqual([["0"], ["2"]]);
    });

    it("deja de pedir páginas en cuanto quien itera hace `break`", async () => {
        const calls = api.mockSequence("get", `/organizations/${ORG_ID}/publish`, [
            { publications: [listedPublication, listedPublication], total: 99 },
        ]);
        const pv = api.client();

        for await (const item of pv.publications.iterate(ORG_ID, { limit: 2 })) {
            expect(item._id).toBe(PUBLICATION_ID);
            break;
        }

        expect(calls).toHaveLength(1);
    });
});

describe("publications: id_account viaja de dos formas", () => {
    it("poblado al leer una publicación", async () => {
        api.mock("get", `/organizations/${ORG_ID}/publish/${PUBLICATION_ID}`, { publication });
        const pv = api.client();

        const read = await pv.publications.get(ORG_ID, PUBLICATION_ID);

        expect(typeof read.id_account).toBe("object");
        expect(accountId(read)).toBe(account._id);
    });

    it("como cadena en el listado, y `accountId` tapa la diferencia", async () => {
        api.mock("get", `/organizations/${ORG_ID}/publish`, { publications: [listedPublication], total: 1 });
        const pv = api.client();

        const page = await pv.publications.list(ORG_ID);

        expect(typeof page.data[0]?.id_account).toBe("string");
        expect(accountId(page.data[0]!)).toBe(ACCOUNT_ID);
    });
});

describe("publications: el resto del camino", () => {
    it("actualiza por PUT sobre la ruta sin cuenta", async () => {
        const calls = api.mock("put", `/organizations/${ORG_ID}/publish/${PUBLICATION_ID}`, { publication });
        const pv = api.client();

        await pv.publications.update(ORG_ID, PUBLICATION_ID, { text: "Otro texto" });

        expect(calls[0]?.method).toBe("PUT");
        expect(calls[0]?.body).toEqual({ text: "Otro texto" });
    });

    it("borra y no devuelve nada", async () => {
        const calls = api.mock("delete", `/organizations/${ORG_ID}/publish/${PUBLICATION_ID}`, {
            success: true,
        });
        const pv = api.client();

        await expect(pv.publications.remove(ORG_ID, PUBLICATION_ID)).resolves.toBeUndefined();
        expect(calls[0]?.method).toBe("DELETE");
    });

    /** El tope viaja en la respuesta para que nadie lo escriba a mano en su panel. */
    it("reintenta y devuelve también el tope que aplica el servidor", async () => {
        const calls = api.mock("post", `/organizations/${ORG_ID}/publish/${PUBLICATION_ID}/retry`, {
            publication: { ...publication, state: "sended", retries: 1 },
            max_retries: 3,
        });
        const pv = api.client();

        const result = await pv.publications.retry(ORG_ID, PUBLICATION_ID);

        expect(result.max_retries).toBe(3);
        expect(result.publication.retries).toBe(1);
        expect(calls[0]?.body).toBeUndefined();
    });

    /** `/metrics` llama a la red y en X cuesta un crédito; `/stats` lee lo medido y es gratis. */
    it("separa las métricas en vivo de la serie ya medida", async () => {
        const live = api.mock("get", `/organizations/${ORG_ID}/publish/${PUBLICATION_ID}/metrics`, {
            likes: 12,
            impressions: 340,
        });
        const stored = api.mock("get", `/organizations/${ORG_ID}/publish/${PUBLICATION_ID}/stats`, {
            id_publication: PUBLICATION_ID,
            social_network: "instagram",
            series: [],
        });
        const pv = api.client();

        await expect(pv.publications.metrics(ORG_ID, PUBLICATION_ID)).resolves.toEqual({
            likes: 12,
            impressions: 340,
        });
        const history = await pv.publications.stats(ORG_ID, PUBLICATION_ID);

        //Una serie vacía es una respuesta válida, no un error: la publicación aún no se ha medido.
        expect(history.series).toEqual([]);
        expect([live, stored].map((c) => c.length)).toEqual([1, 1]);
    });

    it("lee el muro de la cuenta por su propia ruta", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/social_publications`, {
            publications: [listedPublication],
            total: 1,
        });
        const pv = api.client();

        await pv.publications.listOnNetwork(ORG_ID, ACCOUNT_ID, { limit: 5 });

        expect(calls[0]?.path).toBe(`/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/social_publications`);
        expect(calls[0]?.query.limit).toEqual(["5"]);
    });
});

describe("publications: lo que falla antes de salir a la red", () => {
    it("no manda una petición con un identificador vacío", async () => {
        const pv = api.client();

        await expect(pv.publications.get("", PUBLICATION_ID)).rejects.toThrow(/idOrganization/);
    });

    it("avisa cuando el sobre no es el esperado en vez de devolver undefined", async () => {
        api.mock("get", `/organizations/${ORG_ID}/publish`, { uploads: [], total: 0 });
        const pv = api.client();

        await expect(pv.publications.list(ORG_ID)).rejects.toThrow(/publications/);
    });
});
