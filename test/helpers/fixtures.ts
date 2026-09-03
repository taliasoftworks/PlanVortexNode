/**
 * Respuestas de ejemplo con la forma EXACTA que devuelve el servidor.
 *
 * No son datos bonitos: son los sobres y los campos que la fase 6 verificó uno a uno contra
 * `src/domain/**` de PlanVortexServer. Un fixture que se invente un campo convierte los tests de
 * contrato en tests de sí mismos.
 */
import type {
    Account,
    Comment,
    Contact,
    Message,
    Organization,
    Publication,
    Upload,
} from "../../src/index.js";

export const ORG_ID = "66d04a6a427f4c43b9d97f00";
export const CLIENT_ID = "66d04a6a427f4c43b9d97f01";
export const ACCOUNT_ID = "66d04a6a427f4c43b9d97f54";
export const UPLOAD_ID = "66d04a6a427f4c43b9d97f55";
export const PUBLICATION_ID = "66d04a6a427f4c43b9d97f60";
export const COMMENT_ID = "66d04a6a427f4c43b9d97f70";
export const CONTACT_ID = "66d04a6a427f4c43b9d97f80";

export const account: Account = {
    _id: ACCOUNT_ID,
    id_organization: ORG_ID,
    id_client: CLIENT_ID,
    name: "Panadería Nordwind",
    username: "nordwind",
    social_network: "instagram",
    creation_date: "2026-08-01T09:00:00.000Z",
    error_code: 0,
    image: "https://cdn.example/avatar.jpg",
    followers_count: 1240,
};

export const upload: Upload = {
    _id: UPLOAD_ID,
    id_organization: ORG_ID,
    name: "hogaza.jpg",
    file_type: "image",
    file_format: "jpeg",
    file_properties: {
        width: 1080,
        height: 1080,
        duration: 0,
        size_in_bytes: 482_133,
        //Es la división real, no un entero: el spec lo declaraba `integer` y era mentira.
        aspect_ratio: { value: 1, text: "1:1" },
        allowed_social_networks: ["instagram", "facebook"],
    },
    file_externals: [],
    is_temporal: false,
    public_path: "https://bucket.example/orgs/1/2/hogaza.jpg?X-Amz-Signature=abc",
    creation_date: "2026-08-20T10:00:00.000Z",
};

export const publication: Publication = {
    _id: PUBLICATION_ID,
    id_organization: ORG_ID,
    //En las operaciones de UNA publicación llega poblado, que es justo el caso raro.
    id_account: account,
    social_network: "instagram",
    publication_type: "profile",
    state: "ready",
    //Poblado también: el servidor hace `populate("files")` en las seis rutas.
    files: [upload],
    publication_errors: [],
    retries: 0,
    creation_date: "2026-08-20T10:05:00.000Z",
    publish_date: "2026-09-01T10:00:00.000Z",
    text: "Nuevo horno, nuevas hogazas",
};

/** La misma publicación como la devuelve el LISTADO: `id_account` sin poblar. */
export const listedPublication: Publication = { ...publication, id_account: ACCOUNT_ID };

export const organization: Organization = {
    _id: ORG_ID,
    id_client: CLIENT_ID,
    name: "Nordwind",
    creation_date: "2026-07-01T09:00:00.000Z",
};

export const planData = {
    accounts: 4,
    users: 3,
    space: 5,
    integrations: 1,
    twitter_credits: 2500,
    ai_credits: 1000,
    artificial_inteligence: true,
    whatsapp: false,
    stats: true,
};

/**
 * El CONSUMO, que no es el plan: lo mismo mas `publications`.
 *
 * Las publicaciones son ilimitadas desde la fase 1, asi que el numero existe pero no tiene
 * techo contra el que compararse: viaja en `actual_use` y nunca en `limits`.
 */
export const planUseData = {
    ...planData,
    publications: 200,
};

/**
 * Un comentario tal y como sale de un HILO EN VIVO o de un webhook: `id_account` como cadena.
 *
 * Los cuatro booleanos y las dos fechas van siempre —son `default` del modelo, no campos que la
 * red pueda no mandar—, y por eso el spec los declara `required` desde la fase 7.
 */
export const comment: Comment = {
    _id: COMMENT_ID,
    id_account: ACCOUNT_ID,
    id_organization: ORG_ID,
    publication_external_id: "17900000000000000",
    external_id: "17800000000000001",
    social_network: "instagram",
    author: { external_id: "9988776655", name: "un_seguidor", is_own: false },
    text: "Me interesa, ¿cuánto cuesta?",
    creation_date: "2026-08-21T18:00:00.000Z",
    collected_date: "2026-08-21T18:05:00.000Z",
    read: false,
    replied: false,
    hidden: false,
    deleted: false,
};

/**
 * El mismo comentario como lo devuelve LA BANDEJA, que es la única que puebla las dos referencias.
 * Es la asimetría inversa a la de `Publication.id_account`, y por eso hay dos fixtures.
 */
export const inboxComment: Comment = {
    ...comment,
    id_account: account,
    id_publication: publication,
};

/** Un contacto de la agenda, con su identificador de WhatsApp. */
export const contact: Contact = {
    _id: CONTACT_ID,
    id_organization: ORG_ID,
    name: "Marta",
    social_identifiers: [
        {
            _id: "66d04a6a427f4c43b9d97f81",
            social_network: "whatsapp",
            external_identifier: "34600111222",
            last_send_date: "2026-08-21T17:40:00.000Z",
        },
    ],
    creation_date: "2026-08-10T12:00:00.000Z",
    last_contact_update: "2026-08-21T17:40:00.000Z",
};

/**
 * Un mensaje SALIENTE: lleva `contact_id` y no `from_contact_id`. El servidor garantiza que viene
 * exactamente uno de los dos, y de ahí sale la dirección.
 */
export const message: Message = {
    _id: "66d04a6a427f4c43b9d97f90",
    id_account: ACCOUNT_ID,
    contact_id: CONTACT_ID,
    read: false,
    text: "Abrimos de 9 a 14",
    message_type: "simple_message",
    message_options: { files: [], files_urls: [] },
    message_errors: [],
    creation_date: "2026-08-21T18:10:00.000Z",
};
