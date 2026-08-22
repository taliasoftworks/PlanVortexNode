/**
 * El banco de pruebas de la capa 2: qué petición construye cada método y cómo parsea la respuesta.
 *
 * Es el mismo trato que la capa 2 del servidor, y por la misma razón: un método que desenvuelve el
 * campo equivocado devuelve `undefined` sin dar error, y un test que sólo mire el valor de vuelta
 * lo da por bueno. Así que se comprueban **las dos direcciones y las dos ausencias**:
 *
 *  - La petición que sale: método, ruta, query, cabeceras y cuerpo.
 *  - La respuesta que se parsea.
 *  - **Ninguna petición sin simular**: `onUnhandledRequest: "error"` tumba el test. Sin esto, un
 *    método que llamase a una ruta equivocada saldría a la red de verdad o fallaría con un error
 *    que no dice nada.
 *  - **Ningún mock declarado sin usar**: si un test simula una llamada que el método ya no hace, es
 *    que el test dejó de comprobar lo que creía. Es la mitad que se olvida siempre.
 */
import { HttpResponse, http as route } from "msw";
import { setupServer } from "msw/node";
import { expect } from "vitest";

import { PlanVortex } from "../../src/index.js";

export const BASE_URL = "https://api.test.local/v1.0.0";
export const TOKEN_URL = `${BASE_URL}/oauth/token`;

export type Method = "get" | "post" | "put" | "delete";

/** Lo que `HttpResponse.json` de msw acepta como cuerpo. */
type JsonBody = Parameters<typeof HttpResponse.json>[0];

/** Lo que se capturó de una llamada, para poder afirmar sobre ella. */
export interface Captured {
    method: string;
    /** La ruta, sin la baseUrl ni la query. */
    path: string;
    /** La query como pares clave/valor, con las claves repetidas juntas. */
    query: Record<string, string[]>;
    headers: Headers;
    /** El cuerpo JSON, o `undefined` si no había. */
    body: unknown;
    /** Las partes del multipart, cuando el cuerpo era un `FormData`. */
    form: { name: string; filename?: string; type?: string; size?: number; value?: string }[] | undefined;
}

interface Stub {
    description: string;
    used: boolean;
}

export class ContractHarness {
    readonly server = setupServer();
    /** Todas las llamadas capturadas, en orden. */
    readonly calls: Captured[] = [];

    private readonly stubs: Stub[] = [];
    private tokenCalls = 0;

    listen(): void {
        this.server.listen({ onUnhandledRequest: "error" });
    }

    close(): void {
        this.server.close();
    }

    /**
     * Rearma el banco entre pruebas y comprueba lo que se prometió arriba: que no quedó ningún
     * mock sin usar.
     */
    reset(): void {
        const unused = this.stubs.filter((stub) => !stub.used).map((stub) => stub.description);
        this.stubs.length = 0;
        this.calls.length = 0;
        this.tokenCalls = 0;
        this.server.resetHandlers();
        expect(unused, "hay mocks declarados que ningún método llegó a pedir").toEqual([]);
    }

    /** Un cliente autenticado contra el banco. El token se sirve solo. */
    client(overrides: Record<string, unknown> = {}): PlanVortex {
        this.stubToken();
        return new PlanVortex({
            clientId: "app-1",
            clientSecret: "s3cr3t",
            baseUrl: BASE_URL,
            retry: { maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0 },
            ...overrides,
        });
    }

    /**
     * Simula una respuesta. `path` va sin la baseUrl y admite `:parametros` de msw.
     *
     * Devuelve la lista donde se van apuntando las llamadas a ESTA ruta, que es lo que se mira para
     * afirmar sobre la petición.
     */
    mock(method: Method, path: string, json: JsonBody, status = 200): Captured[] {
        const stub: Stub = { description: `${method.toUpperCase()} ${path}`, used: false };
        this.stubs.push(stub);
        const captured: Captured[] = [];

        this.server.use(
            route[method](`${BASE_URL}${path}`, async ({ request }) => {
                stub.used = true;
                const call = await capture(request);
                captured.push(call);
                this.calls.push(call);
                return status === 204
                    ? new HttpResponse(null, { status })
                    : HttpResponse.json(json, { status });
            }),
        );
        return captured;
    }

    /**
     * Una respuesta distinta por llamada, para probar la paginación.
     *
     * La última se repite si se pide una vez más de las declaradas, en vez de reventar: lo que un
     * test de paginación quiere afirmar es CUÁNTAS páginas se pidieron y con qué `offset`, y eso se
     * mira en las llamadas capturadas.
     */
    mockSequence(method: Method, path: string, responses: readonly JsonBody[]): Captured[] {
        const stub: Stub = { description: `${method.toUpperCase()} ${path}`, used: false };
        this.stubs.push(stub);
        const captured: Captured[] = [];

        this.server.use(
            route[method](`${BASE_URL}${path}`, async ({ request }) => {
                stub.used = true;
                const call = await capture(request);
                captured.push(call);
                this.calls.push(call);
                const index = Math.min(captured.length - 1, responses.length - 1);
                return HttpResponse.json(responses[index]);
            }),
        );
        return captured;
    }

    /** Cuántas veces se pidió un token. Sirve para comprobar que no se pide uno por llamada. */
    get tokenRequests(): number {
        return this.tokenCalls;
    }

    /**
     * El token va aparte de {@link mock} a propósito: es infraestructura, no el contrato que se
     * está probando, así que ni cuenta como mock sin usar ni ensucia `calls`.
     */
    private stubToken(): void {
        this.server.use(
            route.post(TOKEN_URL, () => {
                this.tokenCalls++;
                return HttpResponse.json({
                    access_token: "token-1",
                    token_type: "Bearer",
                    expires_in: 300,
                });
            }),
        );
    }
}

async function capture(request: Request): Promise<Captured> {
    const url = new URL(request.url);
    const query: Record<string, string[]> = {};
    for (const [key, value] of url.searchParams) {
        query[key] = [...(query[key] ?? []), value];
    }

    const contentType = request.headers.get("content-type") ?? "";
    let body: unknown;
    let form: Captured["form"];

    if (contentType.startsWith("multipart/form-data")) {
        const data = await request.formData();
        form = [];
        for (const [name, value] of data) {
            if (typeof value === "string") {
                form.push({ name, value });
            } else {
                form.push({ name, filename: value.name, type: value.type, size: value.size });
            }
        }
    } else {
        const text = await request.text();
        body = text ? JSON.parse(text) : undefined;
    }

    return {
        method: request.method,
        path: url.pathname.replace("/v1.0.0", ""),
        query,
        headers: request.headers,
        body,
        form,
    };
}
