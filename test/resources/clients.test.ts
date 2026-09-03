/**
 * Clientes y organizaciones (capa 2).
 *
 * Este fichero existe sobre todo por el PLAN, que es donde el spec estaba peor: `Limit` decía
 * `accounts_limit`, `publications_limit`, `shared_space`... y `GET /limits` devuelve `accounts`,
 * `publications`, `space`, `users`, `integrations`, `twitter_credits` y `ai_credits`. **Ni un
 * nombre coincidía.** Un método escrito contra aquel spec habría leído `undefined` en los siete.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ContractHarness } from "../helpers/contract.js";
import { CLIENT_ID, ORG_ID, organization, planData, planUseData } from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

const client = {
    _id: CLIENT_ID,
    name: "Nordwind S.L.",
    client_type: "company",
    creation_date: "2026-07-01T09:00:00.000Z",
    actual_plan: {
        enabled: true,
        isEnabled: true,
        status: "active",
        plan_identifier: "basic",
        plan_data: planData,
        current_period_end: "2026-09-01T09:00:00.000Z",
    },
};

describe("clients", () => {
    it("desenvuelve `{clients, total}` y `{client}`", async () => {
        api.mock("get", "/clients", { clients: [client], total: 1 });
        api.mock("get", `/clients/${CLIENT_ID}`, { client });
        const pv = api.client();

        const page = await pv.clients.list();
        const one = await pv.clients.get(CLIENT_ID);

        expect({ total: page.total, id: page.data[0]?._id }).toEqual({ total: 1, id: CLIENT_ID });
        expect(one.name).toBe("Nordwind S.L.");
    });

    /**
     * Los números están en `actual_plan.plan_data`, no en `actual_plan`. El spec los ponía un nivel
     * más arriba y con otros nombres.
     */
    it("da los límites del plan dentro de `plan_data`", async () => {
        api.mock("get", `/clients/${CLIENT_ID}`, { client });
        const pv = api.client();

        const one = await pv.clients.get(CLIENT_ID);

        expect(one.actual_plan.plan_data.accounts).toBe(4);
        expect(one.actual_plan.plan_identifier).toBe("basic");
    });

    it("sólo manda `getUse` cuando se pide", async () => {
        const calls = api.mock("get", `/clients/${CLIENT_ID}`, {
            client: { ...client, actual_use: planUseData, actual_asigned: planData },
        });
        const pv = api.client();

        await pv.clients.get(CLIENT_ID);
        const withUse = await pv.clients.get(CLIENT_ID, { getUse: true });

        expect(calls.map((call) => call.query)).toEqual([{}, { getUse: ["true"] }]);
        expect(withUse.actual_use?.accounts).toBe(4);
    });

    it("lista y crea las organizaciones raíz de un cliente", async () => {
        const list = api.mock(`get`, `/clients/${CLIENT_ID}/organizations`, {
            organizations: [organization],
            total: 1,
        });
        const create = api.mock("post", `/clients/${CLIENT_ID}/organizations`, { organization });
        const pv = api.client();

        await pv.clients.organizations(CLIENT_ID, { name: "nord" });
        const created = await pv.clients.createOrganization(CLIENT_ID, {
            name: "Nordwind",
            actual_plan: { accounts: 2, users: 3 },
        });

        expect(list[0]?.query).toEqual({ name: ["nord"] });
        expect(create[0]?.body).toEqual({ name: "Nordwind", actual_plan: { accounts: 2, users: 3 } });
        expect(created._id).toBe(ORG_ID);
    });
});

