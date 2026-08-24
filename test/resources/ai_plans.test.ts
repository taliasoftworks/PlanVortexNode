/**
 * Planes de IA (capa 2).
 *
 * Lo que se pin aquí son las trampas que la fase 7 encontró auditando el spec contra
 * `src/domain/**` del servidor:
 *
 *  - **Las rutas cuelgan del CLIENTE y de la organización**, las dos, al revés que todo lo demás.
 *  - **`create()` no devuelve publicaciones**: devuelve el plan en `pending` y el presupuesto. El
 *    sobre es `{ai_plan, estimated_cost, estimate}` y no `{ai_plan}` a secas.
 *  - **`publications` cambia de forma**: identificadores en el listado, publicaciones enteras al
 *    leer un plan.
 *  - **`options` guardadas != `options` mandadas**: lo devuelto viene normalizado y con todos los
 *    defaults resueltos, incluidos `shared` y `use_organization_context`, que el spec ni tenía.
 *  - **Borrar es cancelar**: el plan sigue existiendo, sólo deja de listarse.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ContractHarness } from "../helpers/contract.js";
import { ACCOUNT_ID, CLIENT_ID, ORG_ID, PUBLICATION_ID, publication } from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

const AI_PLAN_ID = "66d04a6a427f4c43b9d97fb0";
const LIST = `/clients/${CLIENT_ID}/organizations/${ORG_ID}/ai_plans`;
const ONE = `${LIST}/${AI_PLAN_ID}`;

const options = {
    timezone: "Europe/Madrid",
    week_start: "2026-08-24T00:00:00.000Z",
    publish_days: [1, 3, 5],
    language: "es",
    allow_images: true,
    shared: false,
    use_organization_context: true,
    gallery_uploads: [],
};

const aiPlan = {
    _id: AI_PLAN_ID,
    id_client: CLIENT_ID,
    id_organization: ORG_ID,
    accounts: [ACCOUNT_ID],
    prompt: "Pan de masa madre, horno de leña, barrio",
    options,
    state: "pending",
    publications: [],
    credits_spent: 0,
    attempts: 0,
    creation_date: "2026-08-23T09:00:00.000Z",
};

describe("aiPlans.create", () => {
    it("encola el plan y devuelve el presupuesto, no las publicaciones", async () => {
        const calls = api.mock("post", LIST, {
            ai_plan: aiPlan,
            estimated_cost: 1120,
            estimate: {
                base_cost: 420,
                estimated_cost: 1120,
                texts_target: 3,
                images_target: 3,
                available_credits: 5000,
            },
        });
        const pv = api.client();

        const result = await pv.aiPlans.create(CLIENT_ID, ORG_ID, {
            prompt: "Pan de masa madre, horno de leña, barrio",
            accounts: [ACCOUNT_ID],
            options: { publish_days: [1, 3, 5] },
        });

        expect(calls[0]?.path).toBe(LIST);
        expect(calls[0]?.body).toEqual({
            prompt: "Pan de masa madre, horno de leña, barrio",
            accounts: [ACCOUNT_ID],
            options: { publish_days: [1, 3, 5] },
        });
        //Nace en `pending` y sin publicaciones: las genera un job aparte.
        expect(result.ai_plan.state).toBe("pending");
        expect(result.ai_plan.publications).toEqual([]);
        //Y el presupuesto viene entero, no sólo el atajo.
        expect(result.estimate.base_cost).toBe(420);
        expect(result.estimated_cost).toBe(result.estimate.estimated_cost);
    });
});

describe("aiPlans.get", () => {
    it("devuelve las publicaciones resueltas, con sus ficheros", async () => {
        api.mock("get", ONE, {
            ai_plan: { ...aiPlan, state: "generated", publications: [publication] },
        });
        const pv = api.client();

        const plan = await pv.aiPlans.get(CLIENT_ID, ORG_ID, AI_PLAN_ID);

        const first = plan.publications[0];
        expect(typeof first).not.toBe("string");
        expect(typeof first === "object" && first._id).toBe(PUBLICATION_ID);
    });
});

describe("aiPlans.list", () => {
    it("desenvuelve `{ai_plans, total}` y aquí las publicaciones son identificadores", async () => {
        api.mock("get", LIST, {
            ai_plans: [{ ...aiPlan, publications: [PUBLICATION_ID] }],
            total: 1,
        });
        const pv = api.client();

        const page = await pv.aiPlans.list(CLIENT_ID, ORG_ID);

        expect(page.total).toBe(1);
        expect(page.data[0]?.publications[0]).toBe(PUBLICATION_ID);
    });
});

describe("aiPlans.validate y retry", () => {
    it("validate va por POST a su ruta y desenvuelve `{ai_plan}`", async () => {
        const calls = api.mock("post", `${ONE}/validate`, {
            ai_plan: { ...aiPlan, state: "validated" },
        });
        const pv = api.client();

        const plan = await pv.aiPlans.validate(CLIENT_ID, ORG_ID, AI_PLAN_ID);

        expect(calls[0]?.method).toBe("POST");
        expect(plan.state).toBe("validated");
    });

    it("retry devuelve el plan a pending, que es la señal de volver a sondear", async () => {
        api.mock("post", `${ONE}/retry`, { ai_plan: { ...aiPlan, state: "pending", attempts: 1 } });
        const pv = api.client();

        const plan = await pv.aiPlans.retry(CLIENT_ID, ORG_ID, AI_PLAN_ID);

        expect(plan.state).toBe("pending");
        expect(plan.attempts).toBe(1);
    });
});

describe("aiPlans.regenerate", () => {
    /** `credits_spent` es el total del PLAN, no lo que costó esta llamada. */
    it("manda el target y devuelve la publicación y el gasto acumulado", async () => {
        const calls = api.mock("post", `${ONE}/publications/${PUBLICATION_ID}/regenerate`, {
            publication,
            credits_spent: 210,
        });
        const pv = api.client();

        const result = await pv.aiPlans.regenerate(CLIENT_ID, ORG_ID, AI_PLAN_ID, PUBLICATION_ID, "image");

        expect(calls[0]?.body).toEqual({ target: "image" });
        expect(result.credits_spent).toBe(210);
        expect(result.publication._id).toBe(PUBLICATION_ID);
    });
});

describe("aiPlans.remove", () => {
    it("cancela por DELETE y no devuelve nada", async () => {
        const calls = api.mock("delete", ONE, { success: true });
        const pv = api.client();

        await expect(pv.aiPlans.remove(CLIENT_ID, ORG_ID, AI_PLAN_ID)).resolves.toBeUndefined();
        expect(calls[0]?.method).toBe("DELETE");
    });
});
