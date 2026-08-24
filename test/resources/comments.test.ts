/**
 * Comentarios (capa 2): la bandeja, los dos hilos en vivo y la moderación.
 *
 * Lo que se pin aquí son las trampas que la fase 7 encontró auditando el spec contra
 * `src/domain/**` del servidor, porque son las que no fallan de forma ruidosa:
 *
 *  - **La bandeja puebla `id_account` e `id_publication`** y las demás operaciones no. Es la
 *    asimetría inversa a la de `Publication.id_account`, y el spec la daba por cadena siempre.
 *  - **`unread` se activa con la MERA PRESENCIA del parámetro**: el servidor toma cualquier valor
 *    que no sea el literal `"false"` por un sí, así que un `unread: false` que viajara pediría
 *    justo lo contrario de lo que dice quien llama.
 *  - **El hilo pagina con un cursor opaco**, no con un `offset` numérico, y no tiene `iterate()`
 *    porque en X cada comentario leído cuesta un crédito.
 *  - **Hay DOS rutas de hilo**: la de publicación y la de cuenta. La segunda existe por Google
 *    Business, donde una reseña cuelga de la ficha y no hay publicación con la que llamar a la otra.
 *  - **`reply` puede volver sin `_id`**: la respuesta se publica antes de guardarse y guardarla no
 *    tumba la petición.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { accountId, publicationId } from "../../src/index.js";
import { ContractHarness } from "../helpers/contract.js";
import {
    ACCOUNT_ID,
    COMMENT_ID,
    ORG_ID,
    PUBLICATION_ID,
    comment,
    inboxComment,
} from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

describe("comments.list", () => {
    it("desenvuelve `{comments, total}` y devuelve las referencias pobladas", async () => {
        api.mock("get", `/organizations/${ORG_ID}/comments`, { comments: [inboxComment], total: 42 });
        const pv = api.client();

        const page = await pv.comments.list(ORG_ID);

        expect(page.total).toBe(42);
        expect(page.data).toHaveLength(1);
        //Lo que hace la bandeja y no hace nadie más: las dos referencias resueltas.
        expect(accountId(page.data[0]!)).toBe(ACCOUNT_ID);
        expect(publicationId(page.data[0]!)).toBe(PUBLICATION_ID);
    });

    it("manda cada filtro con el nombre que el servidor lee, y los arrays repetidos", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/comments`, { comments: [], total: 0 });
        const pv = api.client();

        await pv.comments.list(ORG_ID, {
            social_network: ["google_business", "instagram"],
            id_account: ACCOUNT_ID,
            id_publication: PUBLICATION_ID,
            search: "precio",
            rating: [1, 2],
            offset: 20,
            limit: 10,
        });

        expect(calls[0]?.query).toEqual({
            social_network: ["google_business", "instagram"],
            id_account: [ACCOUNT_ID],
            id_publication: [PUBLICATION_ID],
            search: ["precio"],
            rating: ["1", "2"],
            offset: ["20"],
            limit: ["10"],
        });
    });

    /**
     * La trampa del flag: el servidor mira si el parámetro VIENE, no cuánto vale. `unread=false`
     * filtraría los no leídos, que es lo contrario de lo que pide quien escribe `unread: false`.
     */
    it("omite `unread` cuando es false y lo manda cuando es true", async () => {
        const off = api.mock("get", `/organizations/${ORG_ID}/comments`, { comments: [], total: 0 });
        const pv = api.client();

        await pv.comments.list(ORG_ID, { unread: false });
        expect(off[0]?.query.unread).toBeUndefined();

        await pv.comments.list(ORG_ID, { unread: true });
        expect(off[1]?.query.unread).toEqual(["true"]);
    });

    it("encadena páginas con iterate() y corta en la última", async () => {
        const calls = api.mockSequence("get", `/organizations/${ORG_ID}/comments`, [
            { comments: [inboxComment, inboxComment], total: 3 },
            { comments: [inboxComment], total: 3 },
        ]);
        const pv = api.client();

        const seen = [];
        for await (const item of pv.comments.iterate(ORG_ID, { limit: 2 })) {
            seen.push(item);
        }

        expect(seen).toHaveLength(3);
        expect(calls.map((call) => call.query.offset)).toEqual([["0"], ["2"]]);
    });
});

