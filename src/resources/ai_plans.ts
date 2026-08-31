/**
 * Planes de publicaciones generados con IA.
 *
 * EL CICLO, que es lo que hay que tener claro antes de nada:
 *
 * ```
 *  create()  ->  pending  ->  generating  ->  generated  ->  validate()  ->  validated
 *                                   |             |
 *                                 failed      (se edita cada draft por pv.publications)
 *                                   |
 *                                 retry()
 * ```
 *
 * Y LO QUE SORPRENDE:
 *
 *  - **`create()` no genera nada**: encola el plan y devuelve el presupuesto. La generación la hace
 *    un job aparte, así que hay que sondear {@link AiPlansResource.get} mientras el estado sea
 *    `pending` o `generating`. Puede tardar minutos.
 *  - **Lo generado son publicaciones NORMALES en estado `draft`.** Se editan y se borran con
 *    `pv.publications`, no con nada de aquí. Validar es lo que las pasa a `ready`.
 *  - **Se paga en créditos de IA y el precio se sabe ANTES.** El presupuesto lo calcula el
 *    servidor, nunca el modelo; si el coste imprescindible no cabe en los créditos disponibles, el
 *    plan se rechaza con el error 941 en vez de generarse a medias.
 *  - **El tamaño del plan lo fijan los días.** Hay como mucho una publicación por día y cuenta, así
 *    que lunes/miércoles/viernes con 3 cuentas son 9 publicaciones, no 21.
 *  - **Estas rutas cuelgan del CLIENTE**, no sólo de la organización: llevan los dos identificadores.
 *  - **Borrar es cancelar.** El plan pasa a `cancelled` y deja de aparecer en el listado, pero
 *    {@link AiPlansResource.get} lo sigue devolviendo. Lo que SÍ desaparece de verdad son sus
 *    publicaciones que aún no habían salido: las drafts y, si el plan ya estaba validado, lo que
 *    quedara programado.
 *  - **Archivar NO es borrar, y es la acción que casi siempre se busca.** {@link
 *    AiPlansResource.archive} saca el plan del listado y no toca una sola publicación —lo
 *    programado sigue publicándose—, vale en cualquier estado y se deshace. Los archivados se leen
 *    con `list(..., { archived: true })`, nunca junto a los activos.
 *
 * LAS PLANTILLAS: DE QUÉ SE GENERA EL PLAN
 *
 * `template` dice de qué sale el contenido, y es lo único que cambia entre un plan y otro: los días
 * de publicación, el idioma, el tono, el `shared` y las imágenes siguen siendo opciones
 * transversales. Es **opcional** — sin ella el plan es `standard`, exactamente lo que hacía cualquier
 * plan antes de que existieran—, y cada plantilla declara qué opciones admite: mandarle una que no
 * admite es un 2106, no un silencio.
 *
 *  - **`standard`** — un prompt de temática y las imágenes las genera el modelo. La de siempre.
 *  - **`from_images`** — las fotos del usuario, cada una con su descripción. Una sola pasada de
 *    visión sobre TODAS a la vez, para que el modelo pueda encadenar una historia (la foto 3 el
 *    "antes", la 7 el "después") en vez de escribir siete publicaciones sueltas.
 *  - **`from_text`** — un artículo: una URL que se descarga al crear el plan, o el texto pegado.
 *  - **`from_catalog`** — los productos de un catálogo conectado, leídos EN VIVO con su nombre, su
 *    precio y su foto.
 *  - **`campaign`** — una cuenta atrás hacia una fecha, con arco narrativo: expectativa, anuncio,
 *    recordatorio, es hoy, cierre.
 *
 * Y lo que sorprende de ellas:
 *
 *  - **La que no genera imágenes no gasta créditos de imagen, y son el 94 % del plan.** La misma
 *    semana de 7 publicaciones con foto cuesta 519 créditos en `standard` y 48 en `from_images`.
 *  - **La fuente se valida al CREAR**, no al generar: el artículo se descarga, el catálogo se lee y
 *    las fotos de los productos se copian ahí mismo. Así una fuente rota falla mientras el usuario
 *    sigue delante (2112-2116), y lo que se guarda es una FOTO — un `retry` tres días después no
 *    depende de que el artículo siga en línea.
 *  - **Un plan es SEMANAL y la fuente no lo alarga.** 12 fotos con 6 huecos publican 6 y el plan
 *    trae el aviso 2117 en `warnings`; los huecos son los días de publicación por las cuentas, así
 *    que se puede decir antes de crearlo.
 *  - **La lista, los costes y los campos se piden**: {@link CatalogResource.plannerTemplates}. No se
 *    escriben a mano — son precios.
 */
import { Resource, requireId } from "./base.js";
import type { RequestOptions, SuccessResponse } from "./base.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages } from "../core/pagination.js";
import type { AiPlan, AiPlanCreateRequest, AiPlanCreateResult, Paginated, Publication } from "../types.js";

/** Qué se regenera de una publicación del plan. `image` exige que el plan permitiera imágenes. */
export type AiPlanRegenerateTarget = "text" | "image";

