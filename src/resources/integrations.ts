/**
 * Integraciones: las herramientas de las que una organización SACA material.
 *
 * OJO CON LA PALABRA. Una **integración** es una conexión con un tercero del que se trae contenido
 * —el Drive del cliente, el feed de su blog, su tienda—. El acceso al API de PlanVortex es otra
 * cosa: una **app** (`pv.apps`). Media web ha usado la misma palabra para las dos y es un lío que no
 * conviene heredar.
 *
 * LO QUE HAY QUE SABER ANTES DE LLAMAR A NADA DE AQUÍ:
 *
 *  - **Hay tres formas de conectar y las decide el proveedor**, por sus puertas y nunca por su
 *    nombre ({@link IntegrationsResource.providers}): con OAuth (`requires_oauth`, Google Drive) se
 *    pide un {@link IntegrationsResource.connectLink} y se manda el `code`; con un enlace que NO es
 *    OAuth (`connect_link` sin `requires_oauth`, WooCommerce) el usuario aprueba en su tienda y la
 *    clave llega sola; y sin enlace (RSS) se manda directamente el formulario de `config_fields`.
 *  - **Es un recurso del plan** (`integrations`, `0` en el gratuito): pasarse devuelve el error
 *    1404. Sólo cuentan las habilitadas, y cada tienda cuenta una.
 *  - **Las credenciales no salen nunca.** Lo que hay para saber si la conexión está viva es
 *    `connected`, y el motivo cuando no lo está, en `error_code`.
 *  - **Reconectar no es crear.** Renueva las credenciales del MISMO documento, va por permiso de
 *    `update` y no vuelve a ocupar cupo.
 *  - **`config` depende del proveedor**: vacío en Google Drive, el feed en RSS y cómo llegar a la
 *    tienda en WooCommerce. El de una tienda no se puede editar (2220): cambiar de tienda es reconectar.
 *  - **Desconectar una tienda no revoca su clave**: WooCommerce no deja que una app borre la suya.
 *    Hay que decirle al usuario que la borre en su WordPress, y `config.key_ending` dice cuál.
 */
import { Resource, requireId } from "./base.js";
import type { RequestOptions, SuccessResponse } from "./base.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages } from "../core/pagination.js";
import type {
    Integration,
    IntegrationCatalogPage,
    IntegrationConnectRequest,
    IntegrationPickerConfig,
    IntegrationProvider,
    IntegrationProviderName,
    IntegrationUpdate,
    Paginated,
} from "../types.js";

export interface IntegrationListOptions extends PageOptions {
    /** Sólo las de este proveedor. */
    provider?: IntegrationProviderName | undefined;
}

export interface ConnectLinkOptions extends RequestOptions {
    /**
     * A dónde devolver al usuario después de autorizar. Tiene que estar en la lista blanca del
     * despliegue (`FRONT_URL_REDIRECT`) o la API devuelve el error 532.
     */
    redirect_uri?: string | undefined;
    /**
     * WooCommerce: la dirección de la tienda, OBLIGATORIA ahí (es lo que dice `connect_link_fields`)
     * porque el enlace apunta a SU WordPress. Los demás proveedores la ignoran.
     */
    url?: string | undefined;
    /**
     * WooCommerce: reconectar ESTA tienda con el botón en vez de conectar una nueva. La clave se
     * renueva en el mismo documento y no ocupa cupo. Pide permiso de `update`.
     */
    id_integration?: string | undefined;
}

/** Qué página del catálogo de una tienda se pide. */
export interface IntegrationProductsOptions extends RequestOptions {
    /**
     * El `next_cursor` de la página anterior, TAL CUAL llegó. Sin él, la primera página. Es opaco: ni
     * se construye ni se interpreta, y uno que no emitió la API es un 2208.
     */
    cursor?: string | undefined;
    /** Lo que se busca, con el buscador de la propia tienda. */
    search?: string | undefined;
    /** Productos por página: 50 si no se dice, y el servidor lo deja entre 1 y 100. */
    limit?: number | undefined;
}

export class IntegrationsResource extends Resource {
    /**
     * El catálogo de proveedores: cómo se conecta cada uno, qué aporta y qué campos lleva su
     * formulario.
     *
     * **Es la única fuente de verdad de esa información.** No copies el formulario del RSS a tu
     * código: `config_fields` lo describe, y cambia con el servidor.
     *
     * No lleva autenticación de organización: es una constante del despliegue.
     */
    async providers(options: RequestOptions = {}): Promise<IntegrationProvider[]> {
        const response = await this.httpGet<{ providers: IntegrationProvider[] }>(
            "/integration_providers",
            undefined,
            options,
        );
        return response.providers;
    }

