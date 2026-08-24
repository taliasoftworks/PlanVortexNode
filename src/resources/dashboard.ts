/**
 * El dashboard: los números de una organización, agregados y comparados con el periodo anterior.
 *
 * LO QUE HAY QUE SABER ANTES DE LLAMAR A NADA DE AQUÍ:
 *
 *  - **Todo cubre la organización Y SUS HIJAS.** No hay forma de pedir sólo la de arriba.
 *  - **Todo trae el periodo anterior**, de la misma longitud exacta, para el delta. No es "el mes
 *    pasado": comparar 30 días contra un mes natural movería el porcentaje con el calendario.
 *  - **El rango por defecto son 30 días y el máximo son 366** (error 1003 al pasarse).
 *  - **Una métrica ausente no es un cero.** Falta cuando la red no la publica; un `0` es una
 *    medición que salió cero. Pintar `0` donde falta es la forma más rápida de mentir en un gráfico.
 *  - **{@link DashboardResource.summary} es UNA llamada para toda la pantalla de inicio**, y sus
 *    bloques se omiten uno a uno según los permisos de quien llama en vez de devolver un 403.
 *    `available_blocks` dice cuáles se pudieron leer.
 *  - **`followers` no se suma, se toma el último valor.** Es una foto acumulada, no un incremento;
 *    el servidor ya lo agrega así, pero conviene saberlo antes de sumar dos filas a mano.
 */
import { Resource, requireId } from "./base.js";
import type { Query, RequestOptions } from "./base.js";
import type {
    Dashboard,
    DashboardMetricsResult,
    MetricName,
    PlanUse,
    PublicationsStatsResult,
    PublicationsSummaryResult,
    SocialNetwork,
    TopPublicationsResult,
} from "../types.js";

/** El rango de cualquier consulta del dashboard. Sin fechas, los últimos 30 días. */
export interface RangeOptions {
    from_date?: Date | string | undefined;
    to_date?: Date | string | undefined;
}

/** El eje sobre el que se agregan las métricas de cuenta. */
export type MetricsGroupBy = "day" | "network" | "account" | "total";

export interface MetricsOptions extends RangeOptions {
    /** Por defecto `day`. Cualquier otro valor devuelve el error 1000. */
    group_by?: MetricsGroupBy | undefined;
    /** Sólo estas métricas del vocabulario común. Sin esto, todas. */
    names?: readonly MetricName[] | undefined;
}

export interface TopPublicationsOptions extends RangeOptions {
    /** La métrica por la que se ordena. Por defecto `engagement`. */
    metric?: MetricName | undefined;
    /** Cuántas devolver. Por defecto 5. */
    limit?: number | undefined;
}

export interface PublicationsStatsOptions extends RangeOptions {
    /** La métrica por la que se ordena, descendente. Por defecto `engagement`. */
    metric?: MetricName | undefined;
    /** Sólo estas redes. **Filtra el listado, no los agregados.** */
    social_network?: readonly SocialNetwork[] | undefined;
    /** Sólo estas cuentas. **Filtra el listado, no los agregados.** */
    accounts?: readonly string[] | undefined;
    /**
     * Apaga los agregados. Sólo dependen del rango, así que recalcularlos en cada página es tirar
     * tres agregaciones a la basura: se piden una vez y se pagina con `summary: false`.
     */
    summary?: boolean | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}

