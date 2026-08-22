/**
 * Que el paquete OpenAPI commiteado siga siendo el spec de verdad.
 *
 * El spec vive en el repositorio hermano PlanVortexHome (`swagger/*.json`), que es quien lo sirve
 * en /documentation. Aqui se guarda unido y commiteado, y ese fichero es la fuente de los tipos:
 * si alguien toca el spec y no ejecuta `npm run generate`, el paquete publica tipos de una API
 * que ya no existe y nadie se entera hasta que un integrador se come un 400.
 *
 * Este test rehace el paquete y lo compara byte a byte con el commiteado. Como el spec puede no
 * estar —una CI que solo clone este repositorio, o un `npm install` de alguien de fuera— **se
 * salta entero** con un aviso bien visible. En la maquina de desarrollo, donde los repos viven
 * juntos, corre siempre.
 *
 * Lo que este test NO cubre es que el spec corresponda al servidor: eso lo vigila
 * `openapi_parity.test.ts` en PlanVortexServer, que recorre `src/routes/*.ts` de verdad.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { BUNDLE_FILE, buildBundle, serializeBundle, swaggerDirectory } from "../scripts/openapi-bundle.js";

const directory = swaggerDirectory();
const available = existsSync(directory);
const describeSpec = available ? describe : describe.skip;

if (!available) {
    //Sin `console.warn` esto se salta sin que nadie se entere, que es justo el fallo que el test
    //existe para evitar.
    console.warn(
        `[openapi_freshness] SALTADO: no encuentro el spec en ${directory}. ` +
            "Clona PlanVortexHome al lado, o apunta PLANVORTEX_SWAGGER_DIR a su carpeta swagger/.",
    );
}

describeSpec("el paquete OpenAPI frente al spec", () => {
    it("es exactamente lo que sale de swagger/ hoy", () => {
        const rebuilt = serializeBundle(buildBundle(directory));
        const committed = readFileSync(BUNDLE_FILE, "utf8");

        //Si esto falla: `npm run generate` y commitea los dos ficheros que salen.
        expect(rebuilt === committed).toBe(true);
    });
});