describe("organizations", () => {
    /** El caso que la fase 5 dejó señalado: `Limit` no acertaba ni un nombre. */
    it("da los límites con los nombres que devuelve el servidor", async () => {
        api.mock("get", `/organizations/${ORG_ID}/limits`, planData);
        const pv = api.client();

        const limits = await pv.organizations.limits(ORG_ID);

        expect(limits).toEqual(planData);
        expect(Object.keys(limits)).toContain("space");
        expect(Object.keys(limits)).not.toContain("shared_space");
    });

    it("lee la ficha y el consumo por la misma ruta", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}`, {
            organization: { ...organization, actual_use: planUseData, actual_asigned: planData },
        });
        const pv = api.client();

        const use = await pv.organizations.use(ORG_ID);

        expect(calls[0]?.query).toEqual({ getUse: ["true"] });
        //`publications` sólo existe en el consumo: lo repartido a las hijas no lo lleva.
        expect(use.actual_use?.publications).toBe(200);
        expect(use.actual_asigned?.accounts).toBe(4);
    });

    it("lista y crea organizaciones hijas", async () => {
        const list = api.mock("get", `/organizations/${ORG_ID}/organizations`, {
            organizations: [organization],
            total: 2,
        });
        const create = api.mock("post", `/organizations/${ORG_ID}/organizations`, { organization });
        const pv = api.client();

        const page = await pv.organizations.children(ORG_ID, { limit: 5, getUse: true });
        await pv.organizations.createChild(ORG_ID, { name: "Nordwind Centro" });

        expect(page.total).toBe(2);
        expect(list[0]?.query).toEqual({ limit: ["5"], getUse: ["true"] });
        expect(create[0]?.body).toEqual({ name: "Nordwind Centro" });
    });

    it("actualiza y borra por su ruta directa", async () => {
        const update = api.mock("put", `/organizations/${ORG_ID}`, { organization });
        const remove = api.mock("delete", `/organizations/${ORG_ID}`, { success: true });
        const pv = api.client();

        await pv.organizations.update(ORG_ID, { name: "Nordwind" });
        await expect(pv.organizations.remove(ORG_ID)).resolves.toBeUndefined();

        expect(update[0]?.body).toEqual({ name: "Nordwind" });
        expect(remove[0]?.method).toBe("DELETE");
    });
});

/**
 * Las tres rutas que la fase 6 no llegó a exponer y cierra la 7: la configuración de IA del
 * cliente, el atajo de arranque y las credenciales propias de una red.
 */
describe("lo que faltaba del cliente y la organización", () => {
    it("updateAiSettings manda los ámbitos y un null borra el suyo", async () => {
        const calls = api.mock("put", `/clients/${CLIENT_ID}/ai-settings`, { client });
        const pv = api.client();

        await pv.clients.updateAiSettings(CLIENT_ID, {
            text: { provider: "openai", api_key: "sk-...", model: "gpt-4o" },
            image: null,
        });

        expect(calls[0]?.body).toEqual({
            text: { provider: "openai", api_key: "sk-...", model: "gpt-4o" },
            image: null,
        });
    });

    /** El atajo del arranque: cada cliente trae dentro sus organizaciones raíz y su propio total. */
    it("withOrganizations trae las organizaciones dentro de cada cliente", async () => {
        api.mock("get", "/clients_organizations", {
            clients: [{ ...client, organizations: [organization], total: 1 }],
            total: 1,
        });
        const pv = api.client();

        const page = await pv.clients.withOrganizations();

        expect(page.data[0]?.organizations[0]?._id).toBe(ORG_ID);
        //Dos `total` distintos: el del cliente cuenta sus organizaciones, el de fuera, los clientes.
        expect(page.data[0]?.total).toBe(1);
        expect(page.total).toBe(1);
    });

    it("updateAiContext reemplaza el bloque y devuelve la organización", async () => {
        const calls = api.mock("put", `/organizations/${ORG_ID}/ai-context`, { organization });
        const pv = api.client();

        await pv.organizations.updateAiContext(ORG_ID, { default_tone: "cercano, sin tecnicismos" });

        expect(calls[0]?.body).toEqual({ default_tone: "cercano, sin tecnicismos" });
    });

    /** BYOB: se mandan las credenciales de la app de Discord del cliente y no vuelve ni una. */
    it("updateSocialCredentials manda los secretos y la respuesta no los devuelve", async () => {
        const calls = api.mock(`put`, `/organizations/${ORG_ID}/social_credentials/discord`, {
            organization: { ...organization, social_credentials: { discord: { client_id: "12345" } } },
        });
        const pv = api.client();

        const updated = await pv.organizations.updateSocialCredentials(ORG_ID, "discord", {
            client_id: "12345",
            client_secret: "s3cr3t",
            bot_token: "MTIz.abc",
        });

        expect(calls[0]?.body).toEqual({
            client_id: "12345",
            client_secret: "s3cr3t",
            bot_token: "MTIz.abc",
        });
        expect(updated.social_credentials?.discord).not.toHaveProperty("client_secret");
        expect(updated.social_credentials?.discord).not.toHaveProperty("bot_token");
    });

    it("deleteSocialCredentials devuelve la organización, no un {success}", async () => {
        const calls = api.mock("delete", `/organizations/${ORG_ID}/social_credentials/discord`, {
            organization,
        });
        const pv = api.client();

        const updated = await pv.organizations.deleteSocialCredentials(ORG_ID, "discord");

        expect(calls[0]?.method).toBe("DELETE");
        expect(updated._id).toBe(ORG_ID);
    });

    it("cambia el nombre del cliente por su ruta directa", async () => {
        const calls = api.mock("put", `/clients/${CLIENT_ID}`, { client });
        const pv = api.client();

        const updated = await pv.clients.update(CLIENT_ID, { name: "Nordwind" });

        expect(calls[0]?.method).toBe("PUT");
        expect(calls[0]?.body).toEqual({ name: "Nordwind" });
        expect(updated._id).toBe(CLIENT_ID);
    });

    /**
     * Una organización RAÍZ se toca por la ruta del cliente y una HIJA por la suya propia. Son dos
     * rutas distintas para lo que parece la misma operación, y equivocarse compila igual.
     */
    it("actualiza y borra una organización raíz por la ruta del cliente", async () => {
        const put = api.mock("put", `/clients/${CLIENT_ID}/organizations/${ORG_ID}`, { organization });
        const removed = api.mock("delete", `/clients/${CLIENT_ID}/organizations/${ORG_ID}`, {
            success: true,
        });
        const pv = api.client();

        const updated = await pv.clients.updateOrganization(CLIENT_ID, ORG_ID, { name: "Panadería" });
        await pv.clients.deleteOrganization(CLIENT_ID, ORG_ID);

        expect(put[0]?.body).toEqual({ name: "Panadería" });
        expect(updated._id).toBe(ORG_ID);
        expect(removed[0]?.method).toBe("DELETE");
    });
});
