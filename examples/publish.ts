/**
 * El camino de publicar, entero: subir una imagen y programar una publicación.
 *
 * Es el ejemplo que cierra la fase 6 y lo que vende `/developers` — de credenciales a publicación
 * programada, sin escribir un solo `fetch`.
 *
 *   PLANVORTEX_CLIENT_ID=... PLANVORTEX_CLIENT_SECRET=... \
 *   PLANVORTEX_BASE_URL=http://localhost:3000/v1.0.0 \
 *   npx tsx examples/publish.ts ./hogaza.jpg
 *
 * Sin `PLANVORTEX_BASE_URL` va contra producción, que es exactamente lo que no quieres mientras
 * pruebas: pon el stack local (`docker compose up -d`) o una organización de juguete.
 */
import { PlanVortex, PlanVortexError, accountId } from "../src/index.js";

const [, , filePath = "./ejemplo.jpg"] = process.argv;

const pv = new PlanVortex({
    //Si no se pasan, salen de PLANVORTEX_CLIENT_ID y PLANVORTEX_CLIENT_SECRET.
    hooks: {
        onRequest: ({ method, url }) => console.log(`  -> ${method} ${url}`),
    },
});

async function main(): Promise<void> {
    // 1. El cliente y su organización. Con credenciales de app sólo se ve el cliente de la app.
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

    // 2. Cuánto queda de plan. Se lee de `limits`, no de `organization.actual_plan`, que falta
    //    cuando la organización no tiene plan propio y hereda el del padre.
    const limits = await pv.organizations.limits(organization._id);
    const { actual_use } = await pv.organizations.use(organization._id);
    console.log(
        `Publicaciones: ${actual_use?.publications ?? 0} de ${limits.publications} · ` +
            `Cuentas: ${actual_use?.accounts ?? 0} de ${limits.accounts}`,
    );

    // 3. Una cuenta con la que se pueda publicar. El filtro `capability` lo resuelve el servidor
    //    con la misma matriz que publica /social_capabilities: ni WhatsApp ni Google Business
    //    aparecen aquí, porque no publican.
    const { data: accounts } = await pv.accounts.list(organization._id, {
        capability: "publications",
        limit: 10,
    });
    const account = accounts.find((candidate) => candidate.error_code === 0);
    if (!account) {
        throw new Error(
            accounts.length
                ? "Todas las cuentas están desconectadas (error_code != 0): hay que reconectarlas."
                : "No hay ninguna cuenta que publique. Conéctala desde el panel (§ fase 9).",
        );
    }
    console.log(`Cuenta: ${account.name} en ${account.social_network}`);

    // 4. Los límites de ESA red, tal y como los valida el servidor. Bluesky lleva dos cuentas del
    //    mismo texto y en unidades distintas, así que se miran los dos.
    const socialLimits = await pv.catalog.socialLimits();
    const maxCharacters = socialLimits.characters?.[account.social_network] ?? 0;
    const maxBytes = socialLimits.max_post_bytes?.[account.social_network] ?? 0;

    const text = "Nuevo horno, nuevas hogazas 🥖";
    const characters = [...new Intl.Segmenter().segment(text)].length;
    const bytes = Buffer.byteLength(text, "utf8");
    if (characters > maxCharacters || (maxBytes > 0 && bytes > maxBytes)) {
        throw new Error(
            `El texto no cabe en ${account.social_network}: ${characters}/${maxCharacters} caracteres` +
                (maxBytes ? ` y ${bytes}/${maxBytes} bytes` : ""),
        );
    }

    // 5. La imagen. Una ruta en disco es la forma que NO pasa el fichero por memoria.
    const upload = await pv.uploads.create(organization._id, { file: filePath });
    console.log(
        `Subido ${upload.name}: ${upload.file_properties?.aspect_ratio?.text} · ` +
            `${Math.round((upload.file_properties?.size_in_bytes ?? 0) / 1024)} KB`,
    );
    //`allowed_social_networks` es sólo el RECORTE. La duración y el peso los mira el servidor al
    //publicar, así que esto es un aviso temprano, no una garantía.
    if (!upload.file_properties?.allowed_social_networks?.includes(account.social_network)) {
        console.warn(`Aviso: el recorte no es de los que ${account.social_network} recomienda.`);
    }

    // 6. La publicación, programada para dentro de una hora.
    const publication = await pv.publications.create(organization._id, account._id, {
        social_network: account.social_network,
        text,
        files: [upload._id],
        publish_date: new Date(Date.now() + 60 * 60 * 1000),
    });

    // 7. Y aquí está lo que hay que mirar: una publicación inválida NO llega como error, llega
    //    como un 200 en estado `withErrors` con el motivo dentro.
    if (publication.state === "withErrors") {
        console.error("La publicación se guardó pero no saldrá:");
        for (const failure of publication.publication_errors) {
            console.error(`  [${failure.code}] ${failure.message}`);
        }
        return;
    }

    console.log(
        `Programada ${publication._id} (${publication.state}) para ` +
            `${publication.publish_date} en la cuenta ${accountId(publication)}`,
    );

    // 8. Lo que hay en la agenda, para comprobar que está.
    const pending = await pv.publications.list(organization._id, { state: ["ready"], limit: 5 });
    console.log(`Pendientes: ${pending.total}`);
}

main().catch((error: unknown) => {
    //Los errores del API se clasifican por `code`, NUNCA por el status: todos llegan con un 400.
    if (error instanceof PlanVortexError) {
        console.error(`[${error.family} ${error.code}] ${error.message}`, error.data);
    } else {
        console.error(error);
    }
    process.exitCode = 1;
});
