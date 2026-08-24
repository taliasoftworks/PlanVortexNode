/**
 * Dashboard (capa 2).
 *
 * Lo que se pin aquí son las trampas que la fase 7 encontró auditando el spec contra
 * `src/domain/repositories/dashboard/` del servidor:
 *
 *  - **`TopPublication` no tiene la forma de una `Publication`.** El spec anunciaba `_id`, `name` y
 *    `text` en la raíz y la agregación devuelve `id_publication` y el contenido anidado en
 *    `publication`: los tres campos documentados eran `undefined`.
 *  - **El bloque de IA se llamaba mal.** El spec decía `publications` y el servidor manda
 *    `generated_publications`, y le faltaba `pending_validation` entero.
 *  - **`MetricRow.group` es `null`** cuando se agrupa por `total`. Con `type: string` a secas, el
 *    caso más simple del endpoint no encajaba en su propio tipo.
 *  - **Un bloque ausente no es un error**: es un permiso que falta, y `available_blocks` lo dice.
 *  - **`summary=false` sólo cuenta si viaja como el literal `false`.**
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ContractHarness } from "../helpers/contract.js";
import { ACCOUNT_ID, ORG_ID, PUBLICATION_ID, listedPublication, planData } from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

const range = {
    from_date: "2026-07-25T00:00:00.000Z",
    to_date: "2026-08-24T00:00:00.000Z",
    previous_from_date: "2026-06-25T00:00:00.000Z",
    previous_to_date: "2026-07-25T00:00:00.000Z",
};

describe("dashboard.summary", () => {
    it("un bloque que falta es un permiso, y available_blocks lo dice", async () => {
        api.mock("get", `/organizations/${ORG_ID}/dashboard`, {
            range,
            available_blocks: {
                health: true,
                publications: true,
                publication_metrics: false,
                account_metrics: false,
                plan_use: true,
                ai_plans: false,
                messages: false,
            },
            health: { accounts_with_errors: [], publications_with_errors: [], total_drafts: 3 },
            publications: {
                total: 12,
                previous_total: 9,
                by_state: [{ state: "sended", total: 10 }],
                by_network: [{ social_network: "instagram", total: 12 }],
                by_day: [],
                published_by_day: [],
            },
            plan_use: { actual_use: planData, actual_asigned: planData, limits: planData },
        });
        const pv = api.client();

        const dashboard = await pv.dashboard.summary(ORG_ID);

        expect(dashboard.available_blocks.publication_metrics).toBe(false);
        //El bloque no viene, y eso NO es un fallo: es que quien llama no puede leerlo.
        expect(dashboard.publication_metrics).toBeUndefined();
        expect(dashboard.publications?.previous_total).toBe(9);
    });

    /** El bloque de IA: el nombre que manda el servidor y el aviso que el spec no tenía. */
    it("el bloque de IA trae generated_publications y pending_validation", async () => {
        api.mock("get", `/organizations/${ORG_ID}/dashboard`, {
            range,
            available_blocks: {
                health: false,
                publications: false,
                publication_metrics: false,
                account_metrics: false,
                plan_use: false,
                ai_plans: true,
                messages: false,
            },
            ai_plans: {
                by_state: [{ state: "generated", total: 2 }],
                total: 5,
                credits_spent: 3400,
                generated_publications: 21,
                pending_validation: 2,
                last_plan: {
                    _id: "66d04a6a427f4c43b9d97fb0",
                    state: "generated",
                    creation_date: range.to_date,
                },
            },
        });
        const pv = api.client();

        const dashboard = await pv.dashboard.summary(ORG_ID);

        expect(dashboard.ai_plans?.generated_publications).toBe(21);
        expect(dashboard.ai_plans?.pending_validation).toBe(2);
    });

    it("manda el rango en ISO aunque se le pase un Date", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/dashboard`, {
            range,
            available_blocks: {
                health: false,
                publications: false,
                publication_metrics: false,
                account_metrics: false,
                plan_use: false,
                ai_plans: false,
                messages: false,
            },
        });
        const pv = api.client();

        await pv.dashboard.summary(ORG_ID, { from_date: new Date("2026-07-25T00:00:00.000Z") });

        expect(calls[0]?.query.from_date).toEqual(["2026-07-25T00:00:00.000Z"]);
    });
});

describe("dashboard.metrics", () => {
    it("manda el eje y las métricas pedidas, y admite `group: null`", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/metrics`, {
            range,
            group_by: "total",
            stats: [{ group: null, name: "followers", value: 1240 }],
        });
        const pv = api.client();

        const result = await pv.dashboard.metrics(ORG_ID, {
            group_by: "total",
            names: ["followers", "impressions"],
        });

        expect(calls[0]?.query).toEqual({
            group_by: ["total"],
            names: ["followers", "impressions"],
        });
        //Agrupando por `total` no hay eje: el campo viaja y vale null.
        expect(result.stats[0]?.group).toBeNull();
    });
});

