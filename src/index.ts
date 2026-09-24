/**
 * planvortex — el cliente oficial de la API de PlanVortex para Node.
 *
 * ESTE PAQUETE ES DE SERVIDOR. El flujo `client_credentials` exige el `client_secret`, y un secreto
 * dentro de un bundle de navegador es la cuenta entera regalada. Para que una PERSONA conecte su
 * cuenta social desde el navegador existe el token temporal de conexión
 * (`GET /organizations/{id}/temporal_connect_token`), que dura quince minutos, va atado a una sola
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
 * OpenAPI público, de la 6 el camino de publicar —`pv.catalog`, `pv.clients`, `pv.organizations`,
 * `pv.accounts`, `pv.uploads` y `pv.publications`—, de la 7 el resto —`pv.comments`, `pv.messages`,
 * `pv.contacts`, `pv.products`, `pv.integrations`, `pv.aiPlans`, `pv.dashboard` y `pv.apps`—, de la
 * 8 los webhooks y de la 9 el flujo de conexión de cuentas. **Ya está cubierta toda la API.**
 */

export { PLANVORTEX_API_URL, VERSION } from "./version.js";

export { PlanVortex } from "./client.js";
export type { PlanVortexOptions } from "./client.js";

export { DEFAULT_PAGE_SIZE, MAX_PAGES } from "./core/pagination.js";
export type { PageOptions } from "./core/pagination.js";

export { guessContentType } from "./core/files.js";
export type { FileInput, FileSource } from "./core/files.js";

export type { RequestOptions, RequestSender } from "./resources/base.js";
export type {
    AccountCapability,
    AccountDestinationOptions,
    AccountListOptions,
    AccountMetricsOptions,
    ConnectCallbackParams,
    ConnectLinksOptions,
} from "./resources/accounts.js";
export type {
    AiPlanListOptions,
    AiPlanRegenerateResult,
    AiPlanRegenerateTarget,
    AiPlanResultsOptions,
} from "./resources/ai_plans.js";
export type { ContactExtraFilter, ContactListOptions } from "./resources/contacts.js";
export type {
    MetricsGroupBy,
    MetricsOptions,
    PublicationsStatsOptions,
    RangeOptions,
    TopPublicationsOptions,
} from "./resources/dashboard.js";
export type { ConnectLinkOptions, IntegrationListOptions } from "./resources/integrations.js";
export type {
    ConversationGroupBy,
    ConversationTotalsOptions,
    MessageTemplateResult,
} from "./resources/messages.js";
export type { CommentListOptions, CommentThreadOptions, CommentUpdate } from "./resources/comments.js";
export type { ClientListOptions, OrganizationInput, OrganizationListOptions } from "./resources/clients.js";
export type {
    ChildOrganizationListOptions,
    ConnectTokenOptions,
    OrganizationOptions,
    OrganizationPlanInput,
} from "./resources/organizations.js";
export type { PublicationListOptions, PublicationRetryResult } from "./resources/publications.js";
export type { ImportError, ImportFileInput, ImportResult, UploadUpdate } from "./resources/uploads.js";

export { AccountsResource } from "./resources/accounts.js";
export { AiPlansResource } from "./resources/ai_plans.js";
export { AppsResource } from "./resources/apps.js";
export { CatalogResource } from "./resources/catalog.js";
export { ClientsResource } from "./resources/clients.js";
export { CommentsResource } from "./resources/comments.js";
export { ContactsResource } from "./resources/contacts.js";
export { DashboardResource } from "./resources/dashboard.js";
export { IntegrationsResource } from "./resources/integrations.js";
export { MessagesResource } from "./resources/messages.js";
export { OrganizationsResource } from "./resources/organizations.js";
export { ProductsResource } from "./resources/products.js";
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
    QueryValue,
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
    publication,
    publicationId,
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
    AccountWithError,
    AiContext,
    AiSettings,
    AiPlan,
    AiPlanCostEstimate,
    AiPlanCreateRequest,
    AiPlanCreateResult,
    AiPlanDestination,
    AiPlanNotice,
    AiPlanOptions,
    AiPlanOptionsInput,
    AiPlanResult,
    AiPlanResults,
    AiPlanResultsGroup,
    AiPlanResultsSort,
    AiPlanResultsTemplateGroup,
    AiPlanSource,
    AiPlanSourceImageInput,
    AiPlanSourceInput,
    AiPlanSourceProduct,
    AiPlanState,
    AspectRatios,
    AspectRatiosByNetwork,
    Client,
    ClientApp,
    ClientAppInput,
    ClientPlan,
    ClientWithOrganizations,
    Comment,
    CommentActions,
    CommentAuthor,
    CommentNetwork,
    CommentReplyResult,
    CommentThread,
    ConnectLink,
    ConnectResult,
    ConnectToken,
    Contact,
    ContactChannel,
    ContactCreate,
    ContactExtraData,
    ContactUpdate,
    Conversation,
    ConversationTotals,
    Dashboard,
    DashboardAiPlanRef,
    DashboardMetricsResult,
    DashboardPublicationRef,
    DashboardRange,
    Destination,
    EnableResult,
    EngagementBase,
    FileFormat,
    FileProperties,
    FileType,
    Integration,
    IntegrationConnectRequest,
    IntegrationPickerConfig,
    IntegrationProvider,
    IntegrationProviderName,
    IntegrationUpdate,
    Message,
    MessageInput,
    MetricName,
    MetricRow,
    MessageOptions,
    MessageTemplate,
    MessageType,
    OpenApiComponents,
    OpenApiOperations,
    OpenApiPaths,
    OpenApiWebhooks,
    OpenEnum,
    Organization,
    Paginated,
    PersistentMenu,
    PlanData,
    PlannerTemplate,
    PlannerTemplateField,
    PlannerTemplateFieldType,
    PlannerTemplateName,
    PlanUse,
    PlanUseData,
    Product,
    ProductCatalog,
    ProductCatalogInput,
    ProductInput,
    Publication,
    PublicationDestination,
    PublicationErrorDetail,
    PublicationInput,
    PublicationLimits,
    PublicationMetrics,
    PublicationState,
    PublicationStats,
    PublicationStatsHistory,
    PublicationStatsPoint,
    PublicationsStatsResult,
    PublicationsSummary,
    PublicationsSummaryResult,
    PublicationType,
    SocialAuthorizationMethod,
    SocialCapabilities,
    SocialCredentials,
    SocialLimits,
    RssConfig,
    SocialIdentifier,
    SocialIdentifierInput,
    SocialLimitsMap,
    SocialNetwork,
    TopPublication,
    TopPublicationsResult,
    Upload,
    WithAccount,
    WithPublication,
} from "./types.js";
