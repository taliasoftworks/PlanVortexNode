/**
 * Los tipos PUBLICOS del paquete: los nombres con los que se habla de la API.
 *
 * Debajo de cada uno esta `src/generated/openapi.d.ts`, que sale del OpenAPI publico y no se toca
 * a mano. Este fichero es la capa fina que hay encima y hace tres cosas que un generador no puede:
 *
 *  1. **Pone nombres legibles.** En lo generado un esquema se llama `PublicationsPublicationInput`,
 *     porque los 16 documentos del spec se unen en uno y el `Plan` de un cliente no es el `Plan`
 *     de una organizacion. Aqui se llama `PublicationInput`. Los que describen LO MISMO en varias
 *     secciones viven en `common.json` y conservan su nombre —`Publication`, `Account`, `Upload`,
 *     `Message`, `Contact`, `NormalizedMetrics`—: es lo que evita dos tipos para un solo objeto.
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
import type { components, operations } from "./generated/openapi.js";

/** Escotilla de salida: los tipos generados en crudo, por si hace falta uno que no este aqui. */
export type {
    components as OpenApiComponents,
    operations as OpenApiOperations,
    paths as OpenApiPaths,
    webhooks as OpenApiWebhooks,
} from "./generated/openapi.js";

type Schemas = components["schemas"];
type Operations = operations;

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
export type PublicationState = OpenEnum<Schemas["Publication"]["state"]>;

/** Donde se publica dentro de la red: perfil, pagina, grupo, reel o story. */
export type PublicationType = OpenEnum<Schemas["Publication"]["publication_type"]>;

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

/**
 * Las credenciales tal y como se MANDAN. Son de solo escritura: nada de lo que va aqui vuelve.
 *
 * Las tres hacen falta la primera vez; despues, lo que se omite se conserva.
 */
export type SocialCredentialsInput = Schemas["OrganizationsSocialCredentialsInput"];

/**
 * La configuracion de proveedores de IA de un cliente (BYOK), ambito a ambito.
 *
 * Un ambito en `null` borra su configuracion y devuelve ese ambito a los creditos de PlanVortex.
 */
export type AiSettings = Schemas["ClientsAiSettings"];

/** Un cliente con sus organizaciones raiz dentro. Es el atajo del arranque: 1 peticion en vez de N. */
export type ClientWithOrganizations =
    Operations["getClientsWithOrganizations"]["responses"][200]["content"]["application/json"]["clients"][number];

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

// ---------------------------------------------------------------------------------------------
// Conexion de cuentas
// ---------------------------------------------------------------------------------------------

/**
 * El token temporal con el que UNA PERSONA conecta una cuenta social, y la URL a la que mandarla.
 *
 * Las dos cosas valen: `url` es el camino alojado —se redirige al usuario y PlanVortex se encarga
 * de todo—, y `token` es el mismo credencial suelto, para pasarselo a `pv.asTemporalToken(token)`
 * y conducir el flujo desde el front propio. Caduca a los quince minutos (`expires_at`), sirve para
 * UNA organizacion y se gasta en cuanto conecta una cuenta.
 */
export type ConnectToken =
    Operations["createTemporalConnectToken"]["responses"][200]["content"]["application/json"];

/**
 * Como se conecta UNA red. Casi siempre es un enlace: se manda al usuario ahi y la red lo devuelve
 * al panel de PlanVortex, que es quien completa la conexion.
 *
 * **Casi. Mira `authorization.type` y no si `link` esta vacio.** WhatsApp no tiene URL de
 * autorizacion: su alta es el Embedded Signup de Meta, un popup que levanta el SDK de JavaScript de
 * Facebook desde tu pagina y que devuelve por `postMessage` datos —el `waba_id`, el
 * `phone_number_id`— que no caben en una query string. Su `link` es cadena vacia y los parametros
 * del popup (`app_id`, `config_id`, `graph_version`...) viajan en `authorization`.
 */
export type ConnectLink = Schemas["AccountsSocialLinksList"]["links"][number];

/**
 * Con que se autoriza una red: `redirect` (las otras nueve) o `meta_embedded_signup` (WhatsApp).
 * Se saca de {@link ConnectLink} y esta aqui para poder nombrarlo en un `switch`.
 */
export type SocialAuthorizationMethod = ConnectLink["authorization"];

