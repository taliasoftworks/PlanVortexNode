/**
 * CAPA 3 — los errores, tal y como los manda el servidor de verdad.
 *
 * LA TRAMPA 1 DEL ROADMAP EN FORMA DE TEST: en este API **todo llega con HTTP 400**. No hay 404 para
 * "no existe" ni 403 para "no puedes": hay un `code` del catálogo dentro de un 400. Toda la
 * clasificación de la librería —qué clase de error se lanza, qué `family` tiene— cuelga de ese
 * número, así que si el servidor decidiera un día devolver un 404 honrado, `errorFamilyForCode`
 * dejaría de encontrar nada y el integrador pasaría de capturar `OrganizationError` a capturar la
 * clase base sin enterarse.
 *
 * La capa 2 no puede ver eso: sus respuestas de error las escribimos nosotros con el número que
 * creemos. Éstas vienen del catálogo real.
 */
import { beforeAll, expect, it } from "vitest";

import { AuthError, NO_ERROR_CODE, OrganizationError, isPlanVortexError } from "../../src/index.js";
import type { PlanVortexError } from "../../src/index.js";
import { describeLive, liveContext, type LiveContext } from "./helpers/liveEnv.js";

/** Un ObjectId con forma perfecta que no es de nadie. */
const MISSING_ID = "000000000000000000000000";

describeLive("errores", () => {
    let live: LiveContext;

    beforeAll(async () => {
        live = await liveContext();
    });

    it("una organización que no existe es un 400 con código 1101, no un 404", async () => {
        const error = await live.pv.organizations.get(MISSING_ID).catch((e: unknown) => e);

        expect(isPlanVortexError(error)).toBe(true);
        const failure = error as PlanVortexError;
        expect(failure).toBeInstanceOf(OrganizationError);
        expect(failure.code).toBe(1101);
        expect(failure.family).toBe("organization");
        //Lo importante de este test: el 400. Es lo que obliga a mirar `code` y nunca `status`.
        expect(failure.status).toBe(400);
        expect(failure.message).toBeTruthy();
    });

    it("un identificador con forma inválida es el 503 del catálogo, no un 500", async () => {
        const error = await live.pv.organizations.get("no-soy-un-object-id").catch((e: unknown) => e);

        expect(isPlanVortexError(error)).toBe(true);
        const failure = error as PlanVortexError;
        //503 vive en el rango 500-541, que es la familia `auth`. Sorprende —no tiene nada que ver
        //con autenticarse— pero es donde está, y la librería lo clasifica por rango.
        expect(failure.code).toBe(503);
        expect(failure).toBeInstanceOf(AuthError);
        expect(failure.status).toBe(400);
    });

    it("lo que exige token de USUARIO se le niega a una app con el 512", async () => {
        //`GET /clients/{id}/apps` lleva `requireCurrentUser`: una app no se administra a sí misma.
        //Es el límite del alcance de la librería, y está aquí para que se note el día que cambie.
        const error = await live.pv.apps.list(live.client._id).catch((e: unknown) => e);

        expect(isPlanVortexError(error)).toBe(true);
        const failure = error as PlanVortexError;
        expect(failure.code).toBe(512);
        expect(failure.family).toBe("auth");
        expect(failure.status).toBe(400);
    });

    it("una ruta que no existe sale como error HTTP sin código inventado", async () => {
        //Aquí sí hay un 404 de verdad, porque no lo genera el catálogo sino Express, y el cuerpo ni
        //siquiera es JSON. La librería no debe fabricar un `code`: se distingue por `family`.
        const error = await live.pv
            .request({ method: "GET", path: "/esta-ruta-no-existe-jamas" })
            .catch((e: unknown) => e);

        expect(isPlanVortexError(error)).toBe(true);
        const failure = error as PlanVortexError;
        expect(failure.status).toBe(404);
        expect(failure.family).toBe("http");
        expect(failure.code).toBe(NO_ERROR_CODE);
    });
});
