/**
 * El flujo de conexión de cuentas, entero: de una app que **no puede** conectar nada a una cuenta
 * social conectada por una persona.
 *
 *   PLANVORTEX_CLIENT_ID=... PLANVORTEX_CLIENT_SECRET=... \
 *   PLANVORTEX_BASE_URL=http://localhost:3000/v1.0.0 \
 *   npx tsx examples/connect-flow.ts
 *
 * Y abre http://localhost:3211.
 *
 * ANTES DE EJECUTARLO hay que registrar la URL de vuelta en los `redirect_urls` de la app —la
 * misma que dice `RETURN_URL` aquí abajo—, o el primer paso contesta el error 532. Se hace en el
 * panel, en la ficha de la app.
 *
 * POR QUÉ HACE FALTA TODO ESTO: una app **no puede conectar una cuenta social**. Autorizar
 * Instagram es un OAuth con una persona delante, así que las credenciales de app sirven para
 * publicar, medir y leer, pero no para conectar. Lo que hace una app es emitir un token temporal,
 * mandar a su usuario con él y esperarlo de vuelta. El `client_secret` no sale de este proceso en
 * ningún momento.
 *
 * Va con `node:http` a propósito, no con Express: no hace falta framework para tres rutas, y así el
 * ejemplo se lee entero. Con Express son los mismos cuatro `app.get(...)`.
 */
import http from "node:http";

import { PlanVortex, isPlanVortexError } from "../src/index.js";
import type { SocialNetwork } from "../src/index.js";

const PORT = Number(process.env.PORT ?? 3211);
/** Cambia esto si lo publicas en otro sitio: tiene que coincidir con el `redirect_urls` de la app. */
const RETURN_URL = process.env.PLANVORTEX_RETURN_URL ?? `http://localhost:${PORT}/listo`;
/**
 * La vuelta del camino en el que el selector de cuentas lo pones tú. También tiene que estar en los
 * `redirect_urls` de la app.
 */
const PICK_URL = process.env.PLANVORTEX_PICK_URL ?? `http://localhost:${PORT}/elegir`;

/**
 * Las sesiones de conexión que ha empezado ESTE proceso. En una integración de verdad va en la
 * sesión de tu usuario: es lo que comparas con el `connect_session` que vuelve, para que una sesión
 * que empezó otro no acabe en su navegador.
 */
const startedSessions = new Set<string>();

const pv = new PlanVortex({
    //Si no se pasan, salen de PLANVORTEX_CLIENT_ID y PLANVORTEX_CLIENT_SECRET.
    hooks: {
        onRequest: ({ method, url }) => console.log(`  -> ${method} ${url}`),
    },
});

/**
 * La organización a la que se le conectan las cuentas.
 *
 * En una integración de verdad esto es un dato tuyo: cada usuario de tu aplicación tiene la suya, y
 * la creas con `pv.clients.createOrganization(...)` cuando se da de alta. Aquí se coge la primera
 * que vea la app para que el ejemplo arranque sin preparar nada.
 */
let organizationId = process.env.PLANVORTEX_ORGANIZATION ?? "";
async function resolveOrganization(): Promise<string> {
    if (organizationId) {
        return organizationId;
    }
    const { data: clients } = await pv.clients.list({ limit: 1 });
    const client = clients[0];
    if (!client) {
        throw new Error("La app no ve ningún cliente: revisa las credenciales.");
    }
    const { data: organizations } = await pv.clients.organizations(client._id, { limit: 1 });
    const organization = organizations[0];
    if (!organization) {
        throw new Error(`El cliente ${client.name} no tiene ninguna organización.`);
    }
    console.log(`Organización: ${organization.name} (${organization._id})`);
    organizationId = organization._id;
    return organizationId;
}