/**
 * Lo que dejo una autorizacion: las cuentas que se pueden dar de alta.
 *
 * **Todavia no cuentan para el plan**: hasta que no se llama a `accounts.enable()` no ocupan plaza
 * ni publican. Una sola autorizacion puede dejar varias (un usuario de Facebook con cuatro paginas
 * son cuatro), y por eso hay un paso de eleccion en medio.
 *
 * No lleva `errorCode`: el endpoint contesta 200 con el error dentro y la libreria lo convierte en
 * la excepcion que le toca (§ `AccountsResource.connect`).
 */
export interface ConnectResult {
    /** Las cuentas conectadas, aun sin habilitar. Vacio si la autorizacion no dejo nada utilizable. */
    accounts: Account[];
    /** A donde mandar al usuario despues, si el token temporal llevaba `redirect_uri`. */
    redirect_uri?: string;
}

/** Lo que devuelve habilitar una cuenta. Un fallo no llega aqui: se lanza. */
export interface EnableResult {
    /** A donde mandar al usuario despues, si el token temporal llevaba `redirect_uri`. */
    redirect_uri?: string;
}

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
    Schemas["Publication"],
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
export type PublicationStats = Schemas["PublicationStats"];

/** Las metricas comparables entre redes: las que se pueden sumar en una grafica. */
export type PublicationMetrics = Schemas["NormalizedMetrics"];

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
 * TRES COSAS QUE SORPRENDEN, las tres comprobadas contra el servidor en la fase 7:
 *
 *  - **`id_publication` falta** cuando el comentario no cuelga de una publicacion nuestra, y eso
 *    no es raro: la resena de Google Business cuelga de la FICHA (ahi `publication_external_id`
 *    es `locations/{id}`), y un video subido a mano al canal o un post anterior a PlanVortex
 *    tambien reciben comentarios. Lo que identifica siempre es `publication_external_id`.
 *  - **`id_account` e `id_publication` cambian de forma segun la operacion**: LA BANDEJA los
 *    devuelve poblados —el objeto entero— y todo lo demas —los hilos en vivo, responder,
 *    actualizar— como cadena. Es la misma asimetria que `Publication.id_account` y se tapa igual,
 *    con {@link accountId} / {@link account} y {@link publicationId} / {@link publication}.
 *  - **`text` puede venir vacio y no es un fallo**: una resena de solo estrellas no lleva texto,
 *    asi que se pinta el `rating` al lado en vez de dar la fila por rota.
 *
 * De lo nuestro solo son `read` y `replied`. Todo lo demas lo manda la red, y una lectura en vivo
 * pisa lo guardado.
 */
export type Comment = Override<
    Schemas["CommentsComment"],
    {
        social_network: CommentNetwork;
        //Se reescriben con NUESTROS `Account` y `Publication`, los de las enumeraciones abiertas,
        //por lo mismo que en `Publication.id_account`: con los generados, un comentario de una red
        //que este paquete todavia no conozca no encajaria aqui.
        id_account: string | Account;
        id_publication: string | Publication;
    }
>;

/** Quien escribio un comentario. `is_own` distingue el nuestro del de un tercero. */
export type CommentAuthor = Schemas["CommentsCommentAuthor"];

/**
 * Un hilo LEIDO EN VIVO: lo que la red dice ahora mismo, ya reconciliado con lo guardado.
 *
 * DOS COSAS: `credits_consumed` es dinero de verdad y solo en X —un credito por respuesta
 * devuelta, `0` en las demas redes—, y `next_cursor` es el token opaco de la red, que se devuelve
 * TAL CUAL como `offset` en la llamada siguiente. Que falte significa que no hay mas paginas.
 */
export type CommentThread = Override<Schemas["CommentsCommentThread"], { comments: Comment[] }>;

/**
 * Lo que devuelve responder a un comentario: el comentario ya marcado como respondido, la
 * respuesta, y lo que costo.
 *
 * **`reply` puede llegar SIN `_id`.** La respuesta se publica primero en la red y se guarda
 * despues, y guardarla no puede tumbar la peticion —la red ya la publico—, asi que cuando esa
 * escritura falla lo que llega es lo que devolvio la red, sin identificador de PlanVortex. El
 * campo que la identifica siempre es `comment.our_reply_external_id`.
 */
export interface CommentReplyResult {
    comment: Comment;
    reply: Comment;
    credits_consumed: number;
}

/**
 * Una conversacion: un contacto, cuando escribio por ultima vez y cuantos mensajes suyos quedan
 * sin leer.
 *
 * No tiene `_id` propio —sale de una agregacion que lo proyecta fuera— porque la conversacion no
 * es una entidad: lo que existe son los mensajes con ese contacto. El identificador con el que se
 * abre el hilo es `conversation.contact._id`.
 */
