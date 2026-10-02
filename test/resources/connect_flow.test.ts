/**
 * El flujo de conexión de cuentas (capa 2).
 *
 * Es el trozo del API que más se sale de la norma, y cada test de aquí pincha una de esas rarezas
 * —ninguna se puede detectar de otra forma:
 *
 *  - El token temporal es el ÚNICO endpoint del flujo que exige credenciales de app; los otros
 *    tres las rechazan. Un cliente hecho con `asTemporalToken()` no puede pedir un token a
 *    `/oauth/token`: no tiene con qué, y si lo intentase el flujo entero se caería con un 401.
 *  - `account-connect` contesta **200 con el error dentro del cuerpo**. Sin la traducción a
 *    excepción, `connect()` devolvería un objeto con `accounts: []` y quien integre daría la
 *    conexión por buena.
 *  - Los parámetros de vuelta de la red se pasan **tal cual**. Filtrarlos o renombrarlos rompe X
 *    (`oauth_token`/`oauth_verifier`) sin romper a Meta, que es la peor forma de romper algo.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { PlanVortexError } from "../../src/index.js";
import { AccountError } from "../../src/index.js";
import { ContractHarness } from "../helpers/contract.js";
import { ACCOUNT_ID, ORG_ID, account } from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

const TEMPORAL_TOKEN = "eyJhbGciOiJIUzI1NiJ9.temporal.firma";

describe("token temporal de conexión", () => {
    it("devuelve la URL, el token suelto y la caducidad, con la red y el redirect en la query", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/temporal_connect_token`, {
            url: `https://app.planvortex.com/organizations/${ORG_ID}/connect?token=${TEMPORAL_TOKEN}&social_network=instagram`,
            token: TEMPORAL_TOKEN,
            expires_at: "2026-08-22T13:00:00.000Z",
        });
        const pv = api.client();

        const connect = await pv.organizations.createConnectToken(ORG_ID, {
            social_network: "instagram",
            redirect_uri: "https://mi-app.example/ya-esta",
        });

        expect(calls[0]?.query).toEqual({
            social_network: ["instagram"],
            redirect_uri: ["https://mi-app.example/ya-esta"],
        });
        //El token suelto es lo que hace que `asTemporalToken()` no tenga que parsear la URL.
        expect(connect.token).toBe(TEMPORAL_TOKEN);
        expect(connect.expires_at).toBe("2026-08-22T13:00:00.000Z");
    });

    /**
     * Este es el test que no puede fallar de otra manera: el cliente temporal manda el token TAL
     * CUAL en el `Authorization` y **no pide ninguno**. Si `asTemporalToken()` dejase puestas las
     * credenciales de la app, el flujo se autenticaría como la app y los tres endpoints siguientes
     * contestarían 519 — con un token perfectamente válido en la mano.
     */
    it("`asTemporalToken` autentica con ese token y no pide otro", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/connect_links`, { links: [] });
        const pv = api.client();

        const guest = pv.asTemporalToken(TEMPORAL_TOKEN);
        await guest.accounts.connectLinks(ORG_ID);

        expect(calls[0]?.headers.get("authorization")).toBe(`Bearer ${TEMPORAL_TOKEN}`);
        expect(api.tokenRequests).toBe(0);
    });
});

describe("enlaces de conexión", () => {
    it("desenvuelve `{links}` y repite `social_network`", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/connect_links`, {
            links: [
                { social_network: "instagram", link: "https://api.instagram.com/oauth/authorize?x=1" },
                { social_network: "bluesky", link: "https://bsky.social/oauth/authorize?x=1" },
            ],
        });
        const guest = api.client({ accessToken: TEMPORAL_TOKEN });

        const links = await guest.accounts.connectLinks(ORG_ID, {
            social_network: ["instagram", "bluesky"],
        });

        expect(calls[0]?.query).toEqual({ social_network: ["instagram", "bluesky"] });
        expect(links.map((link) => link.social_network)).toEqual(["instagram", "bluesky"]);
    });

    /**
     * WHATSAPP NO ES UNA URL. Su alta es el Embedded Signup de Meta —un popup que levanta quien
     * integra, con el SDK de JavaScript de Facebook—, así que llega con `link: ""` y con los
     * parámetros del popup en `authorization`. El servidor los publica desde hace poco; antes eran
     * cadena vacía y nada más, y quien recorriese la lista redirigiendo mandaba a su usuario a su
     * propia página.
     *
     * Aquí lo que se fija es que la librería **no toca nada**: ni filtra la entrada por venir con el
     * enlace vacío, ni se come el bloque que no entiende.
     */
    it("deja pasar WhatsApp entero: link vacío y los parámetros del popup", async () => {
        api.mock("get", `/organizations/${ORG_ID}/connect_links`, {
            links: [
                { social_network: "instagram", link: "https://api.instagram.com/oauth/authorize?x=1", authorization: { type: "redirect" } },
                {
                    social_network: "whatsapp",
                    link: "",
                    authorization: {
                        type: "meta_embedded_signup",
                        app_id: "550079163888720",
                        config_id: "1833599127237054",
                        graph_version: "v23.0",
                        feature_type: "whatsapp_business_app_onboarding",
                        session_info_version: "3",
                    },
                },
            ],
        });
        const guest = api.client({ accessToken: TEMPORAL_TOKEN });

        const links = await guest.accounts.connectLinks(ORG_ID);
        const whatsapp = links.find((link) => link.social_network === "whatsapp");

        expect(links).toHaveLength(2);
        expect(whatsapp?.link).toBe("");
        expect(whatsapp?.authorization).toEqual({
            type: "meta_embedded_signup",
            app_id: "550079163888720",
            config_id: "1833599127237054",
            graph_version: "v23.0",
            feature_type: "whatsapp_business_app_onboarding",
            session_info_version: "3",
        });
        //Y la de al lado sigue siendo de redirección, que es lo que se mira para saber qué hacer.
        expect(links.find((link) => link.social_network === "instagram")?.authorization.type).toBe("redirect");
    });
});

