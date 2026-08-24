/**
 * Productos (capa 2): catálogos de Meta Commerce.
 *
 * Lo que se pin aquí son las trampas que la fase 7 encontró auditando el spec contra
 * `src/domain/**` y `src/orm/social_apis/facebook/products/` del servidor:
 *
 *  - **El sobre de las dos listas es `{items, total}`**, no `{products}` ni `{catalogs}`.
 *  - **`product_catalog_id` es obligatorio de hecho** aunque la ruta lo pinte opcional: sin él, el
 *    servidor devuelve el error 2000. Por eso es un argumento posicional y no una opción.
 *  - **`total` no vale para paginar**: en productos es siempre 0 y en catálogos es la longitud de
 *    la página, así que `iterate()` corta por página corta y no por el total.
 *  - **Crear devuelve una CADENA**, no el objeto creado — y en catálogos el campo se llama
 *    `product_catalog`, que suena a objeto y es un identificador.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ContractHarness } from "../helpers/contract.js";
import { ACCOUNT_ID, ORG_ID } from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

const BASE = `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}`;
const CATALOG_ID = "1122334455667788";

const product = {
    id: "9988776655443322",
    retailer_id: "PAN-CENTENO-1KG",
    name: "Hogaza de centeno",
    //En CENTIMOS de `currency`: 450 son 4,50 EUR. Es el vocabulario de Meta, no el nuestro.
    price: 450,
    currency: "EUR",
    availability: "in stock" as const,
    image_url: "https://cdn.example/hogaza.jpg",
};

describe("products.list", () => {
    it("desenvuelve `{items, total}` y manda el catálogo en la query", async () => {
        const calls = api.mock("get", `${BASE}/products`, { items: [product], total: 0 });
        const pv = api.client();

        const page = await pv.products.list(ORG_ID, ACCOUNT_ID, CATALOG_ID, { limit: 50 });

        expect(calls[0]?.query).toEqual({
            product_catalog_id: [CATALOG_ID],
            limit: ["50"],
        });
        expect(page.data[0]?.id).toBe(product.id);
        //`total` llega a 0 aunque haya productos: sale de un `summary` que el servidor no pide.
        expect(page.total).toBe(0);
    });

    it("sin catálogo no llega a salir a la red", async () => {
        const pv = api.client();

        await expect(pv.products.list(ORG_ID, ACCOUNT_ID, "")).rejects.toThrow(/idCatalog/);
        expect(api.calls).toHaveLength(0);
    });

    /** Con `total: 0` en cada respuesta, lo único que puede cortar el iterador es la página corta. */
    it("iterate() corta por página corta, no por `total`", async () => {
        const calls = api.mockSequence("get", `${BASE}/products`, [
            { items: [product, product], total: 0 },
            { items: [product], total: 0 },
        ]);
        const pv = api.client();

        const seen = [];
        for await (const item of pv.products.iterate(ORG_ID, ACCOUNT_ID, CATALOG_ID, { limit: 2 })) {
            seen.push(item);
        }

        expect(seen).toHaveLength(3);
        expect(calls).toHaveLength(2);
    });
});

describe("products.create", () => {
    it("manda el producto en el cuerpo y el catálogo en la query, y devuelve el id", async () => {
        const calls = api.mock("post", `${BASE}/products`, { product_id: product.id });
        const pv = api.client();

        const id = await pv.products.create(ORG_ID, ACCOUNT_ID, CATALOG_ID, {
            retailer_id: "PAN-CENTENO-1KG",
            name: "Hogaza de centeno",
            price: 450,
            currency: "EUR",
            image_url: "https://cdn.example/hogaza.jpg",
        });

        expect(calls[0]?.query.product_catalog_id).toEqual([CATALOG_ID]);
        expect(calls[0]?.body).toEqual({
            retailer_id: "PAN-CENTENO-1KG",
            name: "Hogaza de centeno",
            price: 450,
            currency: "EUR",
            image_url: "https://cdn.example/hogaza.jpg",
        });
        expect(id).toBe(product.id);
    });
});

describe("products.catalogs", () => {
    it("desenvuelve `{items, total}`", async () => {
        const catalog = { id: CATALOG_ID, name: "Panadería Nordwind", product_count: 12 };
        api.mock("get", `${BASE}/products_catalogs`, { items: [catalog], total: 1 });
        const pv = api.client();

        const page = await pv.products.catalogs(ORG_ID, ACCOUNT_ID);

        expect(page.data[0]?.id).toBe(CATALOG_ID);
    });
});

describe("products.createCatalog", () => {
    /** El campo se llama `product_catalog` y lo que lleva es una cadena. */
    it("devuelve el identificador, no el catálogo", async () => {
        api.mock("post", `${BASE}/products_catalogs`, { product_catalog: CATALOG_ID });
        const pv = api.client();

        const id = await pv.products.createCatalog(ORG_ID, ACCOUNT_ID, { name: "Panadería Nordwind" });

        expect(id).toBe(CATALOG_ID);
    });
});