export type Conversation = Override<Schemas["MessagesConversation"], { contact: Contact }>;

/**
 * Cuantas conversaciones hubo en un rango. Son DOS respuestas distintas, no una con campos de mas:
 * sin `group_by` llega `{total}` y con el llega `{stats, group}`.
 *
 * OJO CON `groupValue`: es el NUMERO que dan `$dayOfYear`, `$month` o `$year` de Mongo —240, 8,
 * 2026—, no una fecha. Con `group_by: "day"` dos anos del mismo rango caen en el mismo valor.
 */
export type ConversationTotals = Schemas["MessagesConversationTotals"];

/**
 * Lo que se manda para escribir un mensaje.
 *
 * `comment_message` y `publication_message` estan en {@link MessageType} pero **no se pueden
 * enviar por aqui**: las dos necesitan el identificador de lo que responden y el endpoint no lo lee
 * del cuerpo, asi que el mensaje saldria sin destinatario.
 */
export type MessageInput = Override<
    Schemas["MessagesMessageInput"],
    { message_options: Partial<MessageOptions> }
>;

/**
 * Una plantilla de mensaje, **en el formato de la red**: `name`, `status`, `components` y
 * `language` de Meta.
 *
 * No se traduce a un tipo nuestro a proposito. La plantilla que hay que nombrar al enviar
 * (`message_options.template_name`) es la de la red, asi que inventar aqui otra forma obligaria a
 * traducir de vuelta en el unico sitio donde se usa. Y es de WhatsApp y de nadie mas.
 */
export type MessageTemplate = Record<string, unknown>;

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
export type MessageOptions = Override<Schemas["MessageOptions"], { files: (string | Upload)[] }>;

/** Que clase de mensaje es. `simple_message` y `file_message` valen en todas las redes. */
export type MessageType = Schemas["MessageType"];

/** Un contacto de la agenda de la organizacion. */
export type Contact = Schemas["Contact"];

/**
 * Lo que se manda para dar de alta un contacto.
 *
 * `social_identifiers` NO es opcional: un contacto sin canal es un contacto al que nadie puede
 * escribir, y el servidor lo rechaza con el error 1601.
 */
export type ContactCreate = Schemas["ContactsContactCreate"];

/**
 * Lo que se manda para cambiar un contacto.
 *
 * **`extra_data` es destructivo**: es el unico campo que el servidor escribe con lo que llegue en
 * vez de conservarlo, asi que omitirlo BORRA los campos propios del contacto. Los otros tres se
 * respetan cuando no viajan.
 */
export type ContactUpdate = Schemas["ContactsContactUpdate"];

/** Los campos propios de un contacto: el bloque de direccion y las seis propiedades libres. */
export type ContactExtraData = Schemas["ContactExtraData"];

/** El mismo contacto, en un canal. Es una red social o `email`. */
export type SocialIdentifier = Schemas["SocialIdentifier"];

/**
 * El mismo, tal y como se MANDA: aqui `_id` es opcional y el servidor pone uno.
 *
 * Son dos tipos y no uno porque el que vuelve siempre trae `_id` y el que se manda casi nunca lo
 * lleva; con un solo tipo, o se exige un identificador que aun no existe o se deja de garantizar
 * el que si.
 */
export type SocialIdentifierInput = Schemas["ContactsSocialIdentifierInput"];

/** Donde se puede alcanzar a un contacto: cualquier red con mensajeria, o `email`. */
export type ContactChannel = OpenEnum<Schemas["ContactChannel"]>;

/**
 * Un producto de un catalogo de Meta Commerce. Solo Facebook e Instagram.
 *
 * Habla el vocabulario de Meta y no uno nuestro, a diferencia de las estadisticas: lo que hay aqui
 * son los campos de la Graph API, con sus nombres.
 */
export type Product = Schemas["ProductsProduct"];

/** Lo que se manda para crear un producto. Con `id` dentro, ACTUALIZA el que ya existe. */
export type ProductInput = Schemas["ProductsProductInput"];

/** Un catalogo de Meta Commerce: lo que agrupa productos y de donde cuelga todo lo demas. */
export type ProductCatalog = Schemas["ProductsProductCatalog"];

/** Lo que se manda para crear un catalogo. */
export type ProductCatalogInput = Schemas["ProductsProductCatalogInput"];

/**
 * Una conexion de una ORGANIZACION con una herramienta de la que se trae material: Google Drive,
 * un feed RSS.
 *
 * No confundir con una **app** ({@link ClientApp}), que es el acceso al API de PlanVortex. Son dos
 * cosas distintas que media web ha llamado igual.
 *
 * Las credenciales no salen nunca: para saber si la conexion esta viva esta `connected`, y el
 * motivo cuando no lo esta, en `error_code`.
 */