    /**
     * Las integraciones de la organización, de la más reciente a la más antigua.
     *
     * **Sin `limit` no hay límite**: vuelven todas. Es la única lista de esta API que se comporta
     * así — las demás cortan en 10.
     */
    async list(
        idOrganization: string,
        options: IntegrationListOptions & RequestOptions = {},
    ): Promise<Paginated<Integration>> {
        return this.getList<Integration>(
            this.path(idOrganization),
            "integrations",
            { provider: options.provider, offset: options.offset, limit: options.limit },
            options,
        );
    }

    /** Las integraciones de la organización, encadenando páginas. */
    iterate(
        idOrganization: string,
        options: IntegrationListOptions & RequestOptions = {},
    ): AsyncGenerator<Integration> {
        return iteratePages<Integration>(
            (page) => this.list(idOrganization, { ...options, ...page }),
            options,
        );
    }

    /** Una integración. */
    async get(
        idOrganization: string,
        idIntegration: string,
        options: RequestOptions = {},
    ): Promise<Integration> {
        return this.getOne<Integration>(
            `${this.path(idOrganization)}/${requireId(idIntegration, "idIntegration")}`,
            "integration",
            undefined,
            options,
        );
    }

    /**
     * El enlace al que mandar al usuario, en los proveedores con `connect_link`. **Sólo esos**:
     * pedirlo para el RSS devuelve el error 2201.
     *
     *  - **Google Drive**: su pantalla de consentimiento. El proveedor devuelve al usuario al
     *    `redirect_uri` con un `code` en la query, y ese `code` es lo que se pasa a {@link connect}.
     *    Es de un solo uso.
     *  - **WooCommerce**: la pantalla de aprobar de SU tienda, así que lleva `url`. La tienda se
     *    comprueba YA y sin claves (https, un cortafuegos delante, que haya WooCommerce), para que lo
     *    que va a fallar falle con el usuario todavía delante. Tras aprobar, la tienda nos manda la
     *    clave directamente y el usuario vuelve con `id_integration` en la query. **No te fíes de
     *    `success`: lee esa integración** con {@link get}. Un 2200 es que la clave no llegó (canceló);
     *    `error_code` 2219, que se está comprobando (unos segundos: vuelve a leerla); otro código, lo
     *    que falló; ninguno, conectada. El enlace dura 15 minutos y vale una vez. Con enlaces
     *    permanentes "simples" la tienda no tiene botón (2216 `plain_permalinks`): conéctala con claves.
     */
    async connectLink(
        idOrganization: string,
        provider: IntegrationProviderName,
        options: ConnectLinkOptions = {},
    ): Promise<string> {
        const response = await this.httpGet<{ url: string }>(
            `${this.path(idOrganization)}/${provider}/connect_link`,
            { redirect_uri: options.redirect_uri, url: options.url, id_integration: options.id_integration },
            options,
        );
        return response.url;
    }

    /**
     * Conecta una integración nueva. **Ocupa cupo del plan** (error 1404 si no queda).
     *
     * El cuerpo depende del proveedor: `{provider: "google_drive", code}` para el OAuth, o el
     * formulario de `config_fields` **PLANO** —no dentro de un `config`— para el resto. El `config`
     * es lo que el servidor construye y devuelve, no lo que se manda.
     *
     * Una tienda con claves creadas a mano (con permiso de **lectura**) va igual; las claves se prueban
     * contra la tienda antes de guardar nada, y una organización puede conectar varias tiendas.
     *
     * ```ts
     * const integration = await pv.integrations.connect(orgId, {
     *     provider: "rss",
     *     url: "https://blog.example/feed",
     *     id_accounts: [accountId],
     * });
     *
     * const store = await pv.integrations.connect(orgId, {
     *     provider: "woocommerce",
     *     url: "https://tienda.example.com",
     *     consumer_key: "ck_...",
     *     consumer_secret: "cs_...",
     * });
     * ```
     */
    async connect(
        idOrganization: string,
        body: IntegrationConnectRequest,
        options: RequestOptions = {},
    ): Promise<Integration> {
        return this.postOne<Integration>(this.path(idOrganization), "integration", body, options);
    }

    /**
     * Renueva las credenciales de una integración que ya existe —caducó el token, el usuario revocó
     * el permiso— o revalida la configuración de un feed, sin cambiar de documento.
     *
     * Mismo cuerpo que {@link connect}, porque quien lo interpreta es el mismo código del proveedor.
     * **No vuelve a ocupar cupo** y va por permiso de `update`, no de `create`.
     */
    async reconnect(
        idOrganization: string,
        idIntegration: string,
        body: IntegrationConnectRequest,
        options: RequestOptions = {},
    ): Promise<Integration> {
        return this.postOne<Integration>(
            `${this.path(idOrganization)}/${requireId(idIntegration, "idIntegration")}/reconnect`,
            "integration",
            body,
            options,
        );
    }

