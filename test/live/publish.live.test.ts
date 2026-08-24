/**
 * CAPA 3 — el camino de publicar, escribiendo de verdad.
 *
 * TODO LO DE AQUÍ ESTÁ APAGADO por defecto y necesita `LIVE_ALLOW_PUBLISH=1`. Y aun encendido, lo
 * que crea **no sale a ninguna red**: la publicación se programa a un día vista y se borra al
 * terminar. Mandarla de verdad lleva un interruptor aparte, `LIVE_ALLOW_SOCIAL_PUBLISH=1`, porque
 * eso ya es público, inmediato e irreversible.
 *
 * Lo que sólo se puede comprobar aquí:
 *
 *  - **El `multipart` de verdad.** La capa 2 mira las partes que monta la librería; que el servidor
 *    las acepte —y deduzca `file_type` y `file_format` del `content-type` de la parte, que es el
 *    error 805 clásico— sólo lo dice el servidor.
 *  - **`public_path` sirve.** Es una URL firmada que caduca (§ trampa 5). Que esté bien formada no
 *    significa que se pueda descargar.
 *  - **Una publicación inválida NO es un error HTTP**: llega un 200 en estado `withErrors` con el
 *    motivo dentro. Es la sorpresa que se lleva todo el que integra.
 */
import { beforeAll, expect } from "vitest";

import type { Account, PublicationInput } from "../../src/index.js";
import {
    LIVE_IMAGE_PATH,
    LIVE_VIDEO_PATH,
    describeLive,
    itPublish,
    itWrite,
    liveContext,
    liveMarker,
    livePublishAccount,
    type LiveContext,
} from "./helpers/liveEnv.js";