/** Filtros del listado de planes. */
export interface AiPlanListOptions extends PageOptions {
    /**
     * `true` devuelve los ARCHIVADOS en vez de los activos. Nunca los dos a la vez: archivar es
     * mandar el plan a otro sitio, no ponerle una etiqueta que lo deje donde estaba.
     */
    archived?: boolean | undefined;
}

/** Lo que devuelve regenerar: la publicación nueva y lo que lleva gastado el plan EN TOTAL. */
export interface AiPlanRegenerateResult {
    publication: Publication;
    credits_spent: number;
}

export class AiPlansResource extends Resource {
    /**
     * Encola un plan. **No devuelve publicaciones**: devuelve el plan en `pending` y el
     * presupuesto que se calculó para aceptarlo.
     *
     * Falla ANTES de gastar nada si no hay créditos para el coste imprescindible (941), si no queda
     * cupo de publicaciones (924), si alguna cuenta no publica —WhatsApp, Google Business— (942), o
     * si con los días elegidos no queda ningún hueco futuro en la semana (2108).
     *
     * ```ts
     * const { ai_plan, estimate } = await pv.aiPlans.create(clientId, orgId, {
     *     prompt: "Pan de masa madre, horno de leña, barrio",
     *     accounts: [accountId],
     *     options: { publish_days: [1, 3, 5], timezone: "Europe/Madrid" },
     * });
     * ```
     *
     * Con plantilla van además `template` y su `source`, que **se valida aquí**: la URL se descarga
     * y el catálogo se lee dentro de esta llamada, así que sus errores llegan mientras el usuario
     * sigue delante — 2111 (plantilla que no existe), 2112 (fuente que no cuadra con la plantilla),
     * 2113 (la URL no se pudo leer), 2114 (la URL apunta a una dirección no pública), 2115 (la
     * cuenta no tiene un catálogo utilizable) y 2116 (la fuente se quedó sin unidades).
     *
     * ```ts
     * await pv.aiPlans.create(clientId, orgId, {
     *     prompt: "Nuestra carta de otoño",
     *     accounts: [accountId],
     *     template: "from_images",
     *     source: {
     *         images: [
     *             { id_upload: primera, description: "Masa reposando en el banco" },
     *             { id_upload: segunda, description: "La hogaza saliendo del horno" },
     *         ],
     *     },
     * });
     * ```
     *
     * **El orden de `images` y de `products` es la historia**: el orquestador se queda con la
     * posición de cada uno, así que la foto 3 puede ser el "antes" y la 7 el "después".
     */
    async create(
        idClient: string,
        idOrganization: string,
        body: AiPlanCreateRequest,
        options: RequestOptions = {},
    ): Promise<AiPlanCreateResult> {
        return this.httpPost<AiPlanCreateResult>(this.path(idClient, idOrganization), body, options);
    }

    /**
     * Un plan, con sus publicaciones **ya resueltas** y con los ficheros de cada una.
     *
     * Es el endpoint que se sondea mientras `state` sea `pending` o `generating`. No hay webhook de
     * esto todavía.
     */
    async get(
        idClient: string,
        idOrganization: string,
        idAiPlan: string,
        options: RequestOptions = {},
    ): Promise<AiPlan> {
        return this.getOne<AiPlan>(
            this.one(idClient, idOrganization, idAiPlan),
            "ai_plan",
            undefined,
            options,
        );
    }

    /**
     * Los planes ACTIVOS de la organización, del más reciente al más antiguo.
     *
     * **Los cancelados no salen** —ni los archivados, que se piden con `archived: true`— y aquí
     * `publications` son identificadores, no las publicaciones enteras: para eso está {@link get}.
     * Sin `limit` vuelven todos.
     *
     * ```ts
     * const activos = await pv.aiPlans.list(clientId, orgId);
     * const guardados = await pv.aiPlans.list(clientId, orgId, { archived: true });
     * ```
     */
    async list(
        idClient: string,
        idOrganization: string,
        options: AiPlanListOptions & RequestOptions = {},
    ): Promise<Paginated<AiPlan>> {
        return this.getList<AiPlan>(
            this.path(idClient, idOrganization),
            "ai_plans",
            {
                offset: options.offset,
                limit: options.limit,
                //El servidor sólo entiende el literal "true"; un `false` explícito pediría lo
                //mismo que no mandar nada, así que se omite en vez de viajar como ruido
                archived: options.archived ? true : undefined,
            },
            options,
        );
    }

    /** Los planes de la organización, encadenando páginas. */
    iterate(
        idClient: string,
        idOrganization: string,
        options: AiPlanListOptions & RequestOptions = {},
    ): AsyncGenerator<AiPlan> {
        return iteratePages<AiPlan>(
            (page) => this.list(idClient, idOrganization, { ...options, ...page }),
            options,
        );
    }

