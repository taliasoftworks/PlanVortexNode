/**
 * Organizaciones: el contenedor de cuentas, publicaciones y ficheros, y el que reparte el cupo.
 *
 * LO QUE SORPRENDE: `organization.actual_plan` es lo ASIGNADO, y **falta cuando no se le asignó
 * nada**. Una organización sin plan propio comparte el del primer padre que tenga uno, y si no lo
 * hay, el resto sin repartir del cliente. Así que para saber qué puede hacer de verdad no se lee
 * `actual_plan`: se llama a {@link OrganizationsResource.limits}, que es quien resuelve la cascada.
 */
import { Resource, requireId } from "./base.js";
import type { RequestOptions, SuccessResponse } from "./base.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages, unwrapOne } from "../core/pagination.js";
import type {
    AccountSelection,
    AiContext,
    ConnectToken,
    Organization,
    Paginated,
    PlanData,
    PlanUseData,
    SocialCredentialsInput,
    SocialNetwork,
} from "../types.js";
import type { OrganizationInput } from "./clients.js";

export interface OrganizationOptions extends RequestOptions {
    /** Trae también `actual_use` y `actual_asigned`. Cuesta una agregación: no lo pidas por costumbre. */
    getUse?: boolean | undefined;
}

export interface ChildOrganizationListOptions extends OrganizationOptions, PageOptions {
    /** Búsqueda por nombre. */
    name?: string | undefined;
}

/** Lo que se puede repartir a una organización hija. Todo son números del plan del padre. */
export type OrganizationPlanInput = Partial<PlanData>;

export interface ConnectTokenOptions extends RequestOptions {
    /**
     * La red que la persona va a conectar. Viaja dentro de la `url` para que el panel no vuelva a
     * preguntarla. Sin esto, el usuario elige red al llegar.
     */
    social_network?: SocialNetwork | undefined;
    /**
     * A dónde vuelve el usuario cuando termina. Tiene que ser uno de los `redirect_urls`
     * registrados en la app, o la llamada contesta el error 532.
     */
    redirect_uri?: string | undefined;
    /**
     * Quién enseña la pantalla de elegir cuentas. Sin esto, PlanVortex (`"planvortex"`).
     *
     * Con `"integrator"` esa pantalla es tuya: la `url` que vuelve es la página de autorización
     * DE LA RED, el usuario va ahí directamente desde tu app, y al terminar aterriza en tu
     * `redirect_uri` con `?connect_session=…&social_network=…` sin ver nada de PlanVortex. Lees la
     * sesión con `accounts.getConnectSession()` y confirmas con `accounts.confirmConnectSession()`.
     *
     * Exige `redirect_uri` y `social_network` (549), y Telegram no puede (550): su enlace abre un
     * chat del que no se vuelve. En WhatsApp la `url` sigue siendo una página de PlanVortex con un
     * botón, porque el popup de Meta sólo se abre en nuestro dominio.
     */
    account_selection?: AccountSelection | undefined;
}

export class OrganizationsResource extends Resource {
    /** La ficha de una organización. */
    async get(idOrganization: string, options: OrganizationOptions = {}): Promise<Organization> {
        return this.getOne<Organization>(
            `/organizations/${requireId(idOrganization, "idOrganization")}`,
            "organization",
            options.getUse ? { getUse: true } : undefined,
            options,
        );
    }

    /** Cambia el nombre de una organización o el cupo que tiene asignado. */
    async update(
        idOrganization: string,
        body: Partial<OrganizationInput>,
        options: RequestOptions = {},
    ): Promise<Organization> {
        return this.putOne<Organization>(
            `/organizations/${requireId(idOrganization, "idOrganization")}`,
            "organization",
            body,
            options,
        );
    }

    /**
     * Borra una organización **con todo lo que tiene dentro**: sus hijas, sus cuentas, sus
     * publicaciones, sus ficheros y sus comentarios. No se deshace.
     */
    async remove(idOrganization: string, options: RequestOptions = {}): Promise<void> {
        await this.httpDelete<SuccessResponse>(
            `/organizations/${requireId(idOrganization, "idOrganization")}`,
            undefined,
            options,
        );
    }

