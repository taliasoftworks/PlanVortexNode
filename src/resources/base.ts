/**
 * Lo que comparten todos los recursos: una petición autenticada y el desenvuelto del sobre.
 *
 * Un recurso no construye su propio transporte: recibe el {@link PlanVortex} y usa su `request`,
 * que es lo que hace que el token, los reintentos y los hooks sean unos para toda la instancia.
 * Y no importa `client.ts` ni por el tipo — sólo la forma que necesita— porque `client.ts` sí
 * importa los recursos, y el ciclo compilaría dejando el orden de inicialización en manos del
 * bundler.
 */
import type { HttpRequest, HttpResponse, QueryValue } from "../core/http.js";
import { unwrapList, unwrapOne } from "../core/pagination.js";
import type { Paginated } from "../types.js";

/** Lo único que un recurso necesita del cliente. */
export interface RequestSender {
    request<T>(request: HttpRequest): Promise<HttpResponse<T>>;
}

export type Query = Record<string, QueryValue>;

/** Opciones por llamada que cualquier método acepta: cancelar y ajustar el timeout. */
export interface RequestOptions {
    signal?: AbortSignal | undefined;
    timeoutMs?: number | undefined;
}

export abstract class Resource {
    constructor(protected readonly client: RequestSender) {}

    protected async dispatch<T>(request: HttpRequest, options: RequestOptions = {}): Promise<T> {
        const response = await this.client.request<T>({
            ...request,
            ...(options.signal === undefined ? {} : { signal: options.signal }),
            ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
        });
        return response.data;
    }

    /*
     * Los cuatro verbos se llaman `httpGet`/`httpPost`/... y no `get`/`post`/... porque los
     * recursos que heredan de aquí SÍ tienen métodos públicos con esos nombres —`uploads.get(org,
     * id)` es lo que un integrador escribe— y en TypeScript una subclase no puede declarar un
     * miembro con la firma de uno heredado. Sin el prefijo, `this.get(...)` dentro de un recurso
     * resolvía a su propio método público y compilaba llamando a otra cosa.
     *
     * Por lo mismo el envío crudo se llama `dispatch` y no `send`: `pv.messages.send(...)` es el
     * nombre obvio de mandar un mensaje, y con el genérico ocupando `send` la subclase no
     * compilaba.
     */
    protected httpGet<T>(path: string, query?: Query, options?: RequestOptions): Promise<T> {
        return this.dispatch<T>({ method: "GET", path, ...(query ? { query } : {}) }, options);
    }

    protected httpPost<T>(path: string, body?: unknown, options?: RequestOptions, query?: Query): Promise<T> {
        return this.dispatch<T>(
            { method: "POST", path, ...(body === undefined ? {} : { body }), ...(query ? { query } : {}) },
            options,
        );
    }

    protected httpPut<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
        return this.dispatch<T>({ method: "PUT", path, ...(body === undefined ? {} : { body }) }, options);
    }

    protected httpDelete<T>(path: string, query?: Query, options?: RequestOptions): Promise<T> {
        return this.dispatch<T>({ method: "DELETE", path, ...(query ? { query } : {}) }, options);
    }

    /** `GET` de una lista, ya desenvuelta a `{data, total}`. */
    protected async getList<T>(
        path: string,
        key: string,
        query?: Query,
        options?: RequestOptions,
    ): Promise<Paginated<T>> {
        return unwrapList<T>(await this.httpGet<unknown>(path, query, options), key);
    }

    /** `GET` de un recurso suelto, ya sacado de su sobre. */
    protected async getOne<T>(
        path: string,
        key: string,
        query?: Query,
        options?: RequestOptions,
    ): Promise<T> {
        return unwrapOne<T>(await this.httpGet<unknown>(path, query, options), key);
    }

    /** `POST` que devuelve un recurso envuelto. */
    protected async postOne<T>(
        path: string,
        key: string,
        body?: unknown,
        options?: RequestOptions,
        query?: Query,
    ): Promise<T> {
        return unwrapOne<T>(await this.httpPost<unknown>(path, body, options, query), key);
    }

    /** `PUT` que devuelve un recurso envuelto. */
    protected async putOne<T>(
        path: string,
        key: string,
        body?: unknown,
        options?: RequestOptions,
    ): Promise<T> {
        return unwrapOne<T>(await this.httpPut<unknown>(path, body, options), key);
    }
}

/**
 * Un identificador de Mongo tal y como viaja en la URL. Se comprueba aquí y no en el servidor
 * porque un `undefined` interpolado en la ruta da un 404 con la URL `/organizations/undefined/...`,
 * y ese error no dice lo que pasó — que a quien llama se le olvidó un argumento.
 */
export function requireId(value: string, name: string): string {
    if (typeof value !== "string" || !value.trim()) {
        throw new TypeError(`Falta ${name}.`);
    }
    return value;
}

/** `{success: true}` es lo que devuelve todo lo que no tiene nada que contar. */
export interface SuccessResponse {
    success?: boolean;
}
