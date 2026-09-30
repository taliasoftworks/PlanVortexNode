/**
 * Integraciones (capa 2): Google Drive y RSS.
 *
 * Lo que se pin aquí son las trampas que la fase 7 encontró auditando el spec contra
 * `src/domain/**` y `src/orm/integrations/` del servidor:
 *
 *  - **Hay dos formas de conectar** y las decide `requires_oauth` del proveedor, no el integrador:
 *    con `code` en Drive, con formulario en RSS. Ambas por el mismo endpoint.
 *  - **Reconectar es otra ruta y otro permiso**: renueva el MISMO documento y no ocupa cupo.
 *  - **`connected` no está guardado**: lo calcula el servidor a la salida a partir de `error_code`.
 *  - **Las credenciales nunca salen**: `access_data` no viaja en ninguna respuesta.
 *  - **La lista no pagina si no se lo pides**: sin `limit` vuelven todas, al revés que el resto.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ContractHarness } from "../helpers/contract.js";
import { ORG_ID, CLIENT_ID, ACCOUNT_ID } from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

const LIST = `/organizations/${ORG_ID}/integrations`;
const INTEGRATION_ID = "66d04a6a427f4c43b9d97fa0";
const ONE = `${LIST}/${INTEGRATION_ID}`;

const integration = {
    _id: INTEGRATION_ID,
    id_organization: ORG_ID,
    id_client: CLIENT_ID,
    provider: "rss",
    name: "Blog de Nordwind",
    external_identifier: "https://blog.example/feed",
    config: { url: "https://blog.example/feed", id_accounts: [ACCOUNT_ID], auto_publish: false },
    enabled: true,
    connected: true,
    creation_date: "2026-08-15T09:00:00.000Z",
};

describe("integrations.providers", () => {
    it("devuelve la lista desenvuelta, con lo que sabe hacer cada proveedor", async () => {
        api.mock("get", "/integration_providers", {
            providers: [
                {
                    provider: "google_drive",
                    requires_oauth: true,
                    file_import: true,
                    content_feed: false,
                    accepted_formats: ["jpeg", "png", "mp4", "heic"],
                    config_fields: [],
                },
                {
                    provider: "rss",
                    requires_oauth: false,
                    file_import: false,
                    content_feed: true,
                    accepted_formats: [],
                    config_fields: [
                        { name: "url", type: "url", required: true },
                        { name: "id_accounts", type: "accounts", required: true },
                    ],
                },
            ],
        });
        const pv = api.client();

        const providers = await pv.integrations.providers();

        expect(providers).toHaveLength(2);
        //Es lo que decide cómo se conecta: con `code` o con formulario.
        expect(providers[0]?.requires_oauth).toBe(true);
        expect(providers[1]?.config_fields[0]?.name).toBe("url");
        //`accepted_formats` vacío en el RSS significa "no aporta ficheros", no "vale todo".
        expect(providers[1]?.accepted_formats).toEqual([]);
    });
});

describe("integrations.list", () => {
    it("desenvuelve `{integrations, total}` y filtra por proveedor", async () => {
        const calls = api.mock("get", LIST, { integrations: [integration], total: 1 });
        const pv = api.client();

        const page = await pv.integrations.list(ORG_ID, { provider: "rss" });

        expect(calls[0]?.query).toEqual({ provider: ["rss"] });
        expect(page.data[0]?._id).toBe(INTEGRATION_ID);
    });

    /** Las credenciales no salen: lo único que hay para saber si está viva es `connected`. */
    it("no trae credenciales", async () => {
        api.mock("get", LIST, { integrations: [integration], total: 1 });
        const pv = api.client();

        const page = await pv.integrations.list(ORG_ID);

        expect(page.data[0]).not.toHaveProperty("access_data");
        expect(page.data[0]?.connected).toBe(true);
    });
});

describe("integrations.connectLink", () => {
    it("devuelve la url y manda el redirect_uri pedido", async () => {
        const calls = api.mock("get", `${LIST}/google_drive/connect_link`, {
            url: "https://accounts.google.com/o/oauth2/v2/auth?response_type=code",
        });
        const pv = api.client();

        const url = await pv.integrations.connectLink(ORG_ID, "google_drive", {
            redirect_uri: "https://panel.example/drive",
        });

        expect(calls[0]?.query.redirect_uri).toEqual(["https://panel.example/drive"]);
        expect(url).toContain("accounts.google.com");
    });
});

