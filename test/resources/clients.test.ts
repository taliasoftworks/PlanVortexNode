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
import { CLIENT_ID, ORG_ID, organization, planData } from "../helpers/fixtures.js";

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
            client: { ...client, actual_use: planData, actual_asigned: planData },
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
            actual_plan: { accounts: 2, publications: 50 },
        });

        expect(list[0]?.query).toEqual({ name: ["nord"] });
        expect(create[0]?.body).toEqual({ name: "Nordwind", actual_plan: { accounts: 2, publications: 50 } });
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
            organization: { ...organization, actual_use: planData, actual_asigned: planData },
        });
        const pv = api.client();

        const use = await pv.organizations.use(ORG_ID);

        expect(calls[0]?.query).toEqual({ getUse: ["true"] });
        expect(use.actual_use?.publications).toBe(200);
        expect(use.actual_asigned?.publications).toBe(200);
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
