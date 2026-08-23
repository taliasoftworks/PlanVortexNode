# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versioning is
[semantic](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The account connection flow: `pv.organizations.createConnectToken(orgId, {social_network,
  redirect_uri})` mints the one-hour token a person needs to connect a social account, and
  `pv.asTemporalToken(token).accounts` exposes `connectLinks()`, `connect()` and `enable()`. App
  credentials are refused by those three (error 519) — that is the whole point of the flow, and the
  reason this is not something an app can do on its own.
- `connect()` turns the `errorCode` that `account-connect` returns **inside an HTTP 200** into the
  thrown error it would have been anywhere else, so the failure cannot be mistaken for an
  authorization that produced no accounts.
- `ConnectToken`, `ConnectLink`, `ConnectResult`, `EnableResult`, `ConnectTokenOptions`,
  `ConnectLinksOptions` and `ConnectCallbackParams` types.
- `examples/connect-flow.ts`: a dependency-free server that issues the token, redirects the user,
  welcomes them back and lists the account they connected.
- Package skeleton: dual ESM + CJS build with both sets of types, `vitest`, `eslint`, `prettier`,
  `typedoc`, and CI on Node 20, 22 and 24 with `publint` and `arethetypeswrong`.
- `PLANVORTEX_API_URL`, `VERSION` and `PLANVORTEX_ERROR_RANGES` from the main entry point.
- Webhooks, from `planvortex/webhooks`: `verifyWebhookSignature` (sha1 and sha256, compared with
  `crypto.timingSafeEqual`, and `false` rather than a throw on a malformed signature),
  `handleWebhookRequest` for any framework, `parseWebhookPayload`, and the `planvortexWebhooks()`
  middleware for Express. The middleware reads the request stream itself when nothing has parsed
  the body, so there is no `express.raw()` to forget, and answers 200 / 401 / 400 / 500.
- Webhook event types as a union discriminated by `field` — `AccountStateChange`,
  `MessageChange`, `CommentChange`, `IntegrationErrorChange` — with `isAccountStateChange`,
  `isMessageChange`, `isCommentChange` and `isIntegrationErrorChange` to narrow it, and a member
  for the events this version does not know yet so a new one does not break your build. The types
  are re-exported from the main entry point; the functions are not, so a webhook endpoint does not
  load the client.
- `WebhookSignatureError` and `WebhookBodyError`, both `PlanVortexError` subclasses with
  `family: "webhook"`.
- `WEBHOOK_SIGNATURE_HEADERS` and `WEBHOOK_EVENTS`, the latter now tied to the specification by a
  test instead of a hand-written list.
- `messageDirection`, `messageContact`, `messageContactId`, `messageFiles` and `messageFileIds`
  for the message fields the API returns populated in some places and as identifiers in others.
- `examples/webhooks.ts`: a receiver with no dependencies that can sign and post a delivery to
  itself, so you can see a 200 and a 401 without exposing your machine.
- `PlanVortex` client: `client_credentials` authentication against `POST /oauth/token` with an
  in-memory token cache, proactive refresh 60 s before expiry, and a lock so concurrent calls make
  a single token request. Credentials may also come from `PLANVORTEX_CLIENT_ID` /
  `PLANVORTEX_CLIENT_SECRET`. The constructor refuses to run in a browser unless
  `dangerouslyAllowBrowser` is passed.
- `pv.request(...)`: an authenticated request against any endpoint, with a single retry when the
  server reports an invalid token (codes 501 and 522, both inside an HTTP 400).
- `pv.asTemporalToken(token)`: the same client authenticated with a temporal connect token.
- Transport: 120 s default timeout, exponential backoff with full jitter for 429/502/503/504 and
  network failures, `Retry-After` support, and `onRequest` / `onResponse` / `onRetry` hooks. Domain
  errors are never retried, and a `POST` is only repeated when the request provably never left.
- Types generated from the public OpenAPI specification, exported from the main entry point:
  `Account`, `Publication`, `PublicationInput`, `Upload`, `Comment`, `Organization`, `Client`,
  `Conversation`, `Message`, `MessageOptions`, `MessageType`, `Contact`, `SocialIdentifier`,
  `Product`, `Integration`, `AiPlan`, `ClientApp` and the catalogue types, plus `Paginated<T>` and the raw `OpenApiPaths` /
  `OpenApiOperations` / `OpenApiComponents` escape hatch.
- Open enumerations: `SocialNetwork`, `CommentNetwork`, `PublicationState`, `PublicationType`,
  `FileType` and `FileFormat` autocomplete the known values and still accept a new one, so a
  network added to PlanVortex does not break your build.
- `npm run generate`: merges the per-section specifications into
  `openapi/planvortex.openapi.json` and regenerates `src/generated/openapi.d.ts`. Both files are
  committed; CI fails if they drift.
- Resources for the publishing path: `pv.catalog`, `pv.clients`, `pv.organizations`, `pv.accounts`,
  `pv.uploads` and `pv.publications`. `examples/publish.ts` walks the whole path.
- Every listing returns `{data, total}` regardless of how the API wraps it, and every one has an
  `iterate()` async iterator that chains the pages. The iterator stops on a short page rather than
  trusting `total`, which is counted by a separate query and does not always agree.
- File uploads accept a path, a `Buffer` or a `Blob`. A path streams from disk instead of reading
  the file into memory, and the part carries its own `content-type` — which is what the server
  reads to decide `file_type` and `file_format`.
- The catalogue is cached in memory per client, promise and all, so ten concurrent calls make one
  request. A failure is not cached. `pv.catalog.clearCache()` drops it.
- `accountId(publication)` and `account(publication)`: `id_account` comes back resolved from the
  single-publication operations and as a string from the listing.

### Fixed

- The published OpenAPI specification was audited field by field against the server for the
  publishing path, and the types regenerated from it. What was wrong: `Limit`, `Plan` and `Use`
  described three shapes that do not exist (`GET /organizations/{id}/limits` answers `accounts`,
  `publications`, `space`, `users`, `integrations`, `twitter_credits`, `ai_credits` — not a single
  documented name matched); `publication_errors` was documented as an object and is an array;
  `Publication` had no `social_network` and declared `files` as identifiers when every response
  resolves them; `MetricModel.stats` was an object and is an array; `aspect_ratio.value` was an
  integer and is the real division; the publication listing documented an `account_type` filter the
  server never reads, while its real `social_network` filter was undocumented, as were the account
  listing's `name` / `accounts` / `social_network` / `capability` and the metrics range.
- `required` is now declared across those schemas, so the fields the API always sends are no longer
  optional in the generated types.
- The webhook payload was audited against the server too, and it was wrong in both directions: it
  announced `message_reactions` and `mentions`, which the backend filters out and never delivers,
  and it was missing `messaging_postbacks`, `messaging_seen` and `messaging_error`, which it does.
  An integration failure was not described at all, even though it carries neither `id_account` nor
  `social_network` and therefore cannot share a type with an account change. `messageObj` was an
  untyped object.
- A message arrives with `contact_id`, `from_contact_id` and `message_options.files` **populated**
  in the messages listing and in every webhook delivery; the specification declared all three as
  identifiers. They are now `string | object`, which is what really happens.
- `Contact` was documented twice with two different shapes — the messaging section was missing
  `extra_data` and `last_contact_update` — and its address fields were declared as strings when
  five of them are `string | number`. There is one `Contact` now.

- Error classes by catalogue range: `AuthError`, `UserError`, `AccountError`, `FileError`,
  `PublicationError`, `OrganizationError`, `PlanLimitError`, `MessagingError`, `ContactError`,
  `ProductError`, `AiPlanError`, `IntegrationError`, plus `PlanVortexConnectionError`,
  `PlanVortexAuthenticationError` and `PlanVortexConfigError`. An unknown code falls back to
  `PlanVortexError` with its `code` and `message` untouched.