/**
 * WooCommerce: el enlace que NO es OAuth. La tienda va en la query porque el enlace apunta a SU
 * WordPress, y reconectar con el botón es el mismo enlace con `id_integration`.
 */
describe("integrations.connectLink de una tienda", () => {
    it("manda la url de la tienda y, para reconectar, el id de la integración", async () => {
        const calls = api.mock("get", `${LIST}/woocommerce/connect_link`, {
            url: "https://tienda.example.com/wc-auth/v1/authorize?app_name=PlanVortex&scope=read",
        });
        const pv = api.client();

        const url = await pv.integrations.connectLink(ORG_ID, "woocommerce", {
            url: "https://tienda.example.com",
            id_integration: INTEGRATION_ID,
        });

        expect(calls[0]?.query).toEqual({
            url: ["https://tienda.example.com"],
            id_integration: [INTEGRATION_ID],
        });
        expect(url).toContain("/wc-auth/v1/authorize");
    });

    it("sin url ni id_integration no manda ninguna de las dos claves", async () => {
        const calls = api.mock("get", `${LIST}/google_drive/connect_link`, {
            url: "https://accounts.google.com/",
        });
        const pv = api.client();

        await pv.integrations.connectLink(ORG_ID, "google_drive");

        //Un `url=` vacío en el enlace de Drive no rompería nada hoy, pero sería mentir en la query
        expect(calls[0]?.query).toEqual({});
    });
});

describe("integrations.products", () => {
    const PRODUCTS = `${ONE}/products`;

    it("pide una página con cursor, búsqueda y límite, y la devuelve tal cual", async () => {
        const calls = api.mock("get", PRODUCTS, {
            items: [
                {
                    external_id: "68",
                    name: "Taza de cerámica",
                    price: "14,52 € IVA incluido",
                    permalink: "https://tienda.example.com/producto/taza",
                    available: true,
                },
                { external_id: "71", name: "Zapatillas", available: false },
            ],
            next_cursor: "p3",
        });
        const pv = api.client();

        const page = await pv.integrations.products(ORG_ID, INTEGRATION_ID, {
            cursor: "p2",
            search: "taza",
            limit: 20,
        });

        expect(calls[0]?.query).toEqual({ cursor: ["p2"], search: ["taza"], limit: ["20"] });
        //El id es SIEMPRE una cadena, y lo agotado viene pero marcado
        expect(page.items[0]?.external_id).toBe("68");
        expect(page.items[1]?.available).toBe(false);
        //El cursor es opaco: se devuelve tal cual llegó, sin interpretarlo
        expect(page.next_cursor).toBe("p3");
    });

    it("la última página no trae next_cursor", async () => {
        api.mock("get", PRODUCTS, { items: [] });
        const pv = api.client();

        const page = await pv.integrations.products(ORG_ID, INTEGRATION_ID);

        expect(page.next_cursor).toBeUndefined();
    });

    it("un proveedor sin catálogo sale como IntegrationError con su código", async () => {
        api.mock("get", PRODUCTS, { code: 2207, message: "This integration has no product catalog" }, 400);
        const pv = api.client();

        await expect(pv.integrations.products(ORG_ID, INTEGRATION_ID)).rejects.toMatchObject({
            code: 2207,
            family: "integration",
        });
    });
});

