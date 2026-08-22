/**
 * `PlanVortex`: el objeto que un integrador construye una vez y usa para todo.
 *
 * De la fase 4 tiene el núcleo —transporte, autenticación y errores— y de la 6 el camino de
 * publicar: `pv.catalog`, `pv.clients`, `pv.organizations`, `pv.accounts`, `pv.uploads` y
 * `pv.publications`. Los demás recursos llegan en la fase 7 colgando de este mismo objeto y usando
 * su {@link PlanVortex.request}.
 */
import { ClientCredentialsAuth, StaticTokenAuth } from "./core/auth.js";
import type { AuthProvider } from "./core/auth.js";
import { PlanVortexConfigError, isTokenError } from "./core/errors.js";
import { HttpClient } from "./core/http.js";
import type { FetchLike, HttpHooks, HttpRequest, HttpResponse, RetryConfig } from "./core/http.js";
import { AccountsResource } from "./resources/accounts.js";
import { CatalogResource } from "./resources/catalog.js";
import { ClientsResource } from "./resources/clients.js";
import { OrganizationsResource } from "./resources/organizations.js";
import { PublicationsResource } from "./resources/publications.js";
import { UploadsResource } from "./resources/uploads.js";
import { PLANVORTEX_API_URL, VERSION } from "./version.js";

export interface PlanVortexOptions {
    /** El identificador de la app de cliente. Por defecto, `process.env.PLANVORTEX_CLIENT_ID`. */
    clientId?: string | undefined;
    /** El secreto de la app. Por defecto, `process.env.PLANVORTEX_CLIENT_SECRET`. */
    clientSecret?: string | undefined;
    /**
     * Un token ya emitido, en vez de credenciales: el `temporal_connect_token` con el que una
     * persona conecta su cuenta social. No se refresca solo (§ trampa 2 del roadmap).
     */
    accessToken?: string | undefined;
    /** Por defecto `https://api.planvortex.com/v1.0.0`. Sin barra final. */
    baseUrl?: string | undefined;
    /** Timeout por petición. 120 s por defecto: publicar un vídeo es lento. */
    timeoutMs?: number | undefined;
    retry?: Partial<RetryConfig> | undefined;
    /** `onRequest` / `onResponse` / `onRetry`, para enchufar el logger de casa. */
    hooks?: HttpHooks | undefined;
    /** `fetch` alternativo: un proxy, un mock, una implementación instrumentada. */
    fetch?: FetchLike | undefined;
    /** `scope` opcional del `client_credentials`. Casi nadie lo necesita. */
    scope?: string | undefined;
    /**
     * Deja construir el cliente en un navegador. **No lo pongas.** El `client_credentials` exige el
     * `client_secret`, y un secreto en un bundle de front es la cuenta entera regalada
     * (§ trampa 9). Para el navegador existe el token temporal de conexión.
     */
    dangerouslyAllowBrowser?: boolean | undefined;
}

/** El `User-Agent` de cada petición: nuestra versión y la de Node, que es lo que se busca en un log. */
function buildUserAgent(): string {
    const runtime =
        typeof process !== "undefined" && process.versions?.node ? ` node/${process.versions.node}` : "";
    return `planvortex-node/${VERSION}${runtime}`;
}

