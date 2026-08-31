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
 *
 * Y de la fase de plantillas:
 *
 *  - **`template` y `source` son OPCIONALES**: un cuerpo sin ellos tiene que seguir saliendo tal
 *    cual, porque es lo que manda quien integró con este paquete antes de que existieran.
 *  - **La fuente se valida al CREAR**, así que sus errores (2112-2116) llegan en esta llamada.
 *  - **`warnings` viaja DENTRO del plan generado**: el 2117 no es un error de la respuesta.
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

const estimate = {
    base_cost: 420,
    estimated_cost: 1120,
    texts_target: 3,
    images_target: 3,
    available_credits: 5000,
};

const images = [
    { id_upload: "66d04a6a427f4c43b9d97f70", description: "Masa reposando en el banco" },
    { id_upload: "66d04a6a427f4c43b9d97f71", description: "La hogaza saliendo del horno" },
];

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

    /**
     * Sin `template` el cuerpo sale exactamente igual que antes de que existieran las plantillas, y
     * eso es contrato: el servidor tarifa como `standard`. Un paquete que rellenase el hueco con un
     * `template: "standard"` "por claridad" estaría cambiando lo que sale por el cable de todos los
     * integradores que ya estaban.
     */
    it("no inventa una plantilla cuando no se le da ninguna", async () => {
        const calls = api.mock("post", LIST, { ai_plan: aiPlan, estimated_cost: 519, estimate });
        const pv = api.client();

        await pv.aiPlans.create(CLIENT_ID, ORG_ID, {
            prompt: "Pan de masa madre, horno de leña, barrio",
            accounts: [ACCOUNT_ID],
        });

        expect(calls[0]?.body).toEqual({
            prompt: "Pan de masa madre, horno de leña, barrio",
            accounts: [ACCOUNT_ID],
        });
    });

    /**
     * Con `from_images` la fuente viaja tal cual, **con las fotos en su orden**: la posición es lo
     * que el orquestador guarda como `source_index`, y es lo que deja que la foto 3 sea el "antes"
     * y la 7 el "después". Reordenarlas por el camino sería el copy del entrante con la foto del
     * postre.
     */
    it("manda la plantilla y su fuente, con las fotos en el orden que cuenta la historia", async () => {
        const calls = api.mock("post", LIST, {
            ai_plan: { ...aiPlan, template: "from_images", source: { images } },
            estimated_cost: 48,
            estimate: { ...estimate, base_cost: 48, estimated_cost: 48, images_target: 0 },
        });
        const pv = api.client();

        const result = await pv.aiPlans.create(CLIENT_ID, ORG_ID, {
            prompt: "Nuestra carta de otoño",
            accounts: [ACCOUNT_ID],
            template: "from_images",
            source: { images },
        });

        expect(calls[0]?.body).toEqual({
            prompt: "Nuestra carta de otoño",
            accounts: [ACCOUNT_ID],
            template: "from_images",
            source: { images },
        });
        //Las fotos las pone la fuente, así que el plan no financia ni una imagen: es de donde sale
        //el 519 -> 48 de la misma semana.
        expect(result.estimate.images_target).toBe(0);
        expect(result.ai_plan.source?.images?.[0]?.description).toBe("Masa reposando en el banco");
    });

    /**
     * `event_date` es un DÍA DE CALENDARIO. `toISOString()` desde un navegador convertiría el 15 de
     * septiembre en el 14 por la tarde para media América — un día entero de desfase en una cuenta
     * atrás, y sin error en ninguna parte —, así que lo que sale por el cable tiene que ser
     * `YYYY-MM-DD` y nada más.
     */
    it("manda la fecha de campaign como día de calendario, no como instante", async () => {
        const calls = api.mock("post", LIST, {
            ai_plan: {
                ...aiPlan,
                template: "campaign",
                source: { event: { name: "Apertura del local", date: "2026-09-15T00:00:00.000+02:00" } },
            },
            estimated_cost: 519,
            estimate,
        });
        const pv = api.client();

        await pv.aiPlans.create(CLIENT_ID, ORG_ID, {
            prompt: "Abrimos tienda en el barrio",
            accounts: [ACCOUNT_ID],
            template: "campaign",
            source: { event_name: "Apertura del local", event_date: "2026-09-15" },
        });

        const body = calls[0]?.body as { source: { event_date: string } };
        expect(body.source.event_date).toBe("2026-09-15");
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

/**
 * ARCHIVAR. Se parece a borrar en la pantalla y no se parece en nada por dentro: archivar no toca
 * ninguna publicación y borrar se lleva lo que quedara programado. Son DOS rutas y no un cuerpo con
 * un booleano, así que lo que hay que fijar es que cada método vaya a la suya.
 */
describe("aiPlans.archive y unarchive", () => {
    it("cada una va a su ruta y desenvuelve `{ai_plan}`", async () => {
        const archived = api.mock("post", `${ONE}/archive`, {
            ai_plan: { ...aiPlan, archived_date: "2026-08-31T09:00:00.000Z" },
        });
        const restored = api.mock("post", `${ONE}/unarchive`, { ai_plan: aiPlan });
        const pv = api.client();

        const guardado = await pv.aiPlans.archive(CLIENT_ID, ORG_ID, AI_PLAN_ID);
        const devuelto = await pv.aiPlans.unarchive(CLIENT_ID, ORG_ID, AI_PLAN_ID);

        expect(archived[0]?.method).toBe("POST");
        expect(restored[0]?.method).toBe("POST");
        expect(guardado.archived_date).toBe("2026-08-31T09:00:00.000Z");
        //Ausente, no `null`: es como llega cualquier plan activo, incluidos los de antes del campo
        expect(devuelto.archived_date).toBeUndefined();
    });

    /** El estado NO cambia al archivar: un plan validado archivado sigue siendo `validated`. */
    it("archivar no toca el estado del plan", async () => {
        api.mock("post", `${ONE}/archive`, {
            ai_plan: { ...aiPlan, state: "validated", archived_date: "2026-08-31T09:00:00.000Z" },
        });
        const pv = api.client();

        const plan = await pv.aiPlans.archive(CLIENT_ID, ORG_ID, AI_PLAN_ID);

        expect(plan.state).toBe("validated");
    });

    it("el listado pide el otro armario con `archived`, y sólo cuando se le pide", async () => {
        const calls = api.mock("get", LIST, { ai_plans: [], total: 0 });
        const pv = api.client();

        await pv.aiPlans.list(CLIENT_ID, ORG_ID, { archived: true });
        await pv.aiPlans.list(CLIENT_ID, ORG_ID, { archived: false });
        await pv.aiPlans.list(CLIENT_ID, ORG_ID);

        expect(calls[0]?.query.archived).toEqual(["true"]);
        //`false` no viaja: el servidor activa el filtro con el literal "true", así que mandarlo
        //sería ruido que además invita a creer que hay un tercer modo con los dos armarios juntos
        expect(calls[1]?.query.archived).toBeUndefined();
        expect(calls[2]?.query.archived).toBeUndefined();
    });
});

/**
 * El 2117 no es un error: el plan se generó perfectamente y lo que pasó es que la fuente traía más
 * unidades que huecos tiene la semana. Va en `warnings` DENTRO del plan, junto a un `state` que
 * dice `generated`, y no en el error de la respuesta — que es donde lo buscaría quien no lo sepa.
 */
describe("los avisos del plan", () => {
    it("trae el 2117 en `warnings` sobre un plan generado, no como error", async () => {
        api.mock("get", ONE, {
            ai_plan: {
                ...aiPlan,
                state: "generated",
                template: "from_images",
                publications: [publication],
                warnings: [
                    {
                        code: 2117,
                        message: "Some source items did not fit in the plan week",
                        data: { source_items: 12, capacity: 6 },
                    },
                ],
            },
        });
        const pv = api.client();

        const plan = await pv.aiPlans.get(CLIENT_ID, ORG_ID, AI_PLAN_ID);

        expect(plan.state).toBe("generated");
        expect(plan.error).toBeUndefined();
        expect(plan.warnings?.[0]?.code).toBe(2117);
        expect(plan.warnings?.[0]?.data).toEqual({ source_items: 12, capacity: 6 });
    });
});
