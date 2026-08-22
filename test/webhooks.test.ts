/**
 * Los webhooks salientes: la firma, el sobre y el middleware.
 *
 * Todo lo que se firma aqui se firma COMO LO FIRMA EL SERVIDOR —
 * `generateSha(secret, JSON.stringify(body), type)` en `src/util/index.ts` de PlanVortexServer,
 * que es literalmente el mismo cuerpo que axios acaba mandando— porque un test que se invente su
 * propia forma de firmar solo prueba que la libreria coincide consigo misma.
 */
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";

import { messageContact, messageContactId, messageDirection, messageFiles } from "../src/index.js";
import type { Comment, Message } from "../src/index.js";
import {
    WebhookBodyError,
    WebhookSignatureError,
    handleWebhookRequest,
    isAccountStateChange,
    isCommentChange,
    isIntegrationErrorChange,
    isMessageChange,
    parseWebhookPayload,
    planvortexWebhooks,
    verifyWebhookSignature,
} from "../src/webhooks/index.js";
import type { WebhookChange, WebhookRequestLike, WebhookResponseLike } from "../src/webhooks/index.js";
import { ORG_ID, ACCOUNT_ID, upload } from "./helpers/fixtures.js";

const SECRET = "un-client-secret-de-mentira";

const comment: Comment = {
    _id: "66d04a6a427f4c43b9d97f70",
    id_account: ACCOUNT_ID,
    id_organization: ORG_ID,
    external_id: "17800000000000001",
    publication_external_id: "17900000000000000",
    social_network: "instagram",
    author: { external_id: "9988776655", name: "un_seguidor", is_own: false },
    text: "Me interesa, ¿cuánto cuesta?",
    read: false,
    replied: false,
};

const message: Message = {
    _id: "66d04a6a427f4c43b9d97f80",
    id_account: ACCOUNT_ID,
    read: false,
    text: "¿Abrís el domingo?",
    message_type: "simple_message",
    message_errors: [],
    creation_date: "2026-08-22T10:00:00.000Z",
    //Asi llega de verdad: el servidor hace populate de los tres antes de entregarlo.
    from_contact_id: {
        _id: "66d04a6a427f4c43b9d97f90",
        id_organization: ORG_ID,
        name: "Marta",
        social_identifiers: [{ _id: "66d04a6a427f4c43b9d97f91", social_network: "instagram" }],
        creation_date: "2026-08-01T09:00:00.000Z",
        last_contact_update: "2026-08-22T09:59:00.000Z",
    },
    message_options: { files: [upload], files_urls: [] },
};

const commentChange = {
    field: "comments",
    id_account: ACCOUNT_ID,
    id_organization: ORG_ID,
    social_network: "instagram",
    commentObj: comment,
};

const messageChange = {
    field: "messages",
    id_account: ACCOUNT_ID,
    id_organization: ORG_ID,
    social_network: "instagram",
    id_contact: "66d04a6a427f4c43b9d97f90",
    messageObj: message,
};

const integrationChange = {
    field: "integration_error",
    id_integration: "66d04a6a427f4c43b9d97fa0",
    id_organization: ORG_ID,
    provider: "google_drive",
    error_code: 2201,
};

/** Exactamente lo que sale por el cable: el array serializado una vez, y su HMAC. */
function delivery(changes: unknown[] = [commentChange], secret = SECRET) {
    const body = JSON.stringify(changes);
    const sign = (algorithm: "sha1" | "sha256") =>
        `${algorithm}=${crypto.createHmac(algorithm, secret).update(body).digest("hex")}`;
    return {
        body,
        headers: {
            "x-hub-signature": sign("sha1"),
            "x-hub-signature-256": sign("sha256"),
        },
    };
}

