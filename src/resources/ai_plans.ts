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
 *    {@link AiPlansResource.get} lo sigue devolviendo.
 */
import { Resource, requireId } from "./base.js";
import type { RequestOptions, SuccessResponse } from "./base.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages } from "../core/pagination.js";
import type { AiPlan, AiPlanCreateRequest, AiPlanCreateResult, Paginated, Publication } from "../types.js";

/** Qué se regenera de una publicación del plan. `image` exige que el plan permitiera imágenes. */
export type AiPlanRegenerateTarget = "text" | "image";

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
     * Los planes de la organización, del más reciente al más antiguo.
     *
     * **Los cancelados no salen**, y aquí `publications` son identificadores, no las publicaciones
     * enteras: para eso está {@link get}. Sin `limit` vuelven todos.
     */
    async list(
        idClient: string,
        idOrganization: string,
        options: PageOptions & RequestOptions = {},
    ): Promise<Paginated<AiPlan>> {
        return this.getList<AiPlan>(
            this.path(idClient, idOrganization),
            "ai_plans",
            { offset: options.offset, limit: options.limit },
            options,
        );
    }

    /** Los planes de la organización, encadenando páginas. */
    iterate(
        idClient: string,
        idOrganization: string,
        options: PageOptions & RequestOptions = {},
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
     * Cancela el plan. **No lo borra**: pasa a `cancelled`, desaparece de {@link list} y
     * {@link get} lo sigue devolviendo.
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