    /** Las organizaciones que cuelgan de ésta. */
    async children(
        idOrganization: string,
        options: ChildOrganizationListOptions = {},
    ): Promise<Paginated<Organization>> {
        return this.getList<Organization>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/organizations`,
            "organizations",
            {
                offset: options.offset,
                limit: options.limit,
                name: options.name,
                getUse: options.getUse ? true : undefined,
            },
            options,
        );
    }

    /** Las organizaciones hijas, encadenando páginas. */
    iterateChildren(
        idOrganization: string,
        options: ChildOrganizationListOptions = {},
    ): AsyncGenerator<Organization> {
        return iteratePages<Organization>(
            (page) => this.children(idOrganization, { ...options, ...page }),
            options,
        );
    }

    /** Crea una organización hija con el cupo que se le reparta del plan de ésta. */
    async createChild(
        idOrganization: string,
        body: OrganizationInput,
        options: RequestOptions = {},
    ): Promise<Organization> {
        return this.postOne<Organization>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/organizations`,
            "organization",
            body,
            options,
        );
    }

    /**
     * Lo que esta organización puede usar de verdad, con la cascada ya resuelta: su plan propio, o
     * el del primer padre que tenga uno, o el resto sin repartir del cliente.
     *
     * Es lo que hay que mirar antes de conectar una cuenta o programar una publicación, no
     * `organization.actual_plan`.
     */
    async limits(idOrganization: string, options: RequestOptions = {}): Promise<PlanData> {
        return this.httpGet<PlanData>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/limits`,
            undefined,
            options,
        );
    }

    /**
     * El consumo de esta organización y lo que ya tiene repartido a sus hijas.
     *
     * Es un atajo de `get(id, {getUse: true})` que devuelve sólo las dos cifras, que es lo que se
     * quiere cuando se está pintando una barra de "3 de 5 cuentas".
     */
    async use(
        idOrganization: string,
        options: RequestOptions = {},
    ): Promise<{ actual_use: PlanUseData | undefined; actual_asigned: PlanData | undefined }> {
        const organization = await this.get(idOrganization, { ...options, getUse: true });
        return { actual_use: organization.actual_use, actual_asigned: organization.actual_asigned };
    }

    /**
     * Emite el token temporal con el que **una persona** conecta una cuenta social a esta
     * organización. Es la única forma que tiene una app de que se le conecte una cuenta.
     *
     * Y es el reverso exacto del resto del flujo: éste es el endpoint que **exige credenciales de
     * app** —con un token de usuario contesta 514—, mientras que los tres que vienen después
     * (`accounts.connectLinks`, `accounts.connect`, `accounts.enable`) las rechazan con un 519.
     *
     * **Un token temporal tampoco puede pedir otro**: también contesta 514. Un credencial que se
     * renovase a sí mismo no caducaría nunca, y éste anda suelto en el navegador de tu usuario.
     *
     * Vuelven las dos formas del mismo credencial, y las dos sirven:
     *
     *  - **`url`** — el camino alojado. Se redirige al usuario ahí y PlanVortex se encarga de la
     *    elección de red, del OAuth y de la pantalla donde elige qué cuentas dar de alta. Es lo que
     *    hace el ejemplo `examples/connect-flow`, y lo que casi todo el mundo quiere.
     *  - **`token`** — el credencial suelto, para `pv.asTemporalToken(token)` cuando la interfaz la
     *    pone el integrador.
     *
     * Caduca en **quince minutos** y **sólo vale para esta organización**: usarlo contra otra
     * contesta 1101.
     *
     * **Y conecta una vez.** En cuanto un `accounts.connect` sale bien, ese token deja de poder
     * conectar y contesta 543; los `accounts.enable` que rematan esa misma conexión siguen valiendo
     * hasta que caduque. Emite uno por conexión: son gratis e inmediatos.
     *
     * **Si pasas `social_network`, el token queda atado a esa red** y no conecta ninguna otra (544).
     * Sin ella, el token abre cualquiera y es la persona quien elige.
     */
    async createConnectToken(
        idOrganization: string,
        options: ConnectTokenOptions = {},
    ): Promise<ConnectToken> {
        return this.httpGet<ConnectToken>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/temporal_connect_token`,
            {
                social_network: options.social_network,
                redirect_uri: options.redirect_uri,
                account_selection: options.account_selection,
            },
            options,
        );
    }
    /**
     * Escribe el contexto de marca que la IA usa al redactar para esta organización.
     *
     * Es un REEMPLAZO del bloque entero, no un parcheo campo a campo. Y no afecta a los planes ya
     * creados: cada plan se lleva una copia del contexto en el momento de pedirlo, para que un
     * reintento genere lo mismo.
     */
    async updateAiContext(
        idOrganization: string,
        body: AiContext,
        options: RequestOptions = {},
    ): Promise<Organization> {
        return this.putOne<Organization>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/ai-context`,
            "organization",
            body,
            options,
        );
    }

    /**
     * Guarda las credenciales de la aplicación PROPIA de la organización para una red (BYOB).
     *
     * Hoy sólo Discord: sin esto, Discord ni siquiera aparece como red conectable (error 960). El
     * motivo de que la aplicación sea del cliente y no nuestra no es técnico — es que el permiso
     * para leer el TEXTO de los mensajes se revisa por aplicación en cuanto se pasa de 10.000
     * usuarios alcanzables, y una app compartida arrastraría a toda la plataforma a esa revisión.
     *
     * **Los secretos son de sólo escritura y no vuelven nunca.** Las tres credenciales hacen falta
     * la primera vez; después, lo que se omite se conserva, así que se puede corregir el
     * `client_id` sin volver a mandar el secreto ni el token. El token del bot se valida contra
     * Discord antes de guardar nada.
     */
    async updateSocialCredentials(
        idOrganization: string,
        socialNetwork: SocialNetwork,
        body: SocialCredentialsInput,
        options: RequestOptions = {},
    ): Promise<Organization> {
        return this.putOne<Organization>(
            this.credentialsPath(idOrganization, socialNetwork),
            "organization",
            body,
            options,
        );
    }

    /**
     * Borra las credenciales propias de una red. Las cuentas ya conectadas con ellas **dejan de
     * funcionar**: no hay a quién pedirle un token.
     */
    async deleteSocialCredentials(
        idOrganization: string,
        socialNetwork: SocialNetwork,
        options: RequestOptions = {},
    ): Promise<Organization> {
        return unwrapOne<Organization>(
            await this.httpDelete<unknown>(
                this.credentialsPath(idOrganization, socialNetwork),
                undefined,
                options,
            ),
            "organization",
        );
    }

    private credentialsPath(idOrganization: string, socialNetwork: SocialNetwork): string {
        return `/organizations/${requireId(idOrganization, "idOrganization")}/social_credentials/${socialNetwork}`;
    }
}
