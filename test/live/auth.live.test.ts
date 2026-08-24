/**
 * CAPA 3 — la fachada de token, contra el servidor de verdad.
 *
 * Es lo primero que se prueba porque es lo primero que se rompe: si `POST /oauth/token` deja de
 * contestar lo que la fase 1 dejó escrito, TODO lo demás de la librería falla con un error que no
 * dice nada. Y es lo único de todo el API cuyo error tiene forma de OAuth2 y status de verdad
 * (401), en vez del `{code, message, data}` con 400 del resto — eso también se comprueba aquí.
 */
import { beforeAll, expect, it } from "vitest";

import { PlanVortexAuthenticationError } from "../../src/index.js";
import { describeLive, liveClient, liveClientWithBadSecret } from "./helpers/liveEnv.js";

describeLive("oauth/token", () => {
    it("emite un token y sirve para llamar al API", async () => {
        const pv = liveClient();

        const networks = await pv.catalog.socialNetworks();

        expect(Array.isArray(networks)).toBe(true);
        expect(networks.length).toBeGreaterThan(0);
    });

    it("pide UN token para varias llamadas: la caché respeta el expires_in real del servidor", async () => {
        let tokenCalls = 0;
        const pv = liveClient({
            hooks: {
                onRequest: ({ url, attempt }) => {
                    if (url.includes("/oauth/token") && attempt === 1) tokenCalls += 1;
                },
            },
        });

        //Tres llamadas seguidas, y la primera es la que arranca el token.
        const { data: clients } = await pv.clients.list({ limit: 1 });
        await pv.catalog.socialNetworks();
        await pv.catalog.socialLimits();

        expect(clients.length).toBeGreaterThan(0);
        //Si esto sale a 3, el token se está pidiendo en cada llamada: son 30 por minuto y client_id.
        expect(tokenCalls).toBe(1);
    });

    it("con un secreto que no vale contesta 401 invalid_client, no un 400 del catálogo", async () => {
        const pv = liveClientWithBadSecret();

        const error = await pv.catalog.socialNetworks().catch((e: unknown) => e);

        expect(error).toBeInstanceOf(PlanVortexAuthenticationError);
        const authError = error as PlanVortexAuthenticationError;
        //El endpoint de token es la ÚNICA ruta del servidor con forma de error OAuth2 y con un
        //status que significa algo. Si esto empieza a llegar como 400 con `code`, es que alguien
        //metió la fachada por el `errorHandler` global y el integrador dejó de poder distinguir
        //"credenciales mal" de "publicación inválida".
        expect(authError.oauthError).toBe("invalid_client");
        expect(authError.status).toBe(401);
        expect(authError.family).toBe("oauth");
    });
});

describeLive("token de app: alcance", () => {
    let clientIds: string[] = [];

    beforeAll(async () => {
        const { data } = await liveClient().clients.list({ limit: 50 });
        clientIds = data.map((client) => client._id);
    });

    it("sólo ve su propio cliente", () => {
        //Una app hereda los permisos de su cliente y no puede tocar otro (error 537). Que el listado
        //devuelva exactamente uno es la forma barata de comprobarlo sin provocar un 537.
        expect(clientIds).toHaveLength(1);
    });
});
