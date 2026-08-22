/**
 * El camino de publicar de punta a punta, que es lo que hace `examples/publish.ts`.
 *
 * POR QUÉ EXISTE, teniendo ya un test de contrato por método: un método correcto no garantiza un
 * camino correcto. Lo que se rompe de verdad es el ORDEN y lo que se pasa de un paso al siguiente —
 * el `_id` del upload que va a `files`, la red de la cuenta que tiene que coincidir con
 * `social_network`, el estado que hay que mirar al final. Es el mismo papel que `flows.test.ts` en
 * el servidor.
 *
 * El ejemplo de verdad necesita un stack levantado Y una cuenta social conectada, que es un OAuth
 * con una persona delante. Esto es lo que sí se puede tener en verde en cada commit.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { accountId } from "../../src/index.js";
import { ContractHarness } from "../helpers/contract.js";
import {
    ACCOUNT_ID,
    CLIENT_ID,
    ORG_ID,
    account,
    organization,
    planData,
    publication,
    upload,
} from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

const client = {
    _id: CLIENT_ID,
    name: "Nordwind S.L.",
    creation_date: "2026-07-01T09:00:00.000Z",
    actual_plan: {
        enabled: true,
        isEnabled: true,
        status: "active",
        plan_identifier: "basic",
        plan_data: planData,
    },
};

describe("de las credenciales a la publicación programada", () => {
    it("recorre el camino entero y encadena los identificadores", async () => {
        api.mock("get", "/clients", { clients: [client], total: 1 });
        api.mock("get", `/clients/${CLIENT_ID}/organizations`, { organizations: [organization], total: 1 });
        api.mock("get", `/organizations/${ORG_ID}/limits`, planData);
        api.mock("get", `/organizations/${ORG_ID}`, {
            organization: {
                ...organization,
                actual_use: { ...planData, publications: 12 },
                actual_asigned: planData,
            },
        });
        const accountCall = api.mock("get", `/organizations/${ORG_ID}/accounts`, {
            accounts: [account],
            total: 1,
        });
        api.mock("get", "/social_limits", {
            characters: { instagram: 2200 },
            max_post_bytes: { instagram: 0 },
        });
        const uploadCall = api.mock("post", `/organizations/${ORG_ID}/uploads`, { upload });
        const publishCall = api.mock("post", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/publish`, {
            publication,
        });

        const pv = api.client();

        const { data: clients } = await pv.clients.list({ limit: 1 });
        const { data: organizations } = await pv.clients.organizations(clients[0]!._id, { limit: 1 });
        const org = organizations[0]!;

        const limits = await pv.organizations.limits(org._id);
        const { actual_use } = await pv.organizations.use(org._id);
        expect({ used: actual_use?.publications, allowed: limits.publications }).toEqual({
            used: 12,
            allowed: 200,
        });

        const { data: accounts } = await pv.accounts.list(org._id, { capability: "publications" });
        const target = accounts.find((candidate) => candidate.error_code === 0)!;

        const socialLimits = await pv.catalog.socialLimits();
        expect(socialLimits.characters?.[target.social_network]).toBe(2200);

        const file = await pv.uploads.create(org._id, {
            file: Buffer.from([0xff, 0xd8]),
            filename: "hogaza.jpg",
        });

        const created = await pv.publications.create(org._id, target._id, {
            social_network: target.social_network,
            text: "Nuevo horno, nuevas hogazas",
            files: [file._id],
            publish_date: new Date("2026-09-01T10:00:00.000Z"),
        });

        //El filtro por capacidad es lo que evita ofrecer una cuenta de WhatsApp en el compositor.
        expect(accountCall[0]?.query.capability).toEqual(["publications"]);
        //El `_id` del upload viaja a `files`, y la red de la cuenta a `social_network`.
        expect(uploadCall[0]?.form?.[0]?.filename).toBe("hogaza.jpg");
        expect(publishCall[0]?.body).toEqual({
            social_network: "instagram",
            text: "Nuevo horno, nuevas hogazas",
            files: [file._id],
            publish_date: "2026-09-01T10:00:00.000Z",
        });
        expect(created.state).toBe("ready");
        expect(accountId(created)).toBe(ACCOUNT_ID);
        //Un token para las ocho llamadas, no ocho.
        expect(api.tokenRequests).toBe(1);
    });

    /**
     * El final que hay que saber leer: la petición sale bien, la publicación se guarda, y no va a
     * salir. Un integrador que sólo mire el `try/catch` la da por publicada.
     */
    it("una publicación que no cumple llega como 200 en `withErrors`, no como excepción", async () => {
        api.mock("post", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/publish`, {
            publication: {
                ...publication,
                state: "withErrors",
                publication_errors: [
                    { code: 944, message: "YouTube exige un título de 100 caracteres o menos" },
                ],
            },
        });
        const pv = api.client();

        const created = await pv.publications.create(ORG_ID, ACCOUNT_ID, {
            social_network: "youtube",
            text: "Una descripción",
        });

        expect(created.state).toBe("withErrors");
        expect(created.publication_errors.map((failure) => failure.code)).toEqual([944]);
    });
});
