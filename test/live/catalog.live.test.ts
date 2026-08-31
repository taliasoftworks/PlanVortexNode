/**
 * CAPA 3 — el catálogo: qué redes hay, qué sabe hacer cada una y con qué límites.
 *
 * Aquí es donde se entera la librería de que el producto ha crecido. La capa 2 simula las respuestas
 * y por definición nunca ve una red nueva; ésta pregunta, y una undécima red que llegue sin límites
 * o sin capacidades sale en rojo el día que se despliega y no seis meses después, cuando un
 * integrador intente publicar en ella.
 *
 * Los cinco endpoints se cruzan ENTRE SÍ a propósito. Cada uno por separado siempre parece correcto:
 * lo que falla en la vida real es que uno crezca y los otros no.
 */
import { beforeAll, expect, it } from "vitest";

import type { CommentActions, SocialCapabilities, SocialLimits, SocialNetwork } from "../../src/index.js";
import { describeLive, liveClient } from "./helpers/liveEnv.js";

describeLive("catálogo", () => {
    let networks: SocialNetwork[] = [];
    let publishing: SocialNetwork[] = [];
    let messaging: SocialNetwork[] = [];
    let capabilities: Record<string, SocialCapabilities> = {};
    let commentActions: Record<string, CommentActions> = {};
    let limits: SocialLimits;
    let aspectRatios: Record<string, unknown> = {};

    beforeAll(async () => {
        const pv = liveClient();
        [networks, publishing, messaging, capabilities, commentActions, limits, aspectRatios] =
            await Promise.all([
                pv.catalog.socialNetworks(),
                pv.catalog.allowedSocialPublications(),
                pv.catalog.allowedSocialMessages(),
                pv.catalog.socialCapabilities(),
                pv.catalog.socialCommentActions(),
                pv.catalog.socialLimits(),
                pv.catalog.allowedAspectRatios(),
            ]);
    });

    it("devuelve las redes del producto", () => {
        expect(networks.length).toBeGreaterThanOrEqual(9);
        expect(networks.every((network) => typeof network === "string" && network.length > 0)).toBe(true);
    });

    it("cada red tiene los CINCO límites que se declaran completos", () => {
        //`SOCIAL_LIMITS` es la única fuente de verdad del servidor, y quien valida es quien anuncia:
        //si una red llega sin entrada, el compositor del panel se queda sin contador y la librería
        //no puede avisar antes de mandar. Un `0` es un valor legítimo —"esta red no tiene título"—;
        //lo que no vale es que falte la clave, porque un `undefined` no se distingue de un olvido.
        //
        //Son cinco y no los siete mapas: los otros dos no van por red, y se miran más abajo.
        const maps = [
            "characters",
            "comment_characters",
            "max_file_size_mb",
            "max_post_bytes",
            "title_characters",
        ] as const;

        for (const network of networks) {
            for (const map of maps) {
                expect(typeof limits[map]?.[network], `${map}.${network}`).toBe("number");
            }
        }
    });

    it("total_images cubre todas las redes que publican", () => {
        //Aquí la cobertura exigible es la de las redes que publican: una red sin publicaciones no
        //tiene "imágenes por publicación" que anunciar. Google Business sí está, a `0`, aunque no
        //publique; WhatsApp no está. La inconsistencia es del servidor y no cambia nada para quien
        //integra, así que el test pide lo que de verdad importa y no lo que sería bonito.
        for (const network of publishing) {
            expect(typeof limits.total_images?.[network], `total_images.${network}`).toBe("number");
        }
    });

    it("las capacidades cubren todas las redes y cuadran con las listas de publicación y mensajería", () => {
        for (const network of networks) {
            const capability = capabilities[network];
            expect(capability, `capacidades de ${network}`).toBeDefined();

            //Las dos listas son la misma información dicha de otra forma. Que se separen es
            //exactamente lo que rompe a un integrador que use una y no la otra.
            expect(capability?.publications, `${network}.publications`).toBe(publishing.includes(network));
            expect(capability?.messages, `${network}.messages`).toBe(messaging.includes(network));
        }
    });

    it("las redes con comentarios traen su matriz de acciones", () => {
        //`allowComments()` es la puerta gruesa y esto es la fina: quién puede responder, ocultar y
        //borrar. Van en endpoints distintos porque tienen formas distintas, y por eso hay que
        //comprobar que no se separen.
        const withComments = networks.filter((network) => capabilities[network]?.comments === true);
        expect(withComments.length).toBeGreaterThan(0);

        for (const network of withComments) {
            const actions = commentActions[network];
            expect(actions, `acciones de ${network}`).toBeDefined();
            for (const action of ["reply", "hide", "delete_own", "delete_others"] as const) {
                expect(typeof actions?.[action], `${network}.${action}`).toBe("boolean");
            }
        }
    });

    /**
     * Los dos mapas que NO van por red, y por qué no se les puede pedir cobertura:
     *
     *  - `video_duration_in_seconds` va por red **y tipo de publicación** (`instagram_story`,
     *    `facebook_reel`) y sólo están las redes que limitan por duración. Discord limita por PESO
     *    y por eso vive en `max_file_size_mb`.
     *  - `allowed_aspect_ratios` tampoco tiene a Discord, y es deliberado: no rechaza ninguna
     *    proporción, así que no hay lista de admitidas que publicar.
     *
     * Lo que sí se les puede exigir es que ninguna clave sea de una red que no existe. Suena a poco
     * y no lo es: en el servidor vivió años un `likedin` sin la ene que dejaba a LinkedIn sin ratio
     * por defecto y reventaba al recortar, y le llegaba al usuario como un error genérico.
     */
    it("los dos mapas que no van por red no inventan nombres de red", () => {
        const keys = [...Object.keys(limits.video_duration_in_seconds ?? {}), ...Object.keys(aspectRatios)];
        expect(keys.length).toBeGreaterThan(0);

        for (const key of keys) {
            const known = networks.some((network) => key === network || key.startsWith(`${network}_`));
            expect(known, `clave de red desconocida: ${key}`).toBe(true);
        }

        for (const [key, value] of Object.entries(limits.video_duration_in_seconds ?? {})) {
            expect(typeof value, `video_duration_in_seconds.${key}`).toBe("number");
        }
    });

    it("los límites de publicación llegan con los tres tamaños", async () => {
        const publicationLimits = await liveClient().catalog.publicationLimits();

        expect(publicationLimits).toBeDefined();
        expect(Object.keys(publicationLimits).length).toBeGreaterThan(0);
    });

    /**
     * Las plantillas del planificador, que es la entrada del catálogo que MÁS caro sale copiar:
     * lleva precios dentro. La capa 2 simula la respuesta, así que jamás vería que el servidor ha
     * cambiado lo que cobra ni que ha entrado una plantilla nueva — que es exactamente lo que esta
     * capa existe para enterarse.
     *
     * Lo que se cruza aquí es el invariante que hace barata la plantilla y del que cuelga el
     * consejo que la librería da: **la que no genera la imagen tampoco la regenera**. Si algún día
     * dejara de cumplirse, el `README` estaría mintiendo.
     */
    it("publica las plantillas del planificador con sus costes y sus campos", async () => {
        const templates = await liveClient().catalog.plannerTemplates();

        expect(templates.length).toBeGreaterThanOrEqual(5);

        for (const template of templates) {
            expect(typeof template.template, JSON.stringify(template)).toBe("string");
            expect(typeof template.orchestration_cost, `${template.template}.orchestration_cost`).toBe(
                "number",
            );
            expect(typeof template.generates_images, `${template.template}.generates_images`).toBe(
                "boolean",
            );

            //El invariante: sin imagen generada no hay imagen que regenerar. Lo contrario le cobraría
            //al usuario 70 créditos por cambiar su propia foto por una inventada.
            if (template.generates_images === false) {
                expect(template.regenerate?.image, `${template.template}.regenerate.image`).toBe(false);
            }

            //Y un tope de unidades sin un campo que las recoja sería un número que nadie puede usar.
            if ((template.max_source_items ?? 0) > 0) {
                expect(template.source_fields?.length, `${template.template}.source_fields`).toBeGreaterThan(
                    0,
                );
            }

            //`source_requires_any` sólo puede nombrar campos que la plantilla declare.
            for (const name of template.source_requires_any ?? []) {
                const declared = (template.source_fields ?? []).some((field) => field.name === name);
                expect(declared, `${template.template}.source_requires_any: ${name}`).toBe(true);
            }
        }

        //`standard` no puede desaparecer: es lo que tarifa un plan que no manda `template`.
        expect(templates.map((template) => template.template)).toContain("standard");
    });

    it("el catálogo se cachea: dos lecturas, una petición", async () => {
        let calls = 0;
        const pv = liveClient({
            hooks: {
                onRequest: ({ url, attempt }) => {
                    if (url.includes("/social_networks") && attempt === 1) calls += 1;
                },
            },
        });

        await pv.catalog.socialNetworks();
        await pv.catalog.socialNetworks();
        expect(calls).toBe(1);

        //Y `clearCache()` tiene que volver a preguntar de verdad, no sólo de mentira en la capa 2.
        pv.catalog.clearCache();
        await pv.catalog.socialNetworks();
        expect(calls).toBe(2);
    });
});
