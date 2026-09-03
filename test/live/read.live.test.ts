/**
 * CAPA 3 — leer todos los dominios contra el servidor de verdad.
 *
 * ESTE ES EL FICHERO QUE JUSTIFICA LA CAPA 3. Cada lista del API llega envuelta con el nombre de su
 * recurso —`{publications, total}`, `{accounts, total}`, `{uploads, total}`— y la librería la
 * desenvuelve por ese nombre exacto (§ trampa 6). Si el servidor renombra un sobre, `unwrapList`
 * devuelve `undefined` y la capa 2 no se entera: sus mocks tienen el nombre viejo porque los
 * escribimos nosotros. Aquí no.
 *
 * Por eso hay un test por dominio y todos comprueban lo mismo, que es lo aburrido y lo que importa:
 * `{data: [...], total: n}`, con `data` siendo un array de verdad.
 *
 * Lo que no está aquí y es a propósito: `pv.apps`. Casi todo el dominio de apps exige token de
 * USUARIO —una app no se administra a sí misma—, así que contra credenciales de app sólo se podría
 * comprobar que falla, y eso ya lo pincha `errors.live.test.ts`.
 */
import { beforeAll, expect, it } from "vitest";

import type { Paginated } from "../../src/index.js";
import {
    describeLive,
    liveContext,
    liveMessagesAccount,
    livePublishAccount,
    withPaidPlan,
    type LiveContext,
} from "./helpers/liveEnv.js";

/** Lo que se le pide a cualquier listado: el sobre bien abierto. */
function expectPage<T>(page: Paginated<T>, name: string): void {
    expect(Array.isArray(page.data), `${name}.data no es un array: ¿cambió el nombre del sobre?`).toBe(true);
    expect(typeof page.total, `${name}.total`).toBe("number");
    expect(page.total).toBeGreaterThanOrEqual(0);
}

describeLive("lecturas", () => {
    let live: LiveContext;

    beforeAll(async () => {
        live = await liveContext();
    });

    it("clientes", async () => {
        const page = await live.pv.clients.list({ limit: 5 });
        expectPage(page, "clients");
        expect(page.data[0]?._id).toBeTruthy();
    });

    it("cliente con plan y organizaciones", async () => {
        const client = await live.pv.clients.get(live.client._id, { getUse: true });
        expect(client._id).toBe(live.client._id);
        expect(client.actual_plan).toBeDefined();

        expectPage(await live.pv.clients.organizations(live.client._id, { limit: 5 }), "organizations");
    });

    it("organización, sus límites y su consumo", async () => {
        const organization = await live.pv.organizations.get(live.organization._id);
        expect(organization._id).toBe(live.organization._id);

        //`limits` es el plan que APLICA, ya resuelto por herencia; `use` es lo gastado. El panel
        //enseña los dos juntos y un integrador que mire `organization.actual_plan` se encuentra
        //`undefined` en cuanto la organización hereda del padre.
        const limits = await live.pv.organizations.limits(live.organization._id);
        expect(typeof limits.accounts).toBe("number");

        //`publications` NO está en `limits`: son ilimitadas y lo que existe es una métrica del
        //consumo. Si algún día vuelve a aparecer ahí, es que el servidor está sirviendo un plan
        //heredado sin limpiar.
        const { actual_use } = await live.pv.organizations.use(live.organization._id);
        expect(actual_use).toBeDefined();
        expect(typeof actual_use?.publications).toBe("number");

        expectPage(await live.pv.organizations.children(live.organization._id, { limit: 5 }), "children");
    });

    it("cuentas", async () => {
        const page = await live.pv.accounts.list(live.organization._id, { limit: 10 });
        expectPage(page, "accounts");

        for (const account of page.data) {
            expect(typeof account.social_network).toBe("string");
            expect(typeof account.error_code).toBe("number");
        }
    });

    it("ficheros", async () => {
        expectPage(await live.pv.uploads.list(live.organization._id, { limit: 5 }), "uploads");
    });

    it("publicaciones", async () => {
        expectPage(await live.pv.publications.list(live.organization._id, { limit: 5 }), "publications");

        const account = await livePublishAccount();
        if (account) {
            expectPage(
                await live.pv.publications.listByAccount(live.organization._id, account._id, { limit: 5 }),
                "publications (por cuenta)",
            );
        }
    });

    it("comentarios", async (ctx) => {
        await withPaidPlan(ctx, async () => {
            expectPage(await live.pv.comments.list(live.organization._id, { limit: 5 }), "comments");
            expect(typeof (await live.pv.comments.unreadCount(live.organization._id))).toBe("number");
        });
    });

    it("buzón privado", async (ctx) => {
        await withPaidPlan(ctx, async () => {
            expect(typeof (await live.pv.messages.unreadCount(live.organization._id))).toBe("number");

            const account = await liveMessagesAccount();
            if (!account) {
                ctx.skip("no hay ninguna cuenta conectada de una red con mensajería");
                return;
            }

            expectPage(
                await live.pv.messages.conversations(live.organization._id, account._id, { limit: 5 }),
                "conversations",
            );
        });
    });

    it("contactos", async (ctx) => {
        await withPaidPlan(ctx, async () => {
            expectPage(await live.pv.contacts.list(live.organization._id, { limit: 5 }), "contacts");
        });
    });

    it("integraciones", async () => {
        const providers = await live.pv.integrations.providers();
        expect(Array.isArray(providers)).toBe(true);
        //`describe()` de cada proveedor es lo que le ahorra al panel una copia del formulario de
        //configuración. Si llega vacío, el panel se queda sin formulario y no lo dice.
        expect(providers.length).toBeGreaterThan(0);

        expectPage(await live.pv.integrations.list(live.organization._id, { limit: 5 }), "integrations");
    });

    it("planes de IA", async () => {
        expectPage(
            await live.pv.aiPlans.list(live.client._id, live.organization._id, { limit: 5 }),
            "ai plans",
        );
    });

    it("dashboard", async () => {
        const summary = await live.pv.dashboard.summary(live.organization._id);
        expect(summary).toBeDefined();

        const use = await live.pv.dashboard.use(live.organization._id);
        expect(use).toBeDefined();
    });

    it("catálogos de producto", async (ctx) => {
        const { data } = await live.pv.accounts.list(live.organization._id, {
            capability: "products",
            limit: 5,
        });
        const account = data.find((candidate) => candidate.error_code === 0);
        if (!account) {
            ctx.skip("no hay ninguna cuenta de Facebook o Instagram conectada");
            return;
        }

        expectPage(
            await live.pv.products.catalogs(live.organization._id, account._id, { limit: 5 }),
            "product catalogs",
        );
    });

    it("el servidor respeta el offset: dos páginas de una, dos elementos distintos", async (ctx) => {
        const first = await live.pv.uploads.list(live.organization._id, { limit: 1, offset: 0 });
        if (first.total < 2) {
            ctx.skip("hacen falta al menos dos ficheros en la organización");
            return;
        }

        const second = await live.pv.uploads.list(live.organization._id, { limit: 1, offset: 1 });

        //`iterate()` encadena páginas con `offset` y corta cuando una viene vacía. Un servidor que
        //ignorase el `offset` devolvería la misma página para siempre: el `MAX_PAGES` de la
        //librería lo convierte en un error en vez de en un proceso colgado, pero el fallo de
        //verdad es éste, y sólo se ve preguntando.
        expect(second.data[0]?._id).not.toBe(first.data[0]?._id);
    });
});