    /**
     * Acepta el plan: las drafts generadas SIN errores pasan a `ready` y a partir de ahí las publica
     * el robot como cualquier publicación programada.
     *
     * **Sólo desde `generated`** (error 2102 en cualquier otro estado). Las drafts que sí tienen
     * errores se quedan en `draft`: se arreglan o se borran con `pv.publications`.
     */
    async validate(
        idClient: string,
        idOrganization: string,
        idAiPlan: string,
        options: RequestOptions = {},
    ): Promise<AiPlan> {
        return this.postOne<AiPlan>(
            `${this.one(idClient, idOrganization, idAiPlan)}/validate`,
            "ai_plan",
            undefined,
            options,
        );
    }

    /**
     * Vuelve a encolar un plan `failed` con los mismos datos. El estado regresa a `pending` y hay
     * que volver a sondear.
     *
     * Usa el contexto de marca copiado al crear el plan, no el actual: el plan es reproducible
     * aunque alguien haya editado la configuración entretanto.
     */
    async retry(
        idClient: string,
        idOrganization: string,
        idAiPlan: string,
        options: RequestOptions = {},
    ): Promise<AiPlan> {
        return this.postOne<AiPlan>(
            `${this.one(idClient, idOrganization, idAiPlan)}/retry`,
            "ai_plan",
            undefined,
            options,
        );
    }

    /**
     * Regenera con IA el texto o la imagen de UNA publicación del plan. **Cuesta créditos** cada vez.
     *
     * `credits_spent` de la respuesta es el total del plan, no lo que costó esta llamada.
     *
     * **`"image"` depende de la plantilla del plan**, no sólo de que el plan permitiera imágenes:
     * la que no generó la imagen tampoco la regenera. Míralo en `regenerate.image` de
     * {@link CatalogResource.plannerTemplates} antes de ofrecer el botón — en `from_images` y en
     * `from_catalog` sería cobrarle 70 créditos al usuario por sustituir su propia foto por una
     * inventada.
     */
    async regenerate(
        idClient: string,
        idOrganization: string,
        idAiPlan: string,
        idPublication: string,
        target: AiPlanRegenerateTarget,
        options: RequestOptions = {},
    ): Promise<AiPlanRegenerateResult> {
        return this.httpPost<AiPlanRegenerateResult>(
            `${this.one(idClient, idOrganization, idAiPlan)}/publications/${requireId(idPublication, "idPublication")}/regenerate`,
            { target },
            options,
        );
    }

    /**
     * Archiva el plan: sale del listado y pasa al de archivados (`list(..., { archived: true })`).
     *
     * Es **sólo visibilidad**. No toca ninguna publicación —lo que estuviera programado sigue
     * publicándose—, no devuelve créditos y no cancela nada, así que vale en CUALQUIER estado,
     * `generating` incluido: no interrumpe al job. Se deshace con {@link unarchive}.
     *
     * Es lo que se busca casi siempre que uno piensa en "quitar" un plan: {@link remove} se lleva
     * por delante las publicaciones que aún no han salido, y esto no.
     */
    async archive(
        idClient: string,
        idOrganization: string,
        idAiPlan: string,
        options: RequestOptions = {},
    ): Promise<AiPlan> {
        return this.postOne<AiPlan>(
            `${this.one(idClient, idOrganization, idAiPlan)}/archive`,
            "ai_plan",
            undefined,
            options,
        );
    }

    /** Devuelve el plan al listado activo. Sobre un plan que no estaba archivado no hace nada. */
    async unarchive(
        idClient: string,
        idOrganization: string,
        idAiPlan: string,
        options: RequestOptions = {},
    ): Promise<AiPlan> {
        return this.postOne<AiPlan>(
            `${this.one(idClient, idOrganization, idAiPlan)}/unarchive`,
            "ai_plan",
            undefined,
            options,
        );
    }

    /**
     * Borra el plan **y sus publicaciones que aún no han salido**: las drafts generadas y, si ya se
     * había validado, las que quedaran programadas. Las ya publicadas se quedan —borrarlas aquí no
     * las quitaría de la red, sólo perdería su historial— y la que se está publicando en ese
     * instante tampoco se toca.
     *
     * El plan en sí no se borra del todo: pasa a `cancelled`, desaparece de {@link list} y
     * {@link get} lo sigue devolviendo. Los créditos gastados no se devuelven y un plan
     * `generating` no se puede borrar (2102): hay que esperar a que el job termine.
     *
     * Si lo que se quiere es dejar de verlo sin perder nada, {@link archive}.
     */
    async remove(
        idClient: string,
        idOrganization: string,
        idAiPlan: string,
        options: RequestOptions = {},
    ): Promise<void> {
        await this.httpDelete<SuccessResponse>(
            this.one(idClient, idOrganization, idAiPlan),
            undefined,
            options,
        );
    }

    private path(idClient: string, idOrganization: string): string {
        return `/clients/${requireId(idClient, "idClient")}/organizations/${requireId(idOrganization, "idOrganization")}/ai_plans`;
    }

    private one(idClient: string, idOrganization: string, idAiPlan: string): string {
        return `${this.path(idClient, idOrganization)}/${requireId(idAiPlan, "idAiPlan")}`;
    }
}
