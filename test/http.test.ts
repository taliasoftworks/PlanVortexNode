import { HttpResponse, http as route } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { PlanLimitError, PlanVortexConnectionError, PlanVortexError } from "../src/core/errors.js";
import { HttpClient, parseRetryAfter } from "../src/core/http.js";
import type { FetchLike, RetryInfo } from "../src/core/http.js";

const BASE_URL = "https://api.test.local/v1.0.0";

/** `onUnhandledRequest: "error"` es la mitad del valor de estos tests: una peticion que no
 * esperabamos rompe en vez de colarse en verde. */
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Espera cero entre intentos: lo que se prueba es la decision de reintentar, no el reloj. */
function makeClient(overrides: Partial<ConstructorParameters<typeof HttpClient>[0]> = {}) {
    return new HttpClient({
        baseUrl: BASE_URL,
        retry: { baseDelayMs: 0, maxDelayMs: 8_000 },
        headers: { "user-agent": "planvortex-node/test" },
        ...overrides,
    });
}

describe("la peticion que sale", () => {
    it("compone la url, la query y las cabeceras", async () => {
        let seen: URL | undefined;
        let userAgent: string | null = null;
        server.use(
            route.get(`${BASE_URL}/organizations/:id/publications`, ({ request }) => {
                seen = new URL(request.url);
                userAgent = request.headers.get("user-agent");
                return HttpResponse.json({ publications: [], total: 0 });
            }),
        );

        const response = await makeClient().request<{ total: number }>({
            method: "GET",
            path: "/organizations/org1/publications",
            query: {
                limit: 50,
                offset: undefined,
                //El servidor lee los arrays como clave repetida.
                state: ["pending", "error"],
                from: new Date("2026-09-01T10:00:00.000Z"),
            },
        });

        expect(response.data.total).toBe(0);
        expect(seen?.searchParams.getAll("state")).toEqual(["pending", "error"]);
        expect(seen?.searchParams.get("limit")).toBe("50");
        expect(seen?.searchParams.get("from")).toBe("2026-09-01T10:00:00.000Z");
        //`offset: undefined` no viaja: no es lo mismo que mandar una cadena vacia.
        expect(seen?.searchParams.has("offset")).toBe(false);
        expect(userAgent).toBe("planvortex-node/test");
    });

    it("serializa a JSON lo que no sea FormData ni URLSearchParams", async () => {
        let body: unknown;
        let contentType: string | null = null;
        server.use(
            route.post(`${BASE_URL}/things`, async ({ request }) => {
                contentType = request.headers.get("content-type");
                body = await request.json();
                return HttpResponse.json({ ok: true }, { status: 201 });
            }),
        );

        await makeClient().request({ method: "POST", path: "/things", body: { text: "hola" } });

        expect(contentType).toBe("application/json");
        expect(body).toEqual({ text: "hola" });
    });

    it("devuelve el x-request-id cuando el despliegue lo pone", async () => {
        server.use(
            route.get(`${BASE_URL}/ping`, () =>
                HttpResponse.json({ ok: true }, { headers: { "x-request-id": "req-7" } }),
            ),
        );
        const response = await makeClient().request({ method: "GET", path: "/ping" });
        expect(response.requestId).toBe("req-7");
    });

    it("no revienta con un 204 sin cuerpo", async () => {
        server.use(route.delete(`${BASE_URL}/things/1`, () => new HttpResponse(null, { status: 204 })));
        const response = await makeClient().request({ method: "DELETE", path: "/things/1" });
        expect(response.status).toBe(204);
        expect(response.data).toBeUndefined();
    });
});

