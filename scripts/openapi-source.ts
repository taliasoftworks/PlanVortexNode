/**
 * De donde sale `openapi/planvortex.openapi.json`.
 *
 * ANTES esto era `openapi-bundle.ts`, ~200 lineas que unian los `swagger/*-swagger.json` de
 * PlanVortexHome en un solo documento. Ya no: unir vive donde vive el spec
 * (`PlanVortexHome/scripts/bundle-openapi.js` -> `public/openapi.json`), y se sirve ademas en
 * https://planvortex.com/openapi.json. El motivo es la segunda libreria: con el unificador dentro
 * de este paquete, la de Python habria tenido que llevar su propia copia del mismo codigo, y dos
 * copias divergen en silencio — cada paquete tipando una forma distinta del mismo recurso.
 *
 * Aqui solo queda RESOLVER de donde se lee y traerlo. El fichero se sigue commiteando en este
 * repositorio, y eso no cambia: la CI solo clona este repo, asi que sin la copia el
 * `git diff --exit-code` que vigila los tipos no vigilaria nada.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
export const BUNDLE_FILE = path.join(ROOT, "openapi", "planvortex.openapi.json");
export const TYPES_FILE = path.join(ROOT, "src", "generated", "openapi.d.ts");

/** Los repos viven uno al lado del otro. `PLANVORTEX_OPENAPI` acepta una ruta o una URL. */
export const DEFAULT_OPENAPI = path.resolve(ROOT, "../../PlanVortexHome/public/openapi.json");

/** Lo mismo, publicado. Sirve para regenerar sin tener PlanVortexHome clonado al lado. */
export const PUBLISHED_OPENAPI = "https://planvortex.com/openapi.json";

export function openapiSource(): string {
    return process.env.PLANVORTEX_OPENAPI || DEFAULT_OPENAPI;
}

export function isRemote(source: string): boolean {
    return /^https?:\/\//i.test(source);
}

/**
 * El documento tal cual lo publica PlanVortexHome, en TEXTO.
 *
 * Se devuelve sin parsear a proposito: lo que se commitea aqui tiene que ser byte a byte lo que
 * hay alli, y un `JSON.parse` + `JSON.stringify` por el medio es justo la forma de que dejen de
 * serlo sin que nadie lo note. `null` significa "no esta disponible", no "esta vacio".
 */
export async function readUpstreamBundle(source: string): Promise<string | null> {
    if (!isRemote(source)) {
        return fs.existsSync(source) ? fs.readFileSync(source, "utf8") : null;
    }
    const response = await fetch(source);
    if (!response.ok) {
        throw new Error(`${source} respondio ${response.status} ${response.statusText}`);
    }
    return response.text();
}

/* eslint-disable @typescript-eslint/no-explicit-any -- se manipula un documento JSON arbitrario */
export type Json = any;

export function readJson(file: string): Json {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

export const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

export function countOperations(items: Json): number {
    return Object.values<Json>(items ?? {}).reduce(
        (total, item) => total + Object.keys(item).filter((key) => HTTP_METHODS.includes(key)).length,
        0,
    );
}
