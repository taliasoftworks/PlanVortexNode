/**
 * El catálogo: qué redes hay, qué sabe hacer cada una, contra qué límites se valida y de qué se
 * puede generar un plan de IA.
 *
 * POR QUÉ SE CACHEA: son constantes del despliegue. No dependen del cliente, no dependen de la
 * organización y no cambian entre dos llamadas — cambian cuando se despliega el servidor. Un
 * compositor que valide el texto mientras se escribe pediría `/social_limits` en cada tecla; con la
 * caché lo pide una vez por instancia de {@link PlanVortex}.
 *
 * POR QUÉ SE PIDEN Y NO SE ESCRIBEN AQUÍ: es la regla de la casa — quien valida el límite es quien
 * lo anuncia. El panel tenía su propia tabla y divergió: contaba LinkedIn hasta 3.000 mientras el
 * servidor lo tumbaba a los 1.300, así que el usuario escribía un texto que el contador daba por
 * bueno y la API rechazaba. Una copia dentro de esta librería sería el mismo error un piso más
 * abajo, y encima repartido por npm.
 *
 * LA CACHÉ ES POR INSTANCIA Y NO CADUCA. Un proceso de días que quiera enterarse de una red nueva
 * llama a {@link CatalogResource.clearCache}; un proceso normal se muere antes de que importe.
 */
import { Resource } from "./base.js";
import type { RequestOptions } from "./base.js";
import type {
    AspectRatiosByNetwork,
    CommentActions,
    PlannerTemplate,
    PublicationLimits,
    SocialCapabilities,
    SocialLimits,
    SocialNetwork,
} from "../types.js";

export class CatalogResource extends Resource {
    private readonly cache = new Map<string, Promise<unknown>>();

    /**
     * Las redes soportadas.
     *
     * **La lista crece varias veces al año.** No la copies a una constante tuya: pídela.
     */
    async socialNetworks(options?: RequestOptions): Promise<SocialNetwork[]> {
        return this.cached("/social_networks", () =>
            this.httpGet<SocialNetwork[]>("/social_networks", undefined, options),
        );
    }

    /** Las redes que aceptan publicaciones. Ni WhatsApp ni Google Business están. */
    async allowedSocialPublications(options?: RequestOptions): Promise<SocialNetwork[]> {
        return this.cached("/allowed_social_publications", () =>
            this.httpGet<SocialNetwork[]>("/allowed_social_publications", undefined, options),
        );
    }

    /**
     * Las redes con conversaciones.
     *
     * Va en `POST` y no en `GET`, que es raro y es así: es la ruta que hay. No manda cuerpo.
     */
    async allowedSocialMessages(options?: RequestOptions): Promise<SocialNetwork[]> {
        return this.cached("/allowed_social_messages", () =>
            this.httpPost<SocialNetwork[]>("/allowed_social_messages", undefined, options),
        );
    }

    /**
     * La matriz red → qué sabe hacer: publicar, mensajes, productos, webhooks, menú persistente y
     * comentarios.
     *
     * Es lo que evita ofrecer una cuenta en una pantalla que su red no soporta — WhatsApp en el
     * compositor, LinkedIn en el chat.
     */
    async socialCapabilities(options?: RequestOptions): Promise<Record<string, SocialCapabilities>> {
        return this.cached("/social_capabilities", () =>
            this.httpGet<Record<string, SocialCapabilities>>("/social_capabilities", undefined, options),
        );
    }

    /**
     * La matriz red → qué se puede hacer con un comentario: responder, ocultar, borrar el propio y
     * borrar el de otro.
     *
     * Va **aparte** de {@link socialCapabilities} porque aquélla es `{[capacidad]: boolean}` y esto
     * es un objeto por red: meterlo dentro rompería su forma. Que la red tenga comentarios no dice
     * lo suficiente — Instagram, X y Bluesky no dejan borrar el de otro, LinkedIn no tiene
     * "ocultar" (ni Discord ni Telegram tampoco), y Google Business sólo deja borrar **nuestra
     * propia respuesta**.
     *
     * Y esto es de la RED, no de una cuenta suya: en Telegram borrar sale `true` y aun así falla con
     * un 969 si el bot no es administrador del grupo de debate. La matriz dice qué botones pintar,
     * no que cada uno vaya a funcionar en cada cuenta.
     */
    async socialCommentActions(options?: RequestOptions): Promise<Record<string, CommentActions>> {
        return this.cached("/social_comment_actions", () =>
            this.httpGet<Record<string, CommentActions>>("/social_comment_actions", undefined, options),
        );
    }

