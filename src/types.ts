/**
 * Los tipos PUBLICOS del paquete: los nombres con los que se habla de la API.
 *
 * Debajo de cada uno esta `src/generated/openapi.d.ts`, que sale del OpenAPI publico y no se toca
 * a mano. Este fichero es la capa fina que hay encima y hace tres cosas que un generador no puede:
 *
 *  1. **Pone nombres legibles.** En lo generado un esquema se llama `PublicationsPublication`,
 *     porque los 16 documentos del spec se unen en uno y el `Plan` de un cliente no es el `Plan`
 *     de una organizacion. Aqui se llama `Publication`.
 *  2. **Abre las enumeraciones que crecen** (§ trampa 8 del roadmap). `ALLOWED_RRSS` va por diez
 *     redes y sube varias veces al ano. Si `social_network` fuera una union cerrada, el dia que
 *     entre la undecima **dejaria de compilar el codigo de todos los integradores** hasta que
 *     actualizasen el paquete, y lo unico que habria pasado es que la API devuelve un valor mas.
 *     Con `T | (string & {})` se autocompletan las conocidas y una nueva sigue compilando.
 *  3. **Avisa de lo que el tipo no puede decir por si solo**, como que `public_path` caduca.
 *
 * NOTA SOBRE LOS CAMPOS OPCIONALES: un `?` aqui significa que el spec no declara ese campo
 * `required`. La fase 6 audito esquema a esquema los del camino de publicar —catalogo, clientes,
 * organizaciones, cuentas, ficheros y publicaciones— contra `src/domain/**` del servidor y declaro
 * lo que siempre viaja, asi que en esos ya no sobra ni un `?`. En los demas todavia sobran: se
 * arreglan en el spec —en PlanVortexHome—, nunca aqui, porque si este fichero declarase
 * obligatorio algo que el spec da por opcional habria dos verdades y solo una estaria publicada.
 */
import type { components } from "./generated/openapi.js";

/** Escotilla de salida: los tipos generados en crudo, por si hace falta uno que no este aqui. */
export type {
    components as OpenApiComponents,
    operations as OpenApiOperations,
    paths as OpenApiPaths,
    webhooks as OpenApiWebhooks,
} from "./generated/openapi.js";

type Schemas = components["schemas"];

/**
 * Una enumeracion ABIERTA: autocompleta los valores conocidos y admite uno nuevo sin romper.
 *
 * El `(string & {})` no es un truco de estilo, es lo unico que consigue las dos cosas a la vez:
 * `T | string` se colapsa a `string` y se pierde el autocompletado, y `T` a secas rompe la
 * compilacion en cuanto la API devuelve un valor que este paquete todavia no conoce.
 */
export type OpenEnum<T extends string> = T | (string & {});

type OptionalKeys<T> = { [K in keyof T]-?: Record<string, never> extends Pick<T, K> ? K : never }[keyof T];
type RequiredKeys<T> = Exclude<keyof T, OptionalKeys<T>>;

/**
 * Sustituye el tipo de unos campos CONSERVANDO si el spec los declara obligatorios u opcionales.
 *
 * La version anterior los dejaba opcionales siempre, que era lo correcto mientras el spec no
 * declaraba un solo `required`. Ahora que los declara, hacerlo asi borraria justo el trabajo de la
 * auditoria: `Publication.social_network` volveria a ser un `string | undefined` que obliga a
 * comprobarlo aunque la API lo mande siempre.
 */
type Override<T, R extends Partial<Record<keyof T, unknown>>> = Omit<T, keyof R> & {
    [K in Extract<keyof R, OptionalKeys<T>>]?: R[K];
} & {
    [K in Extract<keyof R, RequiredKeys<T>>]: R[K];
};

/**
 * Lo que devuelve cualquier `list()` del paquete: la pagina y el total.
 *
 * La API envuelve cada lista con el nombre de su recurso —`{publications, total}`,
 * `{accounts, total}`, `{comments, total}`— y en dos sitios lo envuelve de otra manera. La
 * libreria desenvuelve y entrega siempre la misma forma (§ trampa 6): el sobre es un detalle del
 * transporte. Lo que NO se traduce son los campos del recurso: `_id` sigue siendo `_id`.
 */
export interface Paginated<T> {
    data: T[];
    total: number;
}

// ---------------------------------------------------------------------------------------------
// Enumeraciones abiertas
// ---------------------------------------------------------------------------------------------

