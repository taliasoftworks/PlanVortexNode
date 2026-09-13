/**
 * Cuentas sociales conectadas a una organización.
 *
 * DOS COSAS QUE NO SE ADIVINAN SOLAS:
 *
 *  - **Una app no puede CONECTAR una cuenta.** Conectar Instagram es un OAuth con una persona
 *    delante, y las credenciales de app no valen para eso: {@link AccountsResource.connectLinks},
 *    {@link AccountsResource.connect} y {@link AccountsResource.enable} contestan 519 si se llaman
 *    con ellas. Se emite un token temporal
 *    (`organizations.createConnectToken`), se le pasa a la persona, y se llaman con un cliente
 *    autenticado con ese token: `pv.asTemporalToken(token)`.
 *  - **`error_code` distinto de 0 es una cuenta rota**, no un fallo de esta llamada. Sigue en la
 *    lista con sus datos, pero ni publica ni mide hasta que alguien la reconecte.
 */
import { Resource, requireId } from "./base.js";
import type { Query, RequestOptions, SuccessResponse } from "./base.js";
import { NO_ERROR_CODE, createErrorFromResponse } from "../core/errors.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages, unwrapOne } from "../core/pagination.js";
import type {
    Account,
    AccountMetrics,
    ConnectLink,
    ConnectResult,
    EnableResult,
    Paginated,
    PersistentMenu,
    SocialNetwork,
} from "../types.js";

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

export interface ConnectLinksOptions extends RequestOptions {
    /** Sólo estas redes. Sin esto vuelven todas las que la organización pueda conectar ahora. */
    social_network?: readonly SocialNetwork[] | undefined;
    /**
     * A qué front de PlanVortex devuelve la red al usuario, para un despliegue de marca blanca.
     *
     * **No es una URL tuya**, y no puede serlo: las redes sólo aceptan `redirect_uri` registrados
     * en su propia configuración de aplicación. Tiene que ser uno de los fronts que el servidor
     * tiene dados de alta o la llamada contesta 532. A dónde vuelve TU usuario cuando termina se
     * decide en `organizations.createConnectToken({redirect_uri})`.
     */
    redirect_uri?: string | undefined;
}

/**
 * Lo que la red social pegó a la URL de vuelta. Se pasa **tal cual**, sin tocar ni filtrar: cada
 * red manda lo suyo (`code` y `state` casi todas, `oauth_token`/`oauth_verifier` X, ...).
 */
export type ConnectCallbackParams = Record<string, string | readonly string[] | undefined>;

export class AccountsResource extends Resource {
    /**
     * Los enlaces de autorización de cada red conectable, para mandar a la persona a la suya.
     *
     * **Con credenciales de app contesta 519.** Se llama con un cliente autenticado con el token
     * temporal: `pv.asTemporalToken(token).accounts.connectLinks(orgId)`.
     *
     * **Una red que no puede dar enlace simplemente no aparece**, y eso es una respuesta legítima y
     * no un fallo: es lo que pasa con Discord en una organización que todavía no ha guardado sus
     * propias credenciales de bot.
     *
     * **MIRA `authorization`, NO si `link` está vacío.** Once de las trece redes son `redirect` y se
     * manda a la persona a `link`. Las otras dos no, y ninguna de las dos falla de forma visible si
     * se recorre la lista redirigiendo a `link`:
     *
     *  - **WhatsApp no es una URL**: su alta es el Embedded Signup de Meta, un popup que levantas tú
     *    con el SDK de JavaScript de Facebook, así que su `link` es cadena vacía y lo que necesitas
     *    para abrirlo viaja en `authorization`. Redirigir a él manda a tu usuario a tu propia página.
     *  - **Telegram sí tiene enlace y aun así no es una redirección**: abre un chat con el bot de
     *    PlanVortex y de ahí no vuelve nadie. La cuenta nace después, cuando la persona mete el bot
     *    en su canal, y se anuncia por el WebSocket y por el webhook `new_account` — nunca como
     *    respuesta a una llamada tuya. Ábrelo en otra pestaña y sigue escuchando.
     *
     * Ver {@link ConnectLink} y {@link SocialAuthorizationMethod}.
     *
     * OJO: la red devuelve al usuario a un front de PlanVortex, no a una URL tuya — ver
     * `redirect_uri` en {@link ConnectLinksOptions}.
     */
    async connectLinks(idOrganization: string, options: ConnectLinksOptions = {}): Promise<ConnectLink[]> {
        return unwrapOne<ConnectLink[]>(
            await this.httpGet<unknown>(
                `/organizations/${requireId(idOrganization, "idOrganization")}/connect_links`,
                { social_network: options.social_network, redirect_uri: options.redirect_uri },
                options,
            ),
            "links",
        );
    }