export class DashboardResource extends Resource {
    /**
     * La pantalla de inicio entera en UN viaje: salud operativa, publicaciones, métricas de
     * publicación y de cuenta, consumo del plan, planes de IA y mensajes sin leer.
     *
     * **Un bloque que falta no es un error.** Cada uno se comprueba contra su propio permiso y se
     * omite si quien llama no puede leerlo, en vez de tumbar la petición entera; `available_blocks`
     * dice cuáles se permitieron. Un bloque en `true` que no viene en el cuerpo significa que no
     * había datos — salvo `messages`, que también se apaga cuando el plan no incluye chat.
     */
    async summary(idOrganization: string, options: RangeOptions & RequestOptions = {}): Promise<Dashboard> {
        return this.httpGet<Dashboard>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/dashboard`,
            rangeQuery(options),
            options,
        );
    }

    /**
     * Las métricas de CUENTA agregadas: seguidores, impresiones, alcance, visitas al perfil.
     *
     * `group_by` decide el eje —`day` para una serie, `network` o `account` para un desglose,
     * `total` para un solo número— y en `total` cada fila trae `group: null`. Los nombres son los
     * del vocabulario común, no los crudos de cada red.
     */
    async metrics(
        idOrganization: string,
        options: MetricsOptions & RequestOptions = {},
    ): Promise<DashboardMetricsResult> {
        return this.httpGet<DashboardMetricsResult>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/metrics`,
            { ...rangeQuery(options), group_by: options.group_by, names: options.names },
            options,
        );
    }

    /**
     * Conteos de publicaciones del rango: por estado, por red y por día.
     *
     * Ojo con las dos series, que responden a preguntas distintas y sobre conjuntos distintos:
     * `by_day` cuenta lo CREADO cada día (trabajo hecho, incluidas las programadas y los
     * borradores) y `published_by_day` cuenta lo que SALIÓ cada día, sólo `sended`. Una publicación
     * creada el mes pasado y publicada ayer sale en la segunda y no en la primera.
     *
     * El día se calcula en UTC: un post de madrugada puede caer en el día anterior.
     */
    async publications(
        idOrganization: string,
        options: RangeOptions & RequestOptions = {},
    ): Promise<PublicationsSummaryResult> {
        return this.httpGet<PublicationsSummaryResult>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/publications/summary`,
            rangeQuery(options),
            options,
        );
    }

    /**
     * El ranking de publicaciones del rango por una métrica.
     *
     * **Sólo entra lo que ya se ha medido**: una publicación que la red aún no ha reportado, o de
     * una red que no publica esa métrica, no compite — no es que haya sacado un 0. Para verlas todas
     * con su hueco, {@link publicationStats}.
     *
     * Cuidado con la forma: una fila no es una `Publication`. No tiene `_id` —el identificador es
     * `id_publication`— y el contenido viaja anidado en `publication`.
     */
    async topPublications(
        idOrganization: string,
        options: TopPublicationsOptions & RequestOptions = {},
    ): Promise<TopPublicationsResult> {
        return this.httpGet<TopPublicationsResult>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/publications/top`,
            { ...rangeQuery(options), metric: options.metric, limit: options.limit },
            options,
        );
    }

    /**
     * El listado de publicaciones del rango CON sus métricas, paginado y ordenado por la métrica
     * pedida. Es la pantalla de estadísticas entera en una llamada.
     *
     * Dos cosas que se pagan caras si se ignoran:
     *
     *  - **`summary` cubre siempre la organización entera**; `social_network` y `accounts` filtran
     *    sólo el listado. La cabecera no cambia al filtrar por Instagram, y eso es deliberado.
     *  - **Al paginar, `summary: false`.** Los agregados sólo dependen del rango, así que
     *    recalcularlos en cada página son tres agregaciones tiradas.
     *
     * A diferencia de {@link topPublications}, aquí SÍ salen las publicaciones sin medir, con
     * `metrics` ausente. Ordenando en descendente caen al final solas.
     */
    async publicationStats(
        idOrganization: string,
        options: PublicationsStatsOptions & RequestOptions = {},
    ): Promise<PublicationsStatsResult> {
        return this.httpGet<PublicationsStatsResult>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/publications/stats`,
            {
                ...rangeQuery(options),
                metric: options.metric,
                social_network: options.social_network,
                accounts: options.accounts,
                //El servidor lo lee como el literal "false": cualquier otra cosa deja los agregados.
                summary: options.summary === false ? false : undefined,
                limit: options.limit,
                offset: options.offset,
            },
            options,
        );
    }

    /**
     * El consumo del plan de la organización: lo que gasta, lo que ha repartido entre sus hijas y
     * los límites que le aplican.
     *
     * Una organización sin plan propio hereda el del primer padre que tenga uno, así que `limits`
     * puede no ser suyo. Es la forma barata de pintar una barra de progreso: antes había que
     * bajarse el listado entero de organizaciones del cliente.
     */
    async use(idOrganization: string, options: RequestOptions = {}): Promise<PlanUse> {
        return this.httpGet<PlanUse>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/use`,
            undefined,
            options,
        );
    }
}

function rangeQuery(options: RangeOptions): Query {
    return { from_date: options.from_date, to_date: options.to_date };
}