describe("comments.unreadCount", () => {
    it("devuelve el número, no el sobre", async () => {
        api.mock("get", `/organizations/${ORG_ID}/unread_comments`, { total: 7 });
        const pv = api.client();

        expect(await pv.comments.unreadCount(ORG_ID)).toBe(7);
    });
});

describe("comments.thread", () => {
    it("lee el hilo de una publicación y devuelve lo que costó", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/publish/${PUBLICATION_ID}/comments`, {
            comments: [comment],
            total: 1,
            credits_consumed: 0,
        });
        const pv = api.client();

        const thread = await pv.comments.thread(ORG_ID, PUBLICATION_ID, { limit: 25 });

        expect(calls[0]?.query).toEqual({ limit: ["25"] });
        expect(thread.credits_consumed).toBe(0);
        //El hilo NO puebla: aquí `id_account` es la cadena.
        expect(thread.comments[0]?.id_account).toBe(ACCOUNT_ID);
    });

    /**
     * El cursor viaja como `offset` y es OPACO: se devuelve tal cual, sin convertirlo a número ni
     * sumarle el tamaño de la página.
     */
    it("manda el next_cursor de vuelta como offset, sin tocarlo", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/publish/${PUBLICATION_ID}/comments`, {
            comments: [],
            total: 0,
            credits_consumed: 0,
        });
        const pv = api.client();

        await pv.comments.thread(ORG_ID, PUBLICATION_ID, { offset: "QVFIU..." });

        expect(calls[0]?.query.offset).toEqual(["QVFIU..."]);
    });
});

describe("comments.threadByAccount", () => {
    /**
     * La ruta que existe por Google Business: la reseña cuelga de la ficha, así que esa cuenta no
     * tiene ninguna publicación con la que llamar a la otra.
     */
    it("lee el hilo de una cuenta y conserva el rating de la reseña", async () => {
        const review = { ...comment, social_network: "google_business", rating: 1, text: "" };
        const calls = api.mock("get", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/comments`, {
            comments: [review],
            total: 138,
            credits_consumed: 0,
        });
        const pv = api.client();

        const thread = await pv.comments.threadByAccount(ORG_ID, ACCOUNT_ID);

        expect(calls[0]?.path).toBe(`/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/comments`);
        expect(thread.comments[0]?.rating).toBe(1);
        //Una reseña de sólo estrellas no trae texto, y eso es una respuesta válida.
        expect(thread.comments[0]?.text).toBe("");
        //`total` es el número de RESEÑAS de la ficha, no la longitud del array.
        expect(thread.total).toBe(138);
    });
});

describe("comments.replies", () => {
    it("pide las respuestas del comentario, no las de la publicación", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/comments/${COMMENT_ID}/replies`, {
            comments: [],
            total: 0,
            credits_consumed: 3,
        });
        const pv = api.client();

        const thread = await pv.comments.replies(ORG_ID, COMMENT_ID);

        expect(calls[0]?.path).toBe(`/organizations/${ORG_ID}/comments/${COMMENT_ID}/replies`);
        //En X se cobra por respuesta devuelta, y el número llega DESPUÉS de leer.
        expect(thread.credits_consumed).toBe(3);
    });
});

