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
 *  - **Un producto suelto se pide con {@link ProductsResource.get}, no con `list()`.** Pedir uno
 *    por su identificador va al nodo de ESE producto en Meta, así que la red contesta con el
 *    producto y no con una lista: `items` trae un objeto, y con un objeto no se puede construir
 *    una página.
 *  - **La cuenta tiene que ser una página con negocio detrás**: el catálogo cuelga del
 *    `business_id`, no del perfil.
 */
import { Resource, requireId } from "./base.js";
import type { RequestOptions } from "./base.js";
import { NO_ERROR_CODE, PlanVortexError } from "../core/errors.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages, unwrapOne } from "../core/pagination.js";
import type { Paginated, Product, ProductCatalog, ProductCatalogInput, ProductInput } from "../types.js";

export class ProductsResource extends Resource {
    /**
     * Los productos de un catálogo.
     *
     * `idCatalog` es obligatorio de hecho aunque la API lo pinte opcional: sin él la petición falla
     * con el error 2000. Para pedir **un** producto por su identificador, {@link get} — no es un
     * argumento de aquí porque la respuesta viene con otra forma.
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
     * UN producto, por su identificador **en la red** (el de Meta, no un `_id` de PlanVortex).
     *
     * El servidor reenviaba ese filtro con un nombre que el SDK no lee, así que nunca llegaba a la
     * red y la llamada moría con un 2000; se arregló el 2026-08-24 y aquí se expone desde la 0.3.0.
     *
     * **La respuesta viene con otra forma que la del listado.** Pedir un producto suelto va al nodo
     * de ese producto, así que la red contesta con el producto y `items` trae un objeto. Por eso
     * esto es un método aparte y no un argumento de {@link list}: con un objeto no se construye una
     * página. Se acepta también una lista, que es lo que devolvería un despliegue que envolviera la
     * respuesta, y coger el primero es mejor que reventar por la forma del sobre.
     *
     * ```ts
     * const product = await pv.products.get(orgId, accountId, "7123456789012345");
     * ```
     */
    async get(
        idOrganization: string,
        idAccount: string,
        productId: string,
        options: RequestOptions = {},
    ): Promise<Product> {
        const body = await this.httpGet<unknown>(
            `${this.path(idOrganization, idAccount)}/products`,
            { product_id: requireId(productId, "productId") },
            options,
        );
        const content = unwrapOne<Product | Product[]>(body, "items");

        if (Array.isArray(content)) {
            if (!content.length) {
                throw new PlanVortexError(NO_ERROR_CODE, `La red no devuelve ningún producto "${productId}".`, {
                    family: "http",
                    data: { product_id: productId },
                });
            }
            return content[0] as Product;
        }
        return content;
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
