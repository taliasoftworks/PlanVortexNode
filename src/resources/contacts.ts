/**
 * Contactos: la agenda de la organización, la gente con la que se cruzan mensajes.
 *
 * LO QUE HAY QUE SABER ANTES DE LLAMAR A NADA DE AQUÍ:
 *
 *  - **Un contacto es una persona en VARIOS canales.** `social_identifiers` es la lista, y ahí
 *    entra `email` además de las redes: un contacto creado a mano no tiene por qué venir de ninguna.
 *  - **Crear es idempotente sobre el PRIMER identificador.** Si ya existe un contacto de esa
 *    organización con ese canal y ese `external_identifier`, se devuelve el que había SIN TOCARLO —
 *    el `name`, el `profile_image` y el `extra_data` de la petición se ignoran. No hay error de
 *    "ya existe", así que la respuesta de `create()` no significa "lo he creado".
 *  - **Actualizar PISA `extra_data`.** Es el único campo que no se conserva al omitirlo: mandar un
 *    `update()` sin él borra todos los campos propios del contacto. {@link ContactsResource.update}
 *    lo explica y {@link ContactsResource.merge} lo evita.
 *  - **Borrar un contacto borra también sus mensajes**, y borrar los de la organización los borra
 *    todos. No hay papelera.
 *  - **Exige plan de pago** (error 516).
 */
import { Resource, requireId } from "./base.js";
import type { Query, RequestOptions, SuccessResponse } from "./base.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages } from "../core/pagination.js";
import type { Contact, ContactCreate, ContactExtraData, ContactUpdate, Paginated } from "../types.js";

/** Un filtro por un campo propio del contacto. Un array de valores se lee como "cualquiera de". */
export interface ContactExtraFilter {
    key: keyof ContactExtraData | (string & {});
    value: string | number | readonly string[] | readonly number[];
}

export interface ContactListOptions extends PageOptions {
    /**
     * Búsqueda por NOMBRE, con el índice de texto de Mongo: casa palabras enteras, no trozos.
     * "pana" no encuentra a "Panadería"; "Panadería" sí.
     */
    search?: string | undefined;
    /** Filtros por los campos propios de `extra_data`. Se combinan con Y. */
    extra_data?: readonly ContactExtraFilter[] | undefined;
}

export class ContactsResource extends Resource {
    /**
     * La agenda de la organización, de la más reciente a la más antigua.
     *
     * **No hay filtro por red que funcione.** El servidor acepta un `social_network` que compara el
     * array `social_identifiers` entero contra el nombre de la red, así que no casa nunca y la lista
     * vuelve vacía; por eso este método no lo expone. Filtra sobre `social_identifiers` en memoria.
     */
    async list(
        idOrganization: string,
        options: ContactListOptions & RequestOptions = {},
    ): Promise<Paginated<Contact>> {
        return this.getList<Contact>(this.path(idOrganization), "contacts", listQuery(options), options);
    }

    /** La agenda, encadenando páginas. */
    iterate(
        idOrganization: string,
        options: ContactListOptions & RequestOptions = {},
    ): AsyncGenerator<Contact> {
        return iteratePages<Contact>((page) => this.list(idOrganization, { ...options, ...page }), options);
    }

    /** Un contacto. */
    async get(idOrganization: string, idContact: string, options: RequestOptions = {}): Promise<Contact> {
        return this.getOne<Contact>(
            `${this.path(idOrganization)}/${requireId(idContact, "idContact")}`,
            "contact",
            undefined,
            options,
        );
    }