describe("integrations.connect", () => {
    it("una tienda con claves manda el formulario plano, no un config", async () => {
        const calls = api.mock("post", LIST, {
            integration: {
                ...integration,
                provider: "woocommerce",
                config: {
                    url: "https://tienda.example.com",
                    api_base: "wp-json",
                    auth_mode: "basic",
                    key_ending: "3f9a2c1",
                    tax_location_missing: false,
                },
            },
        });
        const pv = api.client();

        const store = await pv.integrations.connect(ORG_ID, {
            provider: "woocommerce",
            url: "https://tienda.example.com",
            consumer_key: "ck_1",
            consumer_secret: "cs_1",
        });

        expect(calls[0]?.body).toEqual({
            provider: "woocommerce",
            url: "https://tienda.example.com",
            consumer_key: "ck_1",
            consumer_secret: "cs_1",
        });
        //Lo que hay que ENSEÑAR de una tienda: qué clave borrar al desconectar, y si sus precios valen
        expect(store.config.key_ending).toBe("3f9a2c1");
        expect(store.config.tax_location_missing).toBe(false);
    });

    it("con OAuth manda el proveedor y el code", async () => {
        const calls = api.mock("post", LIST, { integration: { ...integration, provider: "google_drive" } });
        const pv = api.client();

        await pv.integrations.connect(ORG_ID, { provider: "google_drive", code: "4/0Ab_c" });

        expect(calls[0]?.body).toEqual({ provider: "google_drive", code: "4/0Ab_c" });
    });

    it("sin OAuth manda el formulario PLANO, no anidado en config", async () => {
        const calls = api.mock("post", LIST, { integration });
        const pv = api.client();

        const created = await pv.integrations.connect(ORG_ID, {
            provider: "rss",
            url: "https://blog.example/feed",
            id_accounts: [ACCOUNT_ID],
        });

        //El formulario va PLANO, no dentro de un `config`: el `config` es lo que devuelve el
        //servidor una vez construido, no lo que se manda.
        expect(calls[0]?.body).toEqual({
            provider: "rss",
            url: "https://blog.example/feed",
            id_accounts: [ACCOUNT_ID],
        });
        expect(created.provider).toBe("rss");
    });
});

describe("integrations.reconnect", () => {
    /** Mismo cuerpo que conectar, otra ruta, otro permiso, y sin volver a ocupar cupo. */
    it("va por su propia ruta y no por la de crear", async () => {
        const calls = api.mock("post", `${ONE}/reconnect`, { integration });
        const pv = api.client();

        await pv.integrations.reconnect(ORG_ID, INTEGRATION_ID, {
            provider: "google_drive",
            code: "4/0Ab_c",
        });

        expect(calls[0]?.path).toBe(`${ONE}/reconnect`);
    });
});

describe("integrations.update", () => {
    it("apaga un feed sin borrarlo", async () => {
        const calls = api.mock("put", ONE, { integration: { ...integration, enabled: false } });
        const pv = api.client();

        const updated = await pv.integrations.update(ORG_ID, INTEGRATION_ID, { enabled: false });

        expect(calls[0]?.body).toEqual({ enabled: false });
        expect(updated.enabled).toBe(false);
    });
});

describe("integrations.remove", () => {
    it("borra por DELETE", async () => {
        const calls = api.mock("delete", ONE, { success: true });
        const pv = api.client();

        await pv.integrations.remove(ORG_ID, INTEGRATION_ID);

        expect(calls[0]?.method).toBe("DELETE");
    });
});

describe("integrations.pickerConfig", () => {
    it("devuelve la configuración del Picker tal cual", async () => {
        api.mock("get", `${ONE}/picker_config`, {
            access_token: "ya29.a0Ae",
            expires_in: "2026-08-24T12:00:00.000Z",
            developer_key: "AIzaSy",
            app_id: "123456789012",
        });
        const pv = api.client();

        const config = await pv.integrations.pickerConfig(ORG_ID, INTEGRATION_ID);

        //`app_id` es el NÚMERO del proyecto de Google Cloud, y viaja como cadena.
        expect(config.app_id).toBe("123456789012");
        expect(config.access_token).toBe("ya29.a0Ae");
    });

    it("una integración suelta se lee por su identificador y viene envuelta en {integration}", async () => {
        const calls = api.mock("get", `${LIST}/${INTEGRATION_ID}`, {
            integration: {
                _id: INTEGRATION_ID,
                provider: "google_drive",
                name: "Drive de marketing",
                enabled: true,
            },
        });
        const pv = api.client();

        const integration = await pv.integrations.get(ORG_ID, INTEGRATION_ID);

        expect(calls[0]?.method).toBe("GET");
        expect(integration._id).toBe(INTEGRATION_ID);
        expect(integration.provider).toBe("google_drive");
    });
});
