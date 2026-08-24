/**
 * Catálogos de producto de Meta Commerce.
 *
 * LO QUE HAY QUE SABER ANTES DE LLAMAR A NADA DE AQUÍ:
 *
 *  - **Sólo Facebook e Instagram.** Son las dos únicas redes con `products: true` en
 *    `pv.catalog.socialCapabilities()`; WhatsApp no lo tiene, a pesar de tener su propio catálogo.
 *  - **Esto habla Meta**, con los nombres de campo de Meta. No hay un vocabulario común como en
 *    estadísticas: lo que se manda y lo que vuelve es lo que documenta la Graph API.
 *  - **`total` no sirve para paginar.** En productos llega siempre a `0` (sale de un `summary` que
 *    no se pide) y en catálogos es la longitud de la página. Se pagina hasta ver una página corta.
 *  - **Un producto suelto no se puede pedir por `product_id`**: ese filtro no llega a la red
 *    (§ {@link ProductsResource.list}). Se pide el catálogo y se busca dentro.
 *  - **La cuenta tiene que ser una página con negocio detrás**: el catálogo cuelga del
 *    `business_id`, no del perfil.
 */
import { Resource, requireId } from "./base.js";
import type { RequestOptions } from "./base.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages } from "../core/pagination.js";
import type { Paginated, Product, ProductCatalog, ProductCatalogInput, ProductInput } from "../types.js";

export class ProductsResource extends Resource {
    /**
     * Los productos de un catálogo.
     *
     * `idCatalog` es obligatorio de hecho aunque la API lo pinte opcional: sin él la petición falla
     * con el error 2000. Hay un `product_id` documentado para pedir uno suelto que **no funciona** —
     * el servidor lo reenvía con un nombre que el SDK no lee—, así que no se expone aquí.
     *
     * ```ts
     * const { data } = await pv.products.list(orgId, accountId, catalogId, { limit: 50 });
     * ```
     */
    async list(
        idOrganization: string,
        idAccount: string,
        idCatalog: string,
        options: PageOptions & RequestOptions = {},
    ): Promise<Paginated<Product>> {
        return this.getList<Product>(
            `${this.path(idOrganization, idAccount)}/products`,
            "items",
            {
                product_catalog_id: requireId(idCatalog, "idCatalog"),
                offset: options.offset,
                limit: options.limit,
            },
            options,
        );
    }

    /**
     * Los productos de un catálogo, encadenando páginas.
     *
     * Corta cuando llega una página más corta que el `limit`, no cuando llega a `total`: en esta
     * lista `total` vale `0` siempre.
     */
    iterate(
        idOrganization: string,
        idAccount: string,
        idCatalog: string,
        options: PageOptions & RequestOptions = {},
    ): AsyncGenerator<Product> {
        return iteratePages<Product>(
            (page) => this.list(idOrganization, idAccount, idCatalog, { ...options, ...page }),
            options,
        );
    }

    /**
     * Da de alta un producto en un catálogo, o **actualiza uno existente** si el cuerpo trae `id`.
     * Devuelve el identificador en la red, no el producto.
     */
    async create(
        idOrganization: string,
        idAccount: string,
        idCatalog: string,
        product: ProductInput,
        options: RequestOptions = {},
    ): Promise<string> {
        const response = await this.httpPost<{ product_id: string }>(
            `${this.path(idOrganization, idAccount)}/products`,
            product,
            options,
            { product_catalog_id: requireId(idCatalog, "idCatalog") },
        );
        return response.product_id;
    }

    /**
     * Los catálogos de la cuenta. Es de donde sale el `idCatalog` de todo lo demás.
     *
     * `total` es la longitud de la página, así que nunca dice que haya otra.
     */
    async catalogs(
        idOrganization: string,
        idAccount: string,
        options: PageOptions & RequestOptions = {},
    ): Promise<Paginated<ProductCatalog>> {
        return this.getList<ProductCatalog>(
            `${this.path(idOrganization, idAccount)}/products_catalogs`,
            "items",
            { offset: options.offset, limit: options.limit },
            options,
        );
    }

    /**
     * Crea un catálogo y devuelve **su identificador**, no el catálogo.
     *
     * El campo de la respuesta se llama `product_catalog` y lleva una cadena; para ver el resto hay
     * que volver a pedir {@link catalogs}.
     */
    async createCatalog(
        idOrganization: string,
        idAccount: string,
        catalog: ProductCatalogInput,
        options: RequestOptions = {},
    ): Promise<string> {
        const response = await this.httpPost<{ product_catalog: string }>(
            `${this.path(idOrganization, idAccount)}/products_catalogs`,
            catalog,
            options,
        );
        return response.product_catalog;
    }

    private path(idOrganization: string, idAccount: string): string {
        return `/organizations/${requireId(idOrganization, "idOrganization")}/accounts/${requireId(idAccount, "idAccount")}`;
    }
}
