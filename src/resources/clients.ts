/**
 * Clientes: quien contrata el plan y a quien cuelgan las organizaciones.
 *
 * LO QUE HAY QUE ENTENDER DEL PLAN, porque el spec lo describía mal hasta la fase 6 y era fácil
 * leer el campo equivocado: `client.actual_plan` es la **suscripción** (si está activa, qué plan
 * es, cuándo acaba el periodo), y los números están dentro, en `actual_plan.plan_data`. Mirar
 * `plan_identifier` para saber los límites es el error clásico: un plan `custom` lleva los suyos.
 *
 * Y el CONSUMO no viaja si no se pide: `actual_use` y `actual_asigned` sólo aparecen con
 * `getUse: true`, porque contarlos es una agregación sobre todas las organizaciones del cliente.
 */
import { Resource, requireId } from "./base.js";
import type { RequestOptions, SuccessResponse } from "./base.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages } from "../core/pagination.js";
import type { AiSettings, Client, ClientWithOrganizations, Organization, Paginated } from "../types.js";

export interface ClientListOptions extends PageOptions {
    /** Trae también `actual_use` y `actual_asigned`. Cuesta una agregación: no lo pidas por costumbre. */
    getUse?: boolean | undefined;
}

export interface OrganizationListOptions extends ClientListOptions {
    /** Búsqueda por nombre. */
    name?: string | undefined;
}

/** Lo que se manda para crear una organización. `actual_plan` es el cupo que se le asigna. */
export interface OrganizationInput {
    name: string;
    actual_plan?: Partial<Organization["actual_plan"]> | undefined;
}

export class ClientsResource extends Resource {
    /** Los clientes que puede ver quien llama. Con credenciales de app, el suyo. */
    async list(options: ClientListOptions & RequestOptions = {}): Promise<Paginated<Client>> {
        return this.getList<Client>("/clients", "clients", listQuery(options), options);
    }

    /** Los clientes, página a página, sin tener que llevar el `offset` a mano. */
    iterate(options: ClientListOptions & RequestOptions = {}): AsyncGenerator<Client> {
        return iteratePages<Client>((page) => this.list({ ...options, ...page }), options);
    }

    /** La ficha de un cliente. */
    async get(
        idClient: string,
        options: { getUse?: boolean | undefined } & RequestOptions = {},
    ): Promise<Client> {
        return this.getOne<Client>(
            `/clients/${requireId(idClient, "idClient")}`,
            "client",
            options.getUse ? { getUse: true } : undefined,
            options,
        );
    }

    /** Cambia lo poco que de un cliente se puede cambiar: hoy, su nombre. */
    async update(idClient: string, body: { name?: string }, options: RequestOptions = {}): Promise<Client> {
        return this.putOne(`/clients/${requireId(idClient, "idClient")}`, "client", body, options);
    }

    /** Las organizaciones RAÍZ de un cliente. Las hijas cuelgan de cada una. */
    async organizations(
        idClient: string,
        options: OrganizationListOptions & RequestOptions = {},
    ): Promise<Paginated<Organization>> {
        return this.getList<Organization>(
            `/clients/${requireId(idClient, "idClient")}/organizations`,
            "organizations",
            { ...listQuery(options), name: options.name },
            options,
        );
    }

    /** Las organizaciones raíz de un cliente, encadenando páginas. */
    iterateOrganizations(
        idClient: string,
        options: OrganizationListOptions & RequestOptions = {},
    ): AsyncGenerator<Organization> {
        return iteratePages<Organization>(
            (page) => this.organizations(idClient, { ...options, ...page }),
            options,
        );
    }

    /** Crea una organización raíz. Lo que se le asigne se descuenta de lo que el cliente tiene. */
    async createOrganization(
        idClient: string,
        body: OrganizationInput,
        options: RequestOptions = {},
    ): Promise<Organization> {
        return this.postOne(
            `/clients/${requireId(idClient, "idClient")}/organizations`,
            "organization",
            body,
            options,
        );
    }

    /** Cambia una organización raíz: su nombre o el cupo que tiene asignado. */
    async updateOrganization(
        idClient: string,
        idOrganization: string,
        body: Partial<OrganizationInput>,
        options: RequestOptions = {},
    ): Promise<Organization> {
        return this.putOne(
            `/clients/${requireId(idClient, "idClient")}/organizations/${requireId(idOrganization, "idOrganization")}`,
            "organization",
            body,
            options,
        );
    }

    /**
     * Configura los proveedores de IA del cliente (BYOK), ámbito por ámbito.
     *
     * Un ámbito puesto a `null` BORRA su configuración y devuelve ese ámbito a los créditos de
     * PlanVortex; con proveedor propio, generar no cuesta créditos porque el cliente paga a su
     * proveedor. `orchestrator` y `text` exigen un proveedor de texto e `image` uno de imagen.
     *
     * **Se manda la clave y no vuelve nunca**: la respuesta es el cliente, sin secretos.
     */
    async updateAiSettings(
        idClient: string,
        body: AiSettings,
        options: RequestOptions = {},
    ): Promise<Client> {
        return this.putOne<Client>(
            `/clients/${requireId(idClient, "idClient")}/ai-settings`,
            "client",
            body,
            options,
        );
    }

    /**
     * Los clientes que puede ver quien llama, **con sus organizaciones raíz dentro**, en una sola
     * llamada.
     *
     * Es el atajo del arranque: con {@link list} y {@link organizations} hacen falta 1 + N
     * peticiones para pintar el selector de organización. Aquí cada cliente trae su array
     * `organizations` y su propio `total`.
     */
    async withOrganizations(options: RequestOptions = {}): Promise<Paginated<ClientWithOrganizations>> {
        return this.getList<ClientWithOrganizations>("/clients_organizations", "clients", undefined, options);
    }

    /**
     * Borra una organización raíz **con todo lo que tiene dentro**: sus organizaciones hijas, sus
     * cuentas, sus publicaciones, sus ficheros y sus comentarios. No se deshace.
     */
    async deleteOrganization(
        idClient: string,
        idOrganization: string,
        options: RequestOptions = {},
    ): Promise<void> {
        await this.httpDelete<SuccessResponse>(
            `/clients/${requireId(idClient, "idClient")}/organizations/${requireId(idOrganization, "idOrganization")}`,
            undefined,
            options,
        );
    }
}

function listQuery(options: ClientListOptions): Record<string, string | number | boolean | undefined> {
    return {
        offset: options.offset,
        limit: options.limit,
        //`getUse` sólo se manda cuando se pide: un `getUse=false` en la query es ruido en el log.
        getUse: options.getUse ? true : undefined,
    };
}
