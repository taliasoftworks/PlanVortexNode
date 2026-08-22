/**
 * Ficheros (capa 2). Aquí lo que se pin es el `multipart`, que es lo que nadie acierta a la
 * primera (§ trampa 10 del roadmap):
 *
 *  - El campo se llama `file` y no otra cosa: el servidor lo lee con `uploadMulter.single("file")`.
 *  - La parte lleva `content-type` propio, porque **de ahí saca el servidor `file_type` y
 *    `file_format`**. Un `application/octet-stream` —que es lo que pone un Blob sin tipo— se lleva
 *    un 805 con un JPEG perfectamente válido dentro.
 *  - La petición NO lleva un `content-type` escrito a mano: lo pone `FormData` con su `boundary`.
 *  - Una ruta en disco no se lee a memoria.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { guessContentType } from "../../src/index.js";
import { ContractHarness } from "../helpers/contract.js";
import { ORG_ID, UPLOAD_ID, upload } from "../helpers/fixtures.js";

const api = new ContractHarness();
beforeAll(() => api.listen());
afterEach(() => api.reset());
afterAll(() => api.close());

/** Un fichero de verdad en disco: la ruta es el camino que no pasa el fichero por memoria. */
const directory = mkdtempSync(join(tmpdir(), "planvortex-uploads-"));
const imagePath = join(directory, "hogaza.jpg");
writeFileSync(imagePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe("uploads.create", () => {
    it("manda un multipart con el campo `file` y el tipo deducido de la extensión", async () => {
        const calls = api.mock("post", `/organizations/${ORG_ID}/uploads`, { upload });
        const pv = api.client();

        const created = await pv.uploads.create(ORG_ID, { file: imagePath });

        expect(created._id).toBe(UPLOAD_ID);
        expect(calls[0]?.form).toEqual([
            { name: "file", filename: "hogaza.jpg", type: "image/jpeg", size: 8 },
        ]);
    });

    /** `FormData` pone el suyo con el `boundary`; escribirlo a mano rompe el multipart entero. */
    it("no escribe el content-type de la petición a mano", async () => {
        const calls = api.mock("post", `/organizations/${ORG_ID}/uploads`, { upload });
        const pv = api.client();

        await pv.uploads.create(ORG_ID, { file: imagePath });

        expect(calls[0]?.headers.get("content-type")).toMatch(/^multipart\/form-data; boundary=/);
    });

    it("acepta un Buffer si se le da el nombre", async () => {
        const calls = api.mock("post", `/organizations/${ORG_ID}/uploads`, { upload });
        const pv = api.client();

        await pv.uploads.create(ORG_ID, {
            file: Buffer.from([1, 2, 3]),
            filename: "portada.png",
        });

        expect(calls[0]?.form?.[0]).toMatchObject({ filename: "portada.png", type: "image/png", size: 3 });
    });

    it("se niega a subir un Buffer sin nombre en vez de inventarse uno", async () => {
        const pv = api.client();

        await expect(pv.uploads.create(ORG_ID, { file: Buffer.from([1]) })).rejects.toThrow(/filename/);
    });

    /**
     * Sin extensión conocida no hay tipo que deducir, y mandarlo mal es un 805 con un fichero
     * bueno dentro. Se corta aquí, con el nombre del fichero en el mensaje.
     */
    it("se niega a adivinar el tipo de una extensión que no conoce", async () => {
        const pv = api.client();

        await expect(
            pv.uploads.create(ORG_ID, { file: Buffer.from([1]), filename: "cosa.raw" }),
        ).rejects.toThrow(/contentType/);
    });

    it("deja forzar el tipo cuando el nombre miente", async () => {
        const calls = api.mock("post", `/organizations/${ORG_ID}/uploads`, { upload });
        const pv = api.client();

        await pv.uploads.create(ORG_ID, {
            file: Buffer.from([1]),
            filename: "video",
            contentType: "video/mp4",
        });

        expect(calls[0]?.form?.[0]?.type).toBe("video/mp4");
    });

    /** HEIC entra por la puerta y lo convierte el SERVIDOR: la librería no toca los bytes. */
    it("manda un HEIC tal cual, que es lo que el servidor espera para convertirlo", () => {
        expect(guessContentType("foto.heic")).toBe("image/heic");
        expect(guessContentType("foto.HEIF")).toBe("image/heif");
    });
});

describe("uploads: el resto", () => {
    it("desenvuelve `{uploads, total}` y `{upload}`", async () => {
        api.mock("get", `/organizations/${ORG_ID}/uploads`, { uploads: [upload], total: 12 });
        api.mock("get", `/organizations/${ORG_ID}/uploads/${UPLOAD_ID}`, { upload });
        const pv = api.client();

        const page = await pv.uploads.list(ORG_ID, { limit: 10 });
        const one = await pv.uploads.get(ORG_ID, UPLOAD_ID);

        expect({ total: page.total, first: page.data[0]?._id }).toEqual({ total: 12, first: UPLOAD_ID });
        //Es la división real: el spec lo declaraba `integer` y 16:9 no es 1.
        expect(one.file_properties?.aspect_ratio?.value).toBe(1);
    });

    it("borra sin forzar por defecto y manda `forceDelete` cuando se pide", async () => {
        const soft = api.mock("delete", `/organizations/${ORG_ID}/uploads/${UPLOAD_ID}`, { success: true });
        const pv = api.client();

        await pv.uploads.remove(ORG_ID, UPLOAD_ID);
        await pv.uploads.remove(ORG_ID, UPLOAD_ID, { force: true });

        expect(soft.map((call) => call.query)).toEqual([{}, { forceDelete: ["true"] }]);
    });

    it("actualiza la portada por PUT", async () => {
        const calls = api.mock("put", `/organizations/${ORG_ID}/uploads/${UPLOAD_ID}`, { upload });
        const pv = api.client();

        await pv.uploads.update(ORG_ID, UPLOAD_ID, { cover_offset: 2500 });

        expect(calls[0]?.body).toEqual({ cover_offset: 2500 });
    });

    /**
     * La importación responde PARCIAL a propósito: de seis ficheros pueden entrar cuatro, y hay
     * que poder decir cuál falló. La librería no convierte `errors` en una excepción.
     */
    it("devuelve la importación parcial entera, sin convertir los fallos en excepción", async () => {
        const calls = api.mock("post", `/organizations/${ORG_ID}/uploads/import`, {
            uploads: [upload],
            errors: [{ external_id: "drive-2", name: "memoria.gdoc", code: 2204, message: "No descargable" }],
        });
        const pv = api.client();

        const result = await pv.uploads.import(ORG_ID, "int-1", [
            { external_id: "drive-1", name: "hogaza.jpg" },
            { external_id: "drive-2", name: "memoria.gdoc" },
        ]);

        expect(result.uploads).toHaveLength(1);
        expect(result.errors[0]?.code).toBe(2204);
        expect(calls[0]?.body).toEqual({
            id_integration: "int-1",
            files: [
                { external_id: "drive-1", name: "hogaza.jpg" },
                { external_id: "drive-2", name: "memoria.gdoc" },
            ],
        });
    });
});