function readEnv(name: string): string | undefined {
    return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

/**
 * Un navegador de verdad, no un test con `jsdom` a medias: `window` **y** `window.document`.
 */
function looksLikeBrowser(): boolean {
    const maybeWindow = (globalThis as { window?: { document?: unknown } }).window;
    return maybeWindow !== undefined && maybeWindow.document !== undefined;
}

export class PlanVortex {
    /** Sin barra final. Útil para componer una URL a mano cuando haga falta. */
    readonly baseUrl: string;

    /** Metadatos estáticos de las redes: qué hay, qué sabe hacer cada una y sus límites. Cacheado. */
    readonly catalog: CatalogResource;
    /** Clientes: el plan contratado y sus organizaciones raíz. */
    readonly clients: ClientsResource;
    /** Organizaciones: la ficha, las hijas, y el cupo que tienen y gastan. */
    readonly organizations: OrganizationsResource;
    /** Cuentas sociales conectadas. Conectar una es otra cosa: hace falta una persona (§ fase 9). */
    readonly accounts: AccountsResource;
    /** La biblioteca de ficheros de una organización. */
    readonly uploads: UploadsResource;
    /** Publicaciones: crear, programar, reintentar y medir. */
    readonly publications: PublicationsResource;

    private readonly http: HttpClient;
    private readonly auth: AuthProvider;
    private readonly options: PlanVortexOptions;

    constructor(options: PlanVortexOptions = {}) {
        if (looksLikeBrowser() && options.dangerouslyAllowBrowser !== true) {
            throw new PlanVortexConfigError(
                "planvortex es un paquete de servidor: el client_secret no puede vivir en un " +
                    "navegador. Para conectar una cuenta desde el front usa el temporal_connect_token.",
            );
        }

        this.options = options;
        this.baseUrl = (options.baseUrl ?? readEnv("PLANVORTEX_BASE_URL") ?? PLANVORTEX_API_URL).replace(
            /\/+$/,
            "",
        );

        this.http = new HttpClient({
            baseUrl: this.baseUrl,
            ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
            ...(options.retry === undefined ? {} : { retry: options.retry }),
            ...(options.hooks === undefined ? {} : { hooks: options.hooks }),
            ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
            headers: { "user-agent": buildUserAgent() },
        });

        const clientId = options.clientId ?? readEnv("PLANVORTEX_CLIENT_ID");
        const clientSecret = options.clientSecret ?? readEnv("PLANVORTEX_CLIENT_SECRET");

        if (options.accessToken) {
            this.auth = new StaticTokenAuth(options.accessToken);
        } else if (clientId && clientSecret) {
            this.auth = new ClientCredentialsAuth(this.http, {
                clientId,
                clientSecret,
                scope: options.scope,
            });
        } else {
            throw new PlanVortexConfigError(
                "Faltan credenciales: pasa clientId y clientSecret (o PLANVORTEX_CLIENT_ID y " +
                    "PLANVORTEX_CLIENT_SECRET en el entorno), o un accessToken.",
            );
        }

        //Los recursos reciben `this` y usan su `request`, así que comparten token, reintentos y
        //hooks. Se construyen aquí y no bajo demanda para que `pv.publications` sea siempre el
        //mismo objeto: la caché del catálogo depende de ello.
        this.catalog = new CatalogResource(this);
        this.clients = new ClientsResource(this);
        this.organizations = new OrganizationsResource(this);
        this.accounts = new AccountsResource(this);
        this.uploads = new UploadsResource(this);
        this.publications = new PublicationsResource(this);
    }

    /**
     * Una petición autenticada. Es lo que usarán los recursos de las fases 6 y 7; un integrador no
     * debería necesitarla, pero está expuesta para no dejar a nadie tirado ante un endpoint que la
     * librería aún no cubra.
     *
     * Reintenta **una sola vez** ante los códigos de token (501 y 522), que llegan dentro de un 400.
     * Un token puede morir antes de su `expires_in` —un despliegue de Keycloak, la app revocada— y
     * ese caso se arregla pidiendo otro; si el segundo también falla, el error sale.
     */
    async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
        try {
            return await this.send<T>(request);
        } catch (error) {
            if (!isTokenError(error)) {
                throw error;
            }
            this.auth.invalidate();
            return this.send<T>(request);
        }
    }

    /**
     * El mismo cliente, con la misma forma, autenticado con un token temporal de conexión.
     *
     * Es la pieza del flujo de conexión de cuentas (§ trampa 2): una app **no** puede conectar una
     * cuenta de Instagram —eso es un OAuth con una persona delante—, así que emite un token
     * temporal, se lo pasa a su usuario y con él se piden los `connect_links`. El token va atado a
     * una sola organización: usarlo contra otra devuelve el error 1101.
     */
    asTemporalToken(token: string): PlanVortex {
        return new PlanVortex({
            ...this.options,
            clientId: undefined,
            clientSecret: undefined,
            accessToken: token,
            baseUrl: this.baseUrl,
        });
    }

    private async send<T>(request: HttpRequest): Promise<HttpResponse<T>> {
        const token = await this.auth.getToken();
        return this.http.request<T>({
            ...request,
            headers: { ...request.headers, authorization: `Bearer ${token}` },
        });
    }
}