    /**
     * Da de alta un contacto, o devuelve el que ya había.
     *
     * Hace falta **al menos un identificador** (error 1601): un contacto sin canal es un contacto al
     * que nadie puede escribir. Y si ya existe uno con el primer canal y el mismo
     * `external_identifier`, vuelve ÉSE tal cual, sin aplicar nada de lo que se mandó.
     *
     * ```ts
     * const contact = await pv.contacts.create(orgId, {
     *     name: "Marta",
     *     social_identifiers: [{ social_network: "whatsapp", external_identifier: "34600111222" }],
     * });
     * ```
     */
    async create(
        idOrganization: string,
        body: ContactCreate,
        options: RequestOptions = {},
    ): Promise<Contact> {
        return this.postOne<Contact>(this.path(idOrganization), "contact", body, options);
    }

    /**
     * Cambia un contacto. **No devuelve el contacto**: la API contesta `{success: true}`, así que
     * este método no devuelve nada y hay que volver a pedirlo si se quiere ver el resultado.
     *
     * CUIDADO CON `extra_data`: es el único campo que NO se conserva al omitirlo. El servidor lo
     * escribe con lo que traiga el cuerpo, así que un `update()` sin `extra_data` deja el contacto
     * sin ninguno de sus campos propios. `name`, `profile_image` y `social_identifiers` sí se
     * respetan cuando no viajan. Para no tener que acordarse, {@link merge}.
     *
     * `social_identifiers` REEMPLAZA la lista entera, no se funde con ella.
     */
    async update(
        idOrganization: string,
        idContact: string,
        body: ContactUpdate,
        options: RequestOptions = {},
    ): Promise<void> {
        await this.httpPut<SuccessResponse>(
            `${this.path(idOrganization)}/${requireId(idContact, "idContact")}`,
            body,
            options,
        );
    }

    /**
     * Como {@link update}, pero leyendo el contacto antes para no perder su `extra_data`.
     *
     * Son DOS peticiones y no es gratis; existe porque el borrado silencioso de `extra_data` es el
     * fallo que se comete una vez y se descubre semanas después. Lo que se pase en `extra_data` se
     * funde sobre lo que había, campo a campo; para vaciarlo de verdad, `update()` con
     * `extra_data: {}`.
     */
    async merge(
        idOrganization: string,
        idContact: string,
        body: ContactUpdate,
        options: RequestOptions = {},
    ): Promise<void> {
        const current = await this.get(idOrganization, idContact, options);
        await this.update(
            idOrganization,
            idContact,
            { ...body, extra_data: { ...current.extra_data, ...body.extra_data } },
            options,
        );
    }

    /** Borra el contacto **y todos sus mensajes**. */
    async remove(idOrganization: string, idContact: string, options: RequestOptions = {}): Promise<void> {
        await this.httpDelete<SuccessResponse>(
            `${this.path(idOrganization)}/${requireId(idContact, "idContact")}`,
            undefined,
            options,
        );
    }

    /**
     * Borra TODOS los contactos de la organización y TODOS sus mensajes.
     *
     * No pide confirmación y no hay vuelta atrás. Está aquí porque la API lo tiene, no porque sea
     * una operación de todos los días.
     */
    async removeAll(idOrganization: string, options: RequestOptions = {}): Promise<void> {
        await this.httpDelete<SuccessResponse>(this.path(idOrganization), undefined, options);
    }

    private path(idOrganization: string): string {
        return `/organizations/${requireId(idOrganization, "idOrganization")}/contacts`;
    }
}

/**
 * Los filtros por `extra_data` viajan como `extra_data[0][key]=...&extra_data[0][value]=...`, que
 * es como Express los vuelve a montar en un array de objetos. No es una invención: es la única
 * forma de mandar una lista de pares por query string a un servidor con el parser extendido.
 */
function listQuery(options: ContactListOptions): Query {
    const query: Query = {
        offset: options.offset,
        limit: options.limit,
        search: options.search,
    };
    options.extra_data?.forEach((filter, index) => {
        query[`extra_data[${index}][key]`] = filter.key;
        query[`extra_data[${index}][value]`] = Array.isArray(filter.value)
            ? (filter.value as readonly (string | number)[])
            : (filter.value as string | number);
    });
    return query;
}
