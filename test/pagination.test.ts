/**
 * Capa 1: la paginación, sin red.
 *
 * Lo que se comprueba aquí no es "que pagine", es lo que pasa cuando el servidor NO se porta como
 * uno espera — que es cuando un iterador mal escrito se lleva por delante el proceso del
 * integrador.
 */
import { describe, expect, it } from "vitest";

import { MAX_PAGES, iteratePages, unwrapList, unwrapOne } from "../src/core/pagination.js";
import { PlanVortexError } from "../src/core/errors.js";

describe("unwrapList", () => {
    it("saca la página y el total del sobre", () => {
        expect(unwrapList({ publications: [1, 2], total: 9 }, "publications")).toEqual({
            data: [1, 2],
            total: 9,
        });
    });

    /**
     * El sobre equivocado es el fallo silencioso que este proyecto ya se comió una vez: el spec
     * decía `{uploads, total}` donde el servidor manda `{publications, total}`. Devolver
     * `{data: undefined}` habría hecho que el error apareciera tres capas más arriba.
     */
    it("avisa cuando el sobre no trae la clave, en vez de devolver undefined", () => {
        expect(() => unwrapList({ uploads: [], total: 0 }, "publications")).toThrow(PlanVortexError);
        expect(() => unwrapList(undefined, "publications")).toThrow(/publications/);
    });

    /** Un despliegue viejo sin `total` da una lista usable, no un `NaN` colándose como número. */
    it("cae a la longitud de la página si no viene `total`", () => {
        expect(unwrapList({ accounts: [1, 2, 3] }, "accounts")).toEqual({ data: [1, 2, 3], total: 3 });
    });

    it("acepta una página vacía como respuesta válida", () => {
        expect(unwrapList({ comments: [], total: 0 }, "comments")).toEqual({ data: [], total: 0 });
    });
});

describe("unwrapOne", () => {
    it("saca el recurso del sobre", () => {
        expect(unwrapOne({ publication: { _id: "1" } }, "publication")).toEqual({ _id: "1" });
    });

    it("avisa cuando falta, incluso si el valor es null", () => {
        expect(() => unwrapOne({ publication: null }, "publication")).toThrow(/publication/);
    });
});

describe("iteratePages", () => {
    function pages(sizes: number[], limit: number) {
        const requested: { limit: number; offset: number }[] = [];
        let call = 0;
        const fetchPage = async (page: { limit: number; offset: number }) => {
            requested.push(page);
            const size = sizes[call++] ?? 0;
            return { data: Array.from({ length: size }, (_, index) => `${page.offset + index}`), total: 999 };
        };
        return { requested, fetchPage, limit };
    }

    it("encadena páginas y para cuando una viene más corta que el límite", async () => {
        const { requested, fetchPage } = pages([3, 3, 1], 3);
        const seen = [];
        for await (const item of iteratePages(fetchPage, { limit: 3 })) {
            seen.push(item);
        }

        expect(seen).toHaveLength(7);
        expect(requested.map((page) => page.offset)).toEqual([0, 3, 6]);
    });

    it("para en seco con una página vacía", async () => {
        const { requested, fetchPage } = pages([0], 5);
        const seen = [];
        for await (const item of iteratePages(fetchPage, { limit: 5 })) {
            seen.push(item);
        }

        expect(seen).toEqual([]);
        expect(requested).toHaveLength(1);
    });

    /**
     * `total` se cuenta con una consulta aparte, así que en una colección que se mueve no cuadra
     * con las páginas. Si el iterador se fiase de él, aquí se quedaría corto: manda la página.
     */
    it("no se fía de `total`: manda lo que devuelven las páginas", async () => {
        const fetchPage = async () => ({ data: ["a"], total: 0 });
        const seen = [];
        for await (const item of iteratePages(fetchPage, { limit: 1 })) {
            seen.push(item);
            if (seen.length === 3) break;
        }

        expect(seen).toEqual(["a", "a", "a"]);
    });

    /**
     * El seguro: un servidor que ignore el `offset` devuelve la misma página para siempre. Sin
     * tope, un `for await` así se come el proceso de quien nos llama.
     */
    it("revienta antes de girar para siempre si el servidor no avanza", async () => {
        let calls = 0;
        const fetchPage = async () => {
            calls++;
            return { data: ["a", "b"], total: 999 };
        };

        await expect(async () => {
            for await (const _item of iteratePages(fetchPage, { limit: 2 })) {
                void _item;
            }
        }).rejects.toThrow(/offset/);
        expect(calls).toBe(MAX_PAGES);
    });

    it("arranca desde el offset que se le dé", async () => {
        const { requested, fetchPage } = pages([2, 0], 2);
        for await (const _item of iteratePages(fetchPage, { limit: 2, offset: 10 })) {
            void _item;
        }

        expect(requested.map((page) => page.offset)).toEqual([10, 12]);
    });
});