/**
 * Una red social soportada. **La lista crece**: no rechaces un valor que no reconozcas.
 *
 * Y no todas hacen lo mismo: `whatsapp` es mensajeria sin muro y `google_business` es una ficha de
 * negocio que recibe resenas, asi que ninguna de las dos publica. Quien manda es
 * `GET /social_capabilities`.
 */
export type SocialNetwork = OpenEnum<Schemas["SocialNetwork"]>;

/** Una red que tiene comentarios. Tambien crece. */
export type CommentNetwork = OpenEnum<Schemas["CommentsCommentNetworkName"]>;

/**
 * El estado de una publicacion.
 *
 * `draft` no se envia nunca; `ready` esta programada; `publishing` esta en manos de la red en este
 * momento; `sended` salio; `withErrors` fallo y trae el motivo en `publication_errors`.
 */
export type PublicationState = OpenEnum<Schemas["PublicationsPublication"]["state"]>;

/** Donde se publica dentro de la red: perfil, pagina, grupo, reel o story. */
export type PublicationType = OpenEnum<Schemas["PublicationsPublication"]["publication_type"]>;

/** `image` o `video`. Abierto porque el catalogo de formatos se ha ampliado antes (HEIC). */
export type FileType = OpenEnum<Schemas["Upload"]["file_type"]>;

/** La extension real del fichero ya guardado. Un HEIC entra pero se convierte a JPEG al subirlo. */
export type FileFormat = OpenEnum<Schemas["Upload"]["file_format"]>;

/**
 * Sobre que se divide el engagement de una publicacion.
 *
 * No todas las redes dan alcance, asi que se cae en cascada: `reach`, si no `impressions`, si no
 * `followers` (que es lo unico que hay en Bluesky y en Discord). **Dos filas con base distinta no
 * son comparables**: si las pones en la misma tabla, di cual es.
 */
export type EngagementBase = OpenEnum<
    NonNullable<Schemas["PublicationsPublicationStatsPoint"]["engagement_base"]>
>;

// ---------------------------------------------------------------------------------------------
// Catalogo
// ---------------------------------------------------------------------------------------------

/**
 * Los limites por red: caracteres, imagenes, duracion de video, tamano de fichero.
 *
 * Los publica el servidor, que es quien los valida. Bluesky lleva **dos** cuentas distintas del
 * mismo texto —300 grafemas en `characters` y 3.000 bytes en `max_post_bytes`— porque `.length`
 * miente en las dos direcciones. Un `0` en `max_post_bytes`, `comment_characters` o
 * `title_characters` significa "esta red no mide eso", no "cero".
 */
export type SocialLimits = Schemas["CatalogSocialLimits"];

/** Un numero por red, con TODAS las redes presentes. Lo obliga el conformance del servidor. */
export type SocialLimitsMap = Schemas["CatalogSocialLimitsMap"];

/** Los recortes que acepta una red, como numero y como se escribe. Indices paralelos. */
export type AspectRatios = Schemas["CatalogAspectRatios"];

/**
 * Los recortes de cada red, indexados por red **y por tipo de publicacion**: hay entradas como
 * `facebook_reels` que no son una red, sino una red y un formato.
 */
export type AspectRatiosByNetwork = Record<string, AspectRatios>;

/** Los topes de una publicacion que no dependen de la red. Hoy, cuantos reintentos manuales admite. */
export interface PublicationLimits {
    max_retries: number;
}

/** Que sabe hacer una red: publicar, mensajes, productos, webhooks, menu persistente, comentarios. */
export type SocialCapabilities = Schemas["CommentsSocialCapabilities"];

/**
 * Que se puede hacer con los comentarios de una red, una a una.
 *
 * No basta con saber que la red tiene comentarios: Instagram, X y Bluesky no dejan borrar el de
 * otro, LinkedIn no tiene "ocultar" y Google Business solo deja borrar **nuestra propia**
 * respuesta. Se pide en `GET /social_comment_actions`, y es lo que decide que botones se pintan.
 */
export type CommentActions = Schemas["CommentsCommentActions"];

// ---------------------------------------------------------------------------------------------
// Cliente, organizacion y plan
// ---------------------------------------------------------------------------------------------

/**
 * Los recursos que reparte un plan. En un cliente es lo contratado; en una organizacion, la
 * porcion que se le asigno.
 *
 * OJO CON LA SUMA: lo asignado a las organizaciones de un cliente nunca puede pasar de lo que el
 * cliente tiene contratado — pedir mas devuelve un 1400-1408.
 */