const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://localhost:${PORT}`);
    void route(url)
        .then((html) => {
            //Un `redirect_uri` no es HTML: cuando la ruta devuelve una URL, se redirige.
            if (html.startsWith("REDIRECT:")) {
                response.statusCode = 302;
                response.setHeader("location", html.slice("REDIRECT:".length));
                response.end();
                return;
            }
            response.setHeader("content-type", "text/html; charset=utf-8");
            response.end(html);
        })
        .catch((error: unknown) => {
            response.statusCode = 500;
            response.setHeader("content-type", "text/html; charset=utf-8");
            response.end(page("Se ha roto algo", explain(error)));
        });
});

async function route(url: URL): Promise<string> {
    switch (url.pathname) {
        case "/":
            return home();
        //PASO 1 — la app emite el token y manda al usuario al camino alojado de PlanVortex, que se
        //encarga del OAuth y de la pantalla donde la persona elige qué cuentas dar de alta.
        case "/conectar": {
            const red = url.searchParams.get("red");
            const connect = await pv.organizations.createConnectToken(await resolveOrganization(), {
                ...(red ? { social_network: red as SocialNetwork } : {}),
                redirect_uri: RETURN_URL,
            });
            console.log(`Token temporal emitido, caduca ${connect.expires_at}`);
            return `REDIRECT:${connect.url}`;
        }
        //LOS BOTONES DE RED LOS PONES TÚ: un token por botón, atado a su red, y se manda al usuario a
        //su `url`. NO se le manda directamente al enlace de `connectLinks()`: la red lo devuelve a
        //PlanVortex, y esa vuelta sólo encuentra el token si entró por `connect.url`. Aquí
        //`connectLinks()` sirve para saber QUÉ redes se pueden conectar ahora mismo.
        case "/enlaces": {
            const idOrganization = await resolveOrganization();
            const { token } = await pv.organizations.createConnectToken(idOrganization);
            const links = await pv.asTemporalToken(token).accounts.connectLinks(idOrganization);
            return page(
                "Elige tú la red",
                `<p>Una red que no aparezca es una red que esta organización no puede conectar ahora
                  mismo (Discord sin sus credenciales de bot, por ejemplo). Cada botón pide su propio
                  token atado a esa red.</p>
                 <ul>${links
                     .map((link) => `<li><a href="/conectar?red=${link.social_network}">${link.social_network}</a></li>`)
                     .join("")}</ul>
                 <p><a href="/">Volver</a></p>`,
            );
        }
        //EL SELECTOR DE CUENTAS LO PONES TÚ: `account_selection: "integrator"`. La `url` es la
        //página de autorización de la red, y la vuelta aterriza en PICK_URL con una sesión de
        //conexión sin pasar por ninguna pantalla de PlanVortex. Exige la red y el `redirect_uri`.
        case "/conectar-propio": {
            const connect = await pv.organizations.createConnectToken(await resolveOrganization(), {
                social_network: (url.searchParams.get("red") ?? "facebook") as SocialNetwork,
                redirect_uri: PICK_URL,
                account_selection: "integrator",
            });
            if (connect.connect_session) {
                startedSessions.add(connect.connect_session);
            }
            return `REDIRECT:${connect.url}`;
        }
        case "/elegir": {
            const idSession = url.searchParams.get("connect_session") ?? "";
            if (!startedSessions.has(idSession)) {
                return page("Esta sesión no es tuya", `<p>No la empezó este proceso.</p><p><a href="/">Volver</a></p>`);
            }
            const error = url.searchParams.get("error");
            if (error) {
                return page(
                    "No se ha terminado",
                    `<p><code>${error}</code> ${url.searchParams.get("error_code") ?? ""}. La sesión sigue
                      abierta: se puede volver a intentar.</p><p><a href="/">Volver</a></p>`,
                );
            }
            const session = await pv.accounts.getConnectSession(await resolveOrganization(), idSession);
            return page(
                "Elige las cuentas",
                `<p>Caben ${session.accounts_limit - session.accounts_used} más en el plan.</p>
                 <form action="/confirmar">
                   <input type="hidden" name="connect_session" value="${session._id}">
                   ${session.accounts
                       .map(
                           (account) =>
                               `<label><input type="checkbox" name="cuenta" value="${account._id}"${account.already_enabled ? " checked" : ""}>
                                ${account.name}${account.already_enabled ? " (ya estaba conectada)" : ""}</label><br>`,
                       )
                       .join("")}
                   <button>Conectar las elegidas</button>
                 </form>`,
            );
        }
        case "/confirmar": {
            const idSession = url.searchParams.get("connect_session") ?? "";
            if (!startedSessions.has(idSession)) {
                return page("Esta sesión no es tuya", `<p><a href="/">Volver</a></p>`);
            }
            const enabled = await pv.accounts.confirmConnectSession(
                await resolveOrganization(),
                idSession,
                url.searchParams.getAll("cuenta"),
            );
            startedSessions.delete(idSession);
            return page(
                "Ya está",
                `<p>Conectadas: ${enabled.map((account) => account.name).join(", ") || "ninguna"}.</p>
                 <p><a href="/">Volver</a></p>`,
            );
        }
        //PASO 2 — la persona ha terminado y PlanVortex la ha devuelto aquí. La cuenta ya está
        //conectada y habilitada: lo que queda es leerla con las credenciales de la app.
        case "/listo": {
            const { data: accounts } = await pv.accounts.list(await resolveOrganization(), { limit: 20 });
            return page(
                "Ya está",
                `<p>La organización tiene ${accounts.length} cuenta(s):</p>
                 <ul>${accounts
                     .map(
                         (account) =>
                             `<li><b>${account.name}</b> · ${account.social_network}` +
                             `${account.error_code ? ` · <span style="color:#b00">rota (${account.error_code})</span>` : ""}</li>`,
                     )
                     .join("")}</ul>
                 <p>Con esto ya se puede publicar: mira <code>examples/publish.ts</code>.</p>
                 <p><a href="/">Volver</a></p>`,
            );
        }
        default:
            return page("Aquí no hay nada", `<p><a href="/">Volver</a></p>`);
    }
}

