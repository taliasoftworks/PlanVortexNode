/**
 * Mensajería (capa 2): conversaciones, hilos, envío y plantillas.
 *
 * Lo que se pin aquí son las trampas que la fase 7 encontró auditando el spec contra
 * `src/domain/**` del servidor:
 *
 *  - **`conversations_total` devuelve DOS formas distintas** según venga `group_by` o no, y la
 *    serie trae `groupValue` como NÚMERO de Mongo (día del año, mes o año), no como fecha.
 *  - **Una conversación no tiene `_id`**: la agregación lo proyecta fuera. Lo que identifica el
 *    hilo es `contact._id`.
 *  - **Hay dos rutas de totales**, la de cuenta y la de organización, y las distingue el argumento.
 *  - **`in_response_external_id` no viaja**: el servidor no lo lee del cuerpo, así que no está en
 *    `MessageInput` y `comment_message` no se puede mandar por aquí.
 *  - **Las plantillas se borran con dos parámetros de query**, id y nombre, no con uno.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { messageContact, messageContactId, messageDirection } from "../../src/index.js";
import { ContractHarness } from "../helpers/contract.js";
import { ACCOUNT_ID, CONTACT_ID, ORG_ID, contact, message } from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

const THREAD = `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/messages/${CONTACT_ID}`;
const TEMPLATES = `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/message_templates`;

describe("messages.conversations", () => {
    it("desenvuelve `{conversations, total}` y trae el contacto resuelto", async () => {
        const conversation = { contact, date: "2026-08-21T18:00:00.000Z", unread_messages: 2 };
        api.mock("get", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/conversations`, {
            conversations: [conversation],
            total: 1,
        });
        const pv = api.client();

        const page = await pv.messages.conversations(ORG_ID, ACCOUNT_ID);

        expect(page.total).toBe(1);
        //La conversación no tiene `_id` propio: el hilo se abre con el del contacto.
        expect(page.data[0]?.contact._id).toBe(CONTACT_ID);
        expect(page.data[0]?.unread_messages).toBe(2);
    });
});

describe("messages.conversationTotals", () => {
    it("sin group_by pide la ruta de la cuenta y devuelve `{total}`", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/conversations_total`, {
            total: 37,
        });
        const pv = api.client();

        const totals = await pv.messages.conversationTotals(ORG_ID, ACCOUNT_ID, {
            from_date: new Date("2026-08-01T00:00:00.000Z"),
        });

        expect(calls[0]?.query.from_date).toEqual(["2026-08-01T00:00:00.000Z"]);
        expect(calls[0]?.query.group_by).toBeUndefined();
        expect("total" in totals && totals.total).toBe(37);
    });

    /**
     * La otra mitad de la trampa: con `group_by` la respuesta ya NO trae `total`, trae `stats` y
     * `group`. Un tipo con los tres opcionales dejaba leer el campo que no viene.
     */
    it("con group_by devuelve la serie, y `groupValue` es un número, no una fecha", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/conversations_total`, {
            group: "day",
            stats: [{ groupValue: 233, totalConversations: 4 }],
        });
        const pv = api.client();

        const totals = await pv.messages.conversationTotals(ORG_ID, ACCOUNT_ID, { group_by: "day" });

        expect(calls[0]?.query.group_by).toEqual(["day"]);
        expect("stats" in totals && totals.stats[0]?.groupValue).toBe(233);
        expect("total" in totals).toBe(false);
    });

    it("sin cuenta pide la ruta de la organización entera", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/conversations_total`, { total: 91 });
        const pv = api.client();

        await pv.messages.conversationTotals(ORG_ID);

        expect(calls[0]?.path).toBe(`/organizations/${ORG_ID}/conversations_total`);
    });
});

describe("messages.list", () => {
    it("desenvuelve `{messages, total}` y deja deducir la dirección", async () => {
        const incoming = { ...message, contact_id: undefined, from_contact_id: contact };
        api.mock("get", THREAD, { messages: [incoming], total: 1 });
        const pv = api.client();

        const page = await pv.messages.list(ORG_ID, ACCOUNT_ID, CONTACT_ID);

        //La dirección no es un campo: se deduce de cuál de los dos contactos viene.
        expect(messageDirection(page.data[0]!)).toBe("incoming");
        expect(messageContactId(page.data[0]!)).toBe(CONTACT_ID);
        //Y en el listado el contacto viene POBLADO, que es lo que el spec no decía.
        expect(messageContact(page.data[0]!)?.name).toBe(contact.name);
    });
});