describe("volver de la red", () => {
    it("pasa los parámetros del callback tal cual y devuelve las cuentas sin habilitar", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/account-connect/instagram`, {
            accounts: [account],
            errorCode: "",
            errorMsg: "",
            redirect_uri: "https://mi-app.example/ya-esta",
        });
        const guest = api.client({ accessToken: TEMPORAL_TOKEN });

        const result = await guest.accounts.connect(ORG_ID, "instagram", {
            code: "AQD-codigo",
            state: "n0nce",
            //X no manda `code`: manda estos dos. Si la librería filtrase por una lista de claves
            //conocidas, Twitter dejaría de conectarse y Meta seguiría funcionando.
            oauth_token: "tw-1",
            oauth_verifier: "tw-2",
        });

        expect(calls[0]?.query).toEqual({
            code: ["AQD-codigo"],
            state: ["n0nce"],
            oauth_token: ["tw-1"],
            oauth_verifier: ["tw-2"],
        });
        expect(result.accounts).toHaveLength(1);
        expect(result.redirect_uri).toBe("https://mi-app.example/ya-esta");
    });

    /**
     * El 200 con el error dentro. Sin esta traducción, `connect()` devolvería `{accounts: []}` y la
     * conexión fallida pasaría por una autorización que no dio ninguna cuenta, que es un caso real
     * y distinto.
     */
    it("lanza el error del catálogo cuando llega dentro de un 200", async () => {
        api.mock("get", `/organizations/${ORG_ID}/account-connect/facebook`, {
            accounts: [],
            errorCode: "700",
            errorMsg: "The account has no usable token",
        });
        const guest = api.client({ accessToken: TEMPORAL_TOKEN });

        const error = await guest.accounts.connect(ORG_ID, "facebook").catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AccountError);
        expect((error as PlanVortexError).code).toBe(700);
        expect((error as PlanVortexError).status).toBe(200);
    });

    it("una lista de cuentas ausente es una lista vacía, no un `undefined`", async () => {
        api.mock("get", `/organizations/${ORG_ID}/account-connect/discord`, {
            errorCode: "",
            errorMsg: "",
        });
        const guest = api.client({ accessToken: TEMPORAL_TOKEN });

        const result = await guest.accounts.connect(ORG_ID, "discord", { code: "d1" });

        expect(result.accounts).toEqual([]);
    });
});

describe("habilitar la cuenta", () => {
    it("hace POST y devuelve a dónde mandar al usuario", async () => {
        const calls = api.mock("post", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/enable`, {
            redirect_uri: "https://mi-app.example/ya-esta",
        });
        const guest = api.client({ accessToken: TEMPORAL_TOKEN });

        const result = await guest.accounts.enable(ORG_ID, ACCOUNT_ID);

        expect(calls[0]?.method).toBe("POST");
        expect(result.redirect_uri).toBe("https://mi-app.example/ya-esta");
    });

    /**
     * Y el 706 —"no queda plaza en el plan"— sale como `AccountError`, no como `PlanLimitError`:
     * vive en el rango 700-715 del catálogo del servidor, que es de cuentas. Se pincha aquí porque
     * es lo que un integrador va a intentar capturar mal.
     */
    it("sin `redirect_uri` devuelve un objeto vacío, y el 706 del cupo se lanza", async () => {
        api.mock("post", `/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/enable`, { success: true });
        api.mock(
            "post",
            `/organizations/${ORG_ID}/accounts/otra/enable`,
            { code: 706, message: "No accounts left in the plan" },
            400,
        );
        const guest = api.client({ accessToken: TEMPORAL_TOKEN });

        expect(await guest.accounts.enable(ORG_ID, ACCOUNT_ID)).toEqual({});
        const error = await guest.accounts.enable(ORG_ID, "otra").catch((e: unknown) => e);
        expect(error).toBeInstanceOf(AccountError);
        expect((error as PlanVortexError).code).toBe(706);
    });
});