describe("dashboard.topPublications", () => {
    /**
     * La trampa gorda de la fase 7: esto NO es una `Publication`. No hay `_id` en la raíz y el
     * contenido va anidado, así que el spec anterior daba `undefined` en los tres campos que
     * anunciaba.
     */
    it("cada fila trae id_publication y el contenido anidado, no la publicación entera", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/publications/top`, {
            range,
            metric: "engagement",
            publications: [
                {
                    id_publication: PUBLICATION_ID,
                    social_network: "instagram",
                    publish_date: range.to_date,
                    collected_date: range.to_date,
                    metrics: { engagement: 340, likes: 300 },
                    engagement_base: "reach",
                    publication: { text: "Nuevo horno", url: "https://instagram.com/p/x" },
                },
            ],
        });
        const pv = api.client();

        const result = await pv.dashboard.topPublications(ORG_ID, { metric: "engagement", limit: 3 });

        expect(calls[0]?.query).toEqual({ metric: ["engagement"], limit: ["3"] });
        const row = result.publications[0]!;
        expect(row.id_publication).toBe(PUBLICATION_ID);
        expect(row).not.toHaveProperty("_id");
        expect(row.publication.text).toBe("Nuevo horno");
        //Dos filas con base distinta no son comparables, y por eso viaja.
        expect(row.engagement_base).toBe("reach");
    });
});

describe("dashboard.publicationStats", () => {
    it("filtra el listado y apaga los agregados al paginar", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/publications/stats`, {
            range,
            metric: "engagement",
            publications: [listedPublication],
            total: 40,
        });
        const pv = api.client();

        const result = await pv.dashboard.publicationStats(ORG_ID, {
            social_network: ["instagram"],
            accounts: [ACCOUNT_ID],
            summary: false,
            offset: 25,
        });

        expect(calls[0]?.query).toEqual({
            social_network: ["instagram"],
            accounts: [ACCOUNT_ID],
            summary: ["false"],
            offset: ["25"],
        });
        //Sin agregados: es justo lo que se pidió.
        expect(result.summary).toBeUndefined();
        expect(result.total).toBe(40);
    });

    /** `summary: true` es el comportamiento por defecto: mandarlo sería ruido en la query. */
    it("no manda `summary` cuando se dejan los agregados", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/publications/stats`, {
            range,
            metric: "engagement",
            publications: [],
            total: 0,
        });
        const pv = api.client();

        await pv.dashboard.publicationStats(ORG_ID, { summary: true });

        expect(calls[0]?.query.summary).toBeUndefined();
    });
});

describe("dashboard.use", () => {
    it("devuelve consumo, reparto y límites en una sola llamada", async () => {
        api.mock("get", `/organizations/${ORG_ID}/use`, {
            actual_use: planData,
            actual_asigned: planData,
            limits: planData,
        });
        const pv = api.client();

        const use = await pv.dashboard.use(ORG_ID);

        expect(use.limits.accounts).toBe(planData.accounts);
    });
});
