/**
 * planvortex — el cliente oficial de la API de PlanVortex para Node.
 *
 * ESTE PAQUETE ES DE SERVIDOR. El flujo `client_credentials` exige el `client_secret`, y un secreto
 * dentro de un bundle de navegador es la cuenta entera regalada. Para que una PERSONA conecte su
 * cuenta social desde el navegador existe el token temporal de conexión
 * (`GET /organizations/{id}/temporal_connect_token`), que dura una hora, va atado a una sola
 * organización y sólo puede crear cuentas.
 *
 * ```ts
 * import { PlanVortex, PlanLimitError } from "planvortex";
 *
 * const pv = new PlanVortex({
 *     clientId: process.env.PLANVORTEX_CLIENT_ID,
 *     clientSecret: process.env.PLANVORTEX_CLIENT_SECRET,
 * });
 * ```
 *
 * De la fase 4 está el núcleo —transporte, autenticación y errores—, de la 5 los tipos generados del
 * OpenAPI público, y de la 6 el camino de publicar entero: `pv.catalog`, `pv.clients`,
 * `pv.organizations`, `pv.accounts`, `pv.uploads` y `pv.publications`. El resto llega en la fase 7.
 */

export { PLANVORTEX_API_URL, VERSION } from "./version.js";

export { PlanVortex } from "./client.js";
export type { PlanVortexOptions } from "./client.js";

export { DEFAULT_PAGE_SIZE, MAX_PAGES } from "./core/pagination.js";
export type { PageOptions } from "./core/pagination.js";

export { guessContentType } from "./core/files.js";
export type { FileInput, FileSource } from "./core/files.js";

export type { RequestOptions } from "./resources/base.js";
export type { AccountCapability, AccountListOptions, AccountMetricsOptions } from "./resources/accounts.js";
export type { ClientListOptions, OrganizationInput, OrganizationListOptions } from "./resources/clients.js";
export type {
    ChildOrganizationListOptions,
    OrganizationOptions,
    OrganizationPlanInput,
} from "./resources/organizations.js";
export type { PublicationListOptions, PublicationRetryResult } from "./resources/publications.js";
export type { ImportError, ImportFileInput, ImportResult, UploadUpdate } from "./resources/uploads.js";

export { AccountsResource } from "./resources/accounts.js";
export { CatalogResource } from "./resources/catalog.js";
export { ClientsResource } from "./resources/clients.js";
export { OrganizationsResource } from "./resources/organizations.js";
export { PublicationsResource } from "./resources/publications.js";
export { UploadsResource } from "./resources/uploads.js";

export {
    AccountError,
    AiPlanError,
    AuthError,
    ContactError,
    FileError,
    IntegrationError,
    MessagingError,
    NO_ERROR_CODE,
    OrganizationError,
    PLANVORTEX_ERROR_RANGES,
    PlanLimitError,
    PlanVortexAuthenticationError,
    PlanVortexConfigError,
    PlanVortexConnectionError,
    PlanVortexError,
    ProductError,
    PublicationError,
    TOKEN_ERROR_CODES,
    UserError,
    errorFamilyForCode,
    isPlanVortexError,
    isTokenError,
} from "./core/errors.js";
export type { ApiErrorBody, PlanVortexErrorOptions, PlanVortexErrorRange } from "./core/errors.js";

export { DEFAULT_RETRY, DEFAULT_TIMEOUT_MS } from "./core/http.js";
export type {
    FetchLike,
    HttpHooks,
    HttpMethod,
    HttpRequest,
    HttpResponse,
    RequestInfo,
    ResponseInfo,
    RetryConfig,
    RetryInfo,
} from "./core/http.js";

export { TOKEN_REFRESH_MARGIN_MS } from "./core/auth.js";
export type { AuthProvider, ClientCredentialsToken } from "./core/auth.js";

/**
 * Los ayudantes de los campos que la API devuelve poblados o como cadena según la operación:
 * `id_account` en una publicación, y el contacto y los ficheros en un mensaje. Son las únicas
 * funciones de `types.ts`: todo lo demás de ahí es `type`.
 */
export {
    account,
    accountId,
    messageContact,
    messageContactId,
    messageDirection,
    messageFileIds,
    messageFiles,
} from "./types.js";

/**
 * Los tipos de los webhooks, para no obligar a importar de dos sitios sólo para nombrar un evento.
 *
 * Las FUNCIONES —`verifyWebhookSignature`, `handleWebhookRequest`, `planvortexWebhooks`— se
 * quedan en `planvortex/webhooks` a propósito: quien recibe webhooks casi nunca es el mismo
 * proceso que publica, y ese punto de entrada existe para que su endpoint no cargue el cliente
 * entero. Reexportar tipos no cuesta un byte; reexportar las funciones se lo cargaría.
 */
export type {
    AccountStateChange,
    AccountWebhookChangeBase,
    CommentChange,
    IntegrationErrorChange,
    MessageChange,
    UnknownWebhookChange,
    WebhookAlgorithm,
    WebhookChange,
    WebhookEvent,
} from "./webhooks/index.js";

/**
 * Los tipos de la API, generados del OpenAPI público (fase 5). Todo lo que hay aquí es `type`: no
 * añade un solo byte al bundle de quien instale el paquete.
 */
export type {
    Account,
    AccountMetricRow,
    AccountMetrics,
    AiContext,
    AiPlan,
    AspectRatios,
    AspectRatiosByNetwork,
    Client,
    ClientApp,
    ClientPlan,
    Comment,
    CommentActions,
    CommentAuthor,
    CommentNetwork,
    Contact,
    Conversation,
    EngagementBase,
    FileFormat,
    FileProperties,
    FileType,
    Integration,
    Message,
    OpenApiComponents,
    OpenApiOperations,
    OpenApiPaths,
    OpenApiWebhooks,
    OpenEnum,
    Organization,
    Paginated,
    PersistentMenu,
    PlanData,
    Product,
    Publication,
    PublicationErrorDetail,
    PublicationInput,
    PublicationLimits,
    PublicationMetrics,
    PublicationState,
    PublicationStats,
    PublicationStatsHistory,
    PublicationStatsPoint,
    PublicationType,
    SocialCapabilities,
    SocialCredentials,
    SocialLimits,
    SocialLimitsMap,
    SocialNetwork,
    Upload,
} from "./types.js";
