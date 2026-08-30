/**
 * Mensajería: el buzón privado de la marca, conversación a conversación.
 *
 * LO QUE HAY QUE SABER ANTES DE LLAMAR A NADA DE AQUÍ:
 *
 *  - **No todas las redes tienen chat.** LinkedIn, X, TikTok, Bluesky, Discord y Telegram no, y
 *    Google Business tampoco: en esas la API devuelve el error 1502. Quien manda es `messages` en
 *    `pv.catalog.socialCapabilities()`.
 *  - **Exige plan de pago** (error 516), y el chat además exige que el plan lo incluya (515).
 *  - **La primera lectura de una cuenta es lenta.** Si en la base de datos no hay nada, el servidor
 *    baja las conversaciones de la red antes de contestar. La segunda ya sale de Mongo.
 *  - **Leer un hilo lo marca como leído**, y sólo en la primera página (`offset: 0`). No es un
 *    efecto secundario que se pueda apagar: es lo que hace bajar el contador de sin leer.
 *  - **La dirección de un mensaje no es un campo**: se deduce de cuál de los dos contactos trae.
 *    Para eso están `messageDirection`, `messageContact` y `messageContactId`.
 *  - **WhatsApp tiene una ventana de 24 horas.** Pasada la última respuesta del contacto sólo se
 *    admite una plantilla; un `simple_message` fuera de esa ventana lo rechaza el servidor.
 *  - **Las plantillas son de WhatsApp y de nadie más.** En el resto de redes el SDK ni siquiera
 *    está implementado, así que lo que vuelve es un 500 con `code: 500` — no el 1502 que cabría
 *    esperar (§ {@link MessagesResource.templates}).
 */
import { Resource, requireId } from "./base.js";
import type { RequestOptions, SuccessResponse } from "./base.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages } from "../core/pagination.js";
import type {
    Conversation,
    ConversationTotals,
    Message,
    MessageInput,
    MessageTemplate,
    Paginated,
} from "../types.js";

/** Cómo se agrupa la serie de {@link MessagesResource.conversationTotals}. */
export type ConversationGroupBy = "day" | "month" | "year";

export interface ConversationTotalsOptions {
    /** Por defecto, el principio del mes en curso. */
    from_date?: Date | string | undefined;
    /** Por defecto, el final del mes en curso. */
    to_date?: Date | string | undefined;
    /**
     * Sin esto llega un `{total}` y con esto una serie `{stats, group}`. Son dos respuestas
     * distintas, no una con campos de más.
     */
    group_by?: ConversationGroupBy | undefined;
}

/** Lo que devuelve crear una plantilla: lo que contestó la red, tal cual. */
export interface MessageTemplateResult {
    template: MessageTemplate;
}

export class MessagesResource extends Resource {
    /**
     * Las conversaciones de una cuenta: un contacto, la fecha del último mensaje y cuántos quedan
     * sin leer. Ordenadas por actividad, la más reciente primero.
     *
     * **La primera llamada de una cuenta puede tardar**: si no hay nada guardado, el servidor se
     * baja las conversaciones de la red y sus mensajes antes de contestar. Conviene subir el
     * `timeoutMs` de esa llamada.
     */
    async conversations(
        idOrganization: string,
        idAccount: string,
        options: PageOptions & RequestOptions = {},
    ): Promise<Paginated<Conversation>> {
        return this.getList<Conversation>(
            `${this.accountPath(idOrganization, idAccount)}/conversations`,
            "conversations",
            { offset: options.offset, limit: options.limit },
            options,
        );
    }

    /** Las conversaciones de una cuenta, encadenando páginas. */
    iterateConversations(
        idOrganization: string,
        idAccount: string,
        options: PageOptions & RequestOptions = {},
    ): AsyncGenerator<Conversation> {
        return iteratePages<Conversation>(
            (page) => this.conversations(idOrganization, idAccount, { ...options, ...page }),
            options,
        );
    }

