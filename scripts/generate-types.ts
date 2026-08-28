/**
 * Genera los tipos del paquete a partir del OpenAPI publico (fase 5 del roadmap).
 *
 *   npm run generate
 *
 * Son DOS ficheros, los dos commiteados:
 *
 *   1. `openapi/planvortex.openapi.json` — el documento unido que publica PlanVortexHome en
 *      `public/openapi.json` (y en https://planvortex.com/openapi.json). Aqui se COPIA, no se
 *      construye: unir los `swagger/*-swagger.json` es cosa de PlanVortexHome desde que hay una
 *      segunda libreria oficial. Se commitea porque el spec vive en OTRO repositorio: sin la
 *      copia, la CI de este —que solo clona este— no tendria nada de lo que regenerar y el
 *      `git diff --exit-code` que vigila los tipos no vigilaria nada.
 *   2. `src/generated/openapi.d.ts` — `openapi-typescript` por encima del anterior. Se commitea
 *      porque instalar `planvortex` no puede exigir generar nada.
 *
 * Con PlanVortexHome al lado se rehacen los dos; sin el, se rehace solo el segundo a partir de la
 * copia commiteada. Asi la CI comprueba lo que le toca (que los tipos correspondan al documento)
 * y la maquina de desarrollo comprueba ademas que el documento corresponda al de Home — eso
 * ultimo lo vigila tambien `test/openapi_freshness.test.ts` en cada `npm test`.
 *
 * Para regenerar sin tener PlanVortexHome clonado:
 *
 *   PLANVORTEX_OPENAPI=https://planvortex.com/openapi.json npm run generate
 */
import fs from "node:fs";
import path from "node:path";
import openapiTS, { astToString } from "openapi-typescript";

import {
    BUNDLE_FILE,
    PUBLISHED_OPENAPI,
    ROOT,
    TYPES_FILE,
    countOperations,
    isRemote,
    openapiSource,
    readJson,
    readUpstreamBundle,
} from "./openapi-source.js";

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
    const source = openapiSource();
    const upstream = await readUpstreamBundle(source);

    if (upstream !== null) {
        fs.mkdirSync(path.dirname(BUNDLE_FILE), { recursive: true });
        //Se escribe el texto tal cual llego: lo commiteado aqui tiene que ser byte a byte lo que
        //publica Home, y reserializar es la forma de que dejen de serlo sin que nadie lo note.
        fs.writeFileSync(BUNDLE_FILE, upstream, "utf8");
        const bundle = readJson(BUNDLE_FILE);
        console.log(
            `openapi: ${countOperations(bundle.paths)} operaciones y ${countOperations(bundle.webhooks)} webhooks ` +
                `desde ${isRemote(source) ? source : path.relative(ROOT, source)} ` +
                `-> ${path.relative(ROOT, BUNDLE_FILE)}`,
        );
    } else if (fs.existsSync(BUNDLE_FILE)) {
        //Sin un aviso bien visible, un checkout suelto regeneraria contra una copia vieja y diria
        //que todo esta en orden.
        console.warn(`openapi: no encuentro el documento en ${source}.`);
        console.warn(
            "openapi: uso la copia commiteada. Clona PlanVortexHome al lado, apunta " +
                `PLANVORTEX_OPENAPI a su public/openapi.json, o usa ${PUBLISHED_OPENAPI}.`,
        );
    } else {
        throw new Error(`No encuentro ni el documento (${source}) ni la copia (${BUNDLE_FILE}).`);
    }

    const ast = await openapiTS(readJson(BUNDLE_FILE), {
        //Ordenado alfabeticamente por el mismo motivo que el documento: lo que vigila la CI es que
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
