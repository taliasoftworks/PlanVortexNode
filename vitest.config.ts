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
            /**
             * El suelo, no la meta. Está para una cosa concreta: que un método público nuevo sin
             * test de contrato baje el número y no pase. `src/resources` está hoy al 100 % de
             * sentencias, así que el suelo es real y no una formalidad.
             *
             * Lo que queda por debajo es lo que cuesta provocar sin retorcer el runtime: la rama de
             * `fs.openAsBlob` que sólo se ejecuta en Node < 20.4, y los caminos de error del
             * transporte que ya tienen su propio test por otro lado.
             *
             * `src/generated` queda fuera porque no lo escribimos nosotros: lo genera
             * `openapi-typescript` y su corrección la vigila el job `types-in-sync` de la CI.
             */
            thresholds: {
                statements: 97,
                branches: 90,
                functions: 98,
                lines: 97,
            },
        },
    },
});
