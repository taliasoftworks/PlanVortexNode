/**
 * Integraciones: las herramientas de las que una organización SACA material.
 *
 * OJO CON LA PALABRA. Una **integración** es una conexión con un tercero del que se trae contenido
 * —el Drive del cliente, el feed de su blog—. El acceso al API de PlanVortex es otra cosa: una
 * **app** (`pv.apps`), y sólo en el plan Custom. Media web ha usado la misma palabra para las dos y
 * es un lío que no conviene heredar.
 *
 * LO QUE HAY QUE SABER ANTES DE LLAMAR A NADA DE AQUÍ:
 *
 *  - **Hay dos formas de conectar y las decide el proveedor**: con OAuth (`requires_oauth: true`,
 *    Google Drive) se pide un {@link IntegrationsResource.connectLink} y se manda el `code`; sin él
 *    (RSS) se manda directamente el formulario que describe `config_fields`. Nunca se adivina: se
 *    lee de {@link IntegrationsResource.providers}.
 *  - **Es un recurso del plan** (`integrations`, `0` en el gratuito): pasarse devuelve el error
 *    1404. Sólo cuentan las habilitadas.
 *  - **Las credenciales no salen nunca.** Lo que hay para saber si la conexión está viva es
 *    `connected`, y el motivo cuando no lo está, en `error_code`.
 *  - **Reconectar no es crear.** Renueva las credenciales del MISMO documento, va por permiso de
 *    `update` y no vuelve a ocupar cupo.
 *  - **`config` es del RSS.** En Google Drive es un objeto vacío: el Picker lo pone todo.
 */
import { Resource, requireId } from "./base.js";
import type { RequestOptions, SuccessResponse } from "./base.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages } from "../core/pagination.js";
import type {
    Integration,
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
     * El enlace de autorización de un proveedor con OAuth. **Sólo los que lo usan**: pedirlo para
     * el RSS devuelve el error 2201.
     *
     * Se manda al usuario ahí, el proveedor lo devuelve al `redirect_uri` con un `code` en la query,
     * y ese `code` es lo que se pasa a {@link connect}. Es de un solo uso.
     */
    async connectLink(
        idOrganization: string,
        provider: IntegrationProviderName,
        options: ConnectLinkOptions = {},
    ): Promise<string> {
        const response = await this.httpGet<{ url: string }>(
            `${this.path(idOrganization)}/${provider}/connect_link`,
            { redirect_uri: options.redirect_uri },
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
     * ```ts
     * const integration = await pv.integrations.connect(orgId, {
     *     provider: "rss",
     *     url: "https://blog.example/feed",
     *     id_accounts: [accountId],
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

    private path(idOrganization: string): string {
        return `/organizations/${requireId(idOrganization, "idOrganization")}/integrations`;
    }
}