describe("messages.send", () => {
    it("manda el cuerpo tal cual y desenvuelve `{message}`", async () => {
        const calls = api.mock("post", THREAD, { message });
        const pv = api.client();

        const sent = await pv.messages.send(ORG_ID, ACCOUNT_ID, CONTACT_ID, {
            message_type: "simple_message",
            text: "Abrimos de 9 a 14",
        });

        expect(calls[0]?.body).toEqual({ message_type: "simple_message", text: "Abrimos de 9 a 14" });
        expect(sent._id).toBe(message._id);
    });

    it("una plantilla viaja con su nombre y su idioma dentro de message_options", async () => {
        const calls = api.mock("post", THREAD, { message });
        const pv = api.client();

        await pv.messages.send(ORG_ID, ACCOUNT_ID, CONTACT_ID, {
            message_type: "template_message",
            message_options: { template_name: "recordatorio_cita", template_language: "es" },
        });

        expect(calls[0]?.body).toEqual({
            message_type: "template_message",
            message_options: { template_name: "recordatorio_cita", template_language: "es" },
        });
    });

    it("las variables de la plantilla viajan en orden en template_parameters", async () => {
        // Es lo que convierte una plantilla aprobada en un recordatorio con el nombre y la hora.
        // El orden es el contrato: el primero rellena {{1}}, el segundo {{2}}.
        const calls = api.mock("post", THREAD, { message });
        const pv = api.client();

        await pv.messages.send(ORG_ID, ACCOUNT_ID, CONTACT_ID, {
            message_type: "template_message",
            message_options: {
                template_name: "recordatorio_cita",
                template_language: "es",
                template_parameters: ["María", "jueves 2 de octubre", "17:00"],
            },
        });

        expect(calls[0]?.body).toEqual({
            message_type: "template_message",
            message_options: {
                template_name: "recordatorio_cita",
                template_language: "es",
                template_parameters: ["María", "jueves 2 de octubre", "17:00"],
            },
        });
    });

    /**
     * El endpoint no leía `in_response_external_id` del cuerpo hasta el 2026-08-24, así que los dos
     * tipos que lo necesitan no se podían mandar por la API pública. Lo que se fija aquí es que el
     * campo viaje: es el identificador de la RED, nunca un `_id` de PlanVortex.
     */
    it("comment_message viaja con el id del comentario en la red", async () => {
        const calls = api.mock("post", THREAD, { message });
        const pv = api.client();

        await pv.messages.send(ORG_ID, ACCOUNT_ID, CONTACT_ID, {
            message_type: "comment_message",
            text: "Te contesto por privado",
            in_response_external_id: "17841400000000000_18000000000000000",
        });

        expect(calls[0]?.body).toEqual({
            message_type: "comment_message",
            text: "Te contesto por privado",
            in_response_external_id: "17841400000000000_18000000000000000",
        });
    });
});

describe("messages.unreadCount", () => {
    it("devuelve el número, no el sobre", async () => {
        api.mock("get", `/organizations/${ORG_ID}/unread_messages`, { total: 12 });
        const pv = api.client();

        expect(await pv.messages.unreadCount(ORG_ID)).toBe(12);
    });
});

describe("messages.markConversationRead", () => {
    it("hace POST a /read del hilo, sin cuerpo, y devuelve network_read tal cual", async () => {
        const calls = api.mock("post", `${THREAD}/read`, { success: true, network_read: false });
        const pv = api.client();

        const result = await pv.messages.markConversationRead(ORG_ID, ACCOUNT_ID, CONTACT_ID);

        expect(calls[0]?.method).toBe("POST");
        //`false` es una respuesta, no un error: la red no tiene «visto» o falló, y el hilo quedó
        //leído en PlanVortex igual
        expect(result).toEqual({ success: true, network_read: false });
    });
});

