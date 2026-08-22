import { HttpResponse, http as route } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PlanVortex } from "../src/client.js";
import { AuthError, PlanVortexConfigError } from "../src/core/errors.js";
import { VERSION } from "../src/version.js";

const BASE_URL = "https://api.test.local/v1.0.0";
const TOKEN_URL = `${BASE_URL}/oauth/token`;

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * Las variables de entorno se limpian entre pruebas: el constructor las lee, y una que estuviera
 * puesta en la maquina de quien ejecuta esto haria pasar un test que deberia fallar.
 */
const ENV_KEYS = ["PLANVORTEX_CLIENT_ID", "PLANVORTEX_CLIENT_SECRET", "PLANVORTEX_BASE_URL"];
let savedEnv: Record<string, string | undefined> = {};
beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    for (const key of ENV_KEYS) {
        delete process.env[key];
    }
});
afterEach(() => {
    for (const key of ENV_KEYS) {
        const value = savedEnv[key];
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
});

function makeClient(overrides: Record<string, unknown> = {}) {
    return new PlanVortex({
        clientId: "app-1",
        clientSecret: "s3cr3t",
        baseUrl: BASE_URL,
        retry: { baseDelayMs: 0, maxDelayMs: 8_000 },
        ...overrides,
    });
}

function stubToken(token = "token-1") {
    const state = { calls: 0 };
    server.use(
        route.post(TOKEN_URL, () => {
            state.calls++;
            return HttpResponse.json({
                access_token: `${token}-${state.calls}`,
                token_type: "Bearer",
                expires_in: 300,
            });
        }),
    );
    return state;
}

describe("el constructor", () => {
    it("exige credenciales", () => {
        expect(() => new PlanVortex()).toThrow(PlanVortexConfigError);
    });

    it("acepta las credenciales del entorno", () => {
        process.env.PLANVORTEX_CLIENT_ID = "app-env";
        process.env.PLANVORTEX_CLIENT_SECRET = "secret-env";
        expect(() => new PlanVortex()).not.toThrow();
    });

    it("quita la barra final de la baseUrl", () => {
        expect(makeClient({ baseUrl: `${BASE_URL}/` }).baseUrl).toBe(BASE_URL);
    });

    /**
     * La trampa 9: el `client_secret` no puede vivir en un bundle de front. El constructor es el
     * ultimo sitio donde se puede parar a alguien antes de que publique su secreto.
     */
    it("se niega a construirse en un navegador", () => {
        const globals = globalThis as { window?: unknown };
        globals.window = { document: {} };
        try {
            expect(() => makeClient()).toThrow(PlanVortexConfigError);
            expect(() => makeClient({ dangerouslyAllowBrowser: true })).not.toThrow();
        } finally {
            delete globals.window;
        }
    });
});

describe("la peticion autenticada", () => {
    it("pone el Bearer y el User-Agent con la version del paquete", async () => {
        stubToken();
        let authorization: string | null = null;
        let userAgent: string | null = null;
        server.use(
            route.get(`${BASE_URL}/clients`, ({ request }) => {
                authorization = request.headers.get("authorization");
                userAgent = request.headers.get("user-agent");
                return HttpResponse.json({ clients: [], total: 0 });
            }),
        );

        await makeClient().request({ method: "GET", path: "/clients" });

        expect(authorization).toBe("Bearer token-1-1");
        expect(userAgent).toContain(`planvortex-node/${VERSION}`);
        expect(userAgent).toContain("node/");
    });

    /**
     * Un token puede morir antes de su `expires_in` —un despliegue de Keycloak, la app revocada—.
     * Ese caso llega como un 400 con code 501 y se arregla con UN token nuevo, no reintentando en
     * bucle. Ojo: el status es 400, asi que quien mirase el status no lo vería nunca.
     */
    it("pide un token nuevo ante un 501 y reintenta una sola vez", async () => {
        const token = stubToken();
        let calls = 0;
        server.use(
            route.get(`${BASE_URL}/clients`, () => {
                calls++;
                if (calls === 1) {
                    return HttpResponse.json(
                        { code: 501, message: "Invalid authorization token" },
                        { status: 400 },
                    );
                }
                return HttpResponse.json({ clients: [], total: 0 });
            }),
        );

        const response = await makeClient().request<{ total: number }>({ method: "GET", path: "/clients" });

        expect(response.data.total).toBe(0);
        expect(calls).toBe(2);
        //Dos tokens: el primero y el que se pidio despues de invalidarlo.
        expect(token.calls).toBe(2);
    });

    it("se rinde si el segundo token tampoco vale", async () => {
        const token = stubToken();
        let calls = 0;
        server.use(
            route.get(`${BASE_URL}/clients`, () => {
                calls++;
                return HttpResponse.json({ code: 522, message: "Invalid token: Expired" }, { status: 400 });
            }),
        );

        const error = await makeClient()
            .request({ method: "GET", path: "/clients" })
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe(522);
        expect(calls).toBe(2);
        expect(token.calls).toBe(2);
    });

    /**
     * El 520 sale 401 y NO es un error de token: pedir otro no arregla que a la app le falten
     * permisos. Si esto reintentase, cada 520 costaria una peticion de token de mas.
     */
    it("no pide token nuevo ante un 520 de permisos", async () => {
        const token = stubToken();
        let calls = 0;
        server.use(
            route.get(`${BASE_URL}/clients`, () => {
                calls++;
                return HttpResponse.json({ code: 520, message: "Insufficient permissions" }, { status: 401 });
            }),
        );

        await makeClient()
            .request({ method: "GET", path: "/clients" })
            .catch(() => undefined);

        expect(calls).toBe(1);
        expect(token.calls).toBe(1);
    });
});

describe("el cliente con token temporal", () => {
    /**
     * El flujo de conexion de cuentas (trampa 2): una app no puede conectar una cuenta de
     * Instagram, asi que emite un token temporal y su usuario final lo usa. Mismo cliente, misma
     * forma, otra identidad — y sin pasar por el endpoint de token.
     */
    it("usa el token tal cual, sin pedir ninguno", async () => {
        let authorization: string | null = null;
        server.use(
            route.get(`${BASE_URL}/organizations/org1/connect_links`, ({ request }) => {
                authorization = request.headers.get("authorization");
                return HttpResponse.json({ links: [] });
            }),
        );

        const guest = makeClient().asTemporalToken("temporal-abc");
        await guest.request({ method: "GET", path: "/organizations/org1/connect_links" });

        //Si hubiera pedido un token, `onUnhandledRequest: "error"` habria roto el test.
        expect(authorization).toBe("Bearer temporal-abc");
    });

    it("hereda la baseUrl del cliente que lo emitio", () => {
        const guest = makeClient().asTemporalToken("temporal-abc");
        expect(guest.baseUrl).toBe(BASE_URL);
    });
});
