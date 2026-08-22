/**
 * De "un fichero" a la parte `file` de un `multipart/form-data` que el servidor acepte.
 *
 * TRES COSAS QUE NO SE PUEDEN IMPROVISAR (§ trampa 10 del roadmap):
 *
 *  1. **Un vídeo no se lee a un `Buffer`.** El límite del servidor son 200 MB por vídeo; leerlo
 *     entero a memoria funciona con una foto y tumba el proceso con un vídeo real. Se usa
 *     `fs.openAsBlob()`, que devuelve un `Blob` PEREZOSO: `fetch` lo va leyendo del disco a medida
 *     que lo manda. El `Buffer` sólo aparece si esa función no existe (Node < 20.4).
 *  2. **El `content-type` de la parte decide qué guarda el servidor.** `file_type` (imagen o vídeo)
 *     y `file_format` salen del MIME que mande el cliente, no del contenido ni del nombre. Un
 *     `application/octet-stream` —que es lo que pone un `Blob` sin `type`— se lleva un error 805
 *     («no es una imagen ni un vídeo») con un JPEG perfectamente válido dentro. Por eso se deduce
 *     de la extensión y por eso se puede pasar a mano.
 *  3. **El `content-type` de la PETICIÓN no se toca.** Lo pone `FormData` con su `boundary`, y
 *     escribirlo a mano rompe el multipart entero. `HttpClient` ya lo respeta; esto sólo lo
 *     recuerda para el día que alguien añada una cabecera "por si acaso".
 */
import { basename } from "node:path";

import { PlanVortexConfigError } from "./errors.js";

/**
 * Un fichero, en cualquiera de las formas en que un integrador lo tiene a mano.
 *
 * La ruta es la buena para lo grande: es la única que no pasa por memoria.
 */
export type FileSource = string | Buffer | Uint8Array | Blob;

export interface FileInput {
    /** Ruta en disco, `Buffer` o `Blob`. */
    file: FileSource;
    /**
     * Nombre con el que se guarda. Con una ruta se deduce del último tramo; con un `Buffer` es
     * obligatorio, porque no hay de dónde sacarlo.
     */
    filename?: string | undefined;
    /**
     * MIME de la parte. Se deduce de la extensión; pásalo cuando el nombre no la tenga o mienta.
     * Es lo que decide `file_type` y `file_format` en el servidor.
     */
    contentType?: string | undefined;
}

/**
 * Extensión -> MIME, sólo de lo que el servidor acepta en la puerta
 * (`ALLOWED_FILES_FORMATS`). `heic`/`heif` entran y se convierten a JPEG durante la ingesta, así
 * que se mandan tal cual: es el servidor quien los convierte, no la librería.
 */
const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
    mp4: "video/mp4",
};

/** El MIME que le corresponde a un nombre de fichero, o `undefined` si la extensión no se conoce. */
export function guessContentType(filename: string): string | undefined {
    const extension = filename.split(".").pop()?.toLowerCase();
    return extension ? MIME_BY_EXTENSION[extension] : undefined;
}

function isBinary(value: unknown): value is Buffer | Uint8Array {
    return value instanceof Uint8Array;
}

/**
 * Convierte un {@link FileInput} en el `Blob` y el nombre con los que se monta el `FormData`.
 *
 * Se exporta aparte de {@link buildUploadForm} porque es lo único de aquí que hace E/S y lo que un
 * test quiere mirar por su cuenta.
 */
export async function toFilePart(input: FileInput): Promise<{ blob: Blob; filename: string }> {
    const { file } = input;

    if (typeof file === "string") {
        const filename = input.filename ?? basename(file);
        const type = input.contentType ?? guessContentType(filename);
        if (!type) {
            throw new PlanVortexConfigError(
                `No se puede deducir el tipo de "${filename}": pasa contentType. El servidor decide ` +
                    "si es imagen o vídeo por el tipo que mandes, no por el contenido.",
            );
        }
        return { blob: await openFileAsBlob(file, type), filename };
    }

    if (isBinary(file)) {
        const filename = input.filename;
        if (!filename) {
            throw new PlanVortexConfigError("Un Buffer no lleva nombre: pasa filename junto al fichero.");
        }
        const type = input.contentType ?? guessContentType(filename);
        if (!type) {
            throw new PlanVortexConfigError(
                `No se puede deducir el tipo de "${filename}": pasa contentType.`,
            );
        }
        //`Uint8Array` puede ser una vista de un ArrayBuffer más grande: se copia el tramo suyo.
        return { blob: new Blob([file.slice()], { type }), filename };
    }

    if (file instanceof Blob) {
        const filename = input.filename ?? (file instanceof File ? file.name : undefined);
        if (!filename) {
            throw new PlanVortexConfigError("Un Blob sin nombre: pasa filename junto al fichero.");
        }
        const type = input.contentType ?? (file.type || guessContentType(filename));
        if (!type) {
            throw new PlanVortexConfigError(
                `No se puede deducir el tipo de "${filename}": pasa contentType.`,
            );
        }
        //Sólo se re-envuelve si hay que cambiarle el tipo: `slice` de un Blob perezoso conserva la
        //pereza, pero envolver por envolver es una copia que no hace falta.
        return { blob: file.type === type ? file : file.slice(0, file.size, type), filename };
    }

    throw new PlanVortexConfigError("El fichero tiene que ser una ruta, un Buffer o un Blob.");
}

/**
 * El `FormData` de `POST /organizations/{id}/uploads`.
 *
 * El nombre del campo es `file` y no es negociable: el servidor lo lee con
 * `uploadMulter.single("file")` y cualquier otro nombre llega como "no se subió ningún fichero".
 */
export async function buildUploadForm(input: FileInput): Promise<FormData> {
    const { blob, filename } = await toFilePart(input);
    const form = new FormData();
    form.append("file", blob, filename);
    return form;
}

/**
 * `fs.openAsBlob` cuando existe, y leer el fichero entero cuando no.
 *
 * La primera llegó en Node 20.4 y este paquete admite Node 20 entero, así que hace falta la
 * segunda — con el aviso de que en un Node viejo un vídeo de 200 MB pasa por memoria.
 */
async function openFileAsBlob(path: string, type: string): Promise<Blob> {
    const fs = await import("node:fs");
    const openAsBlob = (fs as unknown as { openAsBlob?: (p: string, o?: { type?: string }) => Promise<Blob> })
        .openAsBlob;

    if (typeof openAsBlob === "function") {
        return openAsBlob(path, { type });
    }
    const { readFile } = await import("node:fs/promises");
    return new Blob([await readFile(path)], { type });
}