function home(): string {
    return page(
        "Conectar una cuenta social",
        `<p>Esto es lo que vería un usuario de tu aplicación. El <code>client_secret</code> no sale de
           este proceso: lo que viaja con él es un token de quince minutos, atado a una organización,
           que sólo sirve para crear cuentas.</p>
         <p><a href="/conectar">Conectar una cuenta</a> — el camino alojado, y el que quieres.</p>
         <p><a href="/conectar?red=instagram">Conectar Instagram</a> — igual, pero sin preguntar la red.</p>
         <p><a href="/enlaces">Los botones de red los pongo yo</a>: un token por red.</p>
         <p><a href="/conectar-propio?red=facebook">Las cuentas las elijo yo</a>: el selector de cuentas
           es tuyo (<code>account_selection: "integrator"</code>). Necesita <code>${PICK_URL}</code> en
           los <code>redirect_urls</code> de la app.</p>
         <p style="color:#666">La vuelta está configurada a <code>${RETURN_URL}</code>. Si el primer
           paso contesta el error 532, es que esa URL no está en los <code>redirect_urls</code> de la
           app.</p>`,
    );
}

/** Un error de PlanVortex trae código y mensaje; cualquier otra cosa, lo que traiga. */
function explain(error: unknown): string {
    if (isPlanVortexError(error)) {
        const detail =
            error.code === 532
                ? "<p>Es la URL de vuelta: añádela a los <code>redirect_urls</code> de la app.</p>"
                : "";
        return `<p><code>${error.code}</code> (${error.family}): ${error.message}</p>${detail}
                <p><a href="/">Volver</a></p>`;
    }
    return `<p>${String(error)}</p><p><a href="/">Volver</a></p>`;
}

function page(title: string, body: string): string {
    return `<!doctype html><meta charset="utf-8"><title>${title}</title>
            <body style="font:16px/1.6 system-ui;max-width:44rem;margin:3rem auto;padding:0 1rem">
            <h1>${title}</h1>${body}`;
}

server.listen(PORT, () => {
    console.log(`Ejemplo del flujo de conexión en http://localhost:${PORT}`);
    console.log(`Vuelta configurada en ${RETURN_URL} (tiene que estar en los redirect_urls de la app)`);
});
