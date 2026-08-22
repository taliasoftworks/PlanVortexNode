import { defineConfig } from "tsup";

/**
 * Doble salida ESM + CJS con sus dos juegos de tipos.
 *
 * Los dos formatos no son un lujo: el paquete es `"type": "module"`, y sin la salida CJS un
 * proyecto que todavia hace `require("planvortex")` no lo puede usar. Y sin `.d.cts` aparte, ese
 * proyecto resuelve los tipos ESM y TypeScript se queja de que el modulo no tiene llamada
 * `require` valida. Es exactamente lo que detecta `attw`, que corre en CI.
 */
export default defineConfig({
    entry: {
        index: "src/index.ts",
        "webhooks/index": "src/webhooks/index.ts",
    },
    format: ["esm", "cjs"],
    target: "node20",
    platform: "node",
    dts: true,
    sourcemap: true,
    clean: true,
    //Cero dependencias en runtime: si algo se colara, mejor que reviente el build a que viaje
    //dentro del bundle sin que nadie lo note.
    external: [],
    treeshake: true,
});