export type Integration = Schemas["IntegrationsIntegration"];

/** Que sabe hacer un proveedor y que campos lleva su formulario. Es lo que decide como conectar. */
export type IntegrationProvider = Schemas["IntegrationsIntegrationProvider"];

/** Un proveedor soportado. Abierto porque la lista crece. */
export type IntegrationProviderName = OpenEnum<Schemas["IntegrationsIntegrationProviderName"]>;

/** La configuracion de un feed RSS. En Google Drive el `config` es un objeto vacio. */
export type RssConfig = Schemas["IntegrationsRssConfig"];

/**
 * Lo que se manda para conectar o reconectar. Son dos formas y las distingue `provider`: con OAuth
 * viaja el `code`, y sin el, el formulario de `config_fields`.
 */
export type IntegrationConnectRequest =
    Schemas["IntegrationsGoogleDriveConnectRequest"] | Schemas["IntegrationsRssConnectRequest"];

/** Lo que se puede cambiar de una integracion ya conectada. */
export type IntegrationUpdate = Operations["updateIntegration"]["requestBody"]["content"]["application/json"];

/**
 * Lo que el navegador necesita para abrir el Picker de Google. **Lleva un token vivo**: se pide
 * justo antes de abrirlo y no se guarda en ningun sitio.
 */
export type IntegrationPickerConfig =
    Operations["getIntegrationPickerConfig"]["responses"][200]["content"]["application/json"];

/**
 * Un plan de publicaciones generado con IA.
 *
 * **`publications` cambia de forma segun la operacion**, como `Publication.id_account`: leer un
 * plan lo devuelve con las publicaciones enteras y sus ficheros, y el LISTADO devuelve sus
 * identificadores. `organization_context` es una FOTO del contexto de marca de la organizacion en
 * el momento de crear el plan, no el de ahora: es lo que hace que un reintento sea reproducible.
 */
export type AiPlan = Schemas["AiPlansAiPlan"];

/** El estado de un plan. `pending` y `generating` son los dos que hay que sondear. */
export type AiPlanState = OpenEnum<AiPlan["state"]>;

/** Las opciones con las que se genero un plan, ya normalizadas. */
export type AiPlanOptions = Schemas["AiPlansAiPlanOptions"];

/** Las opciones tal y como se MANDAN: todas opcionales, los defaults los pone el servidor. */
export type AiPlanOptionsInput = Schemas["AiPlansAiPlanOptionsInput"];

/** Lo que se manda para encolar un plan. */
export type AiPlanCreateRequest = Schemas["AiPlansAiPlanCreateRequest"];

/**
 * El presupuesto DETERMINISTA de un plan, calculado por el servidor y nunca por el modelo.
 *
 * `base_cost` es lo imprescindible —orquestacion y textos—: si no cabe en `available_credits`, el
 * plan se rechaza en vez de generarse a medias. `estimated_cost` incluye ademas las imagenes
 * financiables y es una cota superior.
 */
export type AiPlanCostEstimate = Schemas["AiPlansAiPlanCostEstimate"];

/** Lo que devuelve encolar un plan: el plan en `pending` y lo que se calculo que costaria. */
export type AiPlanCreateResult = Schemas["AiPlansAiPlanCreateResponse"];

/** Una app de cliente: las credenciales con las que una integracion se autentica. */
export type ClientApp = Schemas["AppsClientApp"];

/** Lo que se manda para crear o actualizar una app. Al actualizar, REEMPLAZA los cinco campos. */
export type ClientAppInput = Schemas["AppsClientAppInput"];

// ---------------------------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------------------------

/**
 * El rango que se aplico y el periodo anterior con el que se compara, de la MISMA longitud.
 *
 * No es "el mes pasado": comparar 30 dias contra un mes natural moveria el delta con el calendario.
 */
export type DashboardRange = Schemas["DashboardDashboardRange"];

/**
 * Una metrica del vocabulario COMUN, la que se puede sumar entre redes.
 *
 * Cerrada a proposito, al reves que {@link SocialNetwork}: no es una lista que crezca sola con cada
 * red nueva, es la traduccion que hace comparables a todas. Un nombre que no este aqui es un nombre
 * crudo de una red y no se puede sumar con nada.
 */
export type MetricName = Schemas["DashboardMetricName"];

