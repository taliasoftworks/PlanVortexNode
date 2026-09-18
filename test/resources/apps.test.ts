/**
 * Apps de cliente (capa 2).
 *
 * Lo que se pin aquí son las trampas que la fase 7 encontró auditando el spec contra
 * `src/domain/**` y `src/routes/client_app.ts` del servidor:
 *
 *  - **Casi todo exige token de USUARIO**: con credenciales de app, listar, crear, borrar y leer el
 *    secreto devuelven el 512. Leer y actualizar la propia app sí funcionan con token de app.
 *  - **Un cliente sólo puede tener UNA app** (error 536), aunque el listado esté paginado.
 *  - **`PUT` reemplaza los cinco campos**, no fusiona: omitir `webhook_url` apaga el webhook.
 *  - **El secreto no está en la ficha**: se pide aparte y viene vivo de Keycloak.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { PlanVortexError } from "../../src/index.js";
import { ContractHarness } from "../helpers/contract.js";
import { CLIENT_ID } from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

const APP_ID = "66d04a6a427f4c43b9d97fc0";
const LIST = `/clients/${CLIENT_ID}/apps`;
const ONE = `${LIST}/${APP_ID}`;

const app = {
    _id: APP_ID,
    id_client: CLIENT_ID,
    name: "Integración de Nordwind",
    keycloak_client_idenfifier: "nordwind-erp",
    allowed_domains: ["https://erp.nordwind.example"],
    redirect_urls: ["https://erp.nordwind.example/planvortex/callback"],
    webhook_url: "https://erp.nordwind.example/planvortex/webhook",
    creation_date: "2026-08-01T09:00:00.000Z",
    deleted: false,
};

describe("apps.list", () => {
    it("desenvuelve `{client_apps, total}`", async () => {
        api.mock("get", LIST, { client_apps: [app], total: 1 });
        const pv = api.client();

        const page = await pv.apps.list(CLIENT_ID);

        expect(page.total).toBe(1);
        expect(page.data[0]?.keycloak_client_idenfifier).toBe("nordwind-erp");
    });

    /**
     * El caso normal de esta librería: el cliente está autenticado con credenciales de APP, y esta
     * ruta pide un usuario. Llega como un 512 dentro de un HTTP 400, como todo.
     */
    it("con token de app devuelve el 512, no un 403", async () => {
        api.mock("get", LIST, { code: 512, message: "requires user", data: {} }, 400);
        const pv = api.client();

        await expect(pv.apps.list(CLIENT_ID)).rejects.toMatchObject({ code: 512 });
        await expect(pv.apps.list(CLIENT_ID)).rejects.toBeInstanceOf(PlanVortexError);
    });
});

describe("apps.get", () => {
    it("desenvuelve `{client_app}`", async () => {
        api.mock("get", ONE, { client_app: app });
        const pv = api.client();

        expect((await pv.apps.get(CLIENT_ID, APP_ID))._id).toBe(APP_ID);
    });
});

describe("apps.create", () => {
    it("manda el cuerpo tal cual", async () => {
        const calls = api.mock("post", LIST, { client_app: app });
        const pv = api.client();

        await pv.apps.create(CLIENT_ID, {
            name: "Integración de Nordwind",
            keycloak_client_idenfifier: "nordwind-erp",
            allowed_domains: ["https://erp.nordwind.example"],
            redirect_urls: ["https://erp.nordwind.example/planvortex/callback"],
        });

        expect(calls[0]?.body).toEqual({
            name: "Integración de Nordwind",
            keycloak_client_idenfifier: "nordwind-erp",
            allowed_domains: ["https://erp.nordwind.example"],
            redirect_urls: ["https://erp.nordwind.example/planvortex/callback"],
        });
    });

    /** Sólo puede haber una app por cliente: la segunda es un 536. */
    it("la segunda app devuelve el 536", async () => {
        api.mock("post", LIST, { code: 536, message: "already exists", data: {} }, 400);
        const pv = api.client();

        await expect(
            pv.apps.create(CLIENT_ID, { name: "Otra", keycloak_client_idenfifier: "otra" }),
        ).rejects.toMatchObject({ code: 536 });
    });
});

describe("apps.update", () => {
    /**
     * El PUT es un REEMPLAZO: la librería manda exactamente lo que se le da y no rellena nada, así
     * que un cuerpo sin `webhook_url` apaga el webhook en el servidor. Este test lo fija para que
     * nadie "arregle" el método rellenando campos por su cuenta.
     */
    it("manda exactamente lo que se le pasa, sin rellenar campos", async () => {
        const calls = api.mock("put", ONE, { client_app: { ...app, webhook_url: undefined } });
        const pv = api.client();

        await pv.apps.update(CLIENT_ID, APP_ID, {
            name: "Integración de Nordwind",
            keycloak_client_idenfifier: "nordwind-erp",
        });

        expect(calls[0]?.body).toEqual({
            name: "Integración de Nordwind",
            keycloak_client_idenfifier: "nordwind-erp",
        });
    });
});

describe("apps.secret", () => {
    it("devuelve la cadena, no el sobre", async () => {
        api.mock("get", `${ONE}/secret`, { secret: "s3cr3t-de-keycloak" });
        const pv = api.client();

        expect(await pv.apps.secret(CLIENT_ID, APP_ID)).toBe("s3cr3t-de-keycloak");
    });

    /** Leer y rotar son la MISMA ruta con dos verbos: un GET de más no rota nada y un POST de más sí */
    it("rotar va por POST a la misma ruta y devuelve el secreto nuevo", async () => {
        const calls = api.mock("post", `${ONE}/secret`, { secret: "s3cr3t-nuevo" });
        const pv = api.client();

        expect(await pv.apps.rotateSecret(CLIENT_ID, APP_ID)).toBe("s3cr3t-nuevo");
        expect(calls[0]?.method).toBe("POST");
    });
});

describe("apps.remove", () => {
    it("borra por DELETE", async () => {
        const calls = api.mock("delete", ONE, { success: true });
        const pv = api.client();

        await pv.apps.remove(CLIENT_ID, APP_ID);

        expect(calls[0]?.method).toBe("DELETE");
    });
});
