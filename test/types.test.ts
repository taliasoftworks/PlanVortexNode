/**
 * Los tipos generados del OpenAPI (fase 5).
 *
 * Un tipo no se puede "ejecutar", asi que lo que se comprueba aqui es de dos clases:
 *
 *  - Lo que SI se puede mirar en tiempo de ejecucion: el paquete OpenAPI commiteado. Que este,
 *    que sea 3.1, que traiga las operaciones que se pactaron, que no haya dos `operationId`
 *    iguales y que los `$ref` apunten a algo. Si algo de esto falla, lo generado esta mal aunque
 *    compile.
 *  - Que los tipos publicos SIGAN SIENDO los que se prometieron. Se hace con asignaciones que el
 *    compilador tiene que aceptar, mas `expectTypeOf` de vitest para lo que hay que negar: que
 *    una red nueva compile (§ trampa 8) y que ningun tipo publico sea `any`.
 *
 * Lo que este fichero NO puede comprobar es que el paquete corresponda al spec de PlanVortexHome,
 * porque ese spec vive en otro repositorio y aqui puede no estar. Eso lo hace
 * `openapi_freshness.test.ts`, que se salta entero cuando no lo encuentra.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";

import { account, accountId } from "../src/index.js";
import type {
    Account,
    Comment,
    CommentNetwork,
    OpenApiComponents,
    Paginated,
    Publication,
    PublicationInput,
    PublicationState,
    SocialAuthorizationMethod,
    SocialNetwork,
    Upload,
} from "../src/index.js";

/** Una cuenta y una publicacion minimas, con todo lo que el spec declara obligatorio y nada mas. */
const cuenta: Account = {
    _id: "66d04a6a427f4c43b9d97f54",
    id_organization: "66d04a6a427f4c43b9d97f00",
    id_client: "66d04a6a427f4c43b9d97f01",
    name: "Panaderia Nordwind",
    social_network: "instagram",
    creation_date: "2026-08-22T09:00:00.000Z",
    error_code: 0,
};

const publicacion: Publication = {
    _id: "66d04a6a427f4c43b9d97f60",
    id_organization: cuenta.id_organization,
    id_account: cuenta._id,
    social_network: "instagram",
    publication_type: "profile",
    state: "ready",
    files: [],
    publication_errors: [],
    retries: 0,
    creation_date: "2026-08-22T09:00:00.000Z",
};

/* eslint-disable @typescript-eslint/no-explicit-any -- se recorre un documento JSON arbitrario */
const bundle = JSON.parse(
    readFileSync(fileURLToPath(new URL("../openapi/planvortex.openapi.json", import.meta.url)), "utf8"),
) as any;

const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

function operations(items: Record<string, Record<string, any>>): { key: string; operation: any }[] {
    return Object.entries(items).flatMap(([route, item]) =>
        Object.entries(item)
            .filter(([method]) => HTTP_METHODS.includes(method))
            .map(([method, operation]) => ({ key: `${method.toUpperCase()} ${route}`, operation })),
    );
}