describe("la verificacion de la firma", () => {
    it("acepta la firma sha256 que calcula el servidor", () => {
        const { body, headers } = delivery();
        expect(
            verifyWebhookSignature({
                payload: body,
                signature: headers["x-hub-signature-256"],
                secret: SECRET,
            }),
        ).toBe(true);
    });

    /** La de sha1 esta por compatibilidad con quien ya integraba webhooks al estilo de Meta. */
    it("acepta tambien la firma sha1", () => {
        const { body, headers } = delivery();
        expect(
            verifyWebhookSignature({
                payload: body,
                signature: headers["x-hub-signature"],
                secret: SECRET,
                algorithm: "sha1",
            }),
        ).toBe(true);
    });

    it("acepta el cuerpo como Buffer, que es como lo deja express.raw()", () => {
        const { body, headers } = delivery();
        expect(
            verifyWebhookSignature({
                payload: Buffer.from(body, "utf8"),
                signature: headers["x-hub-signature-256"],
                secret: SECRET,
            }),
        ).toBe(true);
    });

    /** El criterio de la fase: un solo byte distinto y no cuadra. */
    it("rechaza el cuerpo con un solo byte cambiado", () => {
        const { body, headers } = delivery();
        const tampered = body.replace("cuánto cuesta", "cuánto cuestá");
        expect(tampered).not.toBe(body);
        expect(
            verifyWebhookSignature({
                payload: tampered,
                signature: headers["x-hub-signature-256"],
                secret: SECRET,
            }),
        ).toBe(false);
    });

    it("rechaza la firma hecha con otro secreto", () => {
        const { body } = delivery();
        const otra = delivery([commentChange], "otro-secreto").headers["x-hub-signature-256"];
        expect(verifyWebhookSignature({ payload: body, signature: otra, secret: SECRET })).toBe(false);
    });

    /**
     * Leer la cabecera equivocada NO puede pasar por "firma invalida": son dos problemas
     * distintos y el segundo se arregla mirando el codigo, no el trafico.
     */
    it("rechaza una firma con el prefijo de otro algoritmo", () => {
        const { body, headers } = delivery();
        expect(
            verifyWebhookSignature({
                payload: body,
                signature: headers["x-hub-signature"],
                secret: SECRET,
                algorithm: "sha256",
            }),
        ).toBe(false);
    });

    /**
     * LA TRAMPA DE `timingSafeEqual`: lanza si los dos buffers miden distinto, y una firma
     * recortada es justo lo primero que manda alguien probando el endpoint. Tiene que salir
     * `false`, no una excepcion no capturada que tumbe el proceso.
     */
    it("devuelve false, sin lanzar, ante una firma recortada", () => {
        const { body, headers } = delivery();
        const recortada = headers["x-hub-signature-256"].slice(0, 20);
        expect(() =>
            verifyWebhookSignature({ payload: body, signature: recortada, secret: SECRET }),
        ).not.toThrow();
        expect(verifyWebhookSignature({ payload: body, signature: recortada, secret: SECRET })).toBe(false);
    });

    it("devuelve false si no viene firma", () => {
        const { body } = delivery();
        expect(verifyWebhookSignature({ payload: body, signature: undefined, secret: SECRET })).toBe(false);
        expect(verifyWebhookSignature({ payload: body, signature: "", secret: SECRET })).toBe(false);
    });

    /**
     * El error mas comun de todos, y el unico que la libreria puede diagnosticar: el JSON ya
     * parseado. No es "firma invalida", es que los bytes originales ya no existen.
     */
    it("lanza, y lo explica, si le pasan el JSON ya parseado", () => {
        const { headers } = delivery();
        expect(() =>
            verifyWebhookSignature({
                payload: [commentChange] as unknown as string,
                signature: headers["x-hub-signature-256"],
                secret: SECRET,
            }),
        ).toThrow(WebhookBodyError);
        expect(() =>
            verifyWebhookSignature({
                payload: [commentChange] as unknown as string,
                signature: headers["x-hub-signature-256"],
                secret: SECRET,
            }),
        ).toThrow(/express\.raw/);
    });
});

describe("el sobre", () => {
    /** El cuerpo es un ARRAY. Tratarlo como objeto no da sintoma: da `undefined` para siempre. */
    it("rechaza un cuerpo que no sea un array", () => {
        expect(() => parseWebhookPayload(JSON.stringify(commentChange))).toThrow(WebhookBodyError);
        expect(() => parseWebhookPayload(JSON.stringify(commentChange))).toThrow(/ARRAY/);
    });

    it("rechaza un cuerpo que no sea JSON", () => {
        expect(() => parseWebhookPayload("<html>502 Bad Gateway</html>")).toThrow(WebhookBodyError);
    });

    it("acepta un array vacio", () => {
        expect(parseWebhookPayload("[]")).toEqual([]);
    });
});

