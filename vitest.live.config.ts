import { defineConfig } from "vitest/config";

/**
 * Capa 3: contra un PlanVortex REAL. Necesita `.env.live` y no corre nunca en la CI de un PR.
 * En modo lectura por defecto; escribe solo con LIVE_ALLOW_PUBLISH=1.
 *
 * `fileParallelism: false` no es un detalle: estos ficheros comparten la misma organización, crean
 * y borran cosas en ella, y el servidor cuenta los intentos de token por `client_id`. En paralelo se
 * pisarían entre ellos y el fallo parecería del API.
 */
export default defineConfig({
    test: {
        include: ["test/live/**/*.live.test.ts"],
        environment: "node",
        testTimeout: 120_000,
        fileParallelism: false,
    },
});