    /**
     * Cuántas conversaciones hubo en un rango, en total o agrupadas por día, mes o año.
     *
     * **Una conversación es un contacto en un día**, no un hilo: la misma persona escribiendo el
     * lunes y el martes cuenta dos. Y `groupValue` es el NÚMERO que da Mongo (`$dayOfYear`,
     * `$month`, `$year`), no una fecha — con `group_by: "day"` dos años del mismo rango caen en el
     * mismo valor, así que el rango se acota antes de agrupar por día.
     *
     * Sin `idAccount` cuenta las de la organización entera.
     */
    async conversationTotals(
        idOrganization: string,
        options?: ConversationTotalsOptions & RequestOptions,
    ): Promise<ConversationTotals>;
    async conversationTotals(
        idOrganization: string,
        idAccount: string,
        options?: ConversationTotalsOptions & RequestOptions,
    ): Promise<ConversationTotals>;
    async conversationTotals(
        idOrganization: string,
        accountOrOptions?: string | (ConversationTotalsOptions & RequestOptions),
        maybeOptions: ConversationTotalsOptions & RequestOptions = {},
    ): Promise<ConversationTotals> {
        const byAccount = typeof accountOrOptions === "string";
        const options = byAccount ? maybeOptions : (accountOrOptions ?? {});
        const path = byAccount
            ? `${this.accountPath(idOrganization, accountOrOptions)}/conversations_total`
            : `/organizations/${requireId(idOrganization, "idOrganization")}/conversations_total`;

        return this.httpGet<ConversationTotals>(
            path,
            {
                from_date: options.from_date,
                to_date: options.to_date,
                group_by: options.group_by,
            },
            options,
        );
    }

    /**
     * El hilo con un contacto, del más reciente al más antiguo.
     *
     * **Pedir la primera página (`offset` 0 o sin `offset`) marca el hilo como leído.** Es lo que
     * baja el contador de {@link unreadCount}; no hay forma de leerlo sin marcarlo.
     *
     * Aquí, y en el webhook, `contact_id`, `from_contact_id` y `message_options.files` vienen
     * POBLADOS. Usa `messageContact`, `messageContactId` y `messageFiles` en vez de asumirlo.
     */
    async list(
        idOrganization: string,
        idAccount: string,
        idContact: string,
        options: PageOptions & RequestOptions = {},
    ): Promise<Paginated<Message>> {
        return this.getList<Message>(
            this.threadPath(idOrganization, idAccount, idContact),
            "messages",
            { offset: options.offset, limit: options.limit },
            options,
        );
    }

    /**
     * El hilo con un contacto, encadenando páginas.
     *
     * Ojo: la primera página marca el hilo como leído, así que iterarlo entero lo marca también.
     */
    iterate(
        idOrganization: string,
        idAccount: string,
        idContact: string,
        options: PageOptions & RequestOptions = {},
    ): AsyncGenerator<Message> {
        return iteratePages<Message>(
            (page) => this.list(idOrganization, idAccount, idContact, { ...options, ...page }),
            options,
        );
    }

    /**
     * Manda un mensaje a un contacto.
     *
     * `simple_message` y `file_message` valen en todas las redes con chat; el resto son formas
     * propias de Meta o de WhatsApp y cada una exige su bloque en `message_options`
     * (`template_name` + `template_language`, `whatsappInteractive`, `metaElements`,
     * `metaQuickReplies`). El texto se valida contra `characters` de `pv.catalog.socialLimits()`,
     * que es el límite del CHAT y no el de una publicación.
     *
     * En Facebook e Instagram sólo se admite **un** adjunto por mensaje (error 1509), y en WhatsApp
     * fuera de la ventana de 24 horas sólo se admite una plantilla.
     *
     * `comment_message` y `publication_message` exigen `in_response_external_id`: el identificador
     * EN LA RED de lo que se responde —el `external_id` de un comentario, el `external_identifier`
     * de una publicación—, nunca un `_id` de PlanVortex, y error 1510 si falta. El endpoint no lo
     * leía del cuerpo hasta el 2026-08-24, lo que dejaba los dos tipos fuera del alcance de la API
     * pública; ya funcionan, y sólo en Facebook e Instagram: `comment_message` manda una respuesta
     * privada a un comentario público y `publication_message` adjunta el post como `MEDIA_SHARE`.
     *
     * ```ts
     * await pv.messages.send(orgId, accountId, contactId, {
     *     message_type: "simple_message",
     *     text: "Abrimos de 9 a 14",
     * });
     * ```
     */
    async send(
        idOrganization: string,
        idAccount: string,
        idContact: string,
        body: MessageInput,
        options: RequestOptions = {},
    ): Promise<Message> {
        return this.postOne<Message>(
            this.threadPath(idOrganization, idAccount, idContact),
            "message",
            body,
            options,
        );
    }