describe("handleWebhookRequest", () => {
    it("verifica y devuelve los cambios", () => {
        const { body, headers } = delivery([commentChange, integrationChange]);
        const changes = handleWebhookRequest({ body, headers, secret: SECRET });
        expect(changes).toHaveLength(2);
        expect(changes[0]!.field).toBe("comments");
    });

    /** Se prefiere la de 256 cuando estan las dos, y se cae a la de sha1 solo si no esta. */
    it("prefiere sha256 y se cae a sha1 cuando no viene", () => {
        const { body, headers } = delivery();
        expect(handleWebhookRequest({ body, headers, secret: SECRET })).toHaveLength(1);

        const soloSha1 = { "x-hub-signature": headers["x-hub-signature"] };
        expect(handleWebhookRequest({ body, headers: soloSha1, secret: SECRET })).toHaveLength(1);
    });

    /** Hono, Next y Fastify entregan un `Headers` de fetch, no un objeto plano. */
    it("lee las cabeceras de un Headers de fetch", () => {
        const { body, headers } = delivery();
        const fetchHeaders = new Headers(headers);
        expect(handleWebhookRequest({ body, headers: fetchHeaders, secret: SECRET })).toHaveLength(1);
    });

    it("no le importan las mayusculas de la cabecera", () => {
        const { body, headers } = delivery();
        const gritando = { "X-Hub-Signature-256": headers["x-hub-signature-256"] };
        expect(handleWebhookRequest({ body, headers: gritando, secret: SECRET })).toHaveLength(1);
    });

    it("lanza si no viene ninguna firma", () => {
        const { body } = delivery();
        expect(() => handleWebhookRequest({ body, headers: {}, secret: SECRET })).toThrow(
            WebhookSignatureError,
        );
    });

    it("lanza si la firma no cuadra", () => {
        const { body, headers } = delivery();
        expect(() => handleWebhookRequest({ body: body + " ", headers, secret: SECRET })).toThrow(
            WebhookSignatureError,
        );
    });
});

describe("los tipos de los eventos", () => {
    it("estrecha cada cambio con su predicado", () => {
        const changes = [commentChange, messageChange, integrationChange] as WebhookChange[];
        const [primero, segundo, tercero] = changes;

        expect(isCommentChange(primero!)).toBe(true);
        expect(isMessageChange(primero!)).toBe(false);
        expect(isMessageChange(segundo!)).toBe(true);
        expect(isIntegrationErrorChange(tercero!)).toBe(true);

        //Y lo que importa de verdad: que TypeScript deje leer el campo de cada rama.
        if (isCommentChange(primero!)) expect(primero.commentObj?.text).toContain("cuesta");
        if (isMessageChange(segundo!)) expect(segundo.messageObj?.text).toContain("domingo");
        if (isIntegrationErrorChange(tercero!)) expect(tercero.error_code).toBe(2201);
    });

    it("cuenta los cuatro estados de cuenta como cambios de cuenta", () => {
        for (const field of ["new_account", "change_state_account"]) {
            expect(isAccountStateChange({ field } as WebhookChange)).toBe(true);
        }
        //El visto y el rechazo de la red son mensajeria, no estado de la cuenta.
        for (const field of ["messaging_seen", "messaging_error"]) {
            expect(isAccountStateChange({ field } as WebhookChange)).toBe(false);
            expect(isMessageChange({ field } as WebhookChange)).toBe(true);
        }
    });

    /**
     * El enum del servidor crece. Un `field` que esta version no conoce tiene que pasar por el
     * parser y salir por el `default` del integrador, no reventar la entrega entera.
     */
    it("deja pasar un evento que todavia no conoce", () => {
        const { body, headers } = delivery([{ field: "un_evento_de_2027", id_account: ACCOUNT_ID }]);
        const [change] = handleWebhookRequest({ body, headers, secret: SECRET });
        expect(change!.field).toBe("un_evento_de_2027");
        expect(isCommentChange(change!)).toBe(false);
        expect(isMessageChange(change!)).toBe(false);
        expect(isAccountStateChange(change!)).toBe(false);
        expect(isIntegrationErrorChange(change!)).toBe(false);
    });

    /**
     * El mensaje del webhook llega POBLADO —`populate` de contacto y ficheros antes de entregarlo—
     * y el spec decia que eran cadenas. Los ayudantes son lo que evita el `typeof` en cada sitio.
     */
    it("lee el contacto y los ficheros poblados de un mensaje entrante", () => {
        expect(messageDirection(message)).toBe("incoming");
        expect(messageContactId(message)).toBe("66d04a6a427f4c43b9d97f90");
        expect(messageContact(message)?.name).toBe("Marta");
        expect(messageFiles(message).map((file) => file._id)).toEqual([upload._id]);
    });

    it("distingue el mensaje que escribimos nosotros", () => {
        //Se quita la clave en vez de ponerla a undefined: con exactOptionalPropertyTypes
        //un opcional NO admite undefined explicito, y asi ademas es como llega de verdad.
        const { from_contact_id, ...resto } = message;
        void from_contact_id;
        const saliente: Message = { ...resto, contact_id: "66d04a6a427f4c43b9d97f90" };
        expect(messageDirection(saliente)).toBe("outgoing");
        expect(messageContactId(saliente)).toBe("66d04a6a427f4c43b9d97f90");
        expect(messageContact(saliente)).toBeUndefined();
    });
});

// -----------------------------------------------------------------------------------------------
// El middleware
// -----------------------------------------------------------------------------------------------

/** Una respuesta de mentira con lo poco que el middleware toca de una de Express. */
function fakeResponse() {
    const response: WebhookResponseLike & { ended: boolean } = {
        statusCode: 0,
        ended: false,
        end() {
            this.ended = true;
        },
    };
    return response;
}