    /**
     * Completa la conexión con lo que la red social pegó a la URL de vuelta.
     *
     * **Esta llamada no la necesita la mayoría.** La URL de vuelta la construye la red a partir del
     * enlace de {@link connectLinks}, y apunta a un front de PlanVortex: es ese front el que llama
     * aquí. El método existe para quien sirve su propia interfaz en uno de los dominios registrados
     * en el servidor. En la integración normal —la del ejemplo `connect-flow`— basta con mandar al
     * usuario a la `url` del token temporal y esperarlo de vuelta.
     *
     * **El endpoint contesta 200 aunque haya fallado**, con el error dentro del cuerpo, porque el
     * navegador aterriza aquí desde una redirección y un 400 crudo sería una página rota. La
     * librería deshace ese apaño: si viene `errorCode`, **lanza** el error que le toca, igual que
     * cualquier otro método. Lo que devuelve son sólo cuentas buenas.
     *
     * **Y vuelven SIN habilitar**: no ocupan plaza del plan ni publican hasta que se llama a
     * {@link enable}. Una sola autorización puede dejar varias — un usuario de Facebook con cuatro
     * páginas son cuatro—, y por eso hay un paso de elección en medio.
     */
    async connect(
        idOrganization: string,
        socialNetwork: SocialNetwork,
        params: ConnectCallbackParams = {},
        options: RequestOptions = {},
    ): Promise<ConnectResult> {
        const path =
            `/organizations/${requireId(idOrganization, "idOrganization")}` +
            `/account-connect/${requireId(socialNetwork, "socialNetwork")}`;
        const body = await this.httpGet<{
            accounts?: Account[];
            errorCode?: string;
            errorMsg?: string;
            redirect_uri?: string;
        }>(path, params as Query, options);

        if (body.errorCode) {
            //El `errorCode` viaja como CADENA y es el código del catálogo, así que se reconstruye
            //el error como si hubiera venido en un cuerpo de error normal: así el integrador coge
            //un `AccountError` o un `PlanLimitError` y no una forma distinta sólo aquí.
            const code = Number(body.errorCode);
            throw createErrorFromResponse({
                body: {
                    code: Number.isFinite(code) ? code : NO_ERROR_CODE,
                    message: body.errorMsg || `La conexión no se completó (${body.errorCode}).`,
                },
                status: 200,
            });
        }

        return {
            accounts: body.accounts ?? [],
            ...(body.redirect_uri === undefined ? {} : { redirect_uri: body.redirect_uri }),
        };
    }

    /**
     * Da de alta una de las cuentas que dejó {@link connect}, o recupera una que se desconectó
     * mientras su token guardado siga sirviendo (si no, error 700 y hay que autorizar otra vez).
     *
     * **Es el paso que ocupa plaza del plan**: con el cupo lleno contesta 706, así que se llama una
     * a una y se mira el hueco antes (`organizations.limits`). Y es también el que enciende los
     * webhooks de la red, en cualquier plan que no sea el gratuito.
     *
     * **En Slack es además lo que mete la app dentro del canal**, y ahí hay un caso que no da
     * error aquí y sí en la primera publicación: en un canal **público** la app entra sola, y en
     * uno **privado** no puede —Slack no tiene API para eso— y hace falta que una persona escriba
     * `/invite @PlanVortex` dentro del canal. Esta llamada devuelve bien igual y la cuenta queda
     * conectada; lo que falla es publicar, con el error 980. Avísalo **antes** de que elijan el
     * canal, no después.
     */
    async enable(
        idOrganization: string,
        idAccount: string,
        options: RequestOptions = {},
    ): Promise<EnableResult> {
        const body = await this.httpPost<{ success?: boolean; redirect_uri?: string }>(
            `${this.path(idOrganization, idAccount)}/enable`,
            undefined,
            options,
        );
        //`success: true` no se devuelve: un fallo llega como excepción, así que aquí sólo interesa
        //si el token temporal traía un sitio al que mandar al usuario después.
        return body.redirect_uri === undefined ? {} : { redirect_uri: body.redirect_uri };
    }

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
