# Contributing

Thanks for taking the time. This is the official Node client for the PlanVortex API, and it is
developed in the open.

## Before you start

- **Bugs and questions about the API itself** (an endpoint that answers something unexpected, a
  permission that does not behave) belong in PlanVortex support, not here. This repository is the
  client.
- **A new endpoint** normally does not start here either: the client's types are generated from the
  public OpenAPI specification, so an endpoint missing from the spec is a bug in the spec.

## Setting up

```bash
npm install
npm test
```

The tests need no network and no credentials, on purpose.

## Testing

There are three layers, and each one catches something the others cannot.

| Layer            | What it pins                                                                   | Command             | Cost                    |
| ---------------- | ------------------------------------------------------------------------------ | ------------------- | ----------------------- |
| **1 — unit**     | Our own logic: token cache, backoff, pagination, error mapping, the multipart. | `npm test`          | free                    |
| **2 — contract** | The request each method builds and how it parses the answer, with `msw`.       | `npm test`          | free                    |
| **3 — live**     | That the **server still answers what this client believes**.                   | `npm run test:live` | needs a real PlanVortex |

Layers 1 and 2 run in CI on every pull request, with a coverage floor (`vitest.config.ts`). They
never touch the network: an unmocked request fails the test, and so does a declared mock that no
method ever asked for — without that second half, a method that calls the wrong route goes green.

Layer 3 is the one that sees a renamed response envelope, an error code that moved, or a tenth
social network shipping without limits. It is **opt-in and never runs in CI**: copy
`.env.live.example` to `.env.live`, point `PLANVORTEX_LIVE_BASE_URL` at a server (your local
`docker compose` stack is the sensible choice) and fill in the credentials of a client app. Without
that file the whole layer skips and tells you what is missing — it never fails for lack of
credentials.

```bash
npm run test:live                          # read-only
LIVE_ALLOW_PUBLISH=1 npm run test:live     # uploads a file and schedules a post, then deletes both
```

Writes are off by default. Even switched on, nothing reaches a social network: the publication is
scheduled a day ahead and removed at the end of the test. Publishing for real needs a second,
deliberate switch, `LIVE_ALLOW_SOCIAL_PUBLISH=1` — that one is public, immediate and irreversible.
Writing against `api.planvortex.com` refuses to run unless you also pass `LIVE_ALLOW_PRODUCTION=1`.

## The rules that are not negotiable

- **Zero runtime dependencies.** Everything needed is in modern Node. A pull request that adds one
  will be asked to remove it.
- **Errors are classified by `code`, never by the HTTP status.** Every domain error arrives as an
  HTTP 400.
- **An unknown value is not an error.** The list of social networks, the publication states and the
  error catalogue all grow. A client that rejects a value it does not recognise breaks every
  integration the day PlanVortex adds a network.
- **No `POST` is ever retried once it reached the server.** Publishing twice is worse than failing.

## Sending a change

1. A branch off `main`.
2. `npm run lint`, `npm run typecheck` and `npm test` in green.
3. A line in `CHANGELOG.md` under _Unreleased_.
4. A pull request describing what changes for whoever uses the package.
