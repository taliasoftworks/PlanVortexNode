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
import { iteratePages } from "../core/pagination.js";
import type { ConnectToken, Organization, Paginated, PlanData, SocialNetwork } from "../types.js";
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
    ): Promise<{ actual_use: PlanData | undefined; actual_asigned: PlanData | undefined }> {
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
     * Vuelven las dos formas del mismo credencial, y las dos sirven:
     *
     *  - **`url`** — el camino alojado. Se redirige al usuario ahí y PlanVortex se encarga de la
     *    elección de red, del OAuth y de la pantalla donde elige qué cuentas dar de alta. Es lo que
     *    hace el ejemplo `examples/connect-flow`, y lo que casi todo el mundo quiere.
     *  - **`token`** — el credencial suelto, para `pv.asTemporalToken(token)` cuando la interfaz la
     *    pone el integrador.
     *
     * Caduca en una hora y **sólo vale para esta organización**: usarlo contra otra contesta 1101.
     */
    async createConnectToken(
        idOrganization: string,
        options: ConnectTokenOptions = {},
    ): Promise<ConnectToken> {
        return this.httpGet<ConnectToken>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/temporal_connect_token`,
            { social_network: options.social_network, redirect_uri: options.redirect_uri },
            options,
        );
    }
}
