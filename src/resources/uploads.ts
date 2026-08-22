/**
 * La biblioteca de ficheros de una organización: lo que se adjunta a una publicación.
 *
 * TRES AVISOS QUE AHORRAN UNA TARDE:
 *
 *  1. **`public_path` caduca.** Es una URL firmada, no un enlace permanente: se mantiene idéntica
 *     dentro de la misma hora —cachearla ese rato es correcto— y después deja de servir.
 *     Guardarla en tu base de datos es el error clásico; a los tres días están todas rotas.
 *  2. **El tipo lo decide el `content-type` que mandes**, no el contenido ni la extensión. La
 *     librería lo deduce del nombre; si el nombre no lleva extensión, pásalo (§ `core/files.ts`).
 *  3. **Los topes son del servidor**: 5 MB por imagen y 200 MB por vídeo, más la cuota de espacio
 *     de la organización. Los tres se comprueban contra los bytes que llegan de verdad, así que un
 *     fichero grande falla a mitad de subida con un 802, un 803 o un 804 — no antes de empezar.
 */
import { Resource, requireId } from "./base.js";
import type { RequestOptions, SuccessResponse } from "./base.js";
import { buildUploadForm } from "../core/files.js";
import type { FileInput } from "../core/files.js";
import type { PageOptions } from "../core/pagination.js";
import { iteratePages } from "../core/pagination.js";
import type { Paginated, Upload } from "../types.js";

/** Un fichero de una integración que se quiere traer a la biblioteca. */
export interface ImportFileInput {
    /** Identificador del fichero en el proveedor (el id del fichero en Drive). */
    external_id: string;
    /** Nombre que enseñó el selector. Se usa para el nombre visible y para decir cuál falló. */
    name?: string | undefined;
    /** Tipo que declaró el selector. Sirve para rechazar pronto; manda el tipo real del cuerpo. */
    mime_type?: string | undefined;
}

/** Lo que NO entró en una importación, fichero a fichero. */
export interface ImportError {
    external_id?: string;
    name?: string;
    code: number;
    message: string;
    data?: Record<string, unknown>;
}

/**
 * El resultado de una importación, que es PARCIAL a propósito: `uploads` con lo que entró y
 * `errors` con lo que no, para poder decir cuál de los seis ficheros elegidos falló y por qué.
 */
export interface ImportResult {
    uploads: Upload[];
    errors: ImportError[];
}

/** Los ajustes de portada de un vídeo. Lo único que un upload deja cambiar. */
export interface UploadUpdate {
    /**
     * Identificador de OTRO upload, que tiene que ser una imagen, para usarlo de portada.
     * Reemplazar una portada borra la anterior.
     */
    cover_image?: string | undefined;
    /**
     * Momento del vídeo, en milisegundos, que se usa de fotograma de portada.
     *
     * CUIDADO: **se escribe siempre**, así que omitirlo borra el valor guardado. Si sólo quieres
     * cambiar `cover_image`, manda también el `cover_offset` que ya tenía.
     */
    cover_offset?: number | undefined;
}

export class UploadsResource extends Resource {
    /**
     * Sube un fichero. Admite una ruta en disco, un `Buffer` o un `Blob`.
     *
     * La ruta es la buena para lo grande: es la única forma que no pasa el fichero por memoria.
     *
     * ```ts
     * await pv.uploads.create(orgId, { file: "./hogaza.jpg" });
     * await pv.uploads.create(orgId, { file: bytes, filename: "hogaza.jpg" });
     * ```
     */
    async create(idOrganization: string, input: FileInput, options: RequestOptions = {}): Promise<Upload> {
        const form = await buildUploadForm(input);
        return this.postOne<Upload>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/uploads`,
            "upload",
            form,
            options,
        );
    }

    /**
     * Los ficheros de la biblioteca.
     *
     * No salen aquí los recortes que la plataforma se hace para sí misma (`is_temporal`) ni las
     * portadas de vídeo, que son otro upload y viajan dentro del suyo.
     */
    async list(
        idOrganization: string,
        options: PageOptions & RequestOptions = {},
    ): Promise<Paginated<Upload>> {
        return this.getList<Upload>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/uploads`,
            "uploads",
            { offset: options.offset, limit: options.limit },
            options,
        );
    }

    /** Los ficheros de la biblioteca, encadenando páginas. */
    iterate(idOrganization: string, options: PageOptions & RequestOptions = {}): AsyncGenerator<Upload> {
        return iteratePages<Upload>((page) => this.list(idOrganization, { ...options, ...page }), options);
    }

    /** Un fichero. Pídelo de nuevo cuando necesites un `public_path` vigente. */
    async get(idOrganization: string, idUpload: string, options: RequestOptions = {}): Promise<Upload> {
        return this.getOne<Upload>(this.path(idOrganization, idUpload), "upload", undefined, options);
    }

    /** Cambia la portada de un vídeo. Ojo con `cover_offset`: se escribe siempre (ver arriba). */
    async update(
        idOrganization: string,
        idUpload: string,
        body: UploadUpdate,
        options: RequestOptions = {},
    ): Promise<Upload> {
        return this.putOne<Upload>(this.path(idOrganization, idUpload), "upload", body, options);
    }

    /**
     * Borra un fichero.
     *
     * Con `force` se borra aunque una publicación siga apuntándolo; sin él, un fichero en uso se
     * conserva y sólo se saca de la biblioteca.
     */
    async remove(
        idOrganization: string,
        idUpload: string,
        options: { force?: boolean | undefined } & RequestOptions = {},
    ): Promise<void> {
        await this.httpDelete<SuccessResponse>(
            this.path(idOrganization, idUpload),
            options.force ? { forceDelete: true } : undefined,
            options,
        );
    }

    /**
     * Trae a la biblioteca ficheros elegidos en una integración (el selector de Drive).
     *
     * La respuesta es PARCIAL a propósito: mira `errors` aunque `uploads` traiga algo — de seis
     * ficheros pueden entrar cuatro. Un `2204` significa que el proveedor no da los bytes: un
     * documento nativo de Google no tiene fichero que descargar.
     */
    async import(
        idOrganization: string,
        idIntegration: string,
        files: readonly ImportFileInput[],
        options: RequestOptions = {},
    ): Promise<ImportResult> {
        return this.httpPost<ImportResult>(
            `/organizations/${requireId(idOrganization, "idOrganization")}/uploads/import`,
            { id_integration: requireId(idIntegration, "idIntegration"), files },
            options,
        );
    }

    private path(idOrganization: string, idUpload: string): string {
        return `/organizations/${requireId(idOrganization, "idOrganization")}/uploads/${requireId(idUpload, "idUpload")}`;
    }
}
