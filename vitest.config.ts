import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        //Las capas 1 y 2: logica propia y contrato con `msw`. Sin red y sin credenciales.
        include: ["test/**/*.test.ts"],
        exclude: ["test/live/**"],
        environment: "node",
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: ["src/generated/**"],
        },
    },
});