/** Espera a que el middleware, que por dentro es asincrono, haya respondido. */
async function settled(response: { ended: boolean }) {
    for (let attempt = 0; attempt < 50 && !response.ended; attempt++) {
        await new Promise((resolve) => setImmediate(resolve));
    }
    return response;
}

describe("el middleware de Express", () => {
    it("acepta una entrega firmada y entrega los cambios", async () => {
        const { body, headers } = delivery();
        const onChanges = vi.fn();
        const response = fakeResponse();

        planvortexWebhooks({ secret: SECRET, onChanges })(
            { headers, body: Buffer.from(body, "utf8") },
            response,
            () => {},
        );
        await settled(response);

        expect(response.statusCode).toBe(200);
        expect(onChanges).toHaveBeenCalledTimes(1);
        expect((onChanges.mock.calls[0]![0] as WebhookChange[])[0]!.field).toBe("comments");
    });

    it("acepta tambien la entrega firmada solo con sha1", async () => {
        const { body, headers } = delivery();
        const onChanges = vi.fn();
        const response = fakeResponse();

        planvortexWebhooks({ secret: SECRET, onChanges })(
            { headers: { "x-hub-signature": headers["x-hub-signature"] }, body },
            response,
            () => {},
        );
        await settled(response);

        expect(response.statusCode).toBe(200);
        expect(onChanges).toHaveBeenCalledTimes(1);
    });

    /** El criterio de la fase, del otro lado: un byte distinto y sale un 401. */
    it("responde 401 con un solo byte cambiado", async () => {
        const { body, headers } = delivery();
        const onChanges = vi.fn();
        const onError = vi.fn();
        const response = fakeResponse();

        planvortexWebhooks({ secret: SECRET, onChanges, onError })(
            { headers, body: body.replace("Me interesa", "Me interesá") },
            response,
            () => {},
        );
        await settled(response);

        expect(response.statusCode).toBe(401);
        expect(onChanges).not.toHaveBeenCalled();
        expect(onError.mock.calls[0]![0]).toBeInstanceOf(WebhookSignatureError);
    });

    it("responde 401 si la entrega no trae firma", async () => {
        const { body } = delivery();
        const response = fakeResponse();

        planvortexWebhooks({ secret: SECRET, onChanges: vi.fn() })({ headers: {}, body }, response, () => {});
        await settled(response);

        expect(response.statusCode).toBe(401);
    });

    /**
     * SIN NINGUN BODY PARSER DELANTE. Es el caso que quita el pie de la trampa: el middleware lee
     * el flujo el mismo, asi que no hay forma de olvidarse del `express.raw()`.
     */
    it("lee el cuerpo del flujo cuando no hay body parser", async () => {
        const { body, headers } = delivery();
        const onChanges = vi.fn();
        const response = fakeResponse();
        const request = Object.assign(Readable.from([Buffer.from(body, "utf8")]), {
            headers,
        }) as unknown as WebhookRequestLike;

        planvortexWebhooks({ secret: SECRET, onChanges })(request, response, () => {});
        await settled(response);

        expect(response.statusCode).toBe(200);
        expect(onChanges).toHaveBeenCalledTimes(1);
    });

    /**
     * Lo que NO se puede arreglar: un `express.json()` global ya se bebio los bytes. Volver a
     * serializar el objeto no los recupera, asi que lo unico honesto es un 400 que lo diga.
     */
    it("responde 400, y lo explica, si el JSON ya venia parseado", async () => {
        const { headers } = delivery();
        const onError = vi.fn();
        const response = fakeResponse();

        planvortexWebhooks({ secret: SECRET, onChanges: vi.fn(), onError })(
            { headers, body: [commentChange] },
            response,
            () => {},
        );
        await settled(response);

        expect(response.statusCode).toBe(400);
        expect(onError.mock.calls[0]![0]).toBeInstanceOf(WebhookBodyError);
        expect((onError.mock.calls[0]![0] as Error).message).toMatch(/express\.raw/);
    });

    /**
     * Si el manejador del integrador se cae, sale un 500 Y ademas llega a `next`: sin eso el fallo
     * se queda mudo, y PlanVortex no reintenta la entrega.
     */
    it("responde 500 y llama a next si onChanges lanza", async () => {
        const { body, headers } = delivery();
        const next = vi.fn();
        const response = fakeResponse();
        const boom = new Error("la base de datos no contesta");

        planvortexWebhooks({
            secret: SECRET,
            onChanges: () => {
                throw boom;
            },
        })({ headers, body }, response, next);
        await settled(response);

        expect(response.statusCode).toBe(500);
        expect(next).toHaveBeenCalledWith(boom);
    });
});
