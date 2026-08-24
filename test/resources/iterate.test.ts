/**
 * Los `iterate()` de todos los recursos (capa 2).
 *
 * Cada uno son tres líneas encima de su `list()`, y por eso es tentador no probarlos. El fallo que
 * esconden no es la paginación —de eso se encarga `pagination.test.ts` sobre `iteratePages`— sino el
 * **cableado**: un iterador que se olvida de pasar los filtros, que llama al `list()` del vecino o
 * que no propaga el `limit` compila igual y devuelve datos igual, sólo que no los que se le pidieron.
 *
 * Va en una tabla y no en catorce tests copiados porque es la misma promesa para todos, y porque así
 * un recurso nuevo se añade con una línea. Es el mismo trato que se dan las suites del servidor
 * recorriendo `ALLOWED_RRSS`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { PlanVortex } from "../../src/index.js";
import { ContractHarness } from "../helpers/contract.js";
import { ACCOUNT_ID, CLIENT_ID, CONTACT_ID, ORG_ID } from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

const CATALOG_ID = "66d04a6a427f4c43b9d97f90";

interface IteratorCase {
    name: string;
    /** La ruta que tiene que pedir. Si el iterador llama a otro sitio, no hay mock y el test cae. */
    path: string;
    /** El nombre del sobre. Con el equivocado, `unwrapList` avisa en vez de devolver `undefined`. */
    envelope: string;
    open: (pv: PlanVortex) => AsyncGenerator<unknown>;
}

const CASES: IteratorCase[] = [
    {
        name: "clients",
        path: "/clients",
        envelope: "clients",
        open: (pv) => pv.clients.iterate({ limit: 2 }),
    },
    {
        name: "clients.organizations",
        path: `/clients/${CLIENT_ID}/organizations`,
        envelope: "organizations",
        open: (pv) => pv.clients.iterateOrganizations(CLIENT_ID, { limit: 2 }),
    },
    {
        name: "organizations.children",
        path: `/organizations/${ORG_ID}/organizations`,
        envelope: "organizations",
        open: (pv) => pv.organizations.iterateChildren(ORG_ID, { limit: 2 }),
    },
    {
        name: "accounts",
        path: `/organizations/${ORG_ID}/accounts`,
        envelope: "accounts",
        open: (pv) => pv.accounts.iterate(ORG_ID, { limit: 2 }),
    },
    {
        name: "uploads",
        path: `/organizations/${ORG_ID}/uploads`,
        envelope: "uploads",
        open: (pv) => pv.uploads.iterate(ORG_ID, { limit: 2 }),
    },
    {
        name: "publications",
        path: `/organizations/${ORG_ID}/publish`,
        envelope: "publications",
        open: (pv) => pv.publications.iterate(ORG_ID, { limit: 2 }),
    },
    {
        name: "comments",
        path: `/organizations/${ORG_ID}/comments`,
        envelope: "comments",
        open: (pv) => pv.comments.iterate(ORG_ID, { limit: 2 }),
    },
    {
        name: "contacts",
        path: `/organizations/${ORG_ID}/contacts`,
        envelope: "contacts",
        open: (pv) => pv.contacts.iterate(ORG_ID, { limit: 2 }),
    },
    {
        name: "integrations",
        path: `/organizations/${ORG_ID}/integrations`,
        envelope: "integrations",
        open: (pv) => pv.integrations.iterate(ORG_ID, { limit: 2 }),
    },
    {
        name: "aiPlans",
        path: `/clients/${CLIENT_ID}/organizations/${ORG_ID}/ai_plans`,
        envelope: "ai_plans",
        open: (pv) => pv.aiPlans.iterate(CLIENT_ID, ORG_ID, { limit: 2 }),
    },
    {
        name: "messages.conversations",
        path: `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/conversations`,
        envelope: "conversations",
        open: (pv) => pv.messages.iterateConversations(ORG_ID, ACCOUNT_ID, { limit: 2 }),
    },
    {
        name: "messages",
        path: `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/messages/${CONTACT_ID}`,
        envelope: "messages",
        open: (pv) => pv.messages.iterate(ORG_ID, ACCOUNT_ID, CONTACT_ID, { limit: 2 }),
    },
    {
        name: "products",
        path: `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/products`,
        //`items`, no `products`: el catálogo de Meta envuelve con otro nombre que el resto del API.
        envelope: "items",
        open: (pv) => pv.products.iterate(ORG_ID, ACCOUNT_ID, CATALOG_ID, { limit: 2 }),
    },
];

describe.each(CASES)("iterate: $name", ({ path, envelope, open }) => {
    it("pide su ruta, encadena con offset y corta en la página corta", async () => {
        const calls = api.mockSequence("get", path, [
            { [envelope]: [{ _id: "a" }, { _id: "b" }], total: 3 },
            { [envelope]: [{ _id: "c" }], total: 3 },
        ]);
        const pv = api.client();

        const ids: string[] = [];
        for await (const item of open(pv)) {
            ids.push((item as { _id: string })._id);
        }

        expect(ids).toEqual(["a", "b", "c"]);
        //Dos páginas y ni una más: la segunda vino más corta que el `limit`, así que es la última.
        expect(calls).toHaveLength(2);
        expect(calls[0]?.query.offset).toEqual(["0"]);
        expect(calls[0]?.query.limit).toEqual(["2"]);
        expect(calls[1]?.query.offset).toEqual(["2"]);
    });

    it("no pide nada más cuando la primera página viene vacía", async () => {
        const calls = api.mockSequence("get", path, [{ [envelope]: [], total: 0 }]);
        const pv = api.client();

        const ids: string[] = [];
        for await (const item of open(pv)) {
            ids.push((item as { _id: string })._id);
        }

        expect(ids).toEqual([]);
        expect(calls).toHaveLength(1);
    });
});