describe("el paquete OpenAPI commiteado", () => {
    /**
     * Se commitea a proposito: el spec vive en PlanVortexHome y la CI de este repositorio solo
     * clona este. Sin la copia no habria nada de lo que regenerar, y el `git diff --exit-code`
     * que vigila que los tipos no se queden viejos no vigilaria nada.
     */
    it("existe, va en 3.1 y sale de los 16 documentos del spec", () => {
        expect(bundle.openapi).toBe("3.1.0");
        expect(bundle["x-planvortex-bundle"].sources).toHaveLength(16);
    });

    it("apunta al API publico y a su unica version", () => {
        expect(bundle.servers).toEqual([{ url: "https://api.planvortex.com/v1.0.0" }]);
    });

    /**
     * 132 operaciones y el webhook de comentarios. No es una cifra de cobertura: es el alcance
     * publico que se pacto en la fase 2, y si cambia es que alguien ha movido superficie publica.
     */
    it("trae las operaciones del alcance", () => {
        expect(operations(bundle.paths)).toHaveLength(132);
        expect(Object.keys(bundle.webhooks)).toEqual(["comments"]);
    });

    /**
     * El `operationId` es el nombre con el que un generador bautiza cada metodo. Redocly comprueba
     * que sea unico DENTRO de cada fichero y no entre ficheros, asi que hasta esta fase convivian
     * dos `getOrganizationsService` en documentos distintos: al unirlos, uno se comia al otro.
     */
    it("no repite ningun operationId", () => {
        const ids = [...operations(bundle.paths), ...operations(bundle.webhooks)].map(
            ({ operation }) => operation.operationId as string,
        );

        expect(ids.filter((id) => !id)).toEqual([]);
        expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
    });

    /**
     * Al unir se renombran los componentes con su dominio delante, y reescribir mal un `$ref`
     * deja un tipo apuntando al vacio. `openapi-typescript` no se queja: emite `unknown`.
     */
    it("no deja ningun $ref colgando", () => {
        const found = JSON.stringify(bundle).match(/#\/components\/[a-zA-Z]+\/[A-Za-z0-9_.-]+/g) || [];
        const broken = [...new Set(found)].filter((ref) => {
            const [, , section, name] = ref.split("/") as [string, string, string, string];
            return bundle.components?.[section]?.[name] === undefined;
        });

        expect(broken).toEqual([]);
    });

    /**
     * Las definiciones compartidas (`Error`, `Success`, `SocialNetwork`) se copian identicas a
     * cada documento del spec, asi que al unir tienen que quedarse en UNA y sin prefijo. Si
     * aparecieran prefijadas seria que una copia derivo y el generador las tomo por tipos
     * distintos, que es exactamente lo que se quiso evitar copiandolas.
     */
    it("une las definiciones compartidas en una sola", () => {
        const names = Object.keys(bundle.components.schemas);

        expect(names).toContain("Error");
        expect(names).toContain("Success");
        expect(names).toContain("SocialNetwork");
        expect(names.filter((name) => /^[A-Z][a-z]+(Error|Success|SocialNetwork)$/.test(name))).toEqual([]);
    });

    /** El sobre de cada respuesta es contrato: la libreria desenvuelve por el nombre exacto */
    it("los sobres de respuesta son los que devuelve el servidor", () => {
        const schemas = bundle.components.schemas;

        expect(Object.keys(schemas.PublicationsPublicationOne.properties)).toEqual(["publication"]);
        expect(Object.keys(schemas.PublicationsPublicationList.properties)).toEqual([
            "publications",
            "total",
        ]);
        expect(Object.keys(schemas.OrganizationsOrganizationOne.properties)).toEqual(["organization"]);
        expect(Object.keys(schemas.UploadsUploadOne.properties)).toEqual(["upload"]);
        expect(Object.keys(schemas.AccountsAccountOne.properties)).toEqual(["account"]);
    });
});

describe("los tipos publicos", () => {
    /**
     * Trampa 8: `ALLOWED_RRSS` crece varias veces al ano. Con una union cerrada, la undecima red
     * dejaria de compilar el codigo de TODOS los integradores el dia que entrase, sin que ellos
     * hubieran tocado nada. Este test es el que se pondria rojo si alguien "limpiara" el
     * `(string & {})` por parecer un truco.
     */
    it("admiten una red que este paquete todavia no conoce", () => {
        const conocida: SocialNetwork = "bluesky";
        const nueva: SocialNetwork = "una_red_que_no_existe_todavia";

        expect([conocida, nueva]).toHaveLength(2);
        expectTypeOf<"mastodon">().toExtend<SocialNetwork>();
        expectTypeOf<"withErrors">().toExtend<PublicationState>();
    });

    /** Y siguen autocompletando: si se hubieran colapsado a `string`, esto no seria un literal */
    it("conservan los valores conocidos para el autocompletado", () => {
        expectTypeOf<SocialNetwork>().extract<"instagram">().toEqualTypeOf<"instagram">();
    });

    /**
     * Ningun tipo publico puede ser `any`: un `any` compila con cualquier cosa, asi que un tipo
     * mal generado pasaria desapercibido justo donde mas duele.
     */
    it("no son `any`", () => {
        expectTypeOf<Account>().not.toBeAny();
        expectTypeOf<Publication>().not.toBeAny();
        expectTypeOf<Upload>().not.toBeAny();
        expectTypeOf<Comment>().not.toBeAny();
        expectTypeOf<OpenApiComponents>().not.toBeAny();
    });

    /** Los campos del recurso NO se renombran (§ trampa 6): `_id` se queda `_id` */
    it("conservan los nombres de campo de la API", () => {
        expectTypeOf<Account>().toHaveProperty("_id");
        expectTypeOf<Account>().toHaveProperty("id_organization");
        expectTypeOf<Publication>().toHaveProperty("publication_errors");
        expectTypeOf<Upload>().toHaveProperty("public_path");
        //Google Business: una resena cuelga de la ficha, no de una publicacion nuestra.
        expectTypeOf<Comment>().toHaveProperty("publication_external_id");
        expectTypeOf<Comment>().toHaveProperty("rating");
    });

    /** El `{data, total}` de la libreria, que es igual en todos los dominios */
    it("paginan siempre igual", () => {
        const page: Paginated<Account> = {
            data: [cuenta],
            total: 1,
        };

        expect(page.total).toBe(1);
        expectTypeOf(page.data).toEqualTypeOf<Account[]>();
    });

    /**
     * La fase 6 audito el spec del camino de publicar contra `src/domain/**` y declaro los
     * `required`. Que estos campos ya NO lleven `?` es el resultado, y es lo que evita que el
     * integrador tenga que escribir `account.name ?? ""` para algo que la API manda siempre.
     */
    it("no dejan opcional lo que la API manda siempre", () => {
        expectTypeOf<Account>().toExtend<{ _id: string; name: string; error_code: number }>();
        expectTypeOf<Upload>().toExtend<{ _id: string; public_path: string }>();
        expectTypeOf<Publication>().toExtend<{ _id: string; retries: number }>();
    });

    /**
     * `publication_errors` es un ARRAY. El spec lo declaraba como objeto y no lo era: el modelo es
     * `@prop({default: [], type: PublicationErrorClass}) publication_errors[]`. Con el tipo
     * antiguo, un `if (publication.publication_errors.code === 940)` compilaba y no se cumplia
     * nunca.
     */
    it("dan `publication_errors` como lista", () => {
        expectTypeOf<Publication["publication_errors"]>().toExtend<{ code: number }[]>();
    });

    /**
     * `files` viene POBLADO en todas las respuestas (el servidor hace `populate("files")` en las
     * seis rutas). Identificadores es lo que se manda, no lo que se recibe.
     */
    it("dan los ficheros de una publicacion resueltos, no como identificadores", () => {
        expectTypeOf<Publication["files"]>().toEqualTypeOf<Upload[]>();
        expectTypeOf<PublicationInput["files"]>().toExtend<string[] | undefined>();
    });

    /**
     * `id_account` cambia de forma segun la operacion, y el tipo lo dice en vez de taparlo. Los
     * dos ayudantes son la salida para no escribir el `typeof` en cada sitio.
     */
    it("admiten `id_account` de las dos formas en que la API lo manda", () => {
        const listada = { ...publicacion, id_account: cuenta._id };
        const leida = { ...publicacion, id_account: cuenta };

        expect(accountId(listada)).toBe(cuenta._id);
        expect(accountId(leida)).toBe(cuenta._id);
        expect(account(listada)).toBeUndefined();
        expect(account(leida)).toEqual(cuenta);
    });
});

/**
 * Telegram, que es la red que este paquete puede quedarse sin conocer SIN ROMPERSE.
 *
 * Es la trampa de la fase 10 del roadmap: los tipos salen de una copia commiteada del OpenAPI, y
 * `SocialNetwork` es una enumeracion ABIERTA, asi que `"telegram"` compila igual con el spec viejo
 * — sin error, sin aviso, sin autocompletado—. Lo unico que se estrecha de verdad son las uniones
 * CERRADAS que cuelgan del spec, y son las que se fijan aqui: si alguien toca el spec y no corre
 * `npm run generate`, esto se pone rojo. `openapi_freshness.test.ts` mira lo mismo un piso mas
 * arriba, pero se salta entero cuando PlanVortexHome no esta al lado.
 */
describe("la undecima red vive en las uniones cerradas, no en las abiertas", () => {
    it("autocompleta `telegram` donde la enumeracion es abierta", () => {
        expectTypeOf<SocialNetwork>().extract<"telegram">().toEqualTypeOf<"telegram">();
        expectTypeOf<CommentNetwork>().extract<"telegram">().toEqualTypeOf<"telegram">();
    });

    /**
     * `authorization.type` es la union cerrada que de verdad importa, y encima es CONTRATO NUEVO:
     * Telegram no se autoriza con una redireccion. Quien ramifique con un `if/else` de dos ramas
     * manda a su usuario a un chat del que no vuelve nadie, asi que el tercer valor tiene que
     * existir en el tipo para que su `switch` deje de ser exhaustivo y el compilador se lo diga.
     */
    it("declara el tercer tipo de autorizacion, con los dos campos del bot", () => {
        const telegram: SocialAuthorizationMethod = {
            type: "telegram_bot",
            bot_username: "PlanVortexBot",
            add_to_group_link: "https://t.me/PlanVortexBot?startgroup=true&admin=delete_messages",
        };

        expect(telegram.type).toBe("telegram_bot");
        expectTypeOf<SocialAuthorizationMethod["type"]>().toEqualTypeOf<
            "redirect" | "meta_embedded_signup" | "telegram_bot"
        >();
    });

    /** La red publica, asi que el `social_network` del cuerpo de publicar tiene que aceptarla. */
    it("la admite en el cuerpo cerrado de publicar del spec", () => {
        expectTypeOf<OpenApiComponents["schemas"]["PublicationsPublicationInput"]["social_network"]>()
            .extract<"telegram">()
            .toEqualTypeOf<"telegram">();
    });

    /** Y en el catalogo de redes con comentarios, que es la otra union cerrada del spec. */
    it("la admite en la lista cerrada de redes con comentarios del spec", () => {
        expectTypeOf<OpenApiComponents["schemas"]["CommentsCommentNetworkName"]>()
            .extract<"telegram">()
            .toEqualTypeOf<"telegram">();
    });

    /**
     * Y NO esta en los canales de contacto, que es lo contrario de un olvido: esta red no tiene
     * mensajes directos, y meterla ahi prometeria una bandeja de chat que no existe.
     */
    it("no esta entre los canales de un contacto: Telegram no tiene mensajes directos", () => {
        expectTypeOf<OpenApiComponents["schemas"]["ContactChannel"]>().extract<"telegram">().toBeNever();
    });
});
