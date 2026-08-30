/**
 * Comentarios y reseñas: la conversación pública que cuelga de lo publicado.
 *
 * LO QUE HAY QUE SABER ANTES DE LLAMAR A NADA DE AQUÍ:
 *
 *  - **Son DOS lecturas distintas, no una paginada.** {@link CommentsResource.list} es LA BANDEJA:
 *    sale de la base de datos de PlanVortex, es gratis, responde igual de rápido con una cuenta que
 *    con veinte, y es una FOTO de la última vez que se leyó la red. {@link CommentsResource.thread}
 *    es EL HILO: pregunta a la red en ese momento y reconcilia. Para pintar una lista, la bandeja;
 *    para abrir una conversación, el hilo.
 *  - **El hilo en vivo puede costar dinero.** En X cuesta un crédito por comentario devuelto, y por
 *    eso la respuesta trae `credits_consumed`. En las otras redes es `0`. Es también la razón de
 *    que no haya un `iterate()` del hilo: encadenar páginas solo es una factura que nadie pidió.
 *  - **Las dos lecturas paginan distinto.** La bandeja va con `offset` numérico; el hilo, con el
 *    `next_cursor` OPACO que devolvió la llamada anterior, que se manda de vuelta como `offset`.
 *  - **No todas las redes dejan hacer lo mismo.** Antes de pintar un botón, {@link
 *    CommentsResource.actions}: Instagram, X y Bluesky no dejan borrar el comentario de otro,
 *    LinkedIn no tiene "ocultar" —ni Discord ni Telegram tampoco— y Google Business sólo deja
 *    borrar **nuestra propia** respuesta.
 *  - **En Telegram la bandeja empieza el día que se conectó el canal.** La Bot API no sabe leer el
 *    pasado: un bot sólo se entera de lo que pasa mientras está dentro, así que nada anterior a la
 *    conexión existe aquí y nunca existirá. Dilo en tu interfaz — una bandeja que abre vacía en un
 *    canal con movimiento se lee como un fallo tuyo.
 *  - **Todo esto exige plan de pago.** Con un plan gratuito la API devuelve el error 516.
 *  - **Borrar borra en la red**, no sólo en la bandeja. La fila se conserva marcada para que la
 *    siguiente lectura no la vuelva a dar de alta.
 */
import { Resource, requireId } from "./base.js";
import type { Query, RequestOptions, RequestSender, SuccessResponse } from "./base.js";
import type { CatalogResource } from "./catalog.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages } from "../core/pagination.js";
import type {
    Comment,
    CommentActions,
    CommentNetwork,
    CommentReplyResult,
    CommentThread,
    Paginated,
} from "../types.js";

export interface CommentListOptions extends PageOptions {
    /** Sólo estas redes. */
    social_network?: readonly CommentNetwork[] | undefined;
    /** Sólo los de esta cuenta. */
    id_account?: string | undefined;
    /** Sólo los de esta publicación. */
    id_publication?: string | undefined;
    /** Sólo los que no se han leído. */
    unread?: boolean | undefined;
    /** Búsqueda de texto, sin distinguir mayúsculas. */
    search?: string | undefined;
    /**
     * Sólo estas valoraciones (1-5). Es el filtro que hace útil una bandeja de reseñas —"enséñame
     * las de una y dos estrellas"—, y en las redes sin estrellas no deja nada fuera porque sus
     * comentarios no llevan el campo.
     */
    rating?: readonly number[] | undefined;
}

/**
 * La paginación de una lectura EN VIVO, que no es la de la bandeja: `offset` es el `next_cursor`
 * opaco de la llamada anterior, no un número de elementos.
 */
export interface CommentThreadOptions {
    /**
     * Cuántos pedir. **En X es dinero**: se cobra un crédito por cada uno devuelto, y el servidor
     * lo recorta a su propio tope para que un hilo viral no se lleve el saldo del mes por delante.
     */
    limit?: number | undefined;
    /** El `next_cursor` de la página anterior. Sin él se lee la primera. */
    offset?: string | number | undefined;
}

/** Lo que se cambia de un comentario. Los dos campos se pueden mandar en la misma llamada. */
export interface CommentUpdate {
    /** Estado NUESTRO. No toca la red, así que nunca falla por lo que la red permita. */
    read?: boolean | undefined;
    /**
     * Ocultar o mostrar **en la red**. No todas pueden: LinkedIn devuelve el error 946. Míralo
     * antes en {@link CommentsResource.actions}.
     */
    hidden?: boolean | undefined;
}

export class CommentsResource extends Resource {
    /*
     * El catálogo se recibe en vez de pedirse otra vez: `commentActions()` es una constante del
     * despliegue y `CatalogResource` ya la cachea por instancia. Pedirla aquí por nuestra cuenta
     * sería una segunda copia de lo mismo, con su propia caché y su propia vida.
     */
    constructor(
        client: RequestSender,
        private readonly catalog: CatalogResource,
    ) {
        super(client);
    }

