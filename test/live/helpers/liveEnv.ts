/**
 * CAPA 3 — contra un PlanVortex de VERDAD. Las guardas y el descubrimiento.
 *
 * Las capas 1 y 2 prueban lo que la librería HACE; ésta prueba que el servidor sigue contestando lo
 * que la librería cree. Son cosas distintas y sólo esta capa ve la segunda: un sobre renombrado, un
 * código de error que cambió de número o una décima red social pasan la capa 2 en verde.
 *
 * REGLAS DE SEGURIDAD, en orden:
 *
 *  1. **Sin `.env.live`, todo se SALTA.** Nunca falla por falta de credenciales: `npm test` no se
 *     entera de que esto existe y la CI de un PR tampoco.
 *  2. **Las credenciales llevan prefijo `PLANVORTEX_LIVE_`** y no `PLANVORTEX_CLIENT_ID` a secas,
 *     que es lo que leería el cliente por su cuenta. Es a propósito: un `.env` con las credenciales
 *     de producción —el que usan los `examples/`— no debe armar esta suite sin querer.
 *  3. **Nada escribe salvo con `LIVE_ALLOW_PUBLISH=1`**, y lo que escribe se programa a futuro y se
 *     borra al terminar: no sale a ninguna red social.
 *  4. **Publicar de verdad en la red lleva un interruptor propio**, `LIVE_ALLOW_SOCIAL_PUBLISH=1`.
 *     Es la misma decisión que ya se tomó en el servidor con los comentarios: crear una publicación
 *     programada es privado y reversible, y mandarla a Instagram es público, inmediato e
 *     irreversible. No es el mismo riesgo, así que no comparte interruptor.
 *  5. **Escribir contra producción exige decirlo dos veces** (`LIVE_ALLOW_PRODUCTION=1`) y, si no,
 *     esto revienta en voz alta en vez de saltarse: una configuración peligrosa no es lo mismo que
 *     una configuración ausente.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "vitest";
import type { TestContext } from "vitest";

import { PlanVortex, isPlanVortexError } from "../../../src/index.js";
import type { Account, Client, Organization, PlanVortexOptions } from "../../../src/index.js";

/**
 * Un `.env` mínimo, sin `dotenv`: el paquete no tiene dependencias en runtime y tampoco se le van a
 * añadir a los tests por leer catorce líneas. Lo que ya venga del shell MANDA sobre el fichero, para
 * poder lanzar una vez con otra configuración sin editar nada.
 */
function loadEnvFile(file: string): void {
    if (!existsSync(file)) return;

    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
        //Un `#` al principio no casa: el nombre tiene que empezar por letra o guión bajo.
        const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
        const key = match?.[1];
        if (!key || process.env[key] !== undefined) continue;

        const raw = (match?.[2] ?? "").trim();
        const first = raw[0];
        const quoted = raw.length > 1 && (first === '"' || first === "'") && raw.endsWith(first);
        process.env[key] = quoted ? raw.slice(1, -1) : raw;
    }
}

loadEnvFile(resolve(process.cwd(), process.env.LIVE_ENV_FILE ?? ".env.live"));

/** Contra qué servidor. Sin barra final y CON el `/v1.0.0`, igual que el `baseUrl` del cliente. */
export const BASE_URL = process.env.PLANVORTEX_LIVE_BASE_URL ?? "";
const CLIENT_ID = process.env.PLANVORTEX_LIVE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.PLANVORTEX_LIVE_CLIENT_SECRET ?? "";

/** Lo que falta para poder ejecutar, con nombre y apellidos en el nombre de la suite saltada. */
const MISSING = [
    BASE_URL ? "" : "PLANVORTEX_LIVE_BASE_URL",
    CLIENT_ID ? "" : "PLANVORTEX_LIVE_CLIENT_ID",
    CLIENT_SECRET ? "" : "PLANVORTEX_LIVE_CLIENT_SECRET",
].filter(Boolean);

