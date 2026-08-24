/**
 * La bandeja de comentarios, entera: el badge, la lista, la matriz de acciones, el hilo en vivo y
 * la respuesta.
 *
 * Es el ejemplo de la sección que más gente entiende mal, porque son DOS lecturas y no una:
 * `comments.list()` es la bandeja —sale de la base de datos de PlanVortex, es gratis y es una foto—
 * y `comments.thread()` es el hilo —pregunta a la red en ese momento, y en X cuesta un crédito por
 * comentario devuelto—. Pintar una lista con la segunda es cómo se hace una factura sin querer.
 *
 *   PLANVORTEX_CLIENT_ID=... PLANVORTEX_CLIENT_SECRET=... \
 *   PLANVORTEX_BASE_URL=http://localhost:3000/v1.0.0 \
 *   npx tsx examples/comments.ts
 *
 * RESPONDER ES PÚBLICO E INMEDIATO: lo que se escriba aquí lo ve cualquiera que pase por el post,
 * así que por defecto este ejemplo sólo lee y marca como leído. Para que además responda:
 *
 *   PLANVORTEX_ALLOW_REPLY=1 npx tsx examples/comments.ts
 *
 * Todo esto exige plan de pago: con uno gratuito, la primera llamada contesta el error 516.
 */
import { PlanVortex, PlanVortexError, account, publication } from "../src/index.js";
import type { Comment, CommentActions } from "../src/index.js";

const ALLOW_REPLY = process.env.PLANVORTEX_ALLOW_REPLY === "1";

const pv = new PlanVortex({
    //Si no se pasan, salen de PLANVORTEX_CLIENT_ID y PLANVORTEX_CLIENT_SECRET.
    hooks: {
        onRequest: ({ method, url }) => console.log(`  -> ${method} ${url}`),
    },
});

async function main(): Promise<void> {
    // 1. El cliente y su organización, igual que en `publish.ts`.
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

    // 2. El badge. Es una llamada suya, no el `total` de la bandeja: los comentarios NUESTROS no
    //    cuentan como pendientes de leer, así que los dos números no coinciden.
    const unread = await pv.comments.unreadCount(organization._id);
    console.log(`Sin leer: ${unread}`);

    // 3. LA BANDEJA. Lectura de base de datos: no llama a ninguna red, no gasta créditos y no falla
    //    porque una cuenta esté desconectada. `collected_date` dice de cuándo es la foto.
    const { data: comments, total } = await pv.comments.list(organization._id, {
        unread: true,
        limit: 10,
    });
    console.log(`Bandeja: ${comments.length} de ${total} sin leer`);

    const target = comments[0];
    if (!target) {
        //Sin nada sin leer no hay ejemplo que enseñar, pero tampoco es un fallo.
        console.log("Nada pendiente. Prueba sin el filtro `unread` para ver la bandeja entera.");
        return;
    }

    for (const comment of comments) {
        console.log(`  ${describe(comment)}`);
    }

    // 4. QUÉ SE PUEDE HACER con los comentarios de esa red, antes de pintar un botón. No se deduce
    //    de `social_capabilities`: que una red tenga comentarios no dice nada de lo que deja hacer
    //    con ellos. Instagram, X y Bluesky no dejan borrar el de otro; LinkedIn no tiene "ocultar";
    //    Google Business sólo deja borrar NUESTRA respuesta.
    const actions = await pv.comments.actions(target.social_network);
    console.log(`Acciones en ${target.social_network}: ${describeActions(actions)}`);

    // 5. EL HILO, en vivo contra la red. La red manda: de lo guardado sólo sobreviven `_id`, `read`
    //    y `replied`. Una reseña de Google Business cuelga de la FICHA y no de una publicación
    //    nuestra, así que esa red tiene su propia llamada; y hay comentarios sin publicación detrás
    //    —un vídeo subido a mano, un post anterior a PlanVortex— para los que no hay hilo que pedir.
    //
    //    Aquí, y sólo aquí, `id_account` e `id_publication` vienen POBLADOS: en el hilo y en la
    //    respuesta llegan como cadena. Por eso se leen con los ayudantes y no con un `typeof`.
    const thread = await readThread(organization._id, target);

    if (thread) {
        //`credits_consumed` es dinero de verdad, y sólo en X: en las demás redes es 0. `next_cursor`
        //es el token OPACO de la red, que se devuelve tal cual como `offset` en la llamada siguiente
        //— no es un número de elementos, que es como pagina la bandeja.
        console.log(
            `Hilo: ${thread.comments.length} de ${thread.total} · ` +
                `créditos gastados: ${thread.credits_consumed}` +
                (thread.next_cursor ? " · hay más páginas" : ""),
        );
        for (const comment of thread.comments) {
            console.log(`  ${comment.author.is_own ? "(nuestro) " : ""}${describe(comment)}`);
        }
    } else {
        console.log("Ese comentario no cuelga de ninguna publicación nuestra: no hay hilo que leer.");
    }

    // 6. Y lo que se hace con él. Responder es PÚBLICO, así que va con interruptor; marcar leído es
    //    nuestro, no toca la red y no puede fallar por lo que la red permita.
    if (ALLOW_REPLY && actions?.reply) {
        //El límite de un comentario NO es el de una publicación: Facebook admite 60.000 caracteres
        //en un post y 8.000 en un comentario. Pasarse devuelve el error 948.
        const limits = await pv.catalog.socialLimits();
        const maxCharacters = limits.comment_characters?.[target.social_network] ?? 0;
        const text = "¡Gracias por escribir! Te contestamos por privado.";
        if (maxCharacters > 0 && text.length > maxCharacters) {
            throw new Error(`La respuesta no cabe: ${text.length}/${maxCharacters} caracteres.`);
        }

        const result = await pv.comments.reply(organization._id, target._id, text);
        //`reply._id` puede faltar: la respuesta se publica primero en la red y se guarda después, y
        //esa segunda escritura no puede tumbar una petición que la red ya cumplió. Lo que siempre
        //identifica nuestra respuesta es `comment.our_reply_external_id`.
        console.log(
            `Respondido. Id en la red: ${result.comment.our_reply_external_id ?? "(desconocido)"} · ` +
                `créditos: ${result.credits_consumed}`,
        );
    } else {
        const read = await pv.comments.markRead(organization._id, target._id);
        console.log(`Marcado como leído: ${read._id}`);
        if (ALLOW_REPLY) {
            console.log(`${target.social_network} no deja responder desde el API.`);
        } else {
            console.log("Para responder de verdad: PLANVORTEX_ALLOW_REPLY=1");
        }
    }
}

