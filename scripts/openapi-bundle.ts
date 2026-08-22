/**
 * Une los `swagger/*-swagger.json` de PlanVortexHome en un solo documento OpenAPI 3.1.
 *
 * POR QUE HAY QUE UNIR: /documentation de PlanVortexHome pinta un fichero por pestana y cada uno
 * es un documento OpenAPI completo. Un generador de codigo necesita lo contrario: un solo
 * documento, porque los `operationId` y los nombres de componente tienen que ser unicos en todo
 * lo que va a generar.
 *
 * Vive aparte de `generate-types.ts` para que los tests puedan rehacer el paquete y compararlo
 * con el commiteado sin ejecutar el generador entero.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
export const BUNDLE_FILE = path.join(ROOT, "openapi", "planvortex.openapi.json");
export const TYPES_FILE = path.join(ROOT, "src", "generated", "openapi.d.ts");

/** Los tres repos viven uno al lado del otro; `PLANVORTEX_SWAGGER_DIR` lo mueve de sitio. */
export const DEFAULT_SWAGGER_DIR = path.resolve(ROOT, "../../PlanVortexHome/swagger");

export const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

/** Secciones de `components` que pueden traer nombres. Todas se renombran igual. */
const COMPONENT_SECTIONS = [
    "schemas",
    "parameters",
    "responses",
    "requestBodies",
    "headers",
    "examples",
    "links",
    "callbacks",
    "pathItems",
] as const;

/* eslint-disable @typescript-eslint/no-explicit-any -- se manipula un documento JSON arbitrario */
export type Json = any;