/**
 * El selector de cuentas lo pone el integrador (`account_selection: "integrator"`, fase 20 de
 * cambios-planvortex.md en el Server). Lo que fija esto es la forma del contrato: el modo viaja en
 * la query del token, la sesión se lee y se confirma con las credenciales de la APP —no con el token
 * temporal, que se queda en el navegador— y la confirmación devuelve las cuentas habilitadas.
 */
describe("el selector de cuentas del integrador", () => {
    const SESSION_ID = "665f1c2e8b3a4d0012a1b2c9";

    it("pide el modo en la query del token y devuelve el id de la sesión", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/temporal_connect_token`, {
            url: "https://www.facebook.com/v23.0/dialog/oauth?client_id=1&state=pvcs_x",
            token: TEMPORAL_TOKEN,
            expires_at: "2026-10-02T13:00:00.000Z",
            connect_session: SESSION_ID,
        });
        const pv = api.client();

        const connect = await pv.organizations.createConnectToken(ORG_ID, {
            social_network: "facebook",
            redirect_uri: "https://mi-app.example/vuelta",
            account_selection: "integrator",
        });

        expect(calls[0]?.query).toEqual({
            social_network: ["facebook"],
            redirect_uri: ["https://mi-app.example/vuelta"],
            account_selection: ["integrator"],
        });
        expect(connect.connect_session).toBe(SESSION_ID);
    });

    it("lee la sesión con las credenciales de la app y la desenvuelve", async () => {
        const calls = api.mock("get", `/organizations/${ORG_ID}/connect_sessions/${SESSION_ID}`, {
            connect_session: {
                _id: SESSION_ID,
                social_network: "facebook",
                status: "returned",
                accounts: [{ ...account, deleted: true, already_enabled: false }],
                accounts_used: 3,
                accounts_limit: 10,
                expires_at: "2026-10-02T13:30:00.000Z",
            },
        });
        const pv = api.client();

        const session = await pv.accounts.getConnectSession(ORG_ID, SESSION_ID);

        expect(session.status).toBe("returned");
        expect(session.accounts[0]?.already_enabled).toBe(false);
        expect(session.accounts_limit - session.accounts_used).toBe(7);
        //Un token de app, no el temporal: la elección es del integrador, no del navegador.
        expect(calls[0]?.headers.get("authorization")).not.toBe(`Bearer ${TEMPORAL_TOKEN}`);
    });

    it("confirma mandando los ids y devuelve las cuentas habilitadas", async () => {
        const calls = api.mock("post", `/organizations/${ORG_ID}/connect_sessions/${SESSION_ID}/confirm`, {
            accounts: [{ ...account, deleted: false }],
        });
        const pv = api.client();

        const enabled = await pv.accounts.confirmConnectSession(ORG_ID, SESSION_ID, [ACCOUNT_ID]);

        expect(calls[0]?.body).toEqual({ accounts: [ACCOUNT_ID] });
        expect(enabled.map((e) => e._id)).toEqual([ACCOUNT_ID]);
    });

    /** O todas o ninguna: el 706 llega como excepción, con el número que hay que enseñar. */
    it("si no caben, el 706 llega como excepción con limit, used y requested", async () => {
        api.mock(
            "post",
            `/organizations/${ORG_ID}/connect_sessions/${SESSION_ID}/confirm`,
            { code: 706, message: "Max accounts reached", data: { limit: 10, used: 9, requested: 2 } },
            400,
        );
        const pv = api.client();

        const error = await pv.accounts.confirmConnectSession(ORG_ID, SESSION_ID, [ACCOUNT_ID, "otra"]).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AccountError);
        expect((error as PlanVortexError).code).toBe(706);
        expect((error as PlanVortexError).data).toEqual({ limit: 10, used: 9, requested: 2 });
    });
});
