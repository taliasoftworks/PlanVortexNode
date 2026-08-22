import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";
import globals from "globals";

export default [
    {
        ignores: ["dist/**", "coverage/**", "docs/**", "src/generated/**"],
    },
    js.configs.recommended,
    {
        files: ["**/*.ts"],
        languageOptions: {
            // `projectService` en vez de `project` fijo: asi los ficheros de configuracion
            // (tsup, vitest) tambien se analizan sin tener que meterlos en el tsconfig del paquete.
            parser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
                sourceType: "module",
            },
            globals: {
                ...globals.node,
                ...globals.es2022,
            },
        },
        plugins: {
            "@typescript-eslint": typescript,
        },
        rules: {
            ...typescript.configs.recommended.rules,
            // En TypeScript lo comprueba el compilador, y mejor: `no-undef` no conoce los tipos
            // globales que no existen en runtime (`RequestInit`, por ejemplo) y los da por
            // indefinidos. Es lo que recomienda el propio typescript-eslint.
            "no-undef": "off",
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            // El paquete no arrastra dependencias en runtime y es ESM: un `require` suelto seria
            // las dos cosas a la vez.
            "no-restricted-globals": [
                "error",
                { name: "require", message: "El paquete es ESM: usa import." },
            ],
        },
    },
];
