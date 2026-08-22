/**
 * Cuentas sociales conectadas a una organización.
 *
 * DOS COSAS QUE NO SE ADIVINAN SOLAS:
 *
 *  - **Una app no puede CONECTAR una cuenta.** Conectar Instagram es un OAuth con una persona
 *    delante, y las credenciales de app no valen para eso. El camino es el token temporal de
 *    conexión, y es la fase 9 del roadmap: aquí están la lista, la ficha, el nombre, el borrado,
 *    las métricas y el menú del chat.
 *  - **`error_code` distinto de 0 es una cuenta rota**, no un fallo de esta llamada. Sigue en la
 *    lista con sus datos, pero ni publica ni mide hasta que alguien la reconecte.
 */
import { Resource, requireId } from "./base.js";
import type { RequestOptions, SuccessResponse } from "./base.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages, unwrapOne } from "../core/pagination.js";
import type { Account, AccountMetrics, Paginated, PersistentMenu, SocialNetwork } from "../types.js";

/**
 * Las capacidades por las que se puede filtrar la lista. Son las mismas que publica
 * `catalog.socialCapabilities()`, aplicadas en el servidor: es la forma de pedir "las cuentas con
 * las que puedo publicar" sin mantener tu propia tabla de qué red hace qué.
 */
export type AccountCapability =
    "publications" | "messages" | "products" | "webhooks" | "persistent_menu" | "comments";

export interface AccountListOptions extends PageOptions {
    /** Búsqueda libre sobre el nombre y el usuario de la cuenta. */
    name?: string | undefined;
    /** Sólo estas redes. */
    social_network?: readonly SocialNetwork[] | undefined;
    /** Sólo estas cuentas, por identificador. */
    accounts?: readonly string[] | undefined;
    /** Sólo las cuentas cuya red sabe hacer esto. */
    capability?: AccountCapability | undefined;
}

export interface AccountMetricsOptions extends RequestOptions {
    /** Principio del rango. Por defecto, un día antes de `to_date`. */
    from_date?: Date | string | undefined;
    /** Final del rango. Por defecto, ahora. */
    to_date?: Date | string | undefined;
    /**
     * Sólo estas métricas, por su nombre CRUDO — los que devuelve {@link AccountsResource.metricList}.
     * Sin esto vuelven todas las medidas.
     */
    names?: readonly string[] | undefined;
}

export class AccountsResource extends Resource {
    /** Las cuentas de una organización. */
    async list(
        idOrganization: string,
        options: AccountListOptions & RequestOptions = {},
    ): Promise<Paginated<Account>> {
        return this.getList<Account>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/accounts`,
            "accounts",
            {
                offset: options.offset,
                limit: options.limit,
                name: options.name,
                social_network: options.social_network,
                accounts: options.accounts,
                capability: options.capability,
            },
            options,
        );
    }

    /** Las cuentas de una organización, encadenando páginas. */
    iterate(
        idOrganization: string,
        options: AccountListOptions & RequestOptions = {},
    ): AsyncGenerator<Account> {
        return iteratePages<Account>((page) => this.list(idOrganization, { ...options, ...page }), options);
    }

    /** La ficha de una cuenta. */
    async get(idOrganization: string, idAccount: string, options: RequestOptions = {}): Promise<Account> {
        return this.getOne<Account>(this.path(idOrganization, idAccount), "account", undefined, options);
    }

    /** Cambia el nombre con el que la cuenta se ve en PlanVortex. Es lo único editable. */
    async update(
        idOrganization: string,
        idAccount: string,
        body: { name?: string },
        options: RequestOptions = {},
    ): Promise<Account> {
        return this.putOne<Account>(this.path(idOrganization, idAccount), "account", body, options);
    }

    /**
     * Desconecta la cuenta y **borra sus publicaciones**. Lo ya publicado en la red se queda donde
     * está: esto no la toca.
     */
    async remove(idOrganization: string, idAccount: string, options: RequestOptions = {}): Promise<void> {
        await this.httpDelete<SuccessResponse>(this.path(idOrganization, idAccount), undefined, options);
    }

    /**
     * La serie de métricas ya medidas de una cuenta.
     *
     * Es lectura de lo guardado, no una llamada a la red: mirar la gráfica no cuesta créditos. El
     * agrupado lo decide el rango — hasta 31 días por día, hasta 720 por mes, y de ahí por año— y
     * viene dicho en `group`.
     */
    async metrics(
        idOrganization: string,
        idAccount: string,
        options: AccountMetricsOptions = {},
    ): Promise<AccountMetrics> {
        return this.httpGet<AccountMetrics>(
            `${this.path(idOrganization, idAccount)}/metrics`,
            {
                from_date: options.from_date,
                to_date: options.to_date,
                names: options.names,
            },
            options,
        );
    }

    /**
     * Los nombres CRUDOS de las métricas que publica la red de esta cuenta.
     *
     * Son los que se pasan a {@link metrics} y los que vuelven en cada fila. No es el vocabulario
     * común —eso es `metrics` de una publicación—: aquí cada red habla su idioma
     * (`page_impressions`, `total_interactions`, `allPageViews`).
     */
    async metricList(
        idOrganization: string,
        idAccount: string,
        options: RequestOptions = {},
    ): Promise<string[]> {
        return this.httpGet<string[]>(
            `${this.path(idOrganization, idAccount)}/metric_list`,
            undefined,
            options,
        );
    }

    /**
     * El menú fijo del chat, una entrada por idioma.
     *
     * Sólo las redes con mensajería lo tienen: en las demás la llamada devuelve el error 710. Se
     * comprueba con `persistent_menu` de `catalog.socialCapabilities()`.
     */
    async getPersistentMenu(
        idOrganization: string,
        idAccount: string,
        options: RequestOptions = {},
    ): Promise<PersistentMenu> {
        return unwrapOne<PersistentMenu>(
            await this.httpGet<unknown>(
                `${this.path(idOrganization, idAccount)}/persistent_menu`,
                undefined,
                options,
            ),
            "persistent_menu",
        );
    }

    /**
     * Reemplaza el menú fijo del chat. Es un REEMPLAZO: lo que no vaya en el array desaparece.
     *
     * La entrada con `locale: "default"` es obligatoria — es la que se enseña cuando ninguna otra
     * encaja.
     */
    async setPersistentMenu(
        idOrganization: string,
        idAccount: string,
        menu: PersistentMenu,
        options: RequestOptions = {},
    ): Promise<PersistentMenu> {
        return unwrapOne<PersistentMenu>(
            await this.httpPost<unknown>(
                `${this.path(idOrganization, idAccount)}/persistent_menu`,
                { persistent_menu: menu },
                options,
            ),
            "persistent_menu",
        );
    }

    private path(idOrganization: string, idAccount: string): string {
        return `/organizations/${requireId(idOrganization, "idOrganization")}/accounts/${requireId(idAccount, "idAccount")}`;
    }
}
