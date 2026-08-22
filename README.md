# planvortex

Official Node.js client for the [PlanVortex](https://planvortex.com) API: connect social accounts,
schedule and publish posts, read comments and messages, and verify webhooks.

> **This is a server-side package. Do not use it in a browser.**
> Authenticating uses the `client_credentials` flow, which needs your `client_secret`. A secret
> inside a front-end bundle is your whole account handed over. To let _an end user_ connect their
> own social account from a browser, issue a **temporal connect token** instead — it lasts an hour,
> is tied to a single organization, and can only create accounts.

```bash
npm install planvortex
```

Requires **Node 20 or newer** (`fetch`, `FormData`, `Blob` and `fs.openAsBlob` are globals there)
and has **zero runtime dependencies**.

## Status

**Early. The publishing path and the webhooks work; the inbox does not, yet.**

| Phase | What it adds                                             | State   |
| ----- | -------------------------------------------------------- | ------- |
| 3     | Package skeleton: dual ESM/CJS build, tests, CI, release | done    |
| 4     | Transport, authentication and errors                     | done    |
| 5     | Types generated from the OpenAPI specification           | done    |
| 6     | Resources: the publishing path                           | done    |
| 7     | Resources: inbox and the rest                            | pending |
| 8     | Webhooks                                                 | done    |
| 9     | The account connection flow                              | pending |

## Publishing

```ts
import { PlanVortex } from "planvortex";

const pv = new PlanVortex({
    clientId: process.env.PLANVORTEX_CLIENT_ID,
    clientSecret: process.env.PLANVORTEX_CLIENT_SECRET,
});

// The accounts you can actually publish with. The server applies the same capability matrix it
// publishes at GET /social_capabilities, so you never keep your own table of what each network does.
const { data: accounts } = await pv.accounts.list(orgId, { capability: "publications" });

// A path is the form that does not read the file into memory. A Buffer or a Blob also work.
const upload = await pv.uploads.create(orgId, { file: "./hogaza.jpg" });

const publication = await pv.publications.create(orgId, accounts[0]._id, {
    social_network: accounts[0].social_network,
    text: "Nuevo horno, nuevas hogazas",
    files: [upload._id],
    publish_date: new Date("2026-09-01T10:00:00Z"),
});

// A publication whose content does not fit the network is NOT an error: it is saved in state
// `withErrors` with the reason inside. A try/catch alone reports it as published.
if (publication.state === "withErrors") {
    console.error(publication.publication_errors.map((failure) => failure.message));
}
```

A complete, runnable version is in [examples/publish.ts](examples/publish.ts).

Every listing pages the same way — `{data, total}` — and every one has an iterator that chains the
pages for you:

```ts
const { data, total } = await pv.publications.list(orgId, { state: ["ready"], limit: 50 });

for await (const publication of pv.publications.iterate(orgId, { state: ["ready"] })) {
    // ...
}
```

### What is available

| Resource           | Methods                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pv.catalog`       | `socialNetworks`, `socialLimits`, `socialCapabilities`, `socialCommentActions`, `allowedAspectRatios`, `publicationLimits`, `allowedSocialPublications`, `allowedSocialMessages` — all cached in memory per client |
| `pv.clients`       | `list`, `iterate`, `get`, `update`, `organizations`, `iterateOrganizations`, `createOrganization`, `updateOrganization`, `deleteOrganization`                                                                      |
| `pv.organizations` | `get`, `update`, `remove`, `children`, `iterateChildren`, `createChild`, `limits`, `use`                                                                                                                           |
| `pv.accounts`      | `list`, `iterate`, `get`, `update`, `remove`, `metrics`, `metricList`, `getPersistentMenu`, `setPersistentMenu`                                                                                                    |
| `pv.uploads`       | `create`, `list`, `iterate`, `get`, `update`, `remove`, `import`                                                                                                                                                   |
| `pv.publications`  | `create`, `get`, `list`, `iterate`, `listByAccount`, `update`, `remove`, `retry`, `metrics`, `stats`, `listOnNetwork`                                                                                              |

Anything not covered yet is reachable through the generic `pv.request(...)`, and the response types
are already published, so you can annotate what comes back:

```ts
import type { Comment } from "planvortex";

const { data } = await pv.request<{ comments: Comment[]; total: number }>({
    method: "GET",
    path: "/organizations/ORG_ID/comments",
});
```

These types are generated from the same OpenAPI specification the
[documentation](https://planvortex.com/documentation) is rendered from, so they cannot describe an
endpoint that does not exist. One deliberate exception to "generated": every enumeration that grows
with the product — `SocialNetwork`, `PublicationState`, `FileFormat` — is **open**. The known values
autocomplete, and a network added to PlanVortex next month does not break your build.

## Webhooks

PlanVortex `POST`s to your app's `webhook_url` when something happens. **The body is an array of
changes**, and each one carries `field` telling you what it is.

```ts
import express from "express";
import { planvortexWebhooks, isCommentChange, isMessageChange } from "planvortex/webhooks";

const app = express();

app.post(
    "/webhooks/planvortex",
    planvortexWebhooks({
        secret: process.env.PLANVORTEX_CLIENT_SECRET!,
        onChanges: async (changes) => {
            for (const change of changes) {
                if (isCommentChange(change)) await moderate(change.commentObj);
                if (isMessageChange(change)) await reply(change.messageObj);
            }
        },
    }),
);
```

No `express.raw()` is needed in front: if nothing has parsed the body yet, the middleware reads the
stream itself. It answers 200 when your handler returns, 401 when the signature does not match, 400
when the body is not what it should be, and 500 when your handler throws.

Outside Express — Hono, Fastify, a Next route handler — use the framework-agnostic function:

```ts
import { handleWebhookRequest } from "planvortex/webhooks";

const changes = handleWebhookRequest({
    body: await request.text(),          // the RAW body
    headers: request.headers,            // a Headers or a plain object
    secret: process.env.PLANVORTEX_CLIENT_SECRET!,
});
```

Both throw `WebhookSignatureError` when the signature is missing or wrong, and `WebhookBodyError`
when the body is not raw bytes, not JSON, or not an array. If you only want the check,
`verifyWebhookSignature({payload, signature, secret})` returns a boolean and never throws on a
malformed signature.

### The events

| `field` | What happened | Where the payload is |
|---|---|---|
| `new_account` | An account was connected | — |
| `change_state_account` | An account changed state: broke, refreshed, disconnected | — |
| `messages` | A message came in | `messageObj` |
| `messaging_postbacks` | The contact pressed a button or a quick reply | `messageObj` |
| `messaging_seen` | The contact read the conversation | `messageObj`, when we have it |
| `messaging_error` | The network refused a message you sent | `messageObj.message_errors` |
| `comments` | A comment came in | `commentObj` |
| `integration_error` | An integration stopped working | `provider`, `error_code` |

`isAccountStateChange`, `isMessageChange`, `isCommentChange` and `isIntegrationErrorChange` narrow
a change to its own type. Use them rather than a `switch`: the union carries a member for the
`field`s this version does not know yet — the list grows — and TypeScript cannot rule that one out
of a `case`.

Two things about the payload that are easy to get wrong. An **integration** change carries neither
`id_account` nor `social_network`, because an integration hangs off the organization. And
`messageObj` arrives **populated**: `contact_id`, `from_contact_id` and `message_options.files`
carry whole objects rather than identifiers, which is what `messageContact`, `messageContactId`,
`messageDirection` and `messageFiles` are for.

**Meta repeats deliveries**, and PlanVortex does not retry a failed one. Deduplicate on
`commentObj.external_id`, and if your work is slow, queue it and return.

## Errors

```ts
import { PlanVortex, PlanLimitError, PlanVortexError } from "planvortex";

try {
    await pv.publications.create(orgId, accountId, { social_network: "instagram", text: "..." });
} catch (error) {
    if (error instanceof PlanLimitError) {
        // Plan quota exhausted (codes 1300-1408). Retrying will not help.
    } else if (error instanceof PlanVortexError) {
        console.error(error.code, error.message, error.data, error.status);
    }
}
```

What the core does on your behalf: exchanges your credentials at `POST /oauth/token` and caches the
token, refreshes it a minute before it expires, collapses concurrent calls into a **single** token
request, retries 429/502/503/504 and network failures with exponential backoff and jitter, honours
`Retry-After`, and turns every error body into a typed class. It never retries a domain error, and
it never repeats a `POST` that reached the server.

## Five things to know before you write any code

**Classify errors by `code`, never by the HTTP status.** Every domain error travels with HTTP 400 —
an expired token, a disconnected account, an exhausted plan quota and a text that is too long are
all 400. Only error 520 (permissions) answers 401. An `if (res.status === 401) refresh()` is a silent
bug: the token errors, 501 and 522, arrive inside a 400.

**An app cannot connect social accounts.** Authorizing Instagram is an OAuth flow with a person in
front of it, so those endpoints refuse app credentials. Your server issues a temporal connect token,
your end user completes the flow with it, and the account lands in your organization.

**A publication that does not fit the network is not an error.** It is stored with
`state: "withErrors"` and the reason in `publication_errors` — which is an **array**. Check the
state; a `try/catch` will not tell you.

**`upload.public_path` expires.** It is a signed URL, not a permanent link: identical within the
same hour, gone afterwards. Do not store it in your database — ask for the upload again.

**A webhook signature is computed over the raw body.** Not over a re-serialized copy of the parsed
JSON: the bytes differ and the signature never matches. Either let `planvortexWebhooks()` read the
stream, or put `express.raw({ type: "application/json" })` in front of that one route. A global
`express.json()` is what breaks it, and it breaks it silently.

## Development

```bash
npm install
npm run build        # dual ESM + CJS with both sets of types
npm test             # no network, no credentials
npm run typecheck
npm run lint
npm run generate     # regenerate the OpenAPI bundle and the types
npm run check:exports  # publint + arethetypeswrong
```

## License

MIT