/**
 * El hilo del comentario, pedido por donde corresponda: por la CUENTA en Google Business, cuyas
 * reseñas cuelgan de la ficha, y por la PUBLICACIÓN en las demás. `undefined` cuando no hay ninguna
 * de las dos, que es un caso normal y no un error.
 */
async function readThread(idOrganization: string, comment: Comment) {
    if (comment.social_network === "google_business") {
        const idAccount = account(comment)?._id;
        return idAccount ? pv.comments.threadByAccount(idOrganization, idAccount, { limit: 10 }) : undefined;
    }
    const idPublication = publication(comment)?._id;
    return idPublication ? pv.comments.thread(idOrganization, idPublication, { limit: 10 }) : undefined;
}

/**
 * Una línea por comentario. Dos cosas que no son adorno: el texto PUEDE venir vacío —una reseña de
 * sólo estrellas no lleva ninguno— y `rating` sólo existe en las redes de reseñas, así que su
 * ausencia significa "esta red no tiene eso", nunca cero.
 */
function describe(comment: Comment): string {
    const stars = comment.rating === undefined ? "" : `${"*".repeat(comment.rating)} `;
    const text = comment.text || "(sin texto)";
    return `[${comment.social_network}] ${stars}${comment.author.name ?? "anónimo"}: ${text}`;
}

/** Las cuatro banderas, que son siempre cuatro: una ausente sería indistinguible de un descuido. */
function describeActions(actions: CommentActions | undefined): string {
    if (!actions) {
        return "ninguna (esa red no tiene comentarios)";
    }
    const allowed = Object.entries(actions)
        .filter(([, value]) => value)
        .map(([name]) => name);
    return allowed.length ? allowed.join(", ") : "ninguna";
}

main().catch((error: unknown) => {
    //Los errores del API se clasifican por `code`, NUNCA por el status: todos llegan con un 400.
    if (error instanceof PlanVortexError) {
        if (error.code === 516) {
            console.error("Los comentarios son de plan de pago: con el gratuito no hay bandeja.");
        }
        console.error(`[${error.family} ${error.code}] ${error.message}`, error.data);
    } else {
        console.error(error);
    }
    process.exitCode = 1;
});