describeLive("publicar", () => {
    let live: LiveContext;
    let account: Account | undefined;
    /** El fichero que la red de la cuenta acepta, o `undefined` si no tenemos ninguno que valga. */
    let file: string | undefined;
    /** Cuánto título admite esa red. `0` es "no tiene campo título". */
    let titleLimit = 0;

    beforeAll(async () => {
        live = await liveContext();
        account = await livePublishAccount();

        if (account) {
            //Todo lo que decide la forma de la publicación sale del CATÁLOGO, no de suposiciones.
            //Es lo mismo que este paquete le pide a quien integra, y es lo que hace que estos tests
            //valgan con la cuenta que haya conectada y no sólo con la que teníamos en la cabeza.
            const limits = await live.pv.catalog.socialLimits();

            //`total_images: 0` es YouTube, que sólo publica vídeo: una imagen suya sólo puede ser
            //miniatura, y eso no es una publicación (error 943).
            const acceptsImages = (limits.total_images?.[account.social_network] ?? 0) > 0;
            file = acceptsImages ? LIVE_IMAGE_PATH : LIVE_VIDEO_PATH;

            //Y `title_characters > 0` es una red que EXIGE título: YouTube contesta 944 sin él.
            titleLimit = limits.title_characters?.[account.social_network] ?? 0;
        }
    });

    /** El cuerpo de una publicación válida para la red que toque, con su título si lo pide. */
    function publicationInput(text: string, extra: Partial<PublicationInput> = {}): PublicationInput {
        return {
            social_network: account!.social_network,
            text,
            files: [],
            ...(titleLimit > 0 ? { title: text.slice(0, titleLimit) } : {}),
            ...extra,
        } as PublicationInput;
    }

    itWrite("sube una imagen, la descarga por su public_path y la borra", async () => {
        const upload = await live.pv.uploads.create(live.organization._id, { file: LIVE_IMAGE_PATH });

        try {
            expect(upload._id).toBeTruthy();
            //`file_type` y `file_format` los decide el servidor a partir del `content-type` de la
            //PARTE. Un `application/octet-stream` —lo que pone un Blob sin `type`— se lleva un 805
            //con un PNG perfectamente válido dentro.
            expect(upload.file_type).toBe("image");
            expect(upload.file_format).toBe("png");
            expect(upload.file_properties?.size_in_bytes).toBeGreaterThan(0);

            const fetched = await live.pv.uploads.get(live.organization._id, upload._id);
            expect(fetched._id).toBe(upload._id);
            expect(fetched.public_path).toMatch(/^https?:\/\//);

            //Si esto falla, o la firma está mal o el stack contra el que pruebas no tiene quién
            //sirva los ficheros. Dentro de Docker el driver `local` no vale: no hay volumen ni
            //servidor estático desde que se retiró `planvortex_cdn`.
            const response = await fetch(fetched.public_path, { method: "GET" });
            expect(response.ok, `public_path devolvió ${response.status}`).toBe(true);
        } finally {
            await live.pv.uploads.remove(live.organization._id, upload._id, { force: true });
        }

        //Y borrado es borrado: el fichero ya no está.
        await expect(live.pv.uploads.get(live.organization._id, upload._id)).rejects.toThrow();
    });

    itWrite("programa una publicación, la encuentra en la agenda y la borra", async (ctx) => {
        if (!account) {
            ctx.skip("no hay ninguna cuenta conectada que publique");
            return;
        }
        if (!file) {
            ctx.skip(`${account.social_network} no publica imágenes: hace falta LIVE_VIDEO_PATH`);
            return;
        }

        const marker = liveMarker();
        const upload = await live.pv.uploads.create(live.organization._id, { file });
        let publicationId: string | undefined;

        try {
            const publication = await live.pv.publications.create(
                live.organization._id,
                account._id,
                publicationInput(marker, {
                    files: [upload._id],
                    //A un día vista: queda `ready` y el robot no la toca mientras dura el test.
                    publish_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
                }),
            );
            publicationId = publication._id;

            //Una publicación inválida se guarda igual, en `withErrors` y con el motivo dentro. Que
            //el test lo diga con los códigos a la vista ahorra media tarde de mirar el panel.
            expect(
                publication.publication_errors,
                `la publicación quedó en ${publication.state}: ` +
                    publication.publication_errors.map((e) => `[${e.code}] ${e.message}`).join(", "),
            ).toHaveLength(0);
            expect(publication.state).toBe("ready");

            const fetched = await live.pv.publications.get(live.organization._id, publication._id);
            expect(fetched._id).toBe(publication._id);
            //`files` vuelve POBLADO: son `Upload` enteros, no identificadores. Es lo contrario de lo
            //que se manda, y la única forma de verlo es preguntando.
            expect(fetched.files[0]?._id).toBe(upload._id);

            const agenda = await live.pv.publications.list(live.organization._id, {
                state: ["ready"],
                accounts: [account._id],
                limit: 50,
            });
            expect(agenda.data.some((candidate) => candidate._id === publication._id)).toBe(true);

            await live.pv.publications.remove(live.organization._id, publication._id);
            publicationId = undefined;

            //Lo que de verdad importa: ya no está en la agenda, que es de donde tira un panel.
            const afterDelete = await live.pv.publications.list(live.organization._id, {
                state: ["ready"],
                accounts: [account._id],
                limit: 50,
            });
            expect(afterDelete.data.some((candidate) => candidate._id === publication._id)).toBe(false);

            //HALLAZGO DEL SERVIDOR, no una decisión: el borrado es BLANDO y `get()` sigue
            //devolviendo la publicación. `getPublicationById` es un `findById` pelado y
            //`checkIdPublication` no mira `deleted` — al revés que `checkIdOrganization`, que tira
            //1110, o que `getClientAppById`, que filtra. Para quien integra: borrar y volver a leer
            //por id devuelve la publicación como si nada. Anotado en el roadmap; el test afirma lo
            //que hay HOY para que el día que se arregle salga en rojo y alguien lea esto.
            await expect(
                live.pv.publications.get(live.organization._id, publication._id),
            ).resolves.toBeDefined();
        } finally {
            //Limpiar SIEMPRE, aunque una comprobación de arriba haya fallado: si no, cada ejecución
            //deja una publicación programada que un día se publica sola.
            if (publicationId) {
                await live.pv.publications
                    .remove(live.organization._id, publicationId)
                    .catch(() => undefined);
            }
            await live.pv.uploads
                .remove(live.organization._id, upload._id, { force: true })
                .catch(() => undefined);
        }
    });

    itPublish("publica AHORA en la red y lo borra", async (ctx) => {
        if (!account) {
            ctx.skip("no hay ninguna cuenta conectada que publique");
            return;
        }
        if (!file) {
            ctx.skip(`${account.social_network} no publica imágenes: hace falta LIVE_VIDEO_PATH`);
            return;
        }

        const upload = await live.pv.uploads.create(live.organization._id, { file });
        let publicationId: string | undefined;

        try {
            //Sin `publish_date` se envía en esta misma petición, y la respuesta ya dice si salió.
            const publication = await live.pv.publications.create(
                live.organization._id,
                account._id,
                publicationInput(liveMarker(), { files: [upload._id] }),
            );
            publicationId = publication._id;

            expect(
                publication.publication_errors,
                publication.publication_errors.map((e) => `[${e.code}] ${e.message}`).join(", "),
            ).toHaveLength(0);
            expect(publication.state).toBe("sended");
            //El identificador que devuelve la RED. Es lo que prueba que salió de verdad.
            expect(publication.external_identifier).toBeTruthy();
        } finally {
            if (publicationId) {
                await live.pv.publications
                    .remove(live.organization._id, publicationId)
                    .catch(() => undefined);
            }
            await live.pv.uploads
                .remove(live.organization._id, upload._id, { force: true })
                .catch(() => undefined);
        }
    });
});
