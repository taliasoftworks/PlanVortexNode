import { defineConfig } from "vitest/config";

/**
 * Capa 3: contra un PlanVortex REAL. Necesita `.env.live` y no corre nunca en la CI de un PR.
 * En modo lectura por defecto; escribe solo con LIVE_ALLOW_PUBLISH=1.
 */
export default defineConfig({
    test: {
        include: ["test/live/**/*.live.test.ts"],
        environment: "node",
        testTimeout: 120_000,
    },
});