describe("los reintentos", () => {
    /**
     * LA prueba de la trampa 1: un error de dominio llega con un 400, y repetirlo no arregla nada.
     * Si algun dia alguien mete el 400 en la lista de reintentables, esto se pone rojo.
     */
    it("no reintenta NUNCA un 400 con codigo de dominio", async () => {
        let calls = 0;
        server.use(
            route.get(`${BASE_URL}/limited`, () => {
                calls++;
                return HttpResponse.json(
                    { code: 1301, message: "Plan limit reached", data: { resource: "publications" } },
                    { status: 400 },
                );
            }),
        );

        const error = await makeClient()
            .request({ method: "GET", path: "/limited" })
            .catch((e: unknown) => e);

        expect(calls).toBe(1);
        expect(error).toBeInstanceOf(PlanLimitError);
        expect((error as PlanLimitError).code).toBe(1301);
        expect((error as PlanLimitError).data).toEqual({ resource: "publications" });
    });

    it("reintenta un 503 y acaba saliendo bien", async () => {
        let calls = 0;
        const retries: RetryInfo[] = [];
        server.use(
            route.get(`${BASE_URL}/flaky`, () => {
                calls++;
                if (calls < 3) {
                    return new HttpResponse(null, { status: 503 });
                }
                return HttpResponse.json({ ok: true });
            }),
        );

        const client = makeClient({ hooks: { onRetry: (info) => retries.push(info) } });
        const response = await client.request<{ ok: boolean }>({ method: "GET", path: "/flaky" });

        expect(response.data).toEqual({ ok: true });
        expect(calls).toBe(3);
        expect(retries.map((entry) => entry.status)).toEqual([503, 503]);
    });

    it("se rinde cuando se acaban los reintentos", async () => {
        let calls = 0;
        server.use(
            route.get(`${BASE_URL}/down`, () => {
                calls++;
                return new HttpResponse(null, { status: 502 });
            }),
        );

        const error = await makeClient()
            .request({ method: "GET", path: "/down" })
            .catch((e: unknown) => e);

        //Un intento y dos reintentos, que es el ajuste por defecto.
        expect(calls).toBe(3);
        expect(error).toBeInstanceOf(PlanVortexError);
        expect((error as PlanVortexError).status).toBe(502);
        expect((error as PlanVortexError).family).toBe("http");
    });

    /**
     * Publicar dos veces es peor que fallar: un 5xx demuestra que la peticion LLEGO, asi que un
     * POST no se repite ni aunque el status sea de los que dicen "vuelve luego".
     */
    it("no reintenta un POST que llego al servidor", async () => {
        let calls = 0;
        server.use(
            route.post(`${BASE_URL}/publications`, () => {
                calls++;
                return new HttpResponse(null, { status: 503 });
            }),
        );

        await makeClient()
            .request({ method: "POST", path: "/publications", body: { text: "hola" } })
            .catch(() => undefined);

        expect(calls).toBe(1);
    });

    it("un Retry-After largo no deja la llamada colgada: devuelve el error con el dato dentro", async () => {
        let calls = 0;
        server.use(
            route.get(`${BASE_URL}/braked`, () => {
                calls++;
                return new HttpResponse(null, { status: 429, headers: { "retry-after": "300" } });
            }),
        );

        const error = await makeClient()
            .request({ method: "GET", path: "/braked" })
            .catch((e: unknown) => e);

        expect(calls).toBe(1);
        expect((error as PlanVortexError).retryAfter).toBe(300);
    });

    it("lee el Retry-After en segundos y como fecha", () => {
        expect(parseRetryAfter("120")).toBe(120);
        expect(parseRetryAfter(null)).toBeUndefined();
        expect(parseRetryAfter("no-es-nada")).toBeUndefined();
        const now = Date.parse("2026-08-22T10:00:00.000Z");
        expect(parseRetryAfter("Sat, 22 Aug 2026 10:00:30 GMT", now)).toBe(30);
    });
});

