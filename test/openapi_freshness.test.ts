/**
 * Que la copia del OpenAPI commiteada aqui siga siendo la que publica PlanVortexHome.
 *
 * El spec vive en el repositorio hermano PlanVortexHome (`swagger/*.json`), que es quien lo sirve
 * en /documentation y quien lo une en `public/openapi.json` — el documento que consumen las dos
 * librerias oficiales. Aqui se guarda una copia commiteada, y esa copia es la fuente de los
 * tipos: si alguien toca el spec y no ejecuta `npm run generate`, el paquete publica tipos de una
 * API que ya no existe y nadie se entera hasta que un integrador se come un 400.
 *
 * Este test compara la copia byte a byte con el documento de Home. Como Home puede no estar —una
 * CI que solo clone este repositorio, o un `npm install` de alguien de fuera— **se salta entero**
 * con un aviso bien visible. En la maquina de desarrollo, donde los repos viven juntos, corre
 * siempre.
 *
 * Lo que este test NO cubre es que el spec corresponda al servidor: eso lo vigila
 * `openapi_parity.test.ts` en PlanVortexServer, que recorre `src/routes/*.ts` de verdad. Y que el
 * documento de Home corresponda a su propio `swagger/` lo vigila `swaggerSpecs.test.ts` alli.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { BUNDLE_FILE, isRemote, openapiSource } from "../scripts/openapi-source.js";

const source = openapiSource();
//Una URL no se comprueba aqui: este test corre en cada `npm test` y no puede depender de la red.
const available = !isRemote(source) && existsSync(source);
const describeSpec = available ? describe : describe.skip;

if (!available) {
    //Sin `console.warn` esto se salta sin que nadie se entere, que es justo el fallo que el test
    //existe para evitar.
    console.warn(
        `[openapi_freshness] SALTADO: no encuentro el documento en ${source}. ` +
            "Clona PlanVortexHome al lado, o apunta PLANVORTEX_OPENAPI a su public/openapi.json.",
    );
}

describeSpec("la copia del OpenAPI frente a la que publica PlanVortexHome", () => {
    it("es exactamente el documento que Home sirve hoy", () => {
        const upstream = readFileSync(source, "utf8");
        const committed = readFileSync(BUNDLE_FILE, "utf8");

        //Si esto falla: `npm run generate` y commitea los dos ficheros que salen. Y si lo que ha
        //cambiado es el spec, en Home hace falta antes un `npm run openapi:bundle`.
        expect(upstream === committed).toBe(true);
    });
});
