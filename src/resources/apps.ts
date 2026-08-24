/**
 * Apps de cliente: las credenciales con las que una integración se autentica contra PlanVortex.
 *
 * ESTE RECURSO ES RARO Y CONVIENE SABER POR QUÉ ANTES DE USARLO:
 *
 *  - **Casi todo aquí exige un token de USUARIO, no de app.** Con `client_credentials` —o sea, con
 *    el cliente que devuelve `new PlanVortex({clientId, clientSecret})`— listar, crear, borrar y
 *    leer el secreto devuelven el error 512. Lo único que una app puede hacer con esta sección es
 *    LEER y ACTUALIZAR su propio registro. Está aquí para quien se construye su propio panel.
 *  - **Un cliente sólo puede tener UNA app.** Crear la segunda devuelve el error 536.
 *  - **Hace falta el plan CUSTOM** (error 542). No es "un plan de pago": pro es de pago y no
 *    crea apps. Las apps son lo que ese plan añade, y sin app no hay `client_id` con el que
 *    pedir un token, así que este error es el que se encuentra quien intenta integrar sin él.
 *  - **El secreto no está en la ficha.** Vive en Keycloak y se pide aparte.
 *  - **Actualizar REEMPLAZA**: los cinco campos se escriben con lo que traiga el cuerpo, así que
 *    omitir `webhook_url` apaga el webhook (§ {@link AppsResource.update}).
 *  - **No confundir con una integración** (`pv.integrations`), que es una conexión con Google Drive
 *    o un RSS. Son dos cosas distintas y media web las ha llamado igual.
 */
import { Resource, requireId } from "./base.js";
import type { RequestOptions, SuccessResponse } from "./base.js";
import type { PageOptions } from "../core/pagination.js";
import type { ClientApp, ClientAppInput, Paginated } from "../types.js";

export class AppsResource extends Resource {
    /**
     * Las apps del cliente. **Exige token de usuario** (512) y devuelve como mucho una.
     */
    async list(idClient: string, options: PageOptions & RequestOptions = {}): Promise<Paginated<ClientApp>> {
        return this.getList<ClientApp>(
            this.path(idClient),
            "client_apps",
            { offset: options.offset, limit: options.limit },
            options,
        );
    }

    /**
     * Una app. Es de lo poco de esta sección que **sí** admite un token de app: una app puede leer
     * su propio registro.
     */
    async get(idClient: string, idApp: string, options: RequestOptions = {}): Promise<ClientApp> {
        return this.getOne<ClientApp>(this.one(idClient, idApp), "client_app", undefined, options);
    }

    /**
     * Crea la app del cliente. **Exige token de usuario** (512) y sólo puede haber una (536).
     *
     * `keycloak_client_idenfifier` —con la errata, que es el nombre del campo— es el `client_id` con
     * el que luego se pide el token, y tiene que ser único en todo PlanVortex (534). Los dominios y
     * las urls de redirección tienen que ser URLs válidas (531 y 532), y `webhook_url` también (535).
     */
    async create(idClient: string, body: ClientAppInput, options: RequestOptions = {}): Promise<ClientApp> {
        return this.postOne<ClientApp>(this.path(idClient), "client_app", body, options);
    }

    /**
     * Cambia la app. Admite token de app: una app puede actualizar su propio registro.
     *
     * **REEMPLAZA los cinco campos con lo que traiga el cuerpo.** No es un `PATCH`: mandar una
     * actualización sin `webhook_url` apaga el webhook, y sin `redirect_urls` deja la lista vacía —
     * con lo que el flujo de conexión de cuentas deja de admitir ninguna redirección. Lee la app
     * primero y devuélvela entera.
     */
    async update(
        idClient: string,
        idApp: string,
        body: ClientAppInput,
        options: RequestOptions = {},
    ): Promise<ClientApp> {
        return this.putOne<ClientApp>(this.one(idClient, idApp), "client_app", body, options);
    }

    /**
     * Borra la app. **Exige token de usuario** (512).
     *
     * El cliente de Keycloak se borra de verdad —así que las credenciales dejan de servir en el
     * acto— y el documento se marca como borrado en vez de desaparecer.
     */
    async remove(idClient: string, idApp: string, options: RequestOptions = {}): Promise<void> {
        await this.httpDelete<SuccessResponse>(this.one(idClient, idApp), undefined, options);
    }

    /**
     * El `client_secret` de la app. **Exige token de usuario** (512).
     *
     * Viene de Keycloak, así que es el secreto vivo y no una copia: trátalo como una credencial, no
     * lo escribas en un log y no lo guardes donde no guardarías una contraseña.
     */
    async secret(idClient: string, idApp: string, options: RequestOptions = {}): Promise<string> {
        const response = await this.httpGet<{ secret: string }>(
            `${this.one(idClient, idApp)}/secret`,
            undefined,
            options,
        );
        return response.secret;
    }

    private path(idClient: string): string {
        return `/clients/${requireId(idClient, "idClient")}/apps`;
    }

    private one(idClient: string, idApp: string): string {
        return `${this.path(idClient)}/${requireId(idApp, "idApp")}`;
    }
}