export type PlanData = Schemas["PlanData"];

/**
 * La SUSCRIPCION de un cliente, que no es lo mismo que los recursos que da: los numeros estan en
 * `plan_data`. Leer `plan_identifier` para saber los limites es el error clasico — un plan
 * `custom` los lleva propios.
 */
export type ClientPlan = Schemas["ClientsPlan"];

/** Un cliente: quien contrata el plan y a quien cuelgan las organizaciones. */
export type Client = Schemas["ClientsClient"];

/**
 * Una organizacion: el contenedor de cuentas, publicaciones y ficheros.
 *
 * `actual_plan` es lo ASIGNADO, y **falta cuando no se le asigno nada** — entonces comparte el del
 * primer padre que tenga uno, o el resto sin repartir del cliente. Para los numeros que de verdad
 * aplican, `pv.organizations.limits(id)`.
 */
export type Organization = Schemas["Organization"];

/** El contexto de marca que la IA usa al escribir para esta organizacion. */
export type AiContext = Schemas["AiContext"];

/** Las credenciales de la aplicacion propia de una organizacion (BYOB). Los secretos nunca salen. */
export type SocialCredentials = Schemas["SocialCredentials"];

// ---------------------------------------------------------------------------------------------
// Recursos
// ---------------------------------------------------------------------------------------------

/**
 * Una cuenta social conectada a una organizacion.
 *
 * En Discord una cuenta es un **canal**, no un perfil: publicar en dos canales del mismo servidor
 * gasta dos cuentas del plan. `error_code` distinto de 0 significa que la conexion se rompio —
 * token caducado, permisos retirados— y hay que reconectarla.
 */
export type Account = Override<
    Schemas["Account"],
    {
        social_network: SocialNetwork;
    }
>;

/**
 * La serie de una metrica de cuenta, ya agrupada.
 *
 * `group` dice que cubre cada fila: un rango de 31 dias o menos se agrupa por dia, hasta 720 por
 * mes, y de ahi en adelante por ano. Los `name` son los nombres CRUDOS de la red — los mismos que
 * devuelve `metricList()`—, no el vocabulario comun.
 */
export type AccountMetrics = Schemas["AccountsMetricModel"];

/** Una fila de {@link AccountMetrics}. */
export type AccountMetricRow = AccountMetrics["stats"][number];

/** El menu fijo del chat, en el formato de Meta. Solo lo tienen las redes con mensajeria. */
export type PersistentMenu = Schemas["AccountsPersistentMenu"];

/**
 * Un fichero de la biblioteca de la organizacion.
 *
 * CUIDADO CON `public_path`: es una URL **firmada y temporal**, no un enlace permanente. Se
 * mantiene identica dentro de la misma hora —asi que cachearla ese rato es correcto— y despues
 * deja de servir. Guardarla en tu base de datos es el error clasico: a los tres dias todas las
 * miniaturas estan rotas. Vuelve a pedir el upload cuando la necesites.
 */
export type Upload = Override<
    Schemas["Upload"],
    {
        file_type: FileType;
        file_format: FileFormat;
    }
>;

/** Ancho, alto, duracion y tamano de un fichero, mas en que redes cabe **por su recorte**. */
export type FileProperties = Schemas["FileProperties"];

/**
 * Una publicacion: programada, enviada o fallida.
 *
 * DOS COSAS QUE SORPRENDEN, las dos comprobadas contra el servidor en la fase 6:
 *
 *  - **`files` viene POBLADO**: son `Upload` enteros, no identificadores. Identificadores es lo
 *    que se MANDA ({@link PublicationInput}).
 *  - **`id_account` cambia de forma segun la operacion**: las de una sola publicacion (crear,
 *    leer, reintentar) lo devuelven resuelto y el listado y la actualizacion lo devuelven como
 *    identificador. Usa {@link accountId} o {@link account} en vez de asumir una de las dos.
 *
 * Si `state` es `withErrors`, el motivo esta en `publication_errors` —que es un ARRAY— y su `code`
 * es un codigo del catalogo de PlanVortex, nunca un status HTTP.
 */
export type Publication = Override<
    Schemas["PublicationsPublication"],
    {
        social_network: SocialNetwork;
        state: PublicationState;
        publication_type: PublicationType;
        engagement_base: EngagementBase;
        files: Upload[];
        //Se reescribe con NUESTRO `Account`, el de la enumeracion abierta. Con el generado, una
        //cuenta de una red que este paquete todavia no conozca no encajaria aqui.
        id_account: string | Account;
    }
