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
        //Una hora. Es lo que hace que se pueda mandar por correo a un usuario final sin que sea un
        //credencial permanente en manos de nadie.
        const remaining = new Date(connect.expires_at).getTime() - Date.now();
        expect(remaining).toBeGreaterThan(0);
        expect(remaining).toBeLessThanOrEqual(61 * 60 * 1000);
    });

    it("con el token temporal se piden los enlaces de autorización", async () => {
        const links = await live.pv.asTemporalToken(token).accounts.connectLinks(live.organization._id);

        expect(Array.isArray(links)).toBe(true);
        expect(links.length).toBeGreaterThan(0);

        for (const link of links) {
            expect(typeof link.social_network).toBe("string");

            //OJO CON WHATSAPP, que llega con `link: ""`. Su alta no es un OAuth sino el embedded
            //signup de Meta, así que su SDK devuelve cadena vacía en vez de lanzar —que es lo que
            //hace Discord cuando no puede dar enlace, y por eso Discord sencillamente no aparece—.
            //Un integrador que recorra la lista y redirija manda a su usuario a "", o sea a su
            //propia página. Es un fallo del servidor, está anotado en el roadmap, y hasta que se
            //decida qué hacer la excepción vive aquí para que el resto se siga comprobando.
            if (link.social_network === "whatsapp") {
                expect(link.link).toBe("");
                continue;
            }

            //`link`, no `url`: es la URL de la RED, a la que se manda al usuario.
            expect(link.link, `enlace de ${link.social_network}`).toMatch(/^https?:\/\//);
        }
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
