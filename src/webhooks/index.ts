/**
 * `planvortex/webhooks` — verificación de los webhooks salientes de PlanVortex.
 *
 * Va en su propio punto de entrada porque quien recibe webhooks casi nunca es el mismo proceso que
 * publica: un endpoint de Express no tiene por qué cargar el cliente entero.
 *
 * DOS COSAS QUE TUMBAN A TODO EL MUNDO, y por eso están escritas antes que el código:
 *
 *  1. **El cuerpo es un ARRAY de cambios**, no un objeto. Recorre lo que llega.
 *  2. **La firma se calcula sobre el cuerpo CRUDO.** Si tu framework ya parseó el JSON y lo vuelves
 *     a serializar, los bytes no son los mismos y la firma no cuadra nunca. En Express hace falta
 *     `express.raw({ type: "application/json" })` delante.
 *
 * La verificación y el middleware llegan en la fase 8; aquí están las cabeceras, que son contrato.
 */

/**
 * Las dos cabeceras de firma que PlanVortex manda, con el HMAC del cuerpo crudo hecho con el
 * `client_secret` de la app. El valor lleva el algoritmo delante: `sha256=<hex>`.
 *
 * Verifica la de 256 si puedes; la de sha1 está por compatibilidad con quien ya integraba webhooks
 * al estilo de Meta.
 */
export const WEBHOOK_SIGNATURE_HEADERS = {
    sha1: "x-hub-signature",
    sha256: "x-hub-signature-256",
} as const;

/**
 * Los eventos que hoy se entregan de verdad. La lista crece, así que un `field` desconocido se
 * ignora en vez de romper: el enum del servidor no espera a nadie.
 */
export const WEBHOOK_EVENTS = [
    "new_account",
    "change_state_account",
    "messages",
    "comments",
    "integration_error",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