    /** Cuántos mensajes quedan sin leer en la organización. Es el número del badge. */
    async unreadCount(idOrganization: string, options: RequestOptions = {}): Promise<number> {
        const response = await this.httpGet<{ total: number }>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/unread_messages`,
            undefined,
            options,
        );
        return response.total;
    }

    /**
     * Borra TODOS los mensajes de una cuenta. No hay vuelta atrás y no hay confirmación.
     *
     * Los contactos se quedan: lo que se va son los mensajes.
     */
    async removeByAccount(
        idOrganization: string,
        idAccount: string,
        options: RequestOptions = {},
    ): Promise<void> {
        await this.httpDelete<SuccessResponse>(
            `${this.accountPath(idOrganization, idAccount)}/messages`,
            undefined,
            options,
        );
    }

    /**
     * Las plantillas de mensaje de la cuenta.
     *
     * **SÓLO WHATSAPP.** Ninguna otra red las implementa, y pedirlas en otra no devuelve el 1502 de
     * "esta red no tiene chat": el SDK lanza un error pelado y el manejador global lo convierte en
     * un **HTTP 500 con `code: 500`**. Comprueba que la cuenta es de WhatsApp antes de llamar.
     *
     * Lo que devuelve es lo que devuelve Meta, con sus nombres: `name`, `status`, `components` y
     * `language`. No se traduce a nada nuestro porque la plantilla que hay que nombrar al enviar es
     * la suya.
     */
    async templates(
        idOrganization: string,
        idAccount: string,
        options: PageOptions & RequestOptions = {},
    ): Promise<Paginated<MessageTemplate>> {
        return this.getList<MessageTemplate>(
            `${this.accountPath(idOrganization, idAccount)}/message_templates`,
            "templates",
            { offset: options.offset, limit: options.limit },
            options,
        );
    }

    /**
     * Crea una plantilla. **Sólo WhatsApp** (§ {@link templates}).
     *
     * El cuerpo va en el formato de Meta y se manda tal cual; una plantilla nueva nace en revisión
     * y no se puede usar hasta que Meta la aprueba.
     */
    async createTemplate(
        idOrganization: string,
        idAccount: string,
        template: MessageTemplate,
        options: RequestOptions = {},
    ): Promise<MessageTemplate> {
        const response = await this.httpPost<MessageTemplateResult>(
            `${this.accountPath(idOrganization, idAccount)}/message_templates`,
            template,
            options,
        );
        return response.template;
    }

    /**
     * Borra una plantilla. **Sólo WhatsApp** (§ {@link templates}).
     *
     * Hacen falta LAS DOS COSAS, el identificador y el nombre: Meta borra por nombre y usa el `id`
     * para desambiguar entre idiomas de la misma plantilla. Van en la query, no en el cuerpo.
     */
    async deleteTemplate(
        idOrganization: string,
        idAccount: string,
        templateId: string,
        templateName: string,
        options: RequestOptions = {},
    ): Promise<void> {
        await this.httpDelete<SuccessResponse>(
            `${this.accountPath(idOrganization, idAccount)}/message_templates`,
            { template_id: templateId, template_name: templateName },
            options,
        );
    }

    private accountPath(idOrganization: string, idAccount: string): string {
        return `/organizations/${requireId(idOrganization, "idOrganization")}/accounts/${requireId(idAccount, "idAccount")}`;
    }

    private threadPath(idOrganization: string, idAccount: string, idContact: string): string {
        return `${this.accountPath(idOrganization, idAccount)}/messages/${requireId(idContact, "idContact")}`;
    }
}
