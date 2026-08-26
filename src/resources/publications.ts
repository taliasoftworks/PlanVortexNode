/**
 * Publicaciones: el camino que vende `/developers`.
 *
 * LO QUE HAY QUE SABER ANTES DE LLAMAR A NADA DE AQUÍ:
 *
 *  - **Crear una publicación con contenido inválido NO da error.** El servidor la guarda en estado
 *    `withErrors` con el motivo dentro (`publication_errors`), porque el contenido se valida contra
 *    la red y eso no es un fallo de la petición. Un `try/catch` no basta: hay que mirar `state`.
 *  - **Sin `publish_date` sale YA**, en la propia petición. Con fecha futura queda `ready` y la
 *    manda el robot a su hora.
 *  - **`files` se manda como identificadores y vuelve poblado.** Lo que llega en la respuesta son
 *    `Upload` enteros, no ids (§ el aviso de `Publication`).
 *  - **`id_account` cambia de forma según la operación**: aquí (crear, leer, reintentar) viene
 *    resuelto, y en el listado y al actualizar viene como identificador. `accountId(publication)`
 *    lo tapa.
 *  - **Borrar una publicación la borra TAMBIÉN de la red social.** No es sólo quitarla de la
 *    biblioteca.
 */
import { Resource, requireId } from "./base.js";
import type { Query, RequestOptions, SuccessResponse } from "./base.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages } from "../core/pagination.js";
import type {
    Paginated,
    Publication,
    PublicationInput,
    PublicationState,
    PublicationStats,
    PublicationStatsHistory,
    SocialNetwork,
} from "../types.js";

export interface PublicationListOptions extends PageOptions {
    /** Sólo las publicadas o creadas a partir de esta fecha, según `orderByPublish`. */
    from_date?: Date | string | undefined;
    /** Sólo hasta esta fecha. */
    to_date?: Date | string | undefined;
    /** Búsqueda de texto sobre el nombre, el texto y el título. */
    search?: string | undefined;
    /** Ordena y filtra por `publish_date` en vez de por `creation_date`. */
    orderByPublish?: boolean | undefined;
    /** Sólo estos estados. */
    state?: readonly PublicationState[] | undefined;
    /** Sólo estas cuentas, por identificador. */
    accounts?: readonly string[] | undefined;
    /** Sólo estas redes. */
    social_network?: readonly SocialNetwork[] | undefined;
}

/** Lo que devuelve reintentar: la publicación tal y como quedó, y el tope que aplica el servidor. */
export interface PublicationRetryResult {
    publication: Publication;
    /** Reintentos manuales que admite en total. Léelo de aquí en vez de escribirlo tú. */
    max_retries: number;
}

