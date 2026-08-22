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

The tests need no network and no credentials, on purpose. If a change of yours cannot be tested
without hitting a real API, it probably belongs in the live layer (`test/live/`), which is opt-in
and never runs in CI for a pull request.

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
3. A line in `CHANGELOG.md` under *Unreleased*.
4. A pull request describing what changes for whoever uses the package.
