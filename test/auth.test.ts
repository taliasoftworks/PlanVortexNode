import { HttpResponse, http as route } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ClientCredentialsAuth, StaticTokenAuth, TOKEN_REFRESH_MARGIN_MS } from "../src/core/auth.js";
import { PlanVortexAuthenticationError, PlanVortexConnectionError } from "../src/core/errors.js";
import { HttpClient } from "../src/core/http.js";
import type { FetchLike } from "../src/core/http.js";

const BASE_URL = "https://api.test.local/v1.0.0";
const TOKEN_URL = `${BASE_URL}/oauth/token`;

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeHttp(fetchImpl?: FetchLike) {
    return new HttpClient({
        baseUrl: BASE_URL,
        retry: { baseDelayMs: 0, maxDelayMs: 8_000 },
        ...(fetchImpl === undefined ? {} : { fetch: fetchImpl }),
    });
}

/** Un endpoint de token que cuenta las peticiones y devuelve un token distinto cada vez. */
function stubTokenEndpoint(options: { expiresIn?: number } = {}) {
    const state = { calls: 0, bodies: [] as string[] };
    server.use(
        route.post(TOKEN_URL, async ({ request }) => {
            state.calls++;
            state.bodies.push(await request.text());
            return HttpResponse.json({
                access_token: `token-${state.calls}`,
                token_type: "Bearer",
                expires_in: options.expiresIn ?? 300,
            });
        }),
    );
    return state;
}

describe("el intercambio de credenciales", () => {
    it("manda un client_credentials en form-urlencoded, como manda OAuth2", async () => {
        const endpoint = stubTokenEndpoint();
        const auth = new ClientCredentialsAuth(makeHttp(), { clientId: "app-1", clientSecret: "s3cr3t" });

        expect(await auth.getToken()).toBe("token-1");
        const body = new URLSearchParams(endpoint.bodies[0]);
        expect(body.get("grant_type")).toBe("client_credentials");
        expect(body.get("client_id")).toBe("app-1");
        expect(body.get("client_secret")).toBe("s3cr3t");
    });

    /** El freno del servidor son 30 intentos por minuto: un token cacheado no es un lujo. */
    it("cachea el token entre llamadas", async () => {
        const endpoint = stubTokenEndpoint();
        const auth = new ClientCredentialsAuth(makeHttp(), { clientId: "app-1", clientSecret: "s" });

        expect(await auth.getToken()).toBe("token-1");
        expect(await auth.getToken()).toBe("token-1");
        expect(await auth.getToken()).toBe("token-1");
        expect(endpoint.calls).toBe(1);
    });

    /**
     * Diez llamadas en paralelo con el token caducado tienen que pedir UN token, no diez. Sin el
     * cerrojo, un arranque con veinte peticiones se come el cupo del freno el solito.
     */
    it("pide un solo token con diez llamadas en paralelo", async () => {
        const endpoint = stubTokenEndpoint();
        const auth = new ClientCredentialsAuth(makeHttp(), { clientId: "app-1", clientSecret: "s" });

        const tokens = await Promise.all(Array.from({ length: 10 }, () => auth.getToken()));

        expect(endpoint.calls).toBe(1);
        expect(new Set(tokens)).toEqual(new Set(["token-1"]));
    });

    /**
     * El refresco es PROACTIVO: se pide uno nuevo un minuto antes de caducar. Un token que muere a
     * mitad de vuelo es un 400 con code 501 que el integrador no puede prevenir.
     */
    it("refresca antes de caducar, no despues", async () => {
        const endpoint = stubTokenEndpoint({ expiresIn: 300 });
        let now = 1_000_000;
        const auth = new ClientCredentialsAuth(makeHttp(), {
            clientId: "app-1",
            clientSecret: "s",
            now: () => now,
        });

        expect(await auth.getToken()).toBe("token-1");

        //Justo antes de entrar en el margen: el token que hay todavia vale.
        now += 300_000 - TOKEN_REFRESH_MARGIN_MS - 1_000;
        expect(await auth.getToken()).toBe("token-1");
        expect(endpoint.calls).toBe(1);

        //Dentro del margen, y el token AUN NO ha caducado: se pide otro igualmente.
        now += 2_000;
        expect(await auth.getToken()).toBe("token-2");
        expect(endpoint.calls).toBe(2);
    });

    it("tira el token cacheado cuando se lo mandan", async () => {
        const endpoint = stubTokenEndpoint();
        const auth = new ClientCredentialsAuth(makeHttp(), { clientId: "app-1", clientSecret: "s" });

        expect(await auth.getToken()).toBe("token-1");
        auth.invalidate();
        expect(await auth.getToken()).toBe("token-2");
        expect(endpoint.calls).toBe(2);
    });
});

