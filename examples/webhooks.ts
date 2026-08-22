/**
 * Un receptor de webhooks de PlanVortex, entero y sin dependencias.
 *
 *   PLANVORTEX_CLIENT_SECRET=... npx tsx examples/webhooks.ts
 *
 * Levanta un servidor en el puerto 3210 y, si no le pasas nada más, **se manda a sí mismo** una
 * entrega firmada como la firma PlanVortex para que veas el camino completo sin tener que exponer
 * tu máquina a internet ni esperar a que llegue un comentario de verdad:
 *
 *   npx tsx examples/webhooks.ts --self-test
 *
 * Va con `node:http` a propósito, no con Express: `planvortexWebhooks()` sólo pide `headers`,
 * `body` opcional, `statusCode` y `end()`, que es lo que tiene una respuesta pelada de Node. Si
 * usas Express, el mismo middleware entra en `app.post(...)` sin tocar nada.
 */
import crypto from "node:crypto";
import http from "node:http";

import { messageContact, messageDirection } from "../src/index.js";
import {
    WEBHOOK_SIGNATURE_HEADERS,
    isAccountStateChange,
    isCommentChange,
    isIntegrationErrorChange,
    isMessageChange,
    planvortexWebhooks,
} from "../src/webhooks/index.js";
import type { WebhookRequestLike, WebhookResponseLike } from "../src/webhooks/index.js";

const PORT = 3210;
const SECRET = process.env.PLANVORTEX_CLIENT_SECRET ?? "secreto-de-ejemplo";

/**
 * El manejador. Nada de `express.raw()` delante: si no hay body parser, el middleware lee el flujo.
 *
 * Ojo con lo que se hace aquí dentro: se espera a que termine antes de responder, y PlanVortex no
 * reintenta una entrega que se cae. Si tu trabajo tarda, encólalo y vuelve.
 */
const receive = planvortexWebhooks({
    secret: SECRET,
    onError: (error) => console.error("  ✗", error.message),
    onChanges: (changes) => {
        console.log(`\n  ${changes.length} cambio(s) en la entrega`);
        for (const change of changes) {
            if (isCommentChange(change)) {
                //Meta repite entregas: en producción, deduplica por external_id antes de tocar nada.
                console.log(
                    `  · comentario de ${change.commentObj?.author?.name}: ${change.commentObj?.text}`,
                );
            } else if (isMessageChange(change)) {
                const message = change.messageObj;
                const who = message ? messageContact(message)?.name : undefined;
                console.log(
                    `  · ${change.field} (${message ? messageDirection(message) : "sin mensaje"})` +
                        `${who ? ` con ${who}` : ""}: ${message?.text ?? "—"}`,
                );
            } else if (isIntegrationErrorChange(change)) {
                console.log(`  · la integración ${change.provider} falló con ${change.error_code}`);
            } else if (isAccountStateChange(change)) {
                console.log(`  · la cuenta ${change.id_account} (${change.social_network}): ${change.field}`);
            } else {
                //La rama que importa: el enum del servidor crece y esto NO puede romper.
                console.log(`  · evento que esta versión no conoce: ${change.field}`);
            }
        }
    },
});

const server = http.createServer((request, response) => {
    if (request.method !== "POST" || request.url !== "/webhooks/planvortex") {
        response.statusCode = 404;
        response.end();
        return;
    }
    receive(request as unknown as WebhookRequestLike, response as unknown as WebhookResponseLike, (error) => {
        if (error) {
            console.error("  ✗ el manejador se cayó:", error);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Escuchando en http://localhost:${PORT}/webhooks/planvortex`);
    console.log(`Secreto: ${SECRET === "secreto-de-ejemplo" ? "el de ejemplo" : "el de tu app"}`);
    if (process.argv.includes("--self-test")) {
        void selfTest();
    }
});

/** Se manda una entrega firmada igual que la firma el servidor, y luego otra con un byte cambiado. */
async function selfTest(): Promise<void> {
    const changes = [
        {
            field: "comments",
            id_account: "66d04a6a427f4c43b9d97f54",
            id_organization: "66d04a6a427f4c43b9d97f00",
            social_network: "instagram",
            commentObj: {
                external_id: "17800000000000001",
                author: { name: "un_seguidor", is_own: false },
                text: "¿Cuánto cuesta?",
            },
        },
        {
            field: "integration_error",
            id_integration: "66d04a6a427f4c43b9d97fa0",
            id_organization: "66d04a6a427f4c43b9d97f00",
            provider: "google_drive",
            error_code: 2201,
        },
    ];

    const body = JSON.stringify(changes);
    console.log("\n-> entrega firmada correctamente");
    console.log(`   respuesta: ${await deliver(body, sign(body))}`);

    console.log("\n-> la misma entrega con un byte cambiado");
    console.log(`   respuesta: ${await deliver(body.replace("Cuánto", "Cuanto"), sign(body))}`);

    server.close();
}

function sign(body: string): string {
    return `sha256=${crypto.createHmac("sha256", SECRET).update(body).digest("hex")}`;
}

async function deliver(body: string, signature: string): Promise<number> {
    const response = await fetch(`http://localhost:${PORT}/webhooks/planvortex`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            [WEBHOOK_SIGNATURE_HEADERS.sha256]: signature,
        },
        body,
    });
    return response.status;
}
