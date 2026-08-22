/**
 * Paginación: `list()` devuelve una página y `iterate()` las encadena solo.
 *
 * POR QUÉ ES UN FICHERO Y NO TRES LÍNEAS EN CADA RECURSO: la API pagina con `offset`/`limit` y
 * envuelve cada lista con el nombre de su recurso —`{publications, total}`, `{accounts, total}`,
 * `{uploads, total}`— (§ trampa 6 del roadmap). El sobre es un detalle del transporte, así que se
 * desenvuelve aquí una vez y todos los dominios devuelven la misma `{data, total}`.
 *
 * DOS COSAS QUE HAY QUE SABER DEL `iterate()`:
 *
 *  1. **Corta cuando una página viene vacía**, no cuando ha leído `total`. `total` se cuenta con un
 *     `countDocuments` aparte de la consulta, así que en una colección que se está moviendo puede
 *     no cuadrar con lo que devuelven las páginas; fiarse de él daría o un bucle infinito o una
 *     página perdida. También corta si el servidor devolviera una página más corta que el `limit`,
 *     que es la señal de que ya no hay más.
 *  2. **Tiene tope de páginas.** Un servidor que ignorase el `offset` devolvería la misma página
 *     para siempre, y un `for await` sin tope se lleva por delante el proceso del integrador.
 *     `MAX_PAGES` es un seguro, no un límite de uso: a 100 elementos por página son un millón.
 */
import { NO_ERROR_CODE, PlanVortexError } from "./errors.js";
import type { Paginated } from "../types.js";

/** Lo que admite cualquier `list()` del paquete, además de los filtros propios de su dominio. */
export interface PageOptions {
    /** Cuántos elementos pedir. Sin él manda el servidor, que no siempre pagina igual. */
    limit?: number | undefined;
    /** Cuántos saltar. `0` es la primera página. */
    offset?: number | undefined;
}

/** Elementos por página cuando `iterate()` no recibe `limit`. */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * El seguro contra un bucle infinito. No es un límite de cuánto se puede leer: es lo que hace que
 * un servidor que ignore el `offset` falle en vez de colgar el proceso.
 */
export const MAX_PAGES = 10_000;

/**
 * La página concreta que {@link iteratePages} pide. Se declara aparte y no como
 * `Required<PageOptions>`: con `exactOptionalPropertyTypes`, `Required` quita el `?` pero deja el
 * `| undefined`, y entonces el tipo dice que el iterador puede pedir una página sin `limit`.
 */
export interface Page {
    limit: number;
    offset: number;
}

/** Una función que devuelve una página. Es lo que cada recurso le pasa a {@link iteratePages}. */
export type PageFetcher<T> = (page: Page) => Promise<Paginated<T>>;

/**
 * Saca `{data, total}` del sobre con el que la API envuelve una lista.
 *
 * `key` es el nombre EXACTO del campo que trae el array (`publications`, `accounts`, ...). Si no
 * está, es que el sobre cambió o que se pasó el nombre equivocado, y eso se dice en voz alta: sin
 * esta comprobación el método devolvería `{data: undefined}` y el fallo aparecería tres capas más
 * arriba. Es literalmente lo que le pasó al spec de publicaciones, que anunciaba `{uploads, total}`.
 */
export function unwrapList<T>(body: unknown, key: string): Paginated<T> {
    const envelope = body as Record<string, unknown> | undefined;
    const data = envelope?.[key];

    if (!Array.isArray(data)) {
        throw new PlanVortexError(
            NO_ERROR_CODE,
            `La respuesta no trae "${key}": el sobre de la lista no es el esperado.`,
            {
                family: "http",
                data: { expected: key, received: envelope ? Object.keys(envelope) : envelope },
            },
        );
    }

    const total = envelope?.total;
    return {
        data: data as T[],
        //`total` viaja siempre, pero si un despliegue viejo no lo mandara, la longitud de la
        //página es mejor respuesta que un `undefined` colándose como número.
        total: typeof total === "number" ? total : data.length,
    };
}

/** Saca un recurso suelto del sobre con el que la API lo envuelve (`{publication}`, `{account}`). */
export function unwrapOne<T>(body: unknown, key: string): T {
    const envelope = body as Record<string, unknown> | undefined;
    const value = envelope?.[key];

    if (value === undefined || value === null) {
        throw new PlanVortexError(NO_ERROR_CODE, `La respuesta no trae "${key}".`, {
            family: "http",
            data: { expected: key, received: envelope ? Object.keys(envelope) : envelope },
        });
    }
    return value as T;
}

/**
 * Encadena páginas hasta que se acaben, entregando los elementos de uno en uno.
 *
 * Se corta con un `break` en el `for await` como cualquier iterador: la página que se estuviera
 * pidiendo se descarta y no se pide ninguna más.
 */
export async function* iteratePages<T>(
    fetchPage: PageFetcher<T>,
    options: PageOptions = {},
): AsyncGenerator<T> {
    const limit = options.limit ?? DEFAULT_PAGE_SIZE;
    let offset = options.offset ?? 0;

    for (let page = 0; page < MAX_PAGES; page++) {
        const { data } = await fetchPage({ limit, offset });
        if (!data.length) {
            return;
        }
        for (const item of data) {
            yield item;
        }
        //Una página más corta que el límite es la última: pedir la siguiente sería una llamada
        //que se sabe vacía.
        if (data.length < limit) {
            return;
        }
        offset += data.length;
    }

    throw new PlanVortexError(
        NO_ERROR_CODE,
        `La paginación pasó de ${MAX_PAGES} páginas: el servidor no está avanzando con el offset.`,
        { family: "http" },
    );
}
