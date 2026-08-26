/**
 * CAPA 3 — el flujo de conexión de cuentas, contra el servidor de verdad.
 *
 * ESTO ES LO QUE LA FASE 9 DEJÓ A MEDIAS. Allí el flujo se verificó contra un servidor de mentira,
 * porque autorizar una red es un OAuth **con una persona delante** y eso no se automatiza. Lo que sí
 * se puede comprobar sin nadie pulsando nada es todo lo de antes: que el token temporal se emite,
 * que sirve para pedir los enlaces, y —sobre todo— que **cada uno de los dos credenciales es
 * rechazado exactamente donde debe**.
 *
 * Esa última parte es la que trae cuenta. El spec juraba que pedir los enlaces con credenciales de
 * app contesta 519 y que el token temporal contesta 519 al pedir un token: uno de los dos era 514,
 * los dos errores dicen casi lo mismo y están a cinco números. Con esto pinchado, el día que alguien
 * cambie el orden de un middleware se entera aquí y no en el foro de un integrador.
 *
 * Lo que NO se prueba y no se puede: `accounts.connect()`. La URL de vuelta la construye la red y
 * apunta a un front nuestro; hace falta una persona autorizando.
 */
import { beforeAll, expect, it } from "vitest";

import type { PlanVortexError } from "../../src/index.js";
import { isPlanVortexError } from "../../src/index.js";
import { describeLive, liveContext, type LiveContext } from "./helpers/liveEnv.js";

