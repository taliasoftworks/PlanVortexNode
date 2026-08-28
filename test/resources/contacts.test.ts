/**
 * Contactos (capa 2): la agenda.
 *
 * Lo que se pin aquí son las trampas que la fase 7 encontró auditando el spec contra
 * `src/domain/**` del servidor:
 *
 *  - **`update()` no devuelve el contacto**: la API contesta `{success: true}`. Un método que
 *    prometiera devolverlo tendría que inventárselo.
 *  - **`extra_data` se PISA**: el servidor lo escribe con lo que traiga el cuerpo, así que un
 *    `update()` sin él borra los campos propios. `merge()` existe para eso.
 *  - **Crear es idempotente** sobre el primer identificador y devuelve el que ya había sin tocarlo.
 *  - **Los filtros de `extra_data` viajan como `extra_data[0][key]`**, que es lo que el parser
 *    extendido de Express vuelve a montar en un array de objetos.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ContractHarness } from "../helpers/contract.js";
import { CONTACT_ID, ORG_ID, contact } from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

const LIST = `/organizations/${ORG_ID}/contacts`;
const ONE = `${LIST}/${CONTACT_ID}`;

describe("contacts.list", () => {
    it("desenvuelve `{contacts, total}`", async () => {
        api.mock("get", LIST, { contacts: [contact], total: 1 });
        const pv = api.client();

        const page = await pv.contacts.list(ORG_ID);

        expect(page.total).toBe(1);
        expect(page.data[0]?._id).toBe(CONTACT_ID);
    });

    it("manda los filtros de extra_data como pares indexados", async () => {
        const calls = api.mock("get", LIST, { contacts: [], total: 0 });
        const pv = api.client();

        await pv.contacts.list(ORG_ID, {
            search: "Marta",
            extra_data: [
                { key: "city", value: "Bilbao" },
                { key: "string_property", value: ["vip", "mayorista"] },
            ],
        });

        expect(calls[0]?.query).toEqual({
            search: ["Marta"],
            "extra_data[0][key]": ["city"],
            "extra_data[0][value]": ["Bilbao"],
            "extra_data[1][key]": ["string_property"],
            //Un array se repite: es lo que el servidor lee como "cualquiera de".
            "extra_data[1][value]": ["vip", "mayorista"],
        });
    });

    /**
     * Este filtro devolvía siempre una lista vacía —el servidor comparaba el array entero de
     * `social_identifiers` contra el nombre de la red— y por eso la librería no lo exponía. Se
     * arregló en el servidor el 2026-08-24; lo que este test fija es que VIAJE.
     */
    it("manda el filtro por red", async () => {
        const calls = api.mock("get", LIST, { contacts: [contact], total: 1 });
        const pv = api.client();

        await pv.contacts.list(ORG_ID, { social_network: "whatsapp", limit: 50 });

        expect(calls[0]?.query).toEqual({ social_network: ["whatsapp"], limit: ["50"] });
    });
});

describe("contacts.get", () => {
    it("desenvuelve `{contact}`", async () => {
        api.mock("get", ONE, { contact });
        const pv = api.client();

        expect((await pv.contacts.get(ORG_ID, CONTACT_ID)).name).toBe("Marta");
    });
});

describe("contacts.create", () => {
    it("manda los identificadores y desenvuelve `{contact}`", async () => {
        const calls = api.mock("post", LIST, { contact });
        const pv = api.client();

        const created = await pv.contacts.create(ORG_ID, {
            name: "Marta",
            social_identifiers: [{ social_network: "whatsapp", external_identifier: "34600111222" }],
        });

        expect(calls[0]?.body).toEqual({
            name: "Marta",
            social_identifiers: [{ social_network: "whatsapp", external_identifier: "34600111222" }],
        });
        expect(created._id).toBe(CONTACT_ID);
    });
});

describe("contacts.update", () => {
    /** La API contesta `{success}`, no el contacto. Devolver algo aquí sería inventárselo. */
    it("no devuelve nada", async () => {
        const calls = api.mock("put", ONE, { success: true });
        const pv = api.client();

        await expect(pv.contacts.update(ORG_ID, CONTACT_ID, { name: "Marta G." })).resolves.toBeUndefined();
        expect(calls[0]?.body).toEqual({ name: "Marta G." });
    });

    /**
     * La trampa destructiva: `update()` manda lo que se le da, y omitir `extra_data` lo borra en el
     * servidor. Este test fija que la librería NO lo rellena por su cuenta — si lo hiciera,
     * `update()` dejaría de ser lo que su nombre dice.
     */
    it("no añade un extra_data que no se le pasó", async () => {
        const calls = api.mock("put", ONE, { success: true });
        const pv = api.client();

        await pv.contacts.update(ORG_ID, CONTACT_ID, { name: "Marta G." });

        expect(calls[0]?.body).not.toHaveProperty("extra_data");
    });
});

describe("contacts.merge", () => {
    it("lee el contacto antes y funde el extra_data que ya tenía", async () => {
        const stored = { ...contact, extra_data: { city: "Bilbao", string_property: "vip" } };
        api.mock("get", ONE, { contact: stored });
        const puts = api.mock("put", ONE, { success: true });
        const pv = api.client();

        await pv.contacts.merge(ORG_ID, CONTACT_ID, { extra_data: { string_property: "mayorista" } });

        expect(puts[0]?.body).toEqual({
            extra_data: { city: "Bilbao", string_property: "mayorista" },
        });
    });
});

describe("contacts.remove", () => {
    it("borra un contacto", async () => {
        const calls = api.mock("delete", ONE, { success: true });
        const pv = api.client();

        await pv.contacts.remove(ORG_ID, CONTACT_ID);

        expect(calls[0]?.path).toBe(ONE);
    });

    it("removeAll borra sobre la ruta de la organización, sin identificador", async () => {
        const calls = api.mock("delete", LIST, { success: true });
        const pv = api.client();

        await pv.contacts.removeAll(ORG_ID);

        expect(calls[0]?.path).toBe(LIST);
    });
});