>;

/**
 * Un motivo por el que una publicacion fallo, tal y como viaja en `publication_errors`.
 *
 * NO confundir con `PublicationError`, que es la EXCEPCION que lanza la libreria cuando la
 * peticion falla. Esto es un dato dentro de una respuesta correcta: la publicacion se guardo, y
 * aqui pone por que no salio.
 */
export type PublicationErrorDetail = Publication["publication_errors"][number];

/**
 * Lo que se manda para crear o actualizar una publicacion. Aqui `files` SI son identificadores.
 *
 * `publish_date` admite un `Date` ademas de la cadena ISO: la libreria lo convierte. Sin eso, el
 * primer olvido es siempre el `.toISOString()`.
 */
export type PublicationInput = Override<
    Schemas["PublicationsPublicationInput"],
    {
        social_network: SocialNetwork;
        state: PublicationState;
        publication_type: PublicationType;
        publish_date: string | Date;
    }
>;

/** El desglose crudo de metricas que da la red, que no es el mismo en dos redes cualesquiera. */
export type PublicationStats = Schemas["PublicationsPublicationStats"];

/** Las metricas comparables entre redes: las que se pueden sumar en una grafica. */
export type PublicationMetrics = Schemas["PublicationsNormalizedMetrics"];

/** La serie historica de una publicacion, mas su ultima medicion. */
export type PublicationStatsHistory = Override<
    Schemas["PublicationsPublicationStatsHistory"],
    {
        social_network: SocialNetwork;
        engagement_base: EngagementBase;
    }
>;

/** Una medicion de la serie: el ACUMULADO a esa fecha, no el incremento del dia. */
export type PublicationStatsPoint = Override<
    Schemas["PublicationsPublicationStatsPoint"],
    {
        engagement_base: EngagementBase;
    }
>;

/**
 * Un comentario, o una resena de Google Business.
 *
 * `id_publication` **falta** cuando el comentario cuelga de una ficha y no de una publicacion
 * nuestra, que es justo el caso de Google Business: ahi `publication_external_id` es la ficha
 * (`locations/{id}`). `rating` solo llega donde se valora con estrellas, y una resena puede venir
 * sin texto ninguno. De lo nuestro solo son `read` y `replied`: todo lo demas lo manda la red.
 */
export type Comment = Override<
    Schemas["CommentsComment"],
    {
        social_network: CommentNetwork;
    }
>;

/** Quien escribio un comentario. `is_own` distingue el nuestro del de un tercero. */
export type CommentAuthor = Schemas["CommentsCommentAuthor"];

/** Una conversacion de mensajeria con un contacto. */
export type Conversation = Schemas["MessagesConversation"];

/**
 * Un mensaje intercambiado con un contacto.
 *
 * OJO CON LOS TRES CAMPOS DE REFERENCIA. `contact_id`, `from_contact_id` y
 * `message_options.files` llegan **poblados** —el objeto entero, no el identificador— en el
 * listado de mensajes y en el webhook que PlanVortex manda a tu app, y como identificador a secas
 * en el resto. Es la misma asimetria que `Publication.id_account`, y se tapa igual: con
 * {@link messageContact}, {@link messageContactId} y {@link messageFiles}, para no escribir el
 * `typeof` en cada sitio.
 */
export type Message = Override<Schemas["Message"], { message_options: MessageOptions }>;

/**
 * Lo que un mensaje lleva ademas del texto: ficheros, plantilla, payload, tarjetas de Meta.
 *
 * `files` se reescribe para que los adjuntos poblados sean el {@link Upload} PUBLICO —el de los
 * formatos abiertos— y no el generado: si no, un fichero de un mensaje y uno de una publicacion
 * serian dos tipos distintos para el mismo objeto del servidor.
 */
export type MessageOptions = Override<
    Schemas["MessageOptions"],
    { files: (string | Upload)[] }
>;

/** Que clase de mensaje es. `simple_message` y `file_message` valen en todas las redes. */
export type MessageType = Schemas["MessageType"];

/** Un contacto de la agenda de la organizacion. */
export type Contact = Schemas["Contact"];

/** El mismo contacto, en un canal. Es una red social o `email`. */
export type SocialIdentifier = Schemas["SocialIdentifier"];

/** Donde se puede alcanzar a un contacto: cualquier red con mensajeria, o `email`. */
export type ContactChannel = OpenEnum<Schemas["ContactChannel"]>;