describeLive("flujo de conexión", () => {
    let live: LiveContext;
    let token = "";

    beforeAll(async () => {
        live = await liveContext();
        const connect = await live.pv.organizations.createConnectToken(live.organization._id);
        token = connect.token;
    });

    it("la app emite un token temporal con su URL y su caducidad", async () => {
        const connect = await live.pv.organizations.createConnectToken(live.organization._id, {
            social_network: "instagram",
        });

        expect(connect.token).toBeTruthy();
        expect(connect.url).toMatch(/^https?:\/\//);
        //QUINCE MINUTOS. Era una hora, y la hora no compraba nada: quien recibe esto salta de la
        //aplicación del integrador al panel en el acto. Este número sólo lo puede confirmar la
        //capa 3, porque lo fija el servidor y el paquete se limita a leer su `expires_at`.
        const remaining = new Date(connect.expires_at).getTime() - Date.now();
        expect(remaining).toBeGreaterThan(0);
        expect(remaining).toBeLessThanOrEqual(16 * 60 * 1000);
    });

    /**
     * La red va DENTRO del token, no sólo en la query de la URL. Antes viajaba únicamente ahí —o
     * sea en la parte que cualquiera reescribe—, así que un token pedido "para Instagram" conectaba
     * igual de bien un Facebook de esa organización.
     *
     * Los enlaces son la mitad visible de lo mismo: con un token atado, sólo sale esa red, para que
     * el integrador no le pinte a su usuario botones que después van a contestar 544.
     */
    it("un token emitido para una red sólo enseña y sólo conecta esa red", async () => {
        const connect = await live.pv.organizations.createConnectToken(live.organization._id, {
            social_network: "instagram",
        });
        const guest = live.pv.asTemporalToken(connect.token);

        const links = await guest.accounts.connectLinks(live.organization._id);
        expect(links.map((link) => link.social_network)).toEqual(["instagram"]);

        //Y el rechazo de verdad: pedir la conexión de OTRA red con ese token. El guardia va delante
        //del handler, así que esto no llega a hablar con Facebook.
        const error = await guest.accounts
            .connect(live.organization._id, "facebook", { code: "no-llega-a-usarse" })
            .catch((e: unknown) => e);

        expect(isPlanVortexError(error)).toBe(true);
        expect((error as PlanVortexError).code).toBe(544);
        expect((error as PlanVortexError).status).toBe(400);
    });

    it("con el token temporal se piden los enlaces de autorización", async () => {
        const links = await live.pv.asTemporalToken(token).accounts.connectLinks(live.organization._id);

        expect(Array.isArray(links)).toBe(true);
        expect(links.length).toBeGreaterThan(0);

        for (const link of links) {
            expect(typeof link.social_network).toBe("string");
            //LO QUE SE MIRA ES EL MÉTODO, no si el enlace viene vacío. Ésta era la excepción escrita
            //a mano para WhatsApp —que llega con `link: ""` porque su alta no es un OAuth sino el
            //embedded signup de Meta— y que dejaba a cualquier integrador mandando a su usuario a
            //su propia página. Ahora el servidor lo dice, y el que se salga de estos dos métodos
            //rompe aquí en vez de en el navegador de alguien.
            expect(["redirect", "meta_embedded_signup"]).toContain(link.authorization.type);

            if (link.authorization.type === "meta_embedded_signup") {
                //No hay URL que dar, pero sí todo lo que hace falta para levantar el popup.
                expect(link.link).toBe("");
                for (const field of ["app_id", "config_id", "graph_version", "feature_type", "session_info_version"] as const) {
                    expect(link.authorization[field], `${field} de ${link.social_network}`).toBeTruthy();
                }
                continue;
            }

            //`link`, no `url`: es la URL de la RED, a la que se manda al usuario.
            expect(link.link, `enlace de ${link.social_network}`).toMatch(/^https?:\/\//);
        }
    });

    /**
     * Sólo la capa 3 puede confirmar que la configuración que publicamos es la que Meta acepta: en
     * las capas 1 y 2 el `config_id` es el que le pongamos al mock. Esto no abre el popup —hace
     * falta una persona— pero sí comprueba que el servidor de verdad tiene la variable puesta, que
     * es donde estuvo el fallo: `WHATSAPP_ADJUST_ID` existía en el `.env` y no la leía nadie,
     * mientras el valor bueno vivía a pelo en el front del panel.
     */
    it("WhatsApp publica una configuración de Embedded Signup con pinta de serlo", async () => {
        const links = await live.pv.asTemporalToken(token).accounts.connectLinks(live.organization._id);
        const whatsapp = links.find((link) => link.social_network === "whatsapp");

        if (!whatsapp) {
            //Que no aparezca es legítimo: esa organización puede no tener WhatsApp disponible.
            return;
        }
        expect(whatsapp.authorization.type).toBe("meta_embedded_signup");
        //Los identificadores de Meta son numéricos, y un "CAMBIAR" del .env de ejemplo no lo es.
        expect(whatsapp.authorization.app_id).toMatch(/^\d+$/);
        expect(whatsapp.authorization.config_id).toMatch(/^\d+$/);
        expect(whatsapp.authorization.graph_version).toMatch(/^v\d+\.\d+$/);
    });

    it("las credenciales de app NO sirven para pedir enlaces: 519", async () => {
        //`requireTokenType(["current_user", "temporal_token"])`. Una app no puede conectar una
        //cuenta ni aunque quiera, y ésta es la trampa 2 del roadmap dicha por el servidor.
        const error = await live.pv.accounts.connectLinks(live.organization._id).catch((e: unknown) => e);

        expect(isPlanVortexError(error)).toBe(true);
        expect((error as PlanVortexError).code).toBe(519);
        expect((error as PlanVortexError).status).toBe(400);
    });

    /**
     * ESTO FUE UN FALLO DEL SERVIDOR, y es el que encontró esta capa: **un token temporal podía
     * emitir otro token temporal**, y el nuevo duraba otra hora. Encadenándolos, el credencial no
     * caducaba nunca — y ese credencial viaja en una URL, en el navegador del usuario final del
     * integrador, cuyo único modelo de seguridad era "muere en una hora".
     *
     * El motivo estaba en `checkAuth`: cuando el token es temporal rellena `temporal_token` **y
     * también** `current_app` —lo saca del `keycloak_client_idenfifier` que viaja dentro del propio
     * token—, así que el `requireCurrentApp` de la ruta lo daba por bueno. Arreglado el 2026-08-25:
     * el guardia mira las dos cosas y un token temporal recibe el 514 que el spec ya anunciaba.
     *
     * O sea que este test dejó de afirmar lo que el servidor hacía para afirmar lo que debe hacer.
     */
    it("un token temporal NO puede emitir otro token temporal: 514", async () => {
        const error = await live.pv
            .asTemporalToken(token)
            .organizations.createConnectToken(live.organization._id)
            .catch((e: unknown) => e);

        expect(isPlanVortexError(error)).toBe(true);
        expect((error as PlanVortexError).code).toBe(514);
        //Como todo error de dominio: dentro de un 400, nunca en el status. § Trampa 1.
        expect((error as PlanVortexError).status).toBe(400);
    });

    it("el token temporal está atado a UNA organización", async (ctx) => {
        const { data } = await live.pv.clients.organizations(live.client._id, { limit: 2 });
        const other = data.find((organization) => organization._id !== live.organization._id);
        if (!other) {
            ctx.skip("hace falta una segunda organización en el cliente");
            return;
        }

        const error = await live.pv
            .asTemporalToken(token)
            .accounts.connectLinks(other._id)
            .catch((e: unknown) => e);

        expect(isPlanVortexError(error)).toBe(true);
        expect((error as PlanVortexError).code).toBe(1101);
    });
});
