/**
 * Cuentas (capa 2).
 *
 * Dos de estos tests no pueden fallar de otra forma: el filtro `capability`, que el spec no
 * documentaba y el servidor sí lee, y la forma de `/metrics` —`stats` es un ARRAY— que el spec daba
 * por objeto. Con el spec antiguo, `metrics.stats.map(...)` no compilaba y `metrics.stats.value`
 * era `undefined` sin dar error.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ContractHarness } from "../helpers/contract.js";
import { ACCOUNT_ID, ORG_ID, account } from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

describe("accounts", () => {
    it("desenvuelve `{accounts, total}` y `{account}`", async () => {
        api.mock("get", `/organizations/${ORG_ID}/accounts`, { accounts: [account], total: 4 });
        api.mock("get", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}`, { account });
        const pv = api.client();

        const page = await pv.accounts.list(ORG_ID);
        const one = await pv.accounts.get(ORG_ID, ACCOUNT_ID);

        expect({ total: page.total, id: page.data[0]?._id }).toEqual({ total: 4, id: ACCOUNT_ID });
        //`username` no estaba en el spec hasta la fase 6 y el servidor lo devuelve desde siempre.
        expect(one.username).toBe("nordwind");
    });

    /**
     * `capability` lo aplica el SERVIDOR con la misma matriz que publica `/social_capabilities`.
     * Es la forma de pedir "las cuentas con las que puedo publicar" sin mantener una tabla propia
     * de qué red hace qué — que es exactamente lo que siempre acaba divergiendo.
     */
    it("filtra por capacidad, por red y por nombre", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/accounts`, { accounts: [], total: 0 });
        const pv = api.client();

        await pv.accounts.list(ORG_ID, {
            capability: "publications",
            social_network: ["instagram", "bluesky"],
            name: "nordwind",
            accounts: [ACCOUNT_ID],
        });

        expect(calls[0]?.query).toEqual({
            capability: ["publications"],
            social_network: ["instagram", "bluesky"],
            name: ["nordwind"],
            accounts: [ACCOUNT_ID],
        });
    });

    it("cambia el nombre por PUT y desconecta por DELETE", async () => {
        const update = api.mock("put", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}`, { account });
        const remove = api.mock("delete", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}`, {
            success: true,
        });
        const pv = api.client();

        await pv.accounts.update(ORG_ID, ACCOUNT_ID, { name: "Nordwind Centro" });
        await expect(pv.accounts.remove(ORG_ID, ACCOUNT_ID)).resolves.toBeUndefined();

        expect(update[0]?.body).toEqual({ name: "Nordwind Centro" });
        expect(remove[0]?.method).toBe("DELETE");
    });

    /** `stats` es un ARRAY. El spec lo declaraba objeto y no lo es desde que existe la ruta. */
    it("devuelve las métricas como lista de filas agrupadas", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/metrics`, {
            group: "day",
            stats: [
                {
                    date: "2026-08-20T00:00:00.000Z",
                    name: "page_impressions",
                    group_value: 232,
                    group: "day",
                    value: 1204,
                },
            ],
        });
        const pv = api.client();

        const metrics = await pv.accounts.metrics(ORG_ID, ACCOUNT_ID, {
            from_date: new Date("2026-08-01T00:00:00.000Z"),
            names: ["page_impressions"],
        });

        expect(Array.isArray(metrics.stats)).toBe(true);
        expect(metrics.stats[0]?.value).toBe(1204);
        expect(calls[0]?.query).toEqual({
            from_date: ["2026-08-01T00:00:00.000Z"],
            names: ["page_impressions"],
        });
    });

    it("pide los nombres crudos de las métricas de esa red", async () => {
        api.mock("get", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/metric_list`, [
            "impressions",
            "reach",
        ]);
        const pv = api.client();

        await expect(pv.accounts.metricList(ORG_ID, ACCOUNT_ID)).resolves.toEqual(["impressions", "reach"]);
    });

    it("lee y reemplaza el menú persistente por su sobre", async () => {
        const menu = [{ locale: "default", composer_input_disabled: false, call_to_actions: [] }];
        api.mock("get", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/persistent_menu`, {
            persistent_menu: menu,
        });
        const set = api.mock("post", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/persistent_menu`, {
            persistent_menu: menu,
        });
        const pv = api.client();

        await expect(pv.accounts.getPersistentMenu(ORG_ID, ACCOUNT_ID)).resolves.toEqual(menu);
        await pv.accounts.setPersistentMenu(ORG_ID, ACCOUNT_ID, menu);

        //El cuerpo va envuelto: la ruta lee `req.body.persistent_menu`, no el array a pelo.
        expect(set[0]?.body).toEqual({ persistent_menu: menu });
    });

    /**
     * Los tableros de Pinterest. Dos cosas que un test tiene que fijar: que el id viaja y vuelve
     * como CADENA —un entero largo de Pinterest pasado por `number` pierde digitos y el pin sale en
     * otro tablero, o en ninguno—, y que `refresh` solo se manda cuando se pide, porque la cache es
     * lo que protege el techo de la aplicacion, que es de TODOS los clientes a la vez.
     */
    it("lee los tableros y el detalle de uno, con el id como cadena", async () => {
        const board = { id: "1123581321345589144", name: "Recetas", privacy: "PUBLIC" };
        const list = api.mock("get", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/destinations`, {
            destinations: [board],
        });
        const one = api.mock(
            "get",
            `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/destinations/${board.id}`,
            {
                destination: { ...board, sections: [{ id: "4815162342", name: "Postres" }] },
            },
        );
        const pv = api.client();

        const boards = await pv.accounts.destinations(ORG_ID, ACCOUNT_ID);
        const detail = await pv.accounts.destination(ORG_ID, ACCOUNT_ID, board.id, { refresh: true });

        expect(boards[0]?.id).toBe("1123581321345589144");
        expect(detail.sections?.[0]?.id).toBe("4815162342");
        expect(list[0]?.query).toEqual({});
        expect(one[0]?.query).toEqual({ refresh: ["true"] });
    });

    /** Un token por instancia, no uno por llamada: el freno del servidor son 30 por minuto. */
    it("no pide un token por cada petición", async () => {
        api.mock("get", `/organizations/${ORG_ID}/accounts`, { accounts: [], total: 0 });
        const pv = api.client();

        await pv.accounts.list(ORG_ID);
        await pv.accounts.list(ORG_ID);
        await pv.accounts.list(ORG_ID);

        expect(api.tokenRequests).toBe(1);
    });
});