/** Un producto del catalogo de una cuenta (solo en las redes que venden). */
export type Product = Schemas["ProductsProduct"];

/** Una conexion con una herramienta de la que se traen materiales: Google Drive, un RSS. */
export type Integration = Schemas["IntegrationsIntegration"];

/** Un plan de publicaciones generado con IA. */
export type AiPlan = Schemas["AiPlansAiPlan"];

/** Una app de cliente: las credenciales con las que una integracion se autentica. */
export type ClientApp = Schemas["AppsClientApp"];

/**
 * Los cambios que se entregan a la url de webhook de una app NO se tipan aqui.
 *
 * El spec los describe planos —un solo objeto con casi todo opcional, porque eso es lo que se ve
 * en el cable— y lo que el integrador necesita es una union discriminada por `field` con
 * predicados que la estrechen. Eso vive en `planvortex/webhooks`, junto a la verificacion de la
 * firma, que es donde se van a buscar. Los tipos se reexportan desde el punto de entrada
 * principal, asi que `import type { WebhookChange } from "planvortex"` sigue valiendo.
 */

// ---------------------------------------------------------------------------------------------
// Ayudas para los campos que la API devuelve de dos formas
// ---------------------------------------------------------------------------------------------

/**
 * El identificador de la cuenta de una publicacion, venga poblada o no.
 *
 * `id_account` llega resuelto en las operaciones de una sola publicacion y como cadena en el
 * listado (§ el aviso de {@link Publication}). Esto lo tapa sin obligar a escribir el `typeof` en
 * cada sitio.
 */
export function accountId(publication: Pick<Publication, "id_account">): string {
    const value = publication.id_account;
    return typeof value === "string" ? value : value._id;
}

/**
 * La cuenta de una publicacion cuando viene poblada, y `undefined` cuando la API solo mando el
 * identificador. Contrapartida de {@link accountId}.
 */
export function account(publication: Pick<Publication, "id_account">): Account | undefined {
    const value = publication.id_account;
    return typeof value === "string" ? undefined : value;
}

/**
 * Hacia donde va un mensaje.
 *
 * No es un campo: se deduce de CUAL de los dos contactos trae. `from_contact_id` es el contacto
 * escribiendonos y `contact_id` nosotros escribiendole, y el servidor garantiza que viene
 * exactamente uno (`ERROR_CODE_1503` si no viene ninguno, `1504` si vienen los dos). El
 * `"unknown"` esta para el mensaje que se construye a mano y todavia no ha pasado por ahi.
 */
export function messageDirection(
    message: Pick<Message, "contact_id" | "from_contact_id">,
): "incoming" | "outgoing" | "unknown" {
    if (message.from_contact_id) {
        return "incoming";
    }
    return message.contact_id ? "outgoing" : "unknown";
}

/**
 * El identificador del contacto de un mensaje, venga poblado o no y escriba quien escriba.
 *
 * Para saber la direccion esta {@link messageDirection}; aqui lo que interesa es CON QUIEN se
 * habla, que es la misma persona en los dos sentidos.
 */
export function messageContactId(
    message: Pick<Message, "contact_id" | "from_contact_id">,
): string | undefined {
    const value = message.from_contact_id ?? message.contact_id;
    if (value === undefined) {
        return undefined;
    }
    return typeof value === "string" ? value : value._id;
}

/**
 * El contacto de un mensaje cuando viene poblado —el listado y el webhook—, y `undefined` cuando
 * la API solo mando el identificador. Contrapartida de {@link messageContactId}.
 */
export function messageContact(
    message: Pick<Message, "contact_id" | "from_contact_id">,
): Contact | undefined {
    const value = message.from_contact_id ?? message.contact_id;
    return value === undefined || typeof value === "string" ? undefined : value;
}

/**
 * Los ficheros adjuntos de un mensaje que vienen poblados. Los que llegaron como identificador
 * NO salen aqui: para esos esta {@link messageFileIds}.
 */
export function messageFiles(message: Pick<Message, "message_options">): Upload[] {
    const files = message.message_options?.files ?? [];
    return files.filter((file): file is Upload => typeof file !== "string");
}

/** Los identificadores de los ficheros adjuntos de un mensaje, vengan poblados o no. */
export function messageFileIds(message: Pick<Message, "message_options">): string[] {
    const files = message.message_options?.files ?? [];
    return files.map((file) => (typeof file === "string" ? file : file._id));
}
