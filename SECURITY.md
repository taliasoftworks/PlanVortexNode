# Security policy

## Reporting a vulnerability

**Do not open a public issue.** Write to <contact@planvortex.com> with the details and, if you can,
a way to reproduce it. You will get an answer within a few working days.

Please include the package version, the Node version, and whether the problem is in this client or
in the PlanVortex API behind it.

## What is in scope

This package is a client. Vulnerabilities in it typically look like: a secret being logged or
included in an error, a webhook signature that can be forged or bypassed, or a request being sent
somewhere other than the configured `baseUrl`.

## A note on where your secret lives

This is a server-side package. The `client_credentials` flow needs your `client_secret`, and putting
it in a browser bundle hands over the account. That is not a vulnerability in the package — it is
the reason the package refuses to run in a browser, and the reason the temporal connect token
exists for the browser side of the flow.

## Supported versions

The latest published minor version receives security fixes.
