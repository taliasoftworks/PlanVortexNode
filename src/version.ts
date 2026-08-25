/**
 * Las dos constantes que todo lo demás necesita. Viven aparte de `index.ts` para que `client.ts`
 * pueda leerlas sin importar el punto de entrada, que a su vez le importa a él: el ciclo compila,
 * pero deja el orden de inicialización en manos del bundler y eso se paga tarde y mal.
 */

/** La única URL que un integrador configura. El proveedor de identidad no es parte del contrato. */
export const PLANVORTEX_API_URL = "https://api.planvortex.com/v1.0.0";

/**
 * Versión del paquete, en el `User-Agent` de cada petición.
 *
 * Es una constante y no un `require("../package.json")` a propósito: leer el package.json en tiempo
 * de ejecución obliga a empaquetarlo y se rompe distinto en ESM y en CJS. La mantiene sincronizada
 * un test.
 */
export const VERSION = "0.1.0";