/**
 * Una fila agregada de metricas de cuenta.
 *
 * `group` es el valor del eje —el dia, la red, el identificador de cuenta— y **es `null` cuando se
 * agrupo por `total`**: el campo viaja siempre, el valor no siempre es una cadena.
 */
export type MetricRow = Schemas["DashboardMetricRow"];

/** Lo que devuelve {@link DashboardResource.metrics}. */
export type DashboardMetricsResult =
    Operations["getOrganizationMetrics"]["responses"][200]["content"]["application/json"];

/** Los conteos de publicaciones de un rango. */
export type PublicationsSummary = Schemas["DashboardPublicationsSummary"];

/** Lo que devuelve {@link DashboardResource.publications}: el rango mas los conteos. */
export type PublicationsSummaryResult =
    Operations["getPublicationsSummary"]["responses"][200]["content"]["application/json"];

/**
 * Una fila del ranking. **No tiene la forma de una `Publication`**: sale de la agregacion de
 * estadisticas, asi que el identificador es `id_publication` y el contenido viaja anidado en
 * `publication`.
 */
export type TopPublication = Schemas["DashboardTopPublication"];

/** Lo que devuelve {@link DashboardResource.topPublications}. */
export type TopPublicationsResult =
    Operations["getTopPublications"]["responses"][200]["content"]["application/json"];

/** Lo que devuelve {@link DashboardResource.publicationStats}: los agregados y la pagina. */
export type PublicationsStatsResult = Schemas["PublicationsPublicationsStatsList"];

/** Lo que gasta una organizacion, lo que ha repartido entre sus hijas, y lo que tiene. */
export type PlanUse = Schemas["DashboardPlanUse"];

/** Una cuenta rota: token caducado o permiso revocado. Ni publica ni mide hasta reconectarla. */
export type AccountWithError = Schemas["DashboardAccountWithError"];

/** Una publicacion tal y como la PROYECTA el bloque de salud: cuatro campos, no una `Publication`. */
export type DashboardPublicationRef = Schemas["DashboardDashboardPublicationRef"];

/** El ultimo plan de IA, proyectado, tal y como lo devuelve el bloque de planes. */
export type DashboardAiPlanRef = Schemas["DashboardDashboardAiPlanRef"];

/**
 * La pantalla de inicio entera.
 *
 * **Un bloque que falta no es un error**: cada uno se comprueba contra su propio permiso y se omite
 * si quien llama no puede leerlo, en vez de tumbar la peticion. `available_blocks` dice cuales se
 * permitieron; uno en `true` que no viene es que no habia datos.
 */
export type Dashboard = Schemas["DashboardDashboard"];

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

/** Cualquier cosa que la API devuelve unas veces poblada y otras como identificador. */
export interface WithAccount {
    id_account: string | Account;
}

/** Lo mismo con la publicacion: hoy, un comentario de la bandeja. */
export interface WithPublication {
    id_publication?: string | Publication | undefined;
}

/**
 * El identificador de la cuenta de una publicacion O de un comentario, venga poblada o no.
 *
 * `id_account` llega resuelto en unas operaciones y como cadena en otras —en publicaciones, las
 * de una sola frente al listado; en comentarios, justo al reves— y esto lo tapa sin obligar a
 * escribir el `typeof` en cada sitio (§ los avisos de {@link Publication} y {@link Comment}).
 */
export function accountId(resource: WithAccount): string {
    const value = resource.id_account;
    return typeof value === "string" ? value : value._id;
}

/**
 * La cuenta cuando viene poblada, y `undefined` cuando la API solo mando el identificador.
 * Contrapartida de {@link accountId}.
 */
export function account(resource: WithAccount): Account | undefined {
    const value = resource.id_account;
    return typeof value === "string" ? undefined : value;
}

/**
 * El identificador de la publicacion de un comentario, venga poblada o no.
 *
 * Devuelve `undefined` en los dos casos en los que de verdad no hay ninguna: la resena que cuelga
 * de una ficha de Google Business y el post que no se publico desde PlanVortex.
 */
export function publicationId(resource: WithPublication): string | undefined {
    const value = resource.id_publication;
    if (value === undefined) {
        return undefined;
    }
    return typeof value === "string" ? value : value._id;
}

/**
 * La publicacion cuando viene poblada —solo la bandeja de comentarios la resuelve—, y
 * `undefined` cuando la API mando el identificador o cuando no hay publicacion detras.
 * Contrapartida de {@link publicationId}.
 */
export function publication(resource: WithPublication): Publication | undefined {
    const value = resource.id_publication;
    return value === undefined || typeof value === "string" ? undefined : value;
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