describe("los fallos de red", () => {
    /** Un `fetch` que falla siempre con el codigo que se le diga, y cuenta los intentos. */
    function failingFetch(code: string): { fetch: FetchLike; calls: () => number } {
        let calls = 0;
        return {
            fetch: () => {
                calls++;
                return Promise.reject(Object.assign(new TypeError("fetch failed"), { cause: { code } }));
            },
            calls: () => calls,
        };
    }

    it("reintenta un GET aunque el fallo sea ambiguo", async () => {
        const failing = failingFetch("ECONNRESET");
        const error = await makeClient({ fetch: failing.fetch })
            .request({ method: "GET", path: "/ping" })
            .catch((e: unknown) => e);

        expect(failing.calls()).toBe(3);
        expect(error).toBeInstanceOf(PlanVortexConnectionError);
        expect((error as PlanVortexConnectionError).timeout).toBe(false);
    });

    /**
     * ECONNREFUSED demuestra que la peticion no salio: no hay nadie escuchando. Ese POST si se
     * puede repetir, porque no ha creado nada en ningun sitio.
     */
    it("reintenta un POST cuando la peticion ni llego a salir", async () => {
        const failing = failingFetch("ECONNREFUSED");
        await makeClient({ fetch: failing.fetch })
            .request({ method: "POST", path: "/publications", body: {} })
            .catch(() => undefined);

        expect(failing.calls()).toBe(3);
    });

    /**
     * ECONNRESET en un POST es justo el caso peligroso: el socket pudo caerse DESPUES de que el
     * servidor recibiera el cuerpo. Repetirlo publicaria dos veces.
     */
    it("no reintenta un POST con un fallo de red ambiguo", async () => {
        const failing = failingFetch("ECONNRESET");
        await makeClient({ fetch: failing.fetch })
            .request({ method: "POST", path: "/publications", body: {} })
            .catch(() => undefined);

        expect(failing.calls()).toBe(1);
    });

    it("corta por timeout y lo dice", async () => {
        //Un `fetch` que no responde nunca, pero que respeta el abort.
        const hangingFetch: FetchLike = (_input, init) =>
            new Promise((_resolve, reject) => {
                init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
            });

        const error = await makeClient({ fetch: hangingFetch, retry: { maxRetries: 0 } })
            .request({ method: "GET", path: "/slow", timeoutMs: 20 })
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(PlanVortexConnectionError);
        expect((error as PlanVortexConnectionError).timeout).toBe(true);
    });

    /** Si cancela el integrador, su error sale tal cual: envolverlo le rompe su propio `catch`. */
    it("deja pasar el abort del integrador sin envolverlo", async () => {
        const hangingFetch: FetchLike = (_input, init) =>
            new Promise((_resolve, reject) => {
                init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
            });

        const controller = new AbortController();
        const pending = makeClient({ fetch: hangingFetch, retry: { maxRetries: 0 } })
            .request({ method: "GET", path: "/slow", signal: controller.signal })
            .catch((e: unknown) => e);
        controller.abort(new Error("lo cancele yo"));

        const error = await pending;
        expect(error).not.toBeInstanceOf(PlanVortexConnectionError);
        expect((error as Error).message).toBe("lo cancele yo");
    });
});

describe("los hooks", () => {
    it("avisa de cada intento y de cada respuesta", async () => {
        const onRequest = vi.fn();
        const onResponse = vi.fn();
        let calls = 0;
        server.use(
            route.get(`${BASE_URL}/flaky`, () => {
                calls++;
                return calls === 1
                    ? new HttpResponse(null, { status: 503 })
                    : HttpResponse.json({ ok: true });
            }),
        );

        await makeClient({ hooks: { onRequest, onResponse } }).request({ method: "GET", path: "/flaky" });

        expect(onRequest).toHaveBeenCalledTimes(2);
        expect(onRequest.mock.calls[1]?.[0]).toMatchObject({ method: "GET", attempt: 2 });
        expect(onResponse).toHaveBeenCalledTimes(2);
        expect(onResponse.mock.calls[0]?.[0]).toMatchObject({ status: 503, attempt: 1 });
    });
});