export class PublicationsResource extends Resource {
    /**
     * Crea una publicación en una cuenta.
     *
     * Sin `publish_date` se envía en esta misma petición y la respuesta ya dice si salió
     * (`state: "sended"`) o si falló y por qué. Con fecha futura queda `ready`.
     *
     * ```ts
     * const publication = await pv.publications.create(orgId, accountId, {
     *     social_network: "instagram",
     *     text: "Nuevo horno, nuevas hogazas",
     *     files: [upload._id],
     *     publish_date: new Date("2026-09-01T10:00:00Z"),
     * });
     * ```
     */
    async create(
        idOrganization: string,
        idAccount: string,
        body: PublicationInput,
        options: RequestOptions = {},
    ): Promise<Publication> {
        return this.postOne<Publication>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/accounts/${requireId(idAccount, "idAccount")}/publish`,
            "publication",
            serializeInput(body),
            options,
        );
    }

    /**
     * Una publicación, con sus ficheros y su cuenta ya resueltos.
     *
     * Una publicación **borrada** contesta 917, igual que una que nunca existió.
     */
    async get(
        idOrganization: string,
        idPublication: string,
        options: RequestOptions = {},
    ): Promise<Publication> {
        return this.getOne<Publication>(
            this.path(idOrganization, idPublication),
            "publication",
            undefined,
            options,
        );
    }

    /** Las publicaciones de una organización. */
    async list(
        idOrganization: string,
        options: PublicationListOptions & RequestOptions = {},
    ): Promise<Paginated<Publication>> {
        return this.getList<Publication>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/publish`,
            "publications",
            listQuery(options),
            options,
        );
    }

    /** Las publicaciones de una organización, encadenando páginas. */
    iterate(
        idOrganization: string,
        options: PublicationListOptions & RequestOptions = {},
    ): AsyncGenerator<Publication> {
        return iteratePages<Publication>(
            (page) => this.list(idOrganization, { ...options, ...page }),
            options,
        );
    }

    /** Las publicaciones de UNA cuenta. Mismos filtros que {@link list}. */
    async listByAccount(
        idOrganization: string,
        idAccount: string,
        options: PublicationListOptions & RequestOptions = {},
    ): Promise<Paginated<Publication>> {
        return this.getList<Publication>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/accounts/${requireId(idAccount, "idAccount")}/publish`,
            "publications",
            listQuery(options),
            options,
        );
    }

    /**
     * Cambia una publicación que todavía no ha salido. Una `sended` devuelve el error 921.
     *
     * Editar PONE EL CONTADOR DE REINTENTOS A CERO: el contador cuenta intentos de publicar *ese*
     * contenido, y acabas de cambiarlo. Es además la salida cuando se agotan los tres.
     */
    async update(
        idOrganization: string,
        idPublication: string,
        body: Partial<PublicationInput>,
        options: RequestOptions = {},
    ): Promise<Publication> {
        return this.putOne<Publication>(
            this.path(idOrganization, idPublication),
            "publication",
            serializeInput(body),
            options,
        );
    }

    /**
     * Lo mismo que {@link update}, por la ruta que además nombra la cuenta.
     *
     * La API tiene las dos y **las sirve el mismo handler**: da igual cuál se llame, y `idAccount`
     * sólo se usa para comprobar que la cuenta existe y es de esa organización. Existe aquí porque
     * es una ruta pública y quien venga leyendo la documentación la va a buscar; para escribir
     * código nuevo, {@link update}.
     */
    async updateByAccount(
        idOrganization: string,
        idAccount: string,
        idPublication: string,
        body: Partial<PublicationInput>,
        options: RequestOptions = {},
    ): Promise<Publication> {
        return this.putOne<Publication>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/accounts/${requireId(idAccount, "idAccount")}/publish/${requireId(idPublication, "idPublication")}`,
            "publication",
            serializeInput(body),
            options,
        );
    }

    /**
     * Borra una publicación **y también el post en la red social**.
     *
     * En X borrar cuesta créditos: sin ellos devuelve un 940 en vez de un error genérico.
     *
     * Después deja de leerse por id: {@link get} contesta 917, y por tanto un segundo
     * `remove()` también.
     */
    async remove(idOrganization: string, idPublication: string, options: RequestOptions = {}): Promise<void> {
        await this.httpDelete<SuccessResponse>(this.path(idOrganization, idPublication), undefined, options);
    }

    /**
     * Vuelve a intentar una publicación que falló, sin tocar su contenido.
     *
     * Se reintenta EN LA PETICIÓN, así que la respuesta ya dice si esta vez salió. Cada llamada
     * gasta un reintento aunque vuelva a fallar por el contenido; sólo los créditos de X cortan
     * antes de gastarlo. Una publicación que no está en `withErrors` devuelve un 949, y agotar el
     * tope, un 950.
     */
    async retry(
        idOrganization: string,
        idPublication: string,
        options: RequestOptions = {},
    ): Promise<PublicationRetryResult> {
        return this.httpPost<PublicationRetryResult>(
            `${this.path(idOrganization, idPublication)}/retry`,
            undefined,
            options,
        );
    }

    /**
     * Pide las métricas A LA RED, en vivo, y devuelve su desglose crudo.
     *
     * **En X esto cuesta un crédito por lectura.** Para pintar una gráfica usa {@link stats}, que
     * lee lo ya medido y no cuesta nada.
     */
    async metrics(
        idOrganization: string,
        idPublication: string,
        options: RequestOptions = {},
    ): Promise<PublicationStats> {
        return this.httpGet<PublicationStats>(
            `${this.path(idOrganization, idPublication)}/metrics`,
            undefined,
            options,
        );
    }

    /**
     * La evolución medida de una publicación: una fila por día, más su última medición.
     *
     * Es lectura pura de lo guardado: mirar la gráfica no llama a la red y no cuesta créditos. Una
     * `series` vacía es una respuesta válida —recién enviada, o una red sin estadísticas—, no un
     * error. Cada `metrics` es el ACUMULADO a esa fecha, no el incremento del día.
     */
    async stats(
        idOrganization: string,
        idPublication: string,
        options: RequestOptions = {},
    ): Promise<PublicationStatsHistory> {
        return this.httpGet<PublicationStatsHistory>(
            `${this.path(idOrganization, idPublication)}/stats`,
            undefined,
            options,
        );
    }

    /**
     * Lo que hay publicado en el muro de la cuenta **según la red**, no según PlanVortex: incluye
     * lo que se publicó por fuera.
     *
     * **En X cuesta un crédito por elemento leído**, así que el `limit` es dinero.
     */
    async listOnNetwork(
        idOrganization: string,
        idAccount: string,
        options: PageOptions & RequestOptions = {},
    ): Promise<Paginated<Publication>> {
        return this.getList<Publication>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/accounts/${requireId(idAccount, "idAccount")}/social_publications`,
            "publications",
            { offset: options.offset, limit: options.limit },
            options,
        );
    }

    private path(idOrganization: string, idPublication: string): string {
        return `/organizations/${requireId(idOrganization, "idOrganization")}/publish/${requireId(idPublication, "idPublication")}`;
    }
}

function listQuery(options: PublicationListOptions): Query {
    return {
        offset: options.offset,
        limit: options.limit,
        from_date: options.from_date,
        to_date: options.to_date,
        search: options.search,
        //El servidor lo lee como el literal "true": un `false` no cambia nada, así que se omite.
        orderByPublish: options.orderByPublish ? true : undefined,
        state: options.state,
        accounts: options.accounts,
        social_network: options.social_network,
    };
}

/**
 * Un `Date` en `publish_date` se manda en ISO.
 *
 * `buildQuery` ya lo hace en la query, pero el cuerpo va por `JSON.stringify`, que serializa un
 * `Date` en ISO igualmente — esto es para que el tipo lo admita sin que quien llama tenga que
 * escribir `.toISOString()`, que es lo primero que se olvida.
 */
function serializeInput(body: Partial<PublicationInput>): Record<string, unknown> {
    const { publish_date, ...rest } = body;
    return {
        ...rest,
        ...(publish_date === undefined
            ? {}
            : { publish_date: typeof publish_date === "string" ? publish_date : publish_date.toISOString() }),
    };
}