export function readJson(file: string): Json {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function swaggerDirectory(): string {
    return process.env.PLANVORTEX_SWAGGER_DIR || DEFAULT_SWAGGER_DIR;
}

/** `ai_plans-swagger.json` -> `AiPlans`. Mecanico a proposito: ver `renameComponents`. */
function domainPrefix(file: string): string {
    return file
        .replace("-swagger.json", "")
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
}

/** Recorre el documento entero reescribiendo cada `$ref` con el mapa que se le pasa. */
function rewriteRefs(node: Json, rename: Map<string, string>): Json {
    if (Array.isArray(node)) {
        return node.map((child) => rewriteRefs(child, rename));
    }
    if (node === null || typeof node !== "object") {
        return node;
    }
    const output: Json = {};
    for (const [key, value] of Object.entries(node)) {
        if (key === "$ref" && typeof value === "string") {
            const replacement = rename.get(value);
            if (!replacement && value.startsWith("#/components/")) {
                throw new Error(`$ref sin destino tras el renombrado: ${value}`);
            }
            output[key] = replacement ?? value;
            continue;
        }
        output[key] = rewriteRefs(value, rename);
    }
    return output;
}

/**
 * Renombra los componentes de UN fichero anteponiendole su dominio, y devuelve el mapa de `$ref`.
 *
 * POR QUE SE RENOMBRA TODO Y NO SOLO LO QUE CHOCA: nueve nombres colisionan hoy —`Organization`,
 * `Plan`, `Use`, `PlanData`, `Contact`, `NormalizedMetrics`...— y NO son el mismo tipo: el `Plan`
 * de un cliente y el de una organizacion tienen campos distintos porque describen cosas distintas.
 * Resolver solo las colisiones dejaria el nombre limpio en manos de quien vaya primero por orden
 * alfabetico, y anadir manana un `billing-swagger.json` con su propio `Plan` renombraria en
 * silencio el de otro. Prefijar siempre es feo y es estable, y los nombres bonitos los pone
 * `src/types.ts`, que es la superficie publica.
 *
 * La excepcion son las definiciones compartidas de `common.json` (`Error`, `Success`,
 * `SocialNetwork` y los `securitySchemes`), que se copian IDENTICAS a cada fichero: esas se unen
 * en una sola y conservan su nombre. Si una copia hubiera derivado, aqui revienta.
 */
function renameComponents(
    file: string,
    spec: Json,
    common: Json,
): { components: Json; rename: Map<string, string> } {
    const prefix = domainPrefix(file);
    const rename = new Map<string, string>();
    const components: Json = {};

    for (const section of COMPONENT_SECTIONS) {
        const declared = spec.components?.[section];
        if (!declared) {
            continue;
        }
        components[section] = {};
        for (const [name, definition] of Object.entries<Json>(declared)) {
            const shared = common.components?.[section]?.[name];
            if (shared !== undefined) {
                if (JSON.stringify(shared) !== JSON.stringify(definition)) {
                    throw new Error(
                        `${file}: components.${section}.${name} ha derivado de common.json. ` +
                            "Arreglalo en PlanVortexHome con `npm run swagger:sync`.",
                    );
                }
                //Se queda con su nombre, pero entra igual en el mapa: asi un `$ref` que no aparezca
                //en el es un `$ref` roto, y no "uno que no habia que tocar".
                rename.set(`#/components/${section}/${name}`, `#/components/${section}/${name}`);
                components[section][name] = definition;
                continue;
            }
            const renamed = `${prefix}${name}`;
            rename.set(`#/components/${section}/${name}`, `#/components/${section}/${renamed}`);
            components[section][renamed] = definition;
        }
    }

    /**
     * Los `securitySchemes` NO se prefijan nunca: los bloques `security` los nombran a pelo, no
     * con un `$ref`, asi que renombrarlos romperia la autorizacion sin que ningun `$ref` se
     * quejara. Solo pueden venir de common.json, y si alguna vez llega otro, mejor reventar aqui.
     */
    const schemes = spec.components?.securitySchemes || {};
    for (const [name, definition] of Object.entries<Json>(schemes)) {
        const shared = common.components?.securitySchemes?.[name];
        if (shared === undefined) {
            throw new Error(`${file}: el securityScheme "${name}" no esta en common.json.`);
        }
        if (JSON.stringify(shared) !== JSON.stringify(definition)) {
            throw new Error(`${file}: el securityScheme "${name}" ha derivado de common.json.`);
        }
        components.securitySchemes = { ...components.securitySchemes, [name]: definition };
    }

    return { components, rename };
}

function mergePathItems(
    target: Json,
    source: Json,
    file: string,
    kind: string,
    operationIds: Map<string, string>,
): void {
    for (const [route, item] of Object.entries<Json>(source)) {
        if (target[route]) {
            throw new Error(`${kind} duplicado entre ficheros: ${route} (${file})`);
        }
        for (const [method, operation] of Object.entries<Json>(item)) {
            if (!HTTP_METHODS.includes(method)) {
                continue;
            }
            const id = operation?.operationId;
            if (!id) {
                throw new Error(`${file}: ${method.toUpperCase()} ${route} no declara operationId.`);
            }
            const previous = operationIds.get(id);
            if (previous) {
                throw new Error(
                    `operationId duplicado: "${id}" en ${previous} y en ${file} ` +
                        `(${method.toUpperCase()} ${route}). Un generador de codigo solo puede emitir uno.`,
                );
            }
            operationIds.set(id, `${file} (${method.toUpperCase()} ${route})`);
        }
        target[route] = item;
    }
}

/** Une los `*-swagger.json` de una carpeta en un solo documento OpenAPI 3.1. */
export function buildBundle(directory: string): Json {
    const files = fs
        .readdirSync(directory)
        .filter((file) => file.endsWith("-swagger.json"))
        .sort();
    if (!files.length) {
        throw new Error(`No hay ningun *-swagger.json en ${directory}`);
    }
    const common = readJson(path.join(directory, "common.json"));

    const bundle: Json = {
        openapi: "3.1.0",
        info: undefined,
        servers: undefined,
        security: undefined,
        tags: [],
        paths: {},
        webhooks: {},
        components: {},
        "x-planvortex-bundle": {
            description:
                "GENERADO. Los documentos de PlanVortexHome/swagger unidos en uno, que es lo " +
                "que necesita un generador de codigo. No se edita a mano: se edita el spec de " +
                "PlanVortexHome y se ejecuta `npm run generate`.",
            sources: files,
        },
    };

    const operationIds = new Map<string, string>();
    const tagNames = new Set<string>();

    for (const file of files) {
        const raw = readJson(path.join(directory, file));

        if (raw.openapi !== "3.1.0") {
            throw new Error(`${file}: va en OpenAPI ${raw.openapi} y el resto en 3.1.0.`);
        }
        if (!bundle.servers) {
            bundle.servers = raw.servers;
            bundle.security = raw.security;
            bundle.info = {
                title: "PlanVortex API",
                description:
                    "Schedule and publish on social networks, read comments and messages, and " +
                    "manage the files behind them.\n\nThis document is the union of the per-section " +
                    "specifications published at https://planvortex.com/documentation, and it is what " +
                    "the official client libraries generate their types from.\n\n**Classify errors by " +
                    "`code`, never by the HTTP status**: every domain error travels with HTTP 400.",
                termsOfService: raw.info?.termsOfService,
                contact: raw.info?.contact,
                version: raw.info?.version,
            };
        } else if (JSON.stringify(bundle.servers) !== JSON.stringify(raw.servers)) {
            throw new Error(`${file}: apunta a un servidor distinto del resto.`);
        } else if (JSON.stringify(bundle.security) !== JSON.stringify(raw.security)) {
            throw new Error(`${file}: declara un \`security\` global distinto del resto.`);
        } else if (raw.info?.version !== bundle.info.version) {
            throw new Error(
                `${file}: declara la version ${raw.info?.version} y el resto la ${bundle.info.version}.`,
            );
        }

        const { components, rename } = renameComponents(file, raw, common);
        const spec = rewriteRefs({ ...raw, components }, rename);

        mergePathItems(bundle.paths, spec.paths || {}, file, "path", operationIds);
        mergePathItems(bundle.webhooks, spec.webhooks || {}, file, "webhook", operationIds);

        for (const tag of spec.tags || []) {
            if (!tagNames.has(tag.name)) {
                tagNames.add(tag.name);
                bundle.tags.push(tag);
            }
        }

        for (const [section, definitions] of Object.entries<Json>(spec.components || {})) {
            bundle.components[section] = { ...bundle.components[section], ...definitions };
        }
    }

    //Orden estable: lo que vigila la CI es que el diff este vacio, y un diff que se mueve solo no
    //vigila nada.
    bundle.tags.sort((left: Json, right: Json) => left.name.localeCompare(right.name));
    for (const section of Object.keys(bundle.components).sort()) {
        const sorted: Json = {};
        for (const name of Object.keys(bundle.components[section]).sort()) {
            sorted[name] = bundle.components[section][name];
        }
        bundle.components[section] = sorted;
    }

    return bundle;
}

/** El texto exacto con el que se escribe el paquete, para poder compararlo byte a byte. */
export function serializeBundle(bundle: Json): string {
    return `${JSON.stringify(bundle, null, 2)}\n`;
}

export function countOperations(items: Json): number {
    return Object.values<Json>(items).reduce(
        (total, item) => total + Object.keys(item).filter((key) => HTTP_METHODS.includes(key)).length,
        0,
    );
}