describe("messages.removeByAccount", () => {
    it("borra por DELETE sobre la ruta de mensajes de la cuenta", async () => {
        const calls = api.mock("delete", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/messages`, {
            success: true,
        });
        const pv = api.client();

        await pv.messages.removeByAccount(ORG_ID, ACCOUNT_ID);

        expect(calls[0]?.method).toBe("DELETE");
    });
});

describe("messages plantillas", () => {
    const template = { name: "recordatorio_cita", status: "APPROVED", language: "es", components: [] };

    it("el listado desenvuelve `{templates, total}` y devuelve el formato de la red", async () => {
        api.mock("get", TEMPLATES, { templates: [template], total: 1 });
        const pv = api.client();

        const page = await pv.messages.templates(ORG_ID, ACCOUNT_ID);

        expect(page.total).toBe(1);
        expect(page.data[0]).toEqual(template);
    });

    it("crear devuelve la plantilla desenvuelta", async () => {
        const calls = api.mock("post", TEMPLATES, { template });
        const pv = api.client();

        const created = await pv.messages.createTemplate(ORG_ID, ACCOUNT_ID, template);

        expect(calls[0]?.body).toEqual(template);
        expect(created).toEqual(template);
    });

    /** Meta borra por NOMBRE y usa el id para desambiguar idiomas: hacen falta los dos. */
    it("borrar manda id y nombre en la query", async () => {
        const calls = api.mock("delete", TEMPLATES, { success: true });
        const pv = api.client();

        await pv.messages.deleteTemplate(ORG_ID, ACCOUNT_ID, "1234567890", "recordatorio_cita");

        expect(calls[0]?.query).toEqual({
            template_id: ["1234567890"],
            template_name: ["recordatorio_cita"],
        });
    });
});

/**
 * Los archivos que llegan por mensaje privado NO los guarda PlanVortex: la ruta los pide a la red
 * y los reenvía. Aquí se fija que la librería los devuelve en bytes, con el tipo y el nombre de las
 * cabeceras, y que un error sigue siendo el error tipado aunque la llamada pidiera bytes.
 */
describe("messages.downloadFile", () => {
    const MESSAGE_ID = "66d04a6a427f4c43b9d97f99";
    const FILE = `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/messages/${MESSAGE_ID}/files/1`;

    it("devuelve los bytes, el tipo real y el nombre UTF-8 de `Content-Disposition`", async () => {
        const calls = api.mockFile("get", FILE, "%PDF-1.4\n", {
            "content-type": "application/pdf",
            "content-disposition": `attachment; filename="presupuesto a_o.pdf"; filename*=UTF-8''presupuesto%20a%C3%B1o.pdf`,
        });
        const pv = api.client();

        const file = await pv.messages.downloadFile(ORG_ID, ACCOUNT_ID, MESSAGE_ID, 1);

        expect(calls).toHaveLength(1);
        expect(new TextDecoder().decode(file.data)).toBe("%PDF-1.4\n");
        expect(file.contentType).toBe("application/pdf");
        expect(file.fileName).toBe("presupuesto año.pdf");
        expect(file.disposition).toBe("attachment");
    });

    it("una nota de voz va `inline` y sin los parámetros del tipo", async () => {
        api.mockFile("get", FILE, "OggS", { "content-type": "audio/ogg; codecs=opus", "content-disposition": "inline" });
        const pv = api.client();

        const file = await pv.messages.downloadFile(ORG_ID, ACCOUNT_ID, MESSAGE_ID, 1);

        expect(file.contentType).toBe("audio/ogg");
        expect(file.fileName).toBeUndefined();
        expect(file.disposition).toBe("inline");
    });

    it("WhatsApp ya soltó el archivo: el 1515 llega tipado, no como bytes", async () => {
        api.mock("get", FILE, { code: 1515, message: "The network no longer has this file", data: { social_network: "whatsapp" } }, 400);
        const pv = api.client();

        const error = await pv.messages.downloadFile(ORG_ID, ACCOUNT_ID, MESSAGE_ID, 1).catch((e: unknown) => e);

        expect(error).toMatchObject({ code: 1515, data: { social_network: "whatsapp" } });
    });

    it("una posición que no es un entero desde 0 no sale a la red", async () => {
        const pv = api.client();
        await expect(pv.messages.downloadFile(ORG_ID, ACCOUNT_ID, MESSAGE_ID, 1.5)).rejects.toThrow(TypeError);
        await expect(pv.messages.downloadFile(ORG_ID, ACCOUNT_ID, MESSAGE_ID, -1)).rejects.toThrow(TypeError);
    });
});
