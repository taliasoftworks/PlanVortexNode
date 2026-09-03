# Migration guide

Breaking changes, version by version, with what to do about each. A release note scrolls away; this
does not.

## 0.7.0 → 0.8.0

One field disappeared from a public type and three error families grew. Nothing changed on the wire:
the server stopped charging for publications on 02-09-2026 and opened the public API to every plan,
and this release is the types catching up with both.

### `PlanData.publications` is gone

**Publications are unlimited on every plan**, so there is no quota to describe. The count itself did
not disappear — it moved to the new `PlanUseData`, which is what `actual_use` has always been in
practice: a plan plus `publications`.

```ts
const use = await pv.organizations.use(idOrganization);

use.limits.publications;      // ✗ no longer compiles — and already returned undefined
use.actual_use.publications;  // ✓ PlanUseData: the month's count, with no ceiling to compare it to
```

**What to do:** if you drew a progress bar for publications, delete it — there is no denominator.
Print the count on its own. What throttles publishing is **rate**, not the plan: a per-hour cap per
account and a per-network daily cap, both in `GET /social_limits`, surfacing as errors 978 and 979.

This is the one edit the compiler will not make for you, and the reason it is worth a section: the
field kept type-checking while it returned `undefined` at runtime, so `12 / undefined` rendered as a
bar at zero and nobody noticed.

### `PLANVORTEX_ERROR_RANGES`: three families are wider

| Family | Was | Now | What was falling through |
|---|---|---|---|
| `publication` | 900-960 | **900-979** | Bluesky, Discord, Telegram and Threads (961-977), plus the two rate brakes, **978** and **979** |
| `auth` | 500-544 | **500-546** | **545** (the plan's API rate limit, a `429` with `Retry-After`) and **546** (unverified email when creating an app) |
| `plan_limit` | 1300-1307 | **1300-1308** | **1308** (no more apps fit in this plan) |

Everything above each old ceiling was arriving as a bare `PlanVortexError`, so this only ever adds
to what a `catch` sees.

**What to do:** nothing, if you import the table. If you copied it, copy it again. And if you catch
`PublicationError` to decide whether to retry, look at the code: **978 and 979 are transient** —
waiting fixes them — while the rest of that family is not.

## 0.1.0 → 0.2.0

Nothing in the client's shape changed: no method signature moved, no export disappeared. What
changed is what the server does underneath, and two of those can break an integration that was
written against `0.1.0`. **Upgrade the package only once the PlanVortex API it talks to is on the
matching release** — the package's types describe the new responses.

### A temporal connect token now lives fifteen minutes, not an hour

`organizations.createConnectToken()` returns the same `{url, token, expires_at}`, but `expires_at`
is now about fifteen minutes out.

**What to do:** if you cache a connect token, or queue the redirect behind anything slow (an email,
a job, a support agent copying a link), shorten that window or issue the token at the moment you
need it. Tokens are free and immediate — there is no reason to hold one.

### A connect token now connects once

Once `accounts.connect()` succeeds with a token, that token cannot connect anything else and answers
**error 543**. The `accounts.enable()` calls that finish the *same* connection keep working until it
expires, so a Facebook user picking four pages is unaffected.

**What to do:** issue one token per connection. If your flow let a person come back to the same link
and add a second account, that second attempt now fails — send them through
`createConnectToken()` again.

### A token issued for one network is bound to it

If you pass `social_network` to `createConnectToken()`, that token now only works for that network:
`accounts.connectLinks()` returns just that one, and `accounts.connect()` for a different network
answers **error 544**.

**What to do:** nothing, if you were already using the token for the network you asked for. If you
were issuing a token "for Instagram" and then connecting whatever the person picked, stop passing
`social_network` — an unbound token still opens any network, which is exactly what that flow wants.

### An expired connect token answers 522, not 501

It used to come back as the generic `501` ("Invalid authorization token"). It now says what is
actually wrong: `522`, "Invalid token: Expired". Both are `AuthError`.

**What to do:** nothing, unless you branched on `error.code === 501` to decide whether to reissue a
token. Branch on both, or on `error instanceof AuthError`.

### `connectLinks()` entries carry an `authorization` block

Every entry now says **how** that network is authorized. Nine of the ten are `{type: "redirect"}`
and you send the person to `link`, as before. **WhatsApp is not a URL**: its `link` is an empty
string and `authorization` carries what `FB.init`/`FB.login` need to raise Meta's Embedded Signup
popup.

**What to do:** branch on `authorization.type`, never on whether `link` is empty. A loop that
redirects to `link` unconditionally was already sending WhatsApp users to your own page; that is the
bug this field exists to end.

```ts
for (const entry of await guest.accounts.connectLinks(orgId)) {
    if (entry.authorization.type === "redirect") {
        redirect(entry.link);
    } else {
        // meta_embedded_signup: raise the popup with entry.authorization.*
    }
}
```

Related: a `redirect` network that cannot produce a link is now **absent** from the list rather than
present with an empty one — the rule that already applied to Discord without credentials.

### `PLANVORTEX_ERROR_RANGES`: auth is now 500-544

Was `500-542`. Only matters if you copied the table instead of importing it.