    /**
     * LA BANDEJA de toda la organización, ordenada por la fecha de la red.
     *
     * Sale de la base de datos: no llama a ninguna red, no gasta créditos y no falla porque una
     * cuenta esté desconectada. Es una FOTO —`collected_date` dice de cuándo—, así que para ver el
     * estado de ahora mismo de una conversación hay que abrir {@link thread}.
     *
     * **Lo que escribimos nosotros no sale aquí**: nuestras respuestas se guardan (el hilo las
     * necesita) pero no son correo entrante.
     *
     * **En Telegram esto es TODO lo que hay**, y empieza el día que se conectó el canal: no existe
     * lectura en vivo con la que completarlo, ni forma de importar lo anterior.
     *
     * Aquí, y sólo aquí, `id_account` e `id_publication` vienen POBLADOS.
     *
     * ```ts
     * const { data } = await pv.comments.list(orgId, { unread: true, rating: [1, 2] });
     * ```
     */
    async list(
        idOrganization: string,
        options: CommentListOptions & RequestOptions = {},
    ): Promise<Paginated<Comment>> {
        return this.getList<Comment>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/comments`,
            "comments",
            listQuery(options),
            options,
        );
    }

    /** La bandeja, encadenando páginas. Es lectura de base de datos: no cuesta créditos. */
    iterate(
        idOrganization: string,
        options: CommentListOptions & RequestOptions = {},
    ): AsyncGenerator<Comment> {
        return iteratePages<Comment>((page) => this.list(idOrganization, { ...options, ...page }), options);
    }

    /**
     * Cuántos quedan sin leer en la organización. Es el número del badge.
     *
     * Los nuestros no cuentan: un comentario que escribimos nosotros no está pendiente de leer.
     */
    async unreadCount(idOrganization: string, options: RequestOptions = {}): Promise<number> {
        const response = await this.httpGet<{ total: number }>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/unread_comments`,
            undefined,
            options,
        );
        return response.total;
    }

    /**
     * EL HILO de una publicación, leído EN VIVO contra la red.
     *
     * La red manda: el texto, los contadores y la existencia salen de ella, y de lo guardado sólo
     * sobreviven `_id`, `read` y `replied`. Un comentario que la red ya no devuelve se marca
     * borrado y deja de aparecer en la bandeja.
     *
     * **En X cuesta un crédito por comentario devuelto** (`credits_consumed` lo dice después).
     * Una publicación que nunca llegó a enviarse devuelve el error 936: no hay hilo que leer.
     *
     * **En Telegram NO es en vivo**, y es la única excepción a todo lo anterior: la Bot API no tiene
     * ningún método que liste las respuestas a un post, así que lo que vuelve es la bandeja de
     * PlanVortex — lo que el bot ha visto desde que se conectó el canal. No se reconcilia nada y no
     * se marca nada como borrado, porque no hay contra qué comparar. Y un canal sin grupo de debate
     * no tiene comentarios en absoluto: error 965.
     */
    async thread(
        idOrganization: string,
        idPublication: string,
        options: CommentThreadOptions & RequestOptions = {},
    ): Promise<CommentThread> {
        return this.httpGet<CommentThread>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/publish/${requireId(idPublication, "idPublication")}/comments`,
            threadQuery(options),
            options,
        );
    }

    /**
     * EL HILO de una CUENTA, gemelo del anterior, para las redes cuyos comentarios no cuelgan de
     * una publicación nuestra.
     *
     * Hoy es Google Business: una reseña cuelga de la FICHA, no de un post, así que esa cuenta no
     * tiene ninguna publicación con la que llamar a {@link thread}. Ojo con `total`: es el número
     * de RESEÑAS, que no es la longitud de `comments` — nuestras respuestas viajan en el mismo
     * array, colgando de la reseña que contestan.
     */
    async threadByAccount(
        idOrganization: string,
        idAccount: string,
        options: CommentThreadOptions & RequestOptions = {},
    ): Promise<CommentThread> {
        return this.httpGet<CommentThread>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/accounts/${requireId(idAccount, "idAccount")}/comments`,
            threadQuery(options),
            options,
        );
    }

    /**
     * Las RESPUESTAS de un comentario, también en vivo (y también de pago en X).
     *
     * En la primera página —y sólo en la primera— se cuelan las respuestas NUESTRAS que la red
     * todavía no lista: acabamos de escribirlas y la indexación tarda. Sin eso, refrescar el hilo
     * justo después de responder no enseñaría nada y parecería que no se envió.
     */
    async replies(
        idOrganization: string,
        idComment: string,
        options: CommentThreadOptions & RequestOptions = {},
    ): Promise<CommentThread> {
        return this.httpGet<CommentThread>(
            `${this.path(idOrganization, idComment)}/replies`,
            threadQuery(options),
            options,
        );
    }

    /**
     * Responde EN PÚBLICO, colgando de ese comentario.
     *
     * No es un mensaje privado: para escribirle al comentarista por el chat está
     * `pv.messages.send()`, y no todas las redes lo permiten. El texto no puede ir vacío y tiene
     * su propio límite, `comment_characters`, que **no es el de una publicación** (Facebook admite
     * 60.000 en un post y 8.000 en un comentario); pasarse devuelve el error 948.
     *
     * Deja el comentario marcado como leído y respondido.
     */
    async reply(
        idOrganization: string,
        idComment: string,
        text: string,
        options: RequestOptions = {},
    ): Promise<CommentReplyResult> {
        return this.httpPost<CommentReplyResult>(
            `${this.path(idOrganization, idComment)}/reply`,
            { text },
            options,
        );
    }

    /**
     * Cambia `read` (nuestro) y/o `hidden` (de la red) en una sola llamada.
     *
     * Se pueden mandar los dos porque la pantalla los cambia desde el mismo sitio, pero no son lo
     * mismo: `read` no sale de PlanVortex y `hidden` va a la red y puede no estar permitido.
     */
    async update(
        idOrganization: string,
        idComment: string,
        body: CommentUpdate,
        options: RequestOptions = {},
    ): Promise<Comment> {
        return this.putOne<Comment>(this.path(idOrganization, idComment), "comment", body, options);
    }

    /** Marca leído o sin leer. Atajo de {@link update} para lo que se hace todo el rato. */
    async markRead(
        idOrganization: string,
        idComment: string,
        read = true,
        options: RequestOptions = {},
    ): Promise<Comment> {
        return this.update(idOrganization, idComment, { read }, options);
    }

    /**
     * Borra el comentario **en la red social**.
     *
     * Sólo donde la red deja: `delete_own` y `delete_others` de {@link actions} son dos permisos
     * distintos, y en Google Business lo único borrable es nuestra propia respuesta a una reseña.
     * La fila se conserva marcada como borrada para que la siguiente lectura no la resucite.
     *
     * En Telegram la red deja borrar los dos, y aun así depende de un permiso que controla el
     * cliente: el bot tiene que ser administrador del grupo de debate con derecho a borrar. Cuando
     * no lo es, la respuesta es un 969 — que es la diferencia entre "esta red no puede" y "este
     * canal no puede".
     */
    async remove(idOrganization: string, idComment: string, options: RequestOptions = {}): Promise<void> {
        await this.httpDelete<SuccessResponse>(this.path(idOrganization, idComment), undefined, options);
    }

    /**
     * Qué se puede hacer con los comentarios de cada red: responder, ocultar, borrar el propio,
     * borrar el ajeno.
     *
     * Es lo que decide qué botones se pintan, y **no se deduce de `social_capabilities`**: que una
     * red tenga comentarios no dice nada de lo que deja hacer con ellos. Sin argumento devuelve la
     * matriz entera; con una red, sus cuatro banderas (o `undefined` si esa red no tiene
     * comentarios). Cacheado con el resto del catálogo.
     */
    async actions(options?: RequestOptions): Promise<Record<string, CommentActions>>;
    async actions(network: CommentNetwork, options?: RequestOptions): Promise<CommentActions | undefined>;
    async actions(
        networkOrOptions?: CommentNetwork | RequestOptions,
        maybeOptions?: RequestOptions,
    ): Promise<Record<string, CommentActions> | CommentActions | undefined> {
        if (typeof networkOrOptions === "string") {
            const all = await this.catalog.socialCommentActions(maybeOptions);
            return all[networkOrOptions];
        }
        return this.catalog.socialCommentActions(networkOrOptions);
    }

    private path(idOrganization: string, idComment: string): string {
        return `/organizations/${requireId(idOrganization, "idOrganization")}/comments/${requireId(idComment, "idComment")}`;
    }
}

function listQuery(options: CommentListOptions): Query {
    return {
        offset: options.offset,
        limit: options.limit,
        social_network: options.social_network,
        id_account: options.id_account,
        id_publication: options.id_publication,
        //El servidor activa el filtro con la MERA PRESENCIA del parámetro: cualquier valor que no
        //sea el literal "false" cuenta como "sí". Mandar `unread=false` pediría justo lo contrario
        //de lo que dice el código de quien llama, así que un `false` se omite.
        unread: options.unread ? true : undefined,
        search: options.search,
        rating: options.rating,
    };
}

function threadQuery(options: CommentThreadOptions): Query {
    return { limit: options.limit, offset: options.offset };
}