    /**
     * Los topes de cada red, por los que el servidor valida.
     *
     * Bluesky lleva **dos** cuentas del mismo texto y en unidades distintas: 300 grafemas en
     * `characters` y 3.000 bytes en `max_post_bytes`. `.length` miente en las dos direcciones —un
     * emoji de familia es UN grafema y 25 bytes—, así que un contador que use `.length` da por
     * bueno lo que la API rechaza y al revés.
     *
     * Telegram lleva **dos números para el mismo campo**, y ahí `.length` es justo la unidad buena:
     * `characters.telegram` (4.096) mientras la publicación es sólo texto y
     * `characters.telegram_media` (1.024) en cuanto lleva imagen o vídeo, porque entonces el texto
     * es el pie de un medio. El contador cambia al ADJUNTAR el fichero, no al pulsar publicar.
     */
    async socialLimits(options?: RequestOptions): Promise<SocialLimits> {
        return this.cached("/social_limits", () =>
            this.httpGet<SocialLimits>("/social_limits", undefined, options),
        );
    }

    /** Los topes de una publicación que no dependen de la red: hoy, cuántos reintentos manuales admite. */
    async publicationLimits(options?: RequestOptions): Promise<PublicationLimits> {
        return this.cached("/publication_limits", () =>
            this.httpGet<PublicationLimits>("/publication_limits", undefined, options),
        );
    }

    /**
     * Los recortes que acepta cada red.
     *
     * Se indexa por red **y por formato** (`facebook`, `facebook_reels`, `facebook_stories`), así
     * que no todas las claves son una red. `values` y `text` son arrays paralelos: mismo índice,
     * mismo recorte.
     */
    async allowedAspectRatios(options?: RequestOptions): Promise<AspectRatiosByNetwork> {
        return this.cached("/allowed_aspect_ratios", () =>
            this.httpGet<AspectRatiosByNetwork>("/allowed_aspect_ratios", undefined, options),
        );
    }

    /**
     * Las plantillas del planificador de IA: de QUÉ se puede generar un plan y qué admite cada
     * fuente. Se manda la elegida como `template` al crear el plan, junto con su `source`.
     *
     * Es catálogo por la misma razón que los límites —quien valida es quien anuncia—, y aquí la
     * copia sale especialmente cara porque son **precios**: una tabla escrita a mano en tu interfaz
     * enseñaría un coste que el servidor ya no cobra.
     *
     * Lo que hay que leer de aquí y no dar por sabido:
     *
     *  - **`generates_images: false` es que las fotos las pone la fuente**, y entonces el plan no
     *    gasta ni un crédito de imagen. La misma semana de 7 publicaciones con foto pasa de 519
     *    créditos a 48, y eso se dice ANTES de crear el plan.
     *  - **`regenerate` es por plantilla.** La que no generó la imagen tampoco la regenera: pintar
     *    ese botón igualmente le cuesta al usuario 70 créditos por cambiar su propia foto por una
     *    inventada.
     *  - **`orchestration_cost` es una ESTIMACIÓN**, no la factura: se cobra por uso.
     *    `orchestration_cost_per_source_item` es lo que añade cada unidad de la fuente.
     *  - **Un plan es SEMANAL y la fuente no lo alarga.** Con más unidades que huecos quedan en la
     *    semana, las de más se descartan y el plan trae el aviso 2117 en `warnings`.
     *  - **`source_fields` es de lo que está hecho el paso de fuente**, con sus propios `max` y
     *    `min` —en las unidades del campo: caracteres, elementos, o **días** en una fecha— y
     *    `source_requires_any` nombrando los campos de los que hace falta al menos uno (en
     *    `from_text`, la URL o el texto pegado).
     */
    async plannerTemplates(options?: RequestOptions): Promise<PlannerTemplate[]> {
        return this.cached("/planner_templates", () =>
            this.getOne<PlannerTemplate[]>("/planner_templates", "templates", undefined, options),
        );
    }

    /** Tira la caché. Para un proceso largo que quiera enterarse de una red nueva sin reiniciar. */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Guarda la PROMESA, no el resultado: dos llamadas a la vez comparten una petición en vez de
     * lanzar dos. Si falla, la entrada se retira para que el siguiente intento vuelva a pedirla —
     * cachear un fallo de red deja la instancia rota para siempre.
     */
    private cached<T>(key: string, fetch: () => Promise<T>): Promise<T> {
        const hit = this.cache.get(key);
        if (hit) {
            return hit as Promise<T>;
        }
        const pending = fetch().catch((error: unknown) => {
            this.cache.delete(key);
            throw error;
        });
        this.cache.set(key, pending);
        return pending;
    }
}
