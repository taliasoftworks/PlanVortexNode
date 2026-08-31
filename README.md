<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/taliasoftworks/PlanVortexNode/main/assets/logo-horizontal-dark.png">
  <img src="https://raw.githubusercontent.com/taliasoftworks/PlanVortexNode/main/assets/logo-horizontal.png" alt="PlanVortex" width="300">
</picture>

# planvortex

[![npm](https://img.shields.io/npm/v/planvortex.svg?color=2036d8&label=npm)](https://www.npmjs.com/package/planvortex)
[![node](https://img.shields.io/node/v/planvortex.svg?color=2036d8)](https://nodejs.org)
[![CI](https://github.com/taliasoftworks/PlanVortexNode/actions/workflows/ci.yml/badge.svg)](https://github.com/taliasoftworks/PlanVortexNode/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/planvortex.svg?color=2036d8)](./LICENSE)

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

**[API reference](https://taliasoftworks.github.io/PlanVortexNode/)** — every method, option and
type, generated from the source on every push. The endpoints themselves are documented at
[planvortex.com/documentation](https://planvortex.com/documentation), and the runnable examples are
in [examples/](https://github.com/taliasoftworks/PlanVortexNode/tree/main/examples).

## Status

**Every endpoint of the API is covered.** Connecting accounts, publishing, the comment and
message inboxes, contacts, products, integrations, AI plans, the dashboard and the webhooks.

| Phase | What it adds                                             | State |
| ----- | -------------------------------------------------------- | ----- |
| 3     | Package skeleton: dual ESM/CJS build, tests, CI, release | done  |
| 4     | Transport, authentication and errors                     | done  |
| 5     | Types generated from the OpenAPI specification           | done  |
| 6     | Resources: the publishing path                           | done  |
| 7     | Resources: inbox and the rest                            | done  |
| 8     | Webhooks                                                 | done  |
| 9     | The account connection flow                              | done  |
| 10    | Three test layers, the third against a real PlanVortex   | done  |
| 11    | Documentation: reference, examples, guides               | done  |
| 12    | Published on npm with provenance                         | done  |

The version is a `0.x` on purpose. The shape of the client is settled and pinned by tests, but
nobody outside has used it against their own integration yet, so a break before `1.0.0` is
possible — and would arrive written down in
[MIGRATION.md](https://github.com/taliasoftworks/PlanVortexNode/blob/main/MIGRATION.md).

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
| `pv.catalog`       | `socialNetworks`, `socialLimits`, `socialCapabilities`, `socialCommentActions`, `allowedAspectRatios`, `publicationLimits`, `allowedSocialPublications`, `allowedSocialMessages`, `plannerTemplates` — all cached in memory per client |
| `pv.clients`       | `list`, `iterate`, `get`, `update`, `updateAiSettings`, `withOrganizations`, `organizations`, `iterateOrganizations`, `createOrganization`, `updateOrganization`, `deleteOrganization`                             |
| `pv.organizations` | `get`, `update`, `remove`, `children`, `iterateChildren`, `createChild`, `limits`, `use`, `createConnectToken`, `updateAiContext`, `updateSocialCredentials`, `deleteSocialCredentials`                            |
| `pv.accounts`      | `list`, `iterate`, `get`, `update`, `remove`, `metrics`, `metricList`, `getPersistentMenu`, `setPersistentMenu`, `connectLinks`, `connect`, `enable`                                                               |
| `pv.uploads`       | `create`, `list`, `iterate`, `get`, `update`, `remove`, `import`                                                                                                                                                   |
| `pv.publications`  | `create`, `get`, `list`, `iterate`, `listByAccount`, `update`, `updateByAccount`, `remove`, `retry`, `metrics`, `stats`, `listOnNetwork`                                                                           |
| `pv.comments`      | `list`, `iterate`, `unreadCount`, `thread`, `threadByAccount`, `replies`, `reply`, `update`, `markRead`, `remove`, `actions`                                                                                       |
| `pv.messages`      | `conversations`, `iterateConversations`, `conversationTotals`, `list`, `iterate`, `send`, `unreadCount`, `removeByAccount`, `templates`, `createTemplate`, `deleteTemplate`                                        |
| `pv.contacts`      | `list`, `iterate`, `get`, `create`, `update`, `merge`, `remove`, `removeAll`                                                                                                                                       |
| `pv.products`      | `list`, `iterate`, `get`, `create`, `catalogs`, `createCatalog`                                                                                                                                                           |
| `pv.integrations`  | `providers`, `list`, `iterate`, `get`, `connectLink`, `connect`, `reconnect`, `update`, `remove`, `pickerConfig`                                                                                                   |
| `pv.aiPlans`       | `create`, `get`, `list`, `iterate`, `validate`, `retry`, `regenerate`, `archive`, `unarchive`, `remove`                                                                                                            |
| `pv.dashboard`     | `summary`, `metrics`, `publications`, `topPublications`, `publicationStats`, `use`                                                                                                                                 |
| `pv.apps`          | `list`, `get`, `create`, `update`, `remove`, `secret` — **needs a user token**, not app credentials                                                                                                                |

Every documented endpoint has a method. `pv.request(...)` is still there as an escape hatch — for
an endpoint added to the API before this package catches up — and the response types are published,
so you can annotate what comes back:

```ts
import type { Comment } from "planvortex";

const { data } = await pv.request<{ comments: Comment[]; total: number }>({
    method: "GET",
    path: "/organizations/ORG_ID/comments",
});
```

These types are generated from the same OpenAPI specification the
[documentation](https://planvortex.com/documentation) is rendered from — published whole at
[planvortex.com/openapi.json](https://planvortex.com/openapi.json), if you would rather generate
your own client — so they cannot describe an endpoint that does not exist. One deliberate
exception to "generated": every enumeration that grows
with the product — `SocialNetwork`, `PublicationState`, `FileFormat` — is **open**. The known values
autocomplete, and a network added to PlanVortex next month does not break your build.

## AI plans, and what they are generated from

A plan is a **week** of drafts written by a model: you queue it, a job generates it, and what comes
out are ordinary publications in `draft` that you edit and validate. `template` says what the
content is generated FROM, and it is the only thing that changes between one plan and another —
publish days, language, tone and images stay cross-cutting options, and each template declares which
of them it accepts.

```ts
// The list, the prices and the fields of the source step. Cached, like the rest of the catalogue.
const templates = await pv.catalog.plannerTemplates();

// A week written from the customer's own photos, in the order that tells the story.
const { ai_plan, estimate } = await pv.aiPlans.create(clientId, orgId, {
    prompt: "Our autumn menu",
    accounts: [accountId],
    template: "from_images",
    source: {
        images: [
            { id_upload: first, description: "Dough resting on the bench" },
            { id_upload: second, description: "The loaf coming out of the oven" },
        ],
    },
});
console.log(estimate.images_target); // 0 — the pictures come from the source
```

Four things worth knowing before you build the screen:

- **The template that does not generate images does not spend image credits, and images are 94 % of
  a plan.** The same week — 7 publications, a picture on each — costs 519 credits as `standard` and
  **48** as `from_images`. Say it before the plan is created, not after it is charged.
- **`regenerate("image")` is per template**, not just per plan: the one that did not generate the
  picture cannot regenerate it. Read `regenerate.image` from the catalogue before you draw the
  button — on `from_images` it would charge 70 credits to replace the user's own photo with an
  invented one.
- **The source is validated when the plan is CREATED**, not when it is generated: the article is
  downloaded, the catalogue is read live and the product pictures are copied inside that call. So a
  broken source fails while your user is still there (2112 to 2116), and what gets stored is a
  snapshot — a `retry` three days later does not depend on the article still being online.
- **A plan is weekly and the source does not extend it.** Twelve photos with six slots left publish
  six, and the plan carries warning **2117** in `ai_plan.warnings` — a notice on a plan that
  generated fine, not an error. The slots are your publish days times your accounts, so you can say
  it in advance.

Do not hardcode the list, the costs or the field limits: `GET /planner_templates` publishes them
because the server is what charges them.

## The inbox

Comments and messages are two different sections, not one: a comment hangs off a **publication** and
its author is somebody you may never be able to write to; a message hangs off a **contact**. They
have their own permissions, and both need a paid plan.

```ts
// The inbox: reads from PlanVortex's database. Free, fast, and a snapshot.
const { data: comments } = await pv.comments.list(orgId, { unread: true, rating: [1, 2] });

// The thread: asked of the network right now, and reconciled with what was stored.
const thread = await pv.comments.thread(orgId, publicationId);
console.log(thread.credits_consumed); // X charges one credit per comment read

// Only offer what the network allows.
const actions = await pv.comments.actions("instagram");
if (actions?.delete_others) {
    await pv.comments.remove(orgId, commentId);
}
```

Four things that surprise everybody:

- **The inbox and the thread are not the same read.** The inbox is a photograph — `collected_date`
  says how old — and costs nothing. The thread is live, and on X it costs a credit per comment
  returned. That is also why there is no `iterate()` for a thread.
- **They paginate differently.** The inbox takes a numeric `offset`; the thread takes back the
  opaque `next_cursor` of the previous page, as `offset`.
- **A Google Business review hangs off the listing, not off a post**, so it has its own route:
  `pv.comments.threadByAccount(orgId, accountId)`. It can arrive with a `rating` and no text at all.
- **Reading a message thread marks it read.** First page only, and there is no way to opt out — it
  is what makes `unreadCount()` go down.

A complete, runnable version is in [examples/comments.ts](examples/comments.ts) — the badge, the
inbox, the action matrix, a live thread and a reply. It only replies when you ask it to.

```ts
const { data: conversations } = await pv.messages.conversations(orgId, accountId);
await pv.messages.send(orgId, accountId, conversations[0].contact._id, {
    message_type: "simple_message",
    text: "We open from 9 to 14",
});
```

Message templates are **WhatsApp only**. Every other network answers HTTP 500 with `code: 500`
rather than the 1502 you would expect, so check the account's network first.

## Connecting a social account

**An app cannot connect one.** Authorizing Instagram is an OAuth flow with a person in front of it,
so app credentials are refused (error 519) by every endpoint of this flow. What an app does instead
is mint a one-hour token, hand it to its user, and wait for them to come back. Your `client_secret`
never leaves your server.

```ts
// On your server, when your user asks to connect a social account:
const connect = await pv.organizations.createConnectToken(orgId, {
    // Must be one of the app's registered redirect_urls, or you get error 532.
    redirect_uri: "https://your-app.example/done",
});

response.redirect(connect.url); // PlanVortex takes over, and returns them to your redirect_uri
```

`connect.url` is the hosted path, and the one you want: PlanVortex asks which network, runs the
OAuth, and shows the person which accounts to enable. `connect.token` is the same credential on its
own, for when you would rather render the picker yourself:

```ts
const guest = pv.asTemporalToken(connect.token);
const links = await guest.accounts.connectLinks(orgId); // one authorization URL per network
```

Three things that surprise everyone:

- **A network that cannot be connected right now simply does not appear** in `connectLinks()`. That
  is an answer, not a failure — Discord in an organization that has not saved its own bot
  credentials, for instance.
- **The network sends the user back to PlanVortex, not to you.** Its `redirect_uri` has to be
  registered in the network's own app settings, so it can never be a URL of yours. Where _your_ user
  ends up afterwards is the `redirect_uri` you passed to `createConnectToken`.
- **A connected account is not an enabled account.** One authorization can produce several — a
  Facebook user with four pages — and none of them takes a plan slot or publishes until
  `accounts.enable()` is called on it. That is also the call that answers 706 when the plan is full.

A complete, runnable version is in [examples/connect-flow.ts](examples/connect-flow.ts).

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
    body: await request.text(), // the RAW body
    headers: request.headers, // a Headers or a plain object
    secret: process.env.PLANVORTEX_CLIENT_SECRET!,
});
```

Both throw `WebhookSignatureError` when the signature is missing or wrong, and `WebhookBodyError`
when the body is not raw bytes, not JSON, or not an array. If you only want the check,
`verifyWebhookSignature({payload, signature, secret})` returns a boolean and never throws on a
malformed signature.

### The events

| `field`                | What happened                                            | Where the payload is          |
| ---------------------- | -------------------------------------------------------- | ----------------------------- |
| `new_account`          | An account was connected                                 | —                             |
| `change_state_account` | An account changed state: broke, refreshed, disconnected | —                             |
| `messages`             | A message came in                                        | `messageObj`                  |
| `messaging_postbacks`  | The contact pressed a button or a quick reply            | `messageObj`                  |
| `messaging_seen`       | The contact read the conversation                        | `messageObj`, when we have it |
| `messaging_error`      | The network refused a message you sent                   | `messageObj.message_errors`   |
| `comments`             | A comment came in                                        | `commentObj`                  |
| `integration_error`    | An integration stopped working                           | `provider`, `error_code`      |

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

The class you catch comes from the **range** the code falls in. There is no separate list to keep:
the same ranges are published in the API documentation, and `PLANVORTEX_ERROR_RANGES` exports them
if you would rather branch on `error.family`.

| Codes                | What went wrong                                        | Class               |
| -------------------- | ------------------------------------------------------ | ------------------- |
| 500-542              | Authentication, tokens, permissions, client apps       | `AuthError`         |
| 601-612              | Users                                                  | `UserError`         |
| 700-715              | Social accounts — disconnected, revoked, no slot left  | `AccountError`      |
| 800-810              | Files                                                  | `FileError`         |
| 900-960              | Publications, including every per-network limit        | `PublicationError`  |
| 1000-1003            | General                                                | `PlanVortexError`   |
| 1100-1111            | Organizations                                          | `OrganizationError` |
| 1200-1207            | Roles                                                  | `PlanVortexError`   |
| 1300-1307, 1400-1408 | Plan quota exhausted, at client and organization level | `PlanLimitError`    |
| 1500-1512            | Messaging                                              | `MessagingError`    |
| 1600-1601            | Contacts                                               | `ContactError`      |
| 1900-1906            | Payments                                               | `PlanVortexError`   |
| 2000-2099            | Products                                               | `ProductError`      |
| 2100-2199            | AI plans                                               | `AiPlanError`       |
| 2200-2299            | Integrations                                           | `IntegrationError`  |

A code outside every range — the catalogue grows — arrives as the base `PlanVortexError` with its
`code` and `message` untouched, never swallowed and never renamed. And when the failure never got a
code from the server, `error.code` is **0** and `error.family` says which kind it was: `connection`
(the request never completed), `oauth` (the token exchange itself was rejected, a
`PlanVortexAuthenticationError`), `config` (this package complaining about how it was constructed),
`http` (a status with no PlanVortex body, typically a proxy) or `webhook`.

Two codes deserve their own mention: **516** is "this needs a paid plan", which is what the comment
and message inboxes answer on a free one, and **519** is "an app cannot do this", which is the whole
account-connection flow.

What the core does on your behalf: exchanges your credentials at `POST /oauth/token` and caches the
token, refreshes it a minute before it expires, collapses concurrent calls into a **single** token
request, retries 429/502/503/504 and network failures with exponential backoff and jitter, honours
`Retry-After`, and turns every error body into a typed class. It never retries a domain error, and
it never repeats a `POST` that reached the server.

## Six things to know before you write any code

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

**Some fields arrive populated and some arrive as identifiers, and it depends on the operation.**
`publication.id_account` is resolved when you read one publication and a string in the listing;
`comment.id_account` and `comment.id_publication` are the other way round — resolved in the inbox
and strings everywhere else; a message's contact and files are resolved in the listing and in the
webhook. The types say `string | object` because both really happen, and there are helpers so you
do not write the `typeof` yourself: `accountId`, `account`, `publicationId`, `publication`,
`messageContact`, `messageContactId`, `messageFiles`.

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
npm run docs         # the TypeDoc reference, into docs/
npm run generate     # refresh the OpenAPI copy from PlanVortexHome and regenerate the types
npm run check:exports  # publint + arethetypeswrong
npm run test:live    # against a real PlanVortex; needs .env.live, and skips itself without it
```

Every example runs as it is — `npx tsx examples/publish.ts` — against whatever
`PLANVORTEX_BASE_URL` points at. Point it at a local stack while you try things: the two that write
in public, publishing for real and replying to a comment, are behind their own environment
variables and do nothing without them.

## License

MIT