    /**
     * Cambia el nombre, la configuración o el interruptor.
     *
     * `enabled: false` la deja conectada pero fuera de juego: no la barre el job y **deja de contar
     * cupo**. Es lo que hay que usar para pausar un feed en vez de borrarlo.
     */
    async update(
        idOrganization: string,
        idIntegration: string,
        body: IntegrationUpdate,
        options: RequestOptions = {},
    ): Promise<Integration> {
        return this.putOne<Integration>(
            `${this.path(idOrganization)}/${requireId(idIntegration, "idIntegration")}`,
            "integration",
            body,
            options,
        );
    }

    /**
     * Borra la integración y **revoca en el proveedor** cuando éste sabe hacerlo.
     *
     * **WooCommerce no sabe**: una app no puede borrar su propia clave. Tras desconectar una tienda
     * hay que decirle al usuario que la borre él en WooCommerce → Ajustes → Avanzado → API REST; es
     * la que acaba en `config.key_ending` (léela ANTES de borrar la integración).
     *
     * Lo que ya se importó se queda: los ficheros son de la biblioteca de la organización, no de la
     * integración.
     */
    async remove(idOrganization: string, idIntegration: string, options: RequestOptions = {}): Promise<void> {
        await this.httpDelete<SuccessResponse>(
            `${this.path(idOrganization)}/${requireId(idIntegration, "idIntegration")}`,
            undefined,
            options,
        );
    }

    /**
     * Lo que el navegador necesita para abrir el selector del proveedor. **Sólo Google Drive**: en
     * cualquier otro devuelve el error 2201.
     *
     * Lleva un `access_token` VIVO y de vida corta. No lo guardes, no lo registres en un log y no lo
     * mandes a ningún sitio que no sea el Picker; se pide justo antes de abrirlo.
     *
     * `app_id` es el NÚMERO del proyecto de Google Cloud, no su identificador de texto: con el scope
     * `drive.file` el permiso sobre el fichero elegido se concede al proyecto que lo eligió, así que
     * tiene que ser el mismo que el del cliente OAuth.
     */
    async pickerConfig(
        idOrganization: string,
        idIntegration: string,
        options: RequestOptions = {},
    ): Promise<IntegrationPickerConfig> {
        return this.httpGet<IntegrationPickerConfig>(
            `${this.path(idOrganization)}/${requireId(idIntegration, "idIntegration")}/picker_config`,
            undefined,
            options,
        );
    }

    /**
     * Una página del catálogo de una tienda conectada (un proveedor con `catalog`), para elegir los
     * productos de un plan `from_catalog`: sus `external_id` son lo que va en `source.products`. En
     * cualquier otro proveedor, error 2207; con la integración deshabilitada, 2209.
     *
     * Se lee EN VIVO de la tienda en cada llamada, y por eso no hay un `iterateProducts`: cada página
     * es una petición al hosting del cliente, y recorrer diez mil productos para encontrar tres es
     * trabajo de `search`.
     *
     *  - **Pagina por cursor opaco**: `next_cursor` se devuelve tal cual en `cursor`, y sin él era la
     *    última página.
     *  - **Lo que el público no ve no viene** (borradores, privados, ocultos). **Lo agotado SÍ viene,
     *    con `available: false`**: se enseña marcado y no se deja elegir, o el plan da 2112.
     *  - `price` es texto para copiar literal. Ausente es "sin precio", y también lo es en los
     *    productos con impuesto de una tienda con `config.tax_location_missing`.
     *  - Una tienda que rechaza su clave (2211) queda marcada con ese `error_code` hasta reconectarla;
     *    un cortafuegos (2212) o una tienda que no contesta (2213), no.
     *
     * ```ts
     * const page = await pv.integrations.products(orgId, storeId, { search: "taza" });
     * const choosable = page.items.filter((product) => product.available);
     * ```
     */
    async products(
        idOrganization: string,
        idIntegration: string,
        options: IntegrationProductsOptions = {},
    ): Promise<IntegrationCatalogPage> {
        return this.httpGet<IntegrationCatalogPage>(
            `${this.path(idOrganization)}/${requireId(idIntegration, "idIntegration")}/products`,
            { cursor: options.cursor, search: options.search, limit: options.limit },
            options,
        );
    }

    private path(idOrganization: string): string {
        return `/organizations/${requireId(idOrganization, "idOrganization")}/integrations`;
    }
}