describe("los errores del endpoint de token", () => {
    /** La unica ruta del API con forma de error de OAuth2, `{error, error_description}`. */
    it("traduce un invalid_client sin inventarse un code del catalogo", async () => {
        server.use(
            route.post(TOKEN_URL, () =>
                HttpResponse.json(
                    { error: "invalid_client", error_description: "Invalid client credentials" },
                    { status: 401 },
                ),
            ),
        );
        const auth = new ClientCredentialsAuth(makeHttp(), { clientId: "app-1", clientSecret: "mal" });

        const error = await auth.getToken().catch((e: unknown) => e);

        expect(error).toBeInstanceOf(PlanVortexAuthenticationError);
        expect((error as PlanVortexAuthenticationError).oauthError).toBe("invalid_client");
        expect((error as PlanVortexAuthenticationError).message).toBe("Invalid client credentials");
        expect((error as PlanVortexAuthenticationError).status).toBe(401);
        expect((error as PlanVortexAuthenticationError).code).toBe(0);
    });

    it("saca el Retry-After del freno contra fuerza bruta", async () => {
        server.use(
            route.post(TOKEN_URL, () =>
                HttpResponse.json(
                    { error: "slow_down", error_description: "Too many token requests, slow down" },
                    { status: 429, headers: { "retry-after": "42" } },
                ),
            ),
        );
        const auth = new ClientCredentialsAuth(makeHttp(), { clientId: "app-1", clientSecret: "s" });

        const error = (await auth.getToken().catch((e: unknown) => e)) as PlanVortexAuthenticationError;

        expect(error.oauthError).toBe("slow_down");
        expect(error.retryAfter).toBe(42);
    });

    /**
     * Un fallo de red NO es un problema de credenciales. Confundirlos manda al integrador a revisar
     * un secreto que esta perfectamente bien.
     */
    it("no confunde un fallo de red con unas credenciales malas", async () => {
        const failing: FetchLike = () =>
            Promise.reject(Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } }));
        const auth = new ClientCredentialsAuth(makeHttp(failing), { clientId: "app-1", clientSecret: "s" });

        const error = await auth.getToken().catch((e: unknown) => e);

        expect(error).toBeInstanceOf(PlanVortexConnectionError);
        expect(error).not.toBeInstanceOf(PlanVortexAuthenticationError);
    });

    /** Pedir un token no crea nada: es el unico POST de la libreria que si se reintenta. */
    it("reintenta la peticion de token ante un 503", async () => {
        let calls = 0;
        server.use(
            route.post(TOKEN_URL, () => {
                calls++;
                if (calls < 2) {
                    return new HttpResponse(null, { status: 503 });
                }
                return HttpResponse.json({ access_token: "token-ok", token_type: "Bearer", expires_in: 300 });
            }),
        );
        const auth = new ClientCredentialsAuth(makeHttp(), { clientId: "app-1", clientSecret: "s" });

        expect(await auth.getToken()).toBe("token-ok");
        expect(calls).toBe(2);
    });

    it("no da por bueno un 200 sin access_token", async () => {
        server.use(route.post(TOKEN_URL, () => HttpResponse.json({ token_type: "Bearer" })));
        const auth = new ClientCredentialsAuth(makeHttp(), { clientId: "app-1", clientSecret: "s" });

        await expect(auth.getToken()).rejects.toBeInstanceOf(PlanVortexAuthenticationError);
    });

    /** Un fallo no puede dejar el cerrojo echado: la siguiente llamada tiene que volver a intentarlo. */
    it("suelta el cerrojo cuando la peticion falla", async () => {
        let calls = 0;
        server.use(
            route.post(TOKEN_URL, () => {
                calls++;
                if (calls === 1) {
                    return HttpResponse.json({ error: "invalid_client" }, { status: 401 });
                }
                return HttpResponse.json({ access_token: "token-ok", token_type: "Bearer", expires_in: 300 });
            }),
        );
        const auth = new ClientCredentialsAuth(makeHttp(), { clientId: "app-1", clientSecret: "s" });

        await expect(auth.getToken()).rejects.toBeInstanceOf(PlanVortexAuthenticationError);
        expect(await auth.getToken()).toBe("token-ok");
    });
});

describe("el token temporal", () => {
    it("se devuelve tal cual y no se refresca solo", async () => {
        const auth = new StaticTokenAuth("temporal-abc");
        expect(await auth.getToken()).toBe("temporal-abc");
        auth.invalidate();
        expect(await auth.getToken()).toBe("temporal-abc");
    });
});