export const CONFIGURED = MISSING.length === 0;

/** ¿Se puede escribir (subir, crear, borrar) en esta ejecución? */
export function canWrite(): boolean {
    return process.env.LIVE_ALLOW_PUBLISH === "1";
}

/** ¿Se puede mandar una publicación a la RED, ya, de verdad? Interruptor propio (§ regla 4). */
export function canPublishToNetwork(): boolean {
    return canWrite() && process.env.LIVE_ALLOW_SOCIAL_PUBLISH === "1";
}

function isProduction(): boolean {
    try {
        return new URL(BASE_URL).host === "api.planvortex.com";
    } catch {
        return false;
    }
}

if (CONFIGURED && canWrite() && isProduction() && process.env.LIVE_ALLOW_PRODUCTION !== "1") {
    //Revienta, no se salta: esto es una configuración peligrosa, no una ausente.
    throw new Error(
        "LIVE_ALLOW_PUBLISH=1 contra api.planvortex.com. Estos tests suben ficheros y crean " +
            "publicaciones en una organización REAL. Si es lo que quieres, añade " +
            "LIVE_ALLOW_PRODUCTION=1; si no, apunta PLANVORTEX_LIVE_BASE_URL a tu stack local.",
    );
}

/** El cliente de la app, con las credenciales de `.env.live`. */
export function liveClient(options: PlanVortexOptions = {}): PlanVortex {
    return new PlanVortex({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        baseUrl: BASE_URL,
        ...options,
    });
}

/** Un cliente con un secreto que NO vale. Para comprobar el error, no para colarse. */
export function liveClientWithBadSecret(): PlanVortex {
    return new PlanVortex({
        clientId: CLIENT_ID,
        clientSecret: `${CLIENT_SECRET}-esto-no-es-el-secreto`,
        baseUrl: BASE_URL,
        //Un secreto malo no mejora reintentándolo, y el servidor cuenta los fallos por client_id.
        retry: { maxRetries: 0 },
    });
}

/** Un `describe` que se salta entero —diciendo por qué— si no hay `.env.live`. */
export function describeLive(name: string, body: () => void): void {
    if (!CONFIGURED) {
        describe.skip(`[live] ${name} (falta ${MISSING.join(", ")} en .env.live)`, body);
        return;
    }
    describe(`[live] ${name}`, body);
}

/**
 * Los dos `it` con interruptor.
 *
 * Son funciones y no `export const itWrite = it.skipIf(...)` porque el tipo encadenable de vitest
 * arrastra nombres internos que no se pueden re-exportar (TS4023). Con la firma escrita a mano se
 * usan igual y compilan.
 */
type LiveTest = (context: TestContext) => void | Promise<void>;

/** Igual que `it`, pero se salta si no se permite escribir. Úsalo en TODO lo que cree o borre. */
export function itWrite(name: string, fn: LiveTest): void {
    it.skipIf(!canWrite())(name, fn);
}

/** Igual que `it`, pero sólo corre si además se ha pedido publicar de verdad en la red. */
export function itPublish(name: string, fn: LiveTest): void {
    it.skipIf(!canPublishToNetwork())(name, fn);
}

/**
 * El error 516, "esta funcionalidad es de plan de pago".
 *
 * No es un fallo de la librería ni del servidor: comentarios, buzón y contactos son de plan de pago,
 * y un stack de pruebas normalmente tiene un cliente en `free`. Por eso el dominio entero se SALTA
 * en vez de fallar — igual que se salta lo que necesita una cuenta conectada.
 */
export const PAID_PLAN_ERROR_CODE = 516;

/** Ejecuta el cuerpo, y si el API contesta 516 salta el test diciendo por qué. */
export async function withPaidPlan(context: TestContext, body: () => Promise<void>): Promise<void> {
    try {
        await body();
    } catch (error) {
        if (isPlanVortexError(error) && error.code === PAID_PLAN_ERROR_CODE) {
            context.skip(`el plan del cliente no incluye esto (error ${PAID_PLAN_ERROR_CODE})`);
        }
        throw error;
    }
}

