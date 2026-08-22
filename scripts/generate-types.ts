/**
 * Genera los tipos del paquete a partir del OpenAPI publico (fase 5 del roadmap).
 *
 *   npm run generate
 *
 * Son DOS ficheros, los dos commiteados:
 *
 *   1. `openapi/planvortex.openapi.json` — los documentos de `swagger/` de PlanVortexHome unidos
 *      en uno solo (lo hace `openapi-bundle.ts`). Se commitea porque el spec vive en OTRO
 *      repositorio: sin la copia, la CI de este —que solo clona este— no tendria nada de lo que
 *      regenerar y el `git diff --exit-code` que vigila los tipos no vigilaria nada. Es ademas lo
 *      que consumiran las demas librerias (la de Python y las que vengan): unir se hace una vez.
 *   2. `src/generated/openapi.d.ts` — `openapi-typescript` por encima del paquete anterior. Se
 *      commitea porque instalar `planvortex` no puede exigir generar nada.
 *
 * Con PlanVortexHome al lado se rehacen los dos; sin el, se rehace solo el segundo a partir del
 * paquete commiteado. Asi la CI comprueba lo que le toca (que los tipos correspondan al paquete)
 * y la maquina de desarrollo comprueba ademas que el paquete corresponda al spec — eso ultimo lo
 * vigila tambien `test/openapi_freshness.test.ts` en cada `npm test`.
 */
import fs from "node:fs";
import path from "node:path";
import openapiTS, { astToString } from "openapi-typescript";

import {
    BUNDLE_FILE,
    ROOT,
    TYPES_FILE,
    buildBundle,
    countOperations,
    readJson,
    serializeBundle,
    swaggerDirectory,
} from "./openapi-bundle.js";

const HEADER = [
    "/**",
    " * GENERADO POR `npm run generate`. NO SE EDITA A MANO.",
    " *",
    " * Sale de `openapi/planvortex.openapi.json`, que a su vez sale de los `swagger/*-swagger.json`",
    " * de PlanVortexHome. Si algo de aqui no cuadra con la API, lo que hay que arreglar es el spec.",
    " *",
    " * Estos tipos son un DETALLE INTERNO: los nombres van prefijados por dominio para que el `Plan`",
    " * de un cliente y el de una organizacion no se pisen. La superficie publica del paquete son los",
    " * tipos con nombre legible de `src/types.ts`, que se construyen encima de estos.",
    " */",
    "",
    "",
].join("\n");

async function main(): Promise<void> {
    const directory = swaggerDirectory();

    if (fs.existsSync(directory)) {
        const bundle = buildBundle(directory);
        fs.mkdirSync(path.dirname(BUNDLE_FILE), { recursive: true });
        fs.writeFileSync(BUNDLE_FILE, serializeBundle(bundle), "utf8");
        console.log(
            `openapi: ${bundle["x-planvortex-bundle"].sources.length} ficheros, ` +
                `${countOperations(bundle.paths)} operaciones y ${countOperations(bundle.webhooks)} webhooks ` +
                `-> ${path.relative(ROOT, BUNDLE_FILE)}`,
        );
    } else if (fs.existsSync(BUNDLE_FILE)) {
        //Sin un aviso bien visible, un checkout suelto regeneraria contra un paquete viejo y
        //diria que todo esta en orden.
        console.warn(`openapi: no encuentro el spec en ${directory}.`);
        console.warn(
            "openapi: uso el paquete commiteado. Clona PlanVortexHome al lado, o apunta " +
                "PLANVORTEX_SWAGGER_DIR a su carpeta swagger/, para rehacerlo del spec.",
        );
    } else {
        throw new Error(`No encuentro ni el spec (${directory}) ni el paquete (${BUNDLE_FILE}).`);
    }

    const ast = await openapiTS(readJson(BUNDLE_FILE), {
        //Ordenado alfabeticamente por el mismo motivo que el paquete: lo que vigila la CI es que
        //el diff este vacio, y un diff que se mueve solo no vigila nada.
        alphabetize: true,
    });
    fs.mkdirSync(path.dirname(TYPES_FILE), { recursive: true });
    fs.writeFileSync(TYPES_FILE, `${HEADER}${astToString(ast).trimEnd()}\n`, "utf8");
    console.log(`openapi: escrito ${path.relative(ROOT, TYPES_FILE)}`);
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