describe("comments.reply", () => {
    it("manda `{text}` y devuelve el comentario, la respuesta y el coste", async () => {
        const calls = api.mock("post", `/organizations/${ORG_ID}/comments/${COMMENT_ID}/reply`, {
            comment: { ...comment, replied: true, read: true, our_reply_external_id: "17800000000000009" },
            reply: { ...comment, _id: "66d04a6a427f4c43b9d97f71", external_id: "17800000000000009" },
            credits_consumed: 0,
        });
        const pv = api.client();

        const result = await pv.comments.reply(ORG_ID, COMMENT_ID, "¡Gracias! Te escribimos por privado");

        expect(calls[0]?.body).toEqual({ text: "¡Gracias! Te escribimos por privado" });
        expect(result.comment.replied).toBe(true);
        expect(result.comment.our_reply_external_id).toBe("17800000000000009");
    });

    /**
     * La respuesta se publica en la red ANTES de guardarse, y guardarla no puede tumbar la
     * petición: la red ya la publicó. Cuando esa escritura falla llega lo que devolvió la red, sin
     * `_id`, y lo que identifica la respuesta es `comment.our_reply_external_id`.
     */
    it("no da por hecho que la respuesta traiga `_id`", async () => {
        api.mock("post", `/organizations/${ORG_ID}/comments/${COMMENT_ID}/reply`, {
            comment: { ...comment, replied: true, our_reply_external_id: "17800000000000009" },
            reply: {
                external_id: "17800000000000009",
                publication_external_id: comment.publication_external_id,
                author: { external_id: "la-cuenta", is_own: true },
                text: "¡Gracias!",
            },
            credits_consumed: 0,
        });
        const pv = api.client();

        const result = await pv.comments.reply(ORG_ID, COMMENT_ID, "¡Gracias!");

        expect(result.reply._id).toBeUndefined();
        expect(result.comment.our_reply_external_id).toBe(result.reply.external_id);
    });
});

describe("comments.update", () => {
    it("desenvuelve `{comment}` y manda los dos campos juntos", async () => {
        const calls = api.mock("put", `/organizations/${ORG_ID}/comments/${COMMENT_ID}`, {
            comment: { ...comment, read: true, hidden: true },
        });
        const pv = api.client();

        const updated = await pv.comments.update(ORG_ID, COMMENT_ID, { read: true, hidden: true });

        expect(calls[0]?.body).toEqual({ read: true, hidden: true });
        expect(updated.hidden).toBe(true);
    });

    /** Aquí `false` SÍ viaja: el servidor lo lee del cuerpo, no de la presencia del parámetro. */
    it("markRead(false) manda `read: false` para devolverlo a sin leer", async () => {
        const calls = api.mock("put", `/organizations/${ORG_ID}/comments/${COMMENT_ID}`, { comment });
        const pv = api.client();

        await pv.comments.markRead(ORG_ID, COMMENT_ID, false);

        expect(calls[0]?.body).toEqual({ read: false });
    });
});

describe("comments.remove", () => {
    it("borra por DELETE y no devuelve nada", async () => {
        const calls = api.mock("delete", `/organizations/${ORG_ID}/comments/${COMMENT_ID}`, {
            success: true,
        });
        const pv = api.client();

        await expect(pv.comments.remove(ORG_ID, COMMENT_ID)).resolves.toBeUndefined();
        expect(calls[0]?.method).toBe("DELETE");
    });
});

describe("comments.actions", () => {
    const matrix = {
        instagram: { reply: true, hide: true, delete_own: true, delete_others: false },
        linkedin: { reply: true, hide: false, delete_own: true, delete_others: true },
        google_business: { reply: true, hide: false, delete_own: true, delete_others: false },
    };

    it("devuelve la matriz entera y comparte la caché del catálogo", async () => {
        api.mock("get", "/social_comment_actions", matrix);
        const pv = api.client();

        expect(await pv.comments.actions()).toEqual(matrix);
        //La segunda llamada no vuelve a salir: si saliera, msw registraría dos.
        await pv.catalog.socialCommentActions();
        expect(api.calls.filter((call) => call.path === "/social_comment_actions")).toHaveLength(1);
    });

    it("con una red devuelve sus cuatro banderas, y undefined si esa red no tiene comentarios", async () => {
        api.mock("get", "/social_comment_actions", matrix);
        const pv = api.client();

        expect(await pv.comments.actions("linkedin")).toEqual(matrix.linkedin);
        expect(await pv.comments.actions("whatsapp")).toBeUndefined();
    });
});