/** Texto único por ejecución: sirve para reconocer —y limpiar— lo que ha creado el test. */
export function liveMarker(): string {
    return `PlanVortex live test ${new Date().toISOString()}`;
}

/** La imagen que se sube en la prueba de escritura. El logo del propio repo, por no traer otra. */
export const LIVE_IMAGE_PATH = resolve(
    process.cwd(),
    process.env.LIVE_IMAGE_PATH ?? "assets/logo-horizontal.png",
);

/**
 * Un vídeo, para las redes que no publican imágenes.
 *
 * No hay uno por defecto —un MP4 no se mete en el repo de una librería— así que sin esto los tests
 * de publicación se saltan cuando la única cuenta conectada es de YouTube o TikTok.
 */
export const LIVE_VIDEO_PATH = process.env.LIVE_VIDEO_PATH
    ? resolve(process.cwd(), process.env.LIVE_VIDEO_PATH)
    : undefined;

export interface LiveContext {
    pv: PlanVortex;
    client: Client;
    organization: Organization;
}

let context: Promise<LiveContext> | undefined;

/**
 * El cliente, su organización y el `PlanVortex` con el que se prueba, resueltos UNA vez.
 *
 * La organización se puede fijar con `LIVE_ORGANIZATION_ID`; si no, se coge la primera del cliente.
 * Con credenciales de app sólo se ve el cliente de la app (error 537), así que cliente no hay que
 * elegir: es el suyo o ninguno.
 */
export function liveContext(): Promise<LiveContext> {
    context ??= resolveContext();
    return context;
}

async function resolveContext(): Promise<LiveContext> {
    const pv = liveClient();

    const { data: clients } = await pv.clients.list({ limit: 1 });
    const client = clients[0];
    if (!client) {
        throw new Error("La app no ve ningún cliente: revisa PLANVORTEX_LIVE_CLIENT_ID/SECRET.");
    }

    const preferred = process.env.LIVE_ORGANIZATION_ID;
    if (preferred) {
        return { pv, client, organization: await pv.organizations.get(preferred) };
    }

    const { data: organizations } = await pv.clients.organizations(client._id, { limit: 1 });
    const organization = organizations[0];
    if (!organization) {
        throw new Error(
            `El cliente ${client.name} no tiene organizaciones. Crea una, o fija LIVE_ORGANIZATION_ID.`,
        );
    }

    return { pv, client, organization };
}

let publishAccount: Promise<Account | undefined> | undefined;

/**
 * Una cuenta conectada con la que se pueda publicar, o `undefined` si no hay ninguna.
 *
 * `undefined` es un resultado normal —conectar una cuenta es un OAuth con una persona delante, y no
 * se automatiza—, así que quien la use se salta su test en vez de fallarlo.
 */
export function livePublishAccount(): Promise<Account | undefined> {
    publishAccount ??= resolvePublishAccount();
    return publishAccount;
}

async function resolvePublishAccount(): Promise<Account | undefined> {
    const { pv, organization } = await liveContext();
    const { data } = await pv.accounts.list(organization._id, { capability: "publications", limit: 50 });

    //`error_code !== 0` es una cuenta desconectada: existe, pero cualquier cosa que se le pida falla.
    const usable = data.filter((account) => account.error_code === 0);
    const preferred = process.env.LIVE_ACCOUNT_ID;

    return preferred ? usable.find((account) => account._id === preferred) : usable[0];
}

/** Una cuenta de una red con mensajería, para las lecturas del buzón. */
export async function liveMessagesAccount(): Promise<Account | undefined> {
    const { pv, organization } = await liveContext();
    const { data } = await pv.accounts.list(organization._id, { capability: "messages", limit: 50 });
    return data.find((account) => account.error_code === 0);
}
