# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versioning is
[semantic](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Package skeleton: dual ESM + CJS build with both sets of types, `vitest`, `eslint`, `prettier`,
  `typedoc`, and CI on Node 20, 22 and 24 with `publint` and `arethetypeswrong`.
- `PLANVORTEX_API_URL`, `VERSION` and `PLANVORTEX_ERROR_RANGES` from the main entry point.
- `WEBHOOK_SIGNATURE_HEADERS` and `WEBHOOK_EVENTS` from `planvortex/webhooks`.
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
  `Conversation`, `Message`, `Contact`, `Product`, `Integration`, `AiPlan`, `ClientApp`,
  `WebhookChange` and the catalogue types, plus `Paginated<T>` and the raw `OpenApiPaths` /
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

- Error classes by catalogue range: `AuthError`, `UserError`, `AccountError`, `FileError`,
  `PublicationError`, `OrganizationError`, `PlanLimitError`, `MessagingError`, `ContactError`,
  `ProductError`, `AiPlanError`, `IntegrationError`, plus `PlanVortexConnectionError`,
  `PlanVortexAuthenticationError` and `PlanVortexConfigError`. An unknown code falls back to
  `PlanVortexError` with its `code` and `message` untouched.
