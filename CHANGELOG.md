# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versioning is
[semantic](https://semver.org/spec/v2.0.0.html).

## [0.16.0] - 2026-10-07

### Added

- **LinkedIn personal profiles.** Connecting LinkedIn now returns the personal profile of whoever
  authorizes as well as the pages they manage, and the profile can be enabled like any other
  account. It publishes in that person's name and has statistics, but **no comment inbox**:
  LinkedIn does not let any app read the comments on a member's posts, so every `comments.*` call
  on a profile fails with error 2600. `Account` now types `extra_data.is_personal_profile`
  (`true` on the profile, `false` on a page, absent on pages connected before profiles existed),
  and `accounts.list({ capability: "comments" })` leaves profiles out.
- **`visibility` and `made_for_kids` on publications**, today on YouTube only: who can see the
  video when it goes out (`public`, `unlisted` or `private`; absent is `public`) and whether it
  is made for kids (COPPA; absent is `false`). Both are typed on the publication input and on
  `Publication`. They are the user's choice, so ask them if your software publishes for someone. A
  value the network does not take does not fail the request: the publication is created in
  `withErrors` with code 2500 (visibility) or 2501 (not a boolean). On every other network the
  fields are deleted on save; ask `catalog.socialCapabilities()` for `visibility` and
  `made_for_kids` rather than checking for YouTube.
- **`publication_warnings` on `Publication`**: what still has to be done by hand on the network
  for a publication that did go out. Same shape as `publication_errors`, but it is not a failure:
  the publication stays `sended` and **must not be retried**, or it goes out twice. Today the only
  code is 2400: YouTube accepted the video but left it as a draft or private, and `data.studio_url`
  is the YouTube Studio page where it is finished.
- Error 2600 is thrown as a `PublicationError`, the same class as 945 ("this network has no
  comments"), of which it is the per-account version. It used to fall back to the base class.

## [0.15.0] - 2026-10-03

### Added

- **Two webhook events for AI plans: `ai_plan_generated` and `ai_plan_failed`**, typed as
  `AiPlanChange` and narrowed with `isAiPlanChange` in `planvortex/webhooks`. When a plan finishes,
  your app's `webhook_url` now hears about it, so you no longer have to poll `pv.aiPlans.get()`
  every few seconds. The change carries ids and numbers only (`id_ai_plan`, `state`, `template`,
  `total_publications`, `credits_spent`, how many `warnings`, and `error` with its `code` and
  `message` on a failure), never the prompt or the generated text: read the plan once when it
  arrives. Each plan sends one of the two, never a `failed` followed by a `generated`. Deliveries
  are not retried, so keep polling as the fallback if your endpoint can be down.

- **`pending_publish` on `Publication`**, with the `PublicationPending` type to name it. An
  Instagram video that Meta takes more than ~30 seconds to process now comes back in state
  `publishing` with this object, and PlanVortex keeps asking Instagram in the background for up to
  10 minutes. **Wait and read the publication again after `next_check`; do not retry it or create
  it again**, or the video goes out twice. While it is present the publication cannot be updated
  (error 921). It is read-only: nothing new to send.

### Changed

- The reference no longer says that an X publication left without credits (940) fires your app's
  webhook. It never did: no webhook announces publications, so read the publication to find out.
- `publication_errors` documents two new Instagram codes: **998** (Meta rejected the file, so
  retrying it unchanged fails the same way) and **999** (Meta ran out of time, and a retry usually
  works).

## [0.14.0] - 2026-10-02

**Your app can show its own account picker.** Until now the person connecting a social account
always went through PlanVortex's screen to choose which accounts to enable; with
`account_selection: "integrator"` that screen is yours. It also brings what the AI planner marks
as generated (`ai_generated`), WhatsApp template variables and Threads' reply control. Nothing was
removed and no signature moved: upgrading from `0.13.0` needs no changes, and `MIGRATION.md` gains
no entry.

### Added

- **Your own account picker.** `organizations.createConnectToken(id, { account_selection: "integrator" })`
  makes the screen where the person picks which accounts to enable yours. The `url` that comes back is the network's own authorization page,
  and the person lands on your `redirect_uri` with `?connect_session=…&social_network=…` without
  seeing anything of PlanVortex. Read what they authorized with `accounts.getConnectSession()` and
  enable the ones they pick with `accounts.confirmConnectSession()`. It needs `social_network` and
  `redirect_uri` (error 549), Telegram cannot use it (550), and confirming is all or nothing: 706
  with `{limit, used, requested}` and none enabled. The new codes 549-554 are `auth` errors.
- **`ai_generated` on `Upload` and on `Publication`**, with the `AiImageOrigin` and
  `PublicationAiGenerated` types to name them. It is read-only: nothing new to send.
  - An upload carries it **only when a model generated the image**: the provider, the model, the
    date and the AI plan that asked for it. A photo you uploaded, a product photo from a connected
    shop or an imported image never does.
  - A publication says whether its `text` came from the AI planner (set when the draft is created,
    and it stays even if the text is rewritten) and whether any of its files is an AI `image`
    (recomputed on every save, so swapping the generated image for your own photo turns it off).
    **Absent means nothing is AI**; it is omitted rather than sent as two `false`.
  - It is what you need to show your own AI label. Under Article 50(4) of the EU AI Act, telling
    the audience that an image which could pass for real was generated with AI is the job of
    whoever publishes it. The mark inside the file (C2PA, IPTC and SynthID with the default model)
    is PlanVortex's part; the C2PA signature does not survive a crop, the IPTC marker does.
- **WhatsApp template variables**: `message_options.template_parameters` on a `template_message`,
  in order (the first fills `{{1}}`). Without them WhatsApp rejects a template whose body has
  variables. An empty value, or one with line breaks, tabs or more than four spaces in a row, is
  error 1511 with `data.index` pointing at it. `messages.send` shows a full example.
- **`reply_control` on the publication body**: who can reply to it (`everyone`, `followers_only`,
  `accounts_you_follow`, `mentioned_only`). Only Threads uses it today (`reply_control: true` in
  `catalog.socialCapabilities()`); every other network deletes the field on save.

### Fixed

- **The README no longer suggests building your own network buttons from `connect_links` with the
  bare token.** The network sends the person back to PlanVortex, and that return only finds the
  token when they came in through the token's `url`: without it they ended up on the PlanVortex
  sign-in page. Your own buttons are one token per network, each one redirecting to its `url`.
  The token also lasts fifteen minutes, not the hour the README still said.

## [0.13.0] - 2026-09-29

A connected **WooCommerce store** becomes a source for the AI planner: the `from_catalog` template
can now write a week of posts from the store's real products (name, description, price, picture and
the link to its page), not only from a Meta catalogue. Nothing was removed and no signature moved:
upgrading from `0.12.0` needs no changes, and `MIGRATION.md` gains no entry.

### Added

- **`pv.integrations.products(idOrganization, idIntegration, options)`**, over
  `GET /organizations/{id}/integrations/{id}/products`: one page of a connected store's catalogue,
  to choose the products of a plan. Four things about it are not obvious, and all four are in its
  documentation:
  - **It pages by an opaque cursor**, not by number: send `next_cursor` back as `cursor` exactly as
    it came. There is no `iterateProducts` on purpose: every page is a live request to the client's
    own hosting, and finding three products among ten thousand is what `search` is for.
  - **Out-of-stock products come back with `available: false`**: show them, but do not let them be
    chosen, or the plan is refused with 2112.
  - **`price` is text to copy verbatim**, as the store displays it (tax, symbol, range). Absent
    means no price.
  - A store that rejects its key (2211) is marked until it is reconnected; a firewall (2212) or a
    store that does not answer (2213) is not.
- **`url` and `id_integration` on `integrations.connectLink`.** The store's approval button: the
  link points at the store's own WordPress, so it needs its address, and `id_integration`
  reconnects a store instead of adding one. After approving, the user comes back with an
  `id_integration`: **read that integration instead of trusting `success`** (2219 means the key is
  still being checked).
- **`provider: "woocommerce"` in `integrations.connect`**, with a read-only key created by hand
  (`url`, `consumer_key`, `consumer_secret`). It is the way when the store uses plain permalinks and
  the button cannot work (2216).
- **`source.id_integration_catalog`** on `aiPlans.create`: the store a `from_catalog` plan reads
  from, exclusive with `id_account_catalog` (both at once is a 2112). The stored products gain
  `permalink`, the product's page, which the texts use where a link can be clicked and where a
  Pinterest pin leads unless the plan has its own `options.link`.
- **`unsupported_networks`** on `PlannerTemplate`: the networks whose accounts a plan of that
  template cannot carry. A plan with one is refused with **2120** before anything is read or
  charged; today that is YouTube on `from_images` and `from_catalog`.
- On `IntegrationProvider`, the gates `connect_link`, `connect_link_fields` and `catalog`. **Having a
  link is not being OAuth**: branch on these, never on the provider's name.
- Types `IntegrationCatalogProduct`, `IntegrationCatalogPage`, `IntegrationConfig`,
  `IntegrationFormField`, `WooCommerceConnectRequest` and `IntegrationProductsOptions`.

### Changed

- **`Integration.config` is typed as `IntegrationConfig`**, which adds the store's fields to the
  feed's: `api_base`, `auth_mode`, `key_ending`, `currency` and `tax_location_missing`. Two of them
  have to be shown, not just stored. `key_ending` is how the user finds the key to delete in their
  WordPress after disconnecting, because **WooCommerce does not let an app revoke its own key**; and
  `tax_location_missing: true` means the store's API gives prices without tax labelled as tax
  included, so its taxable products come without a price until the store's setting is fixed and it
  is reconnected. `RssConfig` stays what an `update` takes, and a store's `config` cannot be edited
  at all (2220).
- A form field can now be of type `secret` (WooCommerce's consumer secret): mask it, never prefill
  it, and mark it as a new password so the browser does not fill it with the user's own.

## [0.12.0] - 2026-09-24

Pinterest, the fourteenth network, reaches the package — and it is the first one where choosing
the account does not choose where the publication comes out. **A pin goes to a board**, and that is
a field no other network has. Nothing was removed and no signature moved: upgrading from `0.11.0`
needs no changes, and `MIGRATION.md` gains no entry. The new fields are optional for the other
thirteen networks.

**`"pinterest"` already compiled before this release**, because `SocialNetwork` is an open
enumeration. What it did not have was autocompletion, the two board methods, or the right error
class for any of its codes.

### Added

- **`pv.accounts.destinations(idOrganization, idAccount)`** and
  **`pv.accounts.destination(idOrganization, idAccount, idDestination)`**, over
  `GET /organizations/{id}/accounts/{id}/destinations[/{id}]`: an account's Pinterest boards, and
  one board with its sections. Every other network answers 992 — the account itself is where its
  publications go. Both take `{ refresh: true }` to skip the server's short cache, for a board
  created a moment ago; not on every call, because all of PlanVortex's Pinterest traffic leaves
  through one application.
- **`destination` and `link` on `PublicationInput` and `Publication`.** On Pinterest the board is
  **required**, and leaving it out does not throw: the publication is created in `withErrors` with
  code 987 and is never attempted. `destination.id` is **always a string** — Pinterest's ids are
  long integers and a `number` has already lost digits. `link` is where the pin takes whoever
  clicks it: it goes in its own field, not inside `text`. On every other network both fields are
  deleted on save. Ask `destinations` and `link` in `catalog.socialCapabilities()` rather than
  keeping a list of which network has which.
- **`destinations` on `AiPlanCreateRequest` and `AiPlan`, and `options.link`.** A plan with a
  Pinterest account needs that account's board, one entry per account; without it `aiPlans.create`
  throws **2118**, listing every account that fails. A plan that would leave pins without an image
  is refused with **2119** before a single credit is spent, and an image that fails halfway through
  the generation shows up as a **922** in `ai_plan.warnings`, with the publication that was left
  without it.
- Types `Destination`, `PublicationDestination`, `AiPlanDestination` and
  `AccountDestinationOptions`.

### Fixed

- **Pinterest's error codes (987-996) arrived outside every family**, the third time a network's
  codes were born above the ceiling of the publications range (after 978 and 980). They are now
  `PublicationError`. The one that matters most is **991**: Pinterest throttling the application,
  sent as HTTP 429 with `Retry-After` — the answer is to wait, and `error.retryAfter` says how long.
- **547, 548 and 716 were unclassified too.** 547 (a client app's identifier cannot change) and
  548 (rotating the secret failed, the method that came with `0.11.0`) are now `AuthError`, and
  716 (another process is renewing the Bluesky session; retry) is `AccountError`.
- A test now checks that **every** error code named in the specification's error tables falls into
  some family, so the next network cannot repeat this without the build going red.

## [0.11.0] - 2026-09-17

**Which AI plan worked?** The server can now answer it, and so can this package:
`aiPlans.results()` returns what every plan achieved with what it published, the aggregate per
template and the total. Nothing was removed and no signature moved: upgrading from `0.10.0` needs
no changes, and `MIGRATION.md` gains no entry.

### Added

- **`pv.aiPlans.results(idClient, idOrganization, options)`**, over
  `GET /clients/{id}/organizations/{id}/ai_plans/results`. Four things about it are not obvious,
  and all four are in its documentation:
  - **The range filters on the plan's week** (`week_start`), not on when it was created. A plan
    created today for next week has published nothing yet.
  - **The ranking is interactions per _measured_ publication**, not the total — the total rewards
    the plan with seven accounts even when each post does half as well — and only plans with
    `ranked: true` (at least three measured publications, or all of them) compete in it.
  - **`social_network` recomputes every plan with only its publications on those networks**,
    which is what makes plans on different networks comparable. With that filter
    `credits_per_engagement` is absent: the cost belongs to the whole plan.
  - **The response is not a `Paginated`.** Besides the page it carries `totals` and
    `by_template`, which do not depend on the page, so it comes back whole.
  - **Being first is not being good.** Every plan, group and the dashboard block carry
    `engagement_vs_average`: the plan's interactions per post over what your usual posts get on the
    same networks (`expected_engagement_per_publication`), where **1 is your average**. The ranking
    still orders by interactions per post, so the first plan can be below 1 — a LinkedIn plan gets
    less per post than an Instagram one and can still double its own network's average.
- Types `AiPlanResult`, `AiPlanResults`, `AiPlanResultsGroup`, `AiPlanResultsTemplateGroup`,
  `AiPlanResultsSort` and `AiPlanResultsOptions`.
- **`Dashboard.ai_plan_results`** and its `available_blocks.ai_plan_results`: the three best plans
  of the range, for the home screen. It needs both `ai_plans:read` and `publication_stats:read`,
  and unlike `aiPlans.results()` it covers the organization **and its children**, so each row
  carries its `id_organization`.
- **`pv.apps.rotateSecret(idClient, idApp)`**, over `POST /clients/{id}/apps/{id}/secret`. The route
  reached the specification before this package and came in with this regeneration. **The previous
  secret stops working the moment it answers, and the webhook signature changes with it**, so roll
  the new one out before rotating. Like `secret()`, it needs a user token.

## [0.10.0] - 2026-09-13

Slack, the thirteenth network, reaches the package. It is the second release in a row where the
headline is not a new method, and this time there is a real bug behind it: **Slack's error codes
arrived outside every family**.

**`"slack"` already compiled before this release, and that is the trap again.** `SocialNetwork` is
an open enumeration, so a network the package has not been regenerated for type-checks fine and
quietly loses its autocompletion — the same thing 0.4.0 said about Telegram, and the reason a
regeneration is not optional even when nothing breaks.

Nothing was removed and no signature moved: upgrading from `0.9.0` needs no changes, and
`MIGRATION.md` gains no entry.

### Fixed

- **Slack's errors (980-986) were not `PublicationError`.** The publication family stopped at 979,
  so every one of them fell outside the table and arrived as a plain `PlanVortexError` — including
  **980, the commonest error on the whole network**: the PlanVortex app is not in the channel. Code
  that branches on the error class to decide whether a publication failed for a reason the user can
  fix was told nothing. The range now reaches 986, and a test pins both ends of it. This is the
  third time the ceiling has been raised late (961-977 for four networks, then 978-979 for the rate
  brakes), which is why the range carries a comment saying so.

### Added

- **`slack` in the closed union the specification declares**:
  `PublicationsPublicationInput.social_network`. It is deliberately **not** in `CommentNetwork` nor
  in `ContactChannel` — Slack has neither a comment inbox nor direct messages, and putting it in
  either would promise a screen that does not exist.
- **A warning on `accounts.enable()`, because nothing else announces it.** On Slack that call is
  also what puts the app inside the channel. On a **public** channel it joins by itself; on a
  **private** one it cannot — Slack has no API for that — and somebody has to type
  `/invite @PlanVortex` in the channel. The call succeeds either way and the account stays
  connected: what fails is the first publication, with error 980. Say it before your user picks the
  channel.

### Changed

- The documentation of the network-counting prose, stale again and in the same places: the
  `redirect` count on `accounts.connectLinks` and `SocialAuthorizationMethod` (**eleven of the
  thirteen** now, not ten of twelve — and one of those two said nine of eleven, a count that had
  been wrong for two releases), the `Account` note about a network where **an account is a channel**
  (Slack is the third, so two channels of one workspace are two plan slots), and `EngagementBase`,
  where Slack joins Bluesky, Discord and Telegram as a network with **no reach figure at all** —
  engagement is divided by the channel's members, and a row with that base is not comparable with
  one measured on impressions.
## [0.9.0] - 2026-09-04

**Users are unlimited on every plan**, so the quota that said otherwise is gone from the types —
the same correction 0.8.0 made for publications, one axis later.

It is the second half of a change the server made on 03-09-2026: users stopped being something a
plan grants and became something you simply count. `PlanData.users` was **required**, so every
plan literal had to supply a number that meant nothing, and the compiler kept asking for it. This
package's own test suite was doing exactly that, which is how the drift surfaced.

### Changed

- **BREAKING (types only): `PlanData.users` no longer exists.** The count moved to
  `PlanUseData` as an optional metric — how many users have access right now, with no limit to
  compare it against, because there is none. Nothing changes on the wire.
- **The `/apps` operations no longer claim the Custom plan.** Six of them still carried
  «It also needs the **Custom plan** (`ERROR_CODE_542`)» in their documentation. That stopped
  being true on 02-09-2026, and 0.8.0 announced the opening in this very file while shipping types
  that said the opposite: the changelog was rebuilt, the committed copy of the spec was not. It is
  now, so the published documentation and the published types finally agree.

### Removed

- **`PlanData.artificial_inteligence`, `PlanData.stats` and `PlanData.whatsapp`.** Three
  optional booleans describing a plan model that no longer exists — AI, statistics and WhatsApp are
  not per-plan switches. They were never sent by the current API, so reading them returned
  `undefined` while the compiler presented them as real.

## [0.8.0] - 2026-09-03

**Publications are unlimited on every plan**, so the quota that said otherwise is gone from the
types.

It was never a number this package invented: `PlanData.publications` came from the spec, and the
server stopped charging for it on 02-09-2026. What stayed behind was worse than a wrong number — it
was a field the compiler kept promising, so code written against it read `limits.publications` and
got `undefined` at runtime with nothing to warn it.

### Changed

- **BREAKING (types only): `PlanData.publications` no longer exists.** The count moved to the new
  `PlanUseData`, which is what `actual_use` has always been in practice: the same shape as a plan
  plus `publications`. Nothing changes on the wire, and nothing breaks at runtime — reading the
  field off a plan already returned `undefined`.
- `organizations.use()` now types `actual_use` as `PlanUseData` and `actual_asigned` as `PlanData`,
  which is the real asymmetry: what a child organization was handed cannot include a metric.
- The `publish` example prints publications as what they are — a monthly count with no ceiling —
  instead of `12 de 200`. What throttles publishing is rate (per hour and account, and the
  per-network daily caps in `GET /social_limits`), not the plan.
- **The `publication` error family now reaches 979, not 960.** Everything above the old ceiling was
  falling outside every family and arriving as a bare `PlanVortexError`: the Bluesky, Discord,
  Telegram and Threads codes (961-977) and, more to the point, the two rate brakes that replaced the
  monthly quota — **978** (publishing too fast on this account) and **979** (that network's daily
  cap). Catching `PublicationError` now catches them.

### Added

**The public API is on every plan now, the free one included** — it used to be a Custom-plan
feature — and the types follow the three things that came with opening it.

- `PlanData.apps`: how many apps the plan allows (1 on Free, 2 on Basic, 5 on Pro, 10 on Custom).
  Each app is a `client_id` with a secret, so each one is a key to the whole API. Unlike accounts,
  users or storage it is **not** split between organizations — an app belongs to the client.
- Three error codes, and the two ranges that were hiding them: **545** (the plan's API rate limit,
  which arrives as a `429` with `Retry-After`) and **546** (the account's email must be verified to
  create an app) are `AuthError`, so that range now runs to 546; **1308** (no more apps fit in this
  plan) is a `PlanLimitError`, so that one runs to 1308.

## [0.7.0] - 2026-09-02

**Threads is the twelfth network**, and the types now know it.

Nothing here removes anything, so nothing breaks: `SocialNetwork` gains a value and everything that
compiled before compiles now. What was wrong until today was quieter than an error — the committed
copy of the spec predated Threads, so an account coming back from a real API arrived with a
`social_network` the types had never heard of, and the prose still counted eleven networks where the
API had twelve.

### Changed

- The OpenAPI copy and the generated types are rebuilt from the published document: `threads` is a
  `SocialNetwork`, a comment network and a publishable one.
- The prose that counts networks: `connectLinks()` is a `redirect` on **ten of the twelve**, not
  nine of eleven. WhatsApp and Telegram are still the two that are not.

## [0.6.0] - 2026-08-31

An AI plan can now be **archived**, and deleting one finally means what people thought it meant.

The two look alike on a screen and have nothing in common underneath: archiving takes the plan out
of the listing and touches nothing else, while deleting takes the publications that had not gone out
with it. Almost every time someone reaches for "remove" they wanted the first one.

Upgrading from `0.5.0` needs no changes and `MIGRATION.md` gains no entry — everything added here is
additive. **Read the note on `remove()` anyway**: what it deletes changed in the server, so it has
been happening to your `0.5.0` calls for a while and the docs that shipped with them say otherwise.

### Added

- **`aiPlans.archive()` and `aiPlans.unarchive()`.** Archiving is **visibility only**: the plan
  leaves the listing and moves to the archived one, no publication is touched — anything scheduled
  keeps publishing — no credits come back, nothing is cancelled. It therefore works in **any state**,
  `generating` included, and it is undone. On the object it is `archived_date`: a field, **not** a
  value of `state`, so reading the state enum to find out whether a plan is archived will never
  work. Absent means active, which is how every plan created before the field existed comes back.
- **`archived` on `aiPlans.list()` and `aiPlans.iterate()`.** `true` returns the archived plans
  instead of the active ones, never both at once. A `false` is not sent: the server switches the
  filter on with the literal `"true"`, so it would be noise — and it would suggest a third mode
  with both cupboards open that does not exist.
- The **`AiPlanListOptions`** type, exported.

### Changed

- **`aiPlans.remove()` deletes the plan's publications that have not gone out yet**, not only the
  drafts: if the plan had already been validated, whatever was still scheduled goes too. This is a
  change **in the server**, so it reached your existing calls the day it shipped — before it, a
  validated plan you deleted kept publishing by itself the following week. Two states are
  deliberately left alone: the already published one, because deleting it here would not take it off
  the network and would only lose its history, and the one being published at that very moment.
  If you wanted the plan out of the way without losing anything, that is `archive()`.

## [0.5.0] - 2026-08-31

The AI planner stops being one thing. A plan can now be generated from **your own photos**, from an
**article**, from the **products of a connected catalogue** or as a **countdown towards a date**, and
the package publishes the catalogue that says what each of those accepts and what each of them
costs.

Everything here is additive: `template` and `source` are optional, and a plan created without them
is a `standard` one — exactly what every plan was before templates existed. Upgrading from `0.4.0`
needs no changes and `MIGRATION.md` gains no entry.

**The headline is a price, and it is worth saying out loud before your user creates the plan.**
Images are 94 % of what a plan costs. A template whose pictures come from the source generates none,
so the same week — 7 publications with a picture on each, one account — goes from **519 credits to
48**. That is not a rounding: it is the difference between a feature a customer uses once a month
and one they use every week.

### Added

- **`catalog.plannerTemplates()`**, cached like the rest of the catalogue. It answers what a plan
  can be generated FROM and what each source allows: `allows_shared`, `allows_gallery`,
  `generates_images`, the `regenerate` matrix, `orchestration_cost` and
  `orchestration_cost_per_source_item`, `max_source_items`, and the `source_fields` the source step
  is made of. **Read it, do not copy it** — it is the one catalogue entry that carries prices, and a
  table written by hand in your interface would show a cost the server no longer charges.
- **`template` and `source` on `aiPlans.create()`**, with the five templates: `standard`,
  `from_images`, `from_text`, `from_catalog` and `campaign`. A template is the **source** of the
  content and not a different flow — publish days, language, tone, `shared` and the images stay
  cross-cutting options, and each template declares which of them it accepts. Sending one it does
  not accept is a 2106, not a silent ignore.
- **`AiPlan.source` and `AiPlan.warnings`**, and the types behind them: `PlannerTemplate`,
  `PlannerTemplateField`, `PlannerTemplateName`, `PlannerTemplateFieldType`, `AiPlanSourceInput`,
  `AiPlanSourceImageInput`, `AiPlanSource`, `AiPlanSourceProduct` and `AiPlanNotice`.
  `PlannerTemplateName` is an **open** enumeration, like `SocialNetwork`: the list grows, and a
  template added to PlanVortex next month must not break your build. The one at `create()` is
  closed, because there the server answers 2111 and the compiler can save you the round trip.
- **Errors 2111 to 2117**, all of them already `AiPlanError` by their range. They arrive from
  `create()`, which is the part that surprises: **the source is validated when the plan is created,
  not when it is generated.** The article is downloaded, the catalogue is read live and the product
  pictures are copied inside that call, so a source that does not work fails while your user is
  still in front of it. What gets stored is a snapshot — a `retry` three days later does not depend
  on the article still being online or the product still being in the catalogue.

### Changed

- `aiPlans.regenerate` documents that **`"image"` depends on the plan's template**, not only on
  whether the plan allowed images. The template that did not generate the picture cannot regenerate
  it: read `regenerate.image` from the catalogue before you draw that button, because on
  `from_images` it charges 70 credits to replace the user's own photo with an invented one.
- `aiPlans.get` documents **`warnings`**, which is a notice on a plan that generated **fine** and
  not an error of the response — the place nobody looks. Today it carries one: **2117**, part of the
  source did not fit in the plan week. A plan is weekly and the source does not extend it, so twelve
  photos with six slots left publish six; `data` brings `{ source_items, capacity }`, and the slots
  are your publish days times your accounts, so it can be said before creating the plan rather than
  after charging for it.
- Two traps are now written on the types that carry them, because neither has an error code and both
  fail silently. **`source.text` wins over `source.url`** when both arrive — pasting the article is
  what a user does when the download did not work, so re-downloading to ignore what they wrote would
  take away their only way out. And **`event_date` is a calendar day, `YYYY-MM-DD`**, never an ISO
  instant: `toISOString()` from a browser turns the 15th of September into the 14th in the afternoon
  for half of America — a whole day off in a countdown, with no error anywhere.
- `AiPlanSourceProduct.price` says why the price is **never converted**: it comes exactly as the
  network returned it (`"9,99 €"`), the same field is a number elsewhere in Meta's API, and dividing
  by 100 "just in case" is precisely how a 10 € product gets advertised at 0,10 €.

## [0.4.0] - 2026-08-30

Telegram, the eleventh network, reaches the package. Nothing here is a new method: what changes is
what the types know, and on this network that turns out to be contract rather than one more name in
a list.

**`"telegram"` already compiled before this release, and that is the trap.** `SocialNetwork` is an
open enumeration, so a network the package has not been regenerated for type-checks fine and just
loses its autocompletion. What actually went missing were the CLOSED unions hanging off the
specification — the comment networks, a publication's `social_network`, and `authorization.type` —
and the last of those is not cosmetic: an integration that branches on two authorization types sends
its user into a chat nobody comes back from.

Nothing was removed and no signature moved: upgrading from `0.3.0` needs no changes, and
`MIGRATION.md` gains no entry.

### Added

- **A third `authorization.type`: `telegram_bot`.** Telegram is the one entry that carries a `link`
  and still is not somewhere to redirect. That link opens a private chat with the PlanVortex bot;
  there is no OAuth behind it, no `code` and no `redirect_uri`, and the account is born minutes
  later when the person drops that bot into their channel — announced over the WebSocket and the
  `new_account` webhook, never as the answer to a call of yours. The block carries `bot_username`
  (the bot's `@name`, without the at sign) and `add_to_group_link`, the second step, which turns
  comments on by adding the bot to the channel's linked discussion group. **Branch on
  `authorization.type`, never on whether `link` is empty**: that test was already wrong for WhatsApp
  and it is worse here, because a filled-in `link` makes it look like it worked.
- **`telegram` in the closed unions**: `CommentNetwork`, the specification's
  `PublicationsPublicationInput.social_network` and `CommentsCommentNetworkName`. It is deliberately
  **not** in `ContactChannel`: Telegram has no direct messages, and putting it there would promise a
  chat inbox that does not exist.
- **`PublicationStats.reactions` and `reactions_by_emoji`**, which are Telegram's only publication
  metric — and neither of them is asked for. `reactions` is the COMPLETE STATE and not an increment,
  so it goes down when somebody takes theirs back.
- **`Publication.extra_data`**, for what one network has to remember about one publication and that
  has no common field. Today only `telegram_message_ids` writes there: on Telegram an album is one
  publication that is several messages, `external_identifier` holds the first and the rest live
  here, because deleting the album means deleting all of them.

### Changed

- The documentation of the network-counting prose, which had quietly stopped being true:
  `accounts.connectLinks`, `SocialAuthorizationMethod`, `ConnectLink` and the comment-action matrix
  all said "nine of the ten". No test watches a sentence, which is why they went stale.
- Two warnings about this network are now on the methods that would otherwise surprise you, because
  neither has an error code to announce it. **The comment inbox starts the day the channel was
  connected** — the Bot API cannot read the past, so `comments.list` and `comments.thread` have
  nothing earlier and never will, and on Telegram the "live" thread is not live at all. And **there
  are no impressions and no reach**: `engagement_base` is `followers`, the only audience figure the
  Bot API publishes being the channel's member count.
- `catalog.socialLimits` explains Telegram's **two numbers for the same field** — 4.096 characters
  while the publication is text only and 1.024 the moment it carries an image or a video, because
  then the text is a media caption. The counter switches when the file is attached, not when publish
  is pressed. `SocialLimitsMap` now says out loud that some of its keys are not a network.
- `publications.remove` documents Telegram's **48-hour window** (error 966, with `published_date`
  and `max_hours` in `data`), which is a button to grey out rather than to offer and fail.

## [0.3.0] - 2026-08-28

Three things the API can do and this package said it could not. All three were server bugs that
`0.1.0` audited, documented as broken and deliberately left unexposed; all three were fixed on the
server on 2026-08-24, and until now the library kept telling you they were broken. Documenting
something that works as broken is worse than not documenting it.

Nothing was removed and no signature moved: upgrading from `0.2.0` needs no changes.

### Added

- **`products.get(idOrganization, idAccount, productId)`** — one product, by its identifier **on
  the network** (Meta's, not a PlanVortex `_id`). It is a method of its own rather than an argument
  on `list()` because the answer comes back a different shape: asking for one product goes to that
  product's own node, so the network answers with the product and `items` carries an object, and a
  page cannot be built out of an object. A list is accepted too — that is what a deployment
  wrapping the response would return — and the first element is taken.
- **`contacts.list()` and `contacts.iterate()` take `social_network`** — only the contacts
  reachable on that network. It matches on `social_identifiers[].social_network`, so a contact with
  several channels comes back through any of them. It used to return an empty list always, because
  the server compared the whole array of objects against the network name.
- **`MessageInput.in_response_external_id`**, which makes `comment_message` and
  `publication_message` reachable from `messages.send()` for the first time. It is the identifier
  the NETWORK gives — a comment's `external_id`, a publication's `external_identifier` — never a
  PlanVortex `_id`, and error `1510` without it. Only Facebook and Instagram do anything with it:
  `comment_message` sends a private reply to a public comment and `publication_message` attaches
  the post as a `MEDIA_SHARE`.

### Changed

- The OpenAPI document is no longer assembled inside this package. Joining the per-section
  specifications now happens where the specification lives — PlanVortexHome, which publishes the
  whole thing at [planvortex.com/openapi.json](https://planvortex.com/openapi.json) — and this
  repository keeps a committed copy of it. With a second official library, an assembler living in
  one of them meant two copies of the same code, and two copies drift in silence.
  `npm run generate` now refreshes that copy and regenerates the types; without PlanVortexHome
  beside it, point `PLANVORTEX_OPENAPI` at the published URL. Nothing about the installed package
  changes.

## [0.2.0] - 2026-08-26

The connect flow, told straight. Two things that an integration could only get wrong before: a
temporal connect token that lived an hour and could be replayed, and a WhatsApp entry that announced
itself with an empty URL. Neither changes the shape of the client — no method signature moved — but
both change what you can assume, so read **Changed** before upgrading. `MIGRATION.md` has the short
version.

### Added

- **`connectLinks()` now says *how* each network is authorized**, in a new `authorization` field on
  every entry. Nine of the ten are `{type: "redirect"}` and you send the person to `link`, as before.
  **WhatsApp is not a URL at all** — its sign-up is Meta's Embedded Signup, a popup you raise with
  the Facebook JavaScript SDK — so its `link` is an empty string and `authorization` carries the
  `app_id`, `config_id`, `graph_version`, `feature_type` and `session_info_version` that
  `FB.init`/`FB.login` need. Until now the server published that empty string and nothing else, so a
  client looping over the list and redirecting sent its user to its own page; those values existed
  only inside PlanVortex's own dashboard.
  - Branch on `authorization.type`, never on whether `link` is empty. The new
    `SocialAuthorizationMethod` type is exported for that.
  - A `redirect` network that cannot produce a link is now **absent from the list** rather than
    present with an empty one — the same rule that already applied to Discord without credentials.

### Changed

- **A temporal connect token now lasts fifteen minutes instead of an hour, and it connects once.**
  The server was hardened (`CONNECT_TOKEN_SECRET`, a `jti` per token, single redemption); the
  package's types, JSDoc and generated OpenAPI follow. Nothing about the client's shape changed —
  `createConnectToken` still returns `{url, token, expires_at}` — but the assumptions around it did:
  - `expires_at` is now ~15 minutes out. If you cache a connect token anywhere, shorten the window.
  - Once `accounts.connect()` succeeds with a token, that token cannot connect again and answers
    **error 543**. The `accounts.enable()` calls that finish the same connection still work until it
    expires. Issue one token per connection — they are free and immediate.
  - A token issued with `social_network` is now **bound** to that network: `connectLinks()` only
    returns that one, and connecting a different network answers **error 544**.
  - An expired connect token now answers **522** ("Invalid token: Expired") where it used to answer
    the generic 501. `AuthError` already covered both.
  - `PLANVORTEX_ERROR_RANGES`: the auth family is `500-544`, was `500-542`.

## [0.1.0] - 2026-08-25

The first release with code in it. Every documented endpoint of the PlanVortex API has a method, the
three test layers are in place — the third one against a real PlanVortex — and the reference is
published. It is a `0.x` on purpose: the shape of the client is settled and pinned by tests, but
nobody outside has used it yet, so a break before `1.0.0` is possible and would arrive written down
in `MIGRATION.md`.

The `0.0.1` already on npm carries no code. It was published on 2026-08-22 to reserve the name,
which is the only way npm reserves one.

### Added

- **The API reference is published** (phase 11) at
  [taliasoftworks.github.io/PlanVortexNode](https://taliasoftworks.github.io/PlanVortexNode/):
  TypeDoc, regenerated by CI on every push to `main`. It builds with no warnings, which is what
  keeps a broken `{@link}` visible instead of buried among a dozen tolerated ones.
- `examples/comments.ts`: the comment inbox end to end — the unread badge, the listing, the action
  matrix per network, a live thread and a reply. Replying is public and immediate, so it only does
  it with `PLANVORTEX_ALLOW_REPLY=1`, the same way the publishing example guards a real post.
- `QueryValue` and `RequestSender` are exported as types. Both already appeared in public
  signatures — `HttpRequest.query`, which `pv.request()` takes, and the constructor of every
  resource — so they could be used but not named.
- **The rest of the API** (phase 7), so every documented endpoint now has a method:
  `pv.comments`, `pv.messages`, `pv.contacts`, `pv.products`, `pv.integrations`, `pv.aiPlans`,
  `pv.dashboard` and `pv.apps`, plus the six operations phase 6 had left out —
  `clients.updateAiSettings`, `clients.withOrganizations`, `organizations.updateAiContext`,
  `organizations.updateSocialCredentials`, `organizations.deleteSocialCredentials` and
  `publications.updateByAccount`.
- `pv.comments` separates the two reads the API really has: `list()` / `iterate()` serve the inbox
  out of PlanVortex's database (free, and a snapshot), while `thread()`, `threadByAccount()` and
  `replies()` ask the network live and report what that cost in `credits_consumed`. There is
  deliberately **no** `iterate()` for a thread: on X each comment read is a credit.
- `comments.actions(network?)` shares the catalogue's cache, so the four flags that decide which
  buttons you can paint cost one request per client instance.
- `contacts.merge()`, which reads the contact before updating it. It exists because
  `PUT /contacts/{id}` writes `extra_data` with whatever the body carries, so a plain `update()`
  without it **erases every custom field** — a data loss that shows up weeks later.
- `dashboard.publicationStats()` — the publications-with-metrics listing that lives at
  `/organizations/{id}/publications/stats`. Unlike `topPublications()` it includes publications
  nobody has measured yet, with `metrics` absent.
- `publicationId()` and `publication()` helpers, and `accountId()` / `account()` now take a
  comment as well as a publication: the populated-or-string asymmetry runs in opposite directions
  in the two domains.
- New types: `CommentThread`, `CommentReplyResult`, `ConversationTotals`, `MessageInput`,
  `MessageTemplate`, `ContactCreate`, `ContactUpdate`, `ContactExtraData`,
  `SocialIdentifierInput`, `ProductInput`, `ProductCatalog`, `ProductCatalogInput`,
  `IntegrationProvider`, `IntegrationConnectRequest`, `IntegrationUpdate`,
  `IntegrationPickerConfig`, `RssConfig`, `AiPlanState`, `AiPlanOptions`, `AiPlanOptionsInput`,
  `AiPlanCreateRequest`, `AiPlanCostEstimate`, `AiPlanCreateResult`, `ClientAppInput`,
  `AiSettings`, `SocialCredentialsInput`, `ClientWithOrganizations`, `Dashboard`,
  `DashboardRange`, `MetricName`, `MetricRow`, `TopPublication`, `PlanUse`, `AccountWithError`
  and the projected `DashboardPublicationRef` / `DashboardAiPlanRef`.
- **The live test layer** (`test/live/`, phase 10): 37 tests that talk to a real PlanVortex and pin
  what mocked tests cannot — that response envelopes still have the names this client unwraps, that
  every domain error still arrives as an HTTP 400 with a catalogue `code`, that the token facade
  still answers RFC 6749 shapes, and that every network in `/social_networks` has its limits,
  capabilities and aspect ratios. It is opt-in (`.env.live`, see `.env.live.example`), never runs in
  CI, is read-only by default, and refuses to write against production without being told twice.
- The connection flow now has a test against the real server for the half that needs no human: the
  temporal token is issued, it fetches the authorization links, and each credential is refused
  exactly where it should be — app credentials get a 519 asking for links, and a temporal token gets
  a 514 asking for another token.

### Changed

- **Two server behaviours the live layer caught were fixed in PlanVortex itself**, so this client
  documents what the API does rather than what it did:
    - A **temporal connect token can no longer issue another one**. It used to be able to, and
      chaining the calls made a credential that never expired — one that travels in a URL, inside
      your end user's browser, and whose entire security model was "it dies in an hour". Asking for
      a token with a temporal token now answers **514**, which is what the specification already
      claimed.
    - **A deleted publication is no longer readable by identifier.** The delete is soft on the
      server, and reading one by id used to return it as if nothing had happened while it was
      already gone from the listing. `publications.get()` now answers **917** after a delete, and
      so does a second `publications.remove()`.

- **Apps are the Custom plan's feature, and the server now says so.** Every `/clients/{id}/apps`
  route answers the new error **542** on any other plan; it used to be 511, "a plan with at least
  two users", which the Pro plan satisfies. Since apps are what issues the `client_id` this package
  authenticates with, this is the first error an integration on the wrong plan meets. The `auth`
  range in `PLANVORTEX_ERROR_RANGES` grows to 500-542 accordingly, so 542 arrives as an `AuthError`
  and not as the base class.
- `Publication`, `PublicationStats` and `NormalizedMetrics` are now shared definitions of the
  specification instead of one copy per section, so a publication inside a comment, a dashboard row
  and the publications listing are finally the same type. `NormalizedMetrics` had genuinely
  drifted: the dashboard declared a loose `Record<string, number>` and publications enumerated the
  twelve real metrics.
- Every schema of these eight sections now declares its `required` fields, audited one by one
  against `src/domain/**` of the server. That removes a long tail of `?` from fields that always
  travel — and, where the audit found the opposite, adds one.
- `Comment.id_account` and `Comment.id_publication` are typed `string | object`: the inbox
  resolves both and every other operation returns identifiers. The specification claimed strings
  everywhere.
- The protected `Resource.send` is now `Resource.dispatch`, so `pv.messages.send()` can be called
  what it obviously should be called.

### Fixed

- Four error codes named in the documentation did not exist in the server's catalogue, and two of
  them were the ones an integration hits first: the paid-plan refusal of the comment, message and
  contact inboxes is **516**, not 1520, and the integration quota is **1404**, not 1409. Both
  invented codes were in the range of a different family, so branching on them would have caught
  the wrong error class.
- Specification bugs found auditing phase 7, each of which would have compiled and then read
  `undefined` at runtime:
    - `TopPublication` described a shape that does not exist. The aggregation projects
      `id_publication` and nests the content under `publication`; the specification announced `_id`,
      `name` and `text` at the root — all three `undefined`.
    - The dashboard's AI block announced `publications` and the server sends
      `generated_publications`, and `pending_validation` was missing altogether.
    - `AiPlanOptions` was missing `shared` and `use_organization_context`, and `AiPlan` was missing
      `organization_context` — the snapshot that makes a retry reproducible.
    - `MetricRow.group` is `null` when grouping by `total`; it was typed as a plain string, so the
      simplest call of that endpoint did not fit its own type.
    - `AiSettings` documented in prose that a scope set to `null` clears it, while the type refused
      `null`.
    - A `default` on a **request** property made it required in the generated types — the mirror
      image of the `followers_count` bug of phase 6. Ten of them, across the RSS connect body and
      the AI plan options.
    - `ContactInput` was one schema for two shapes: creating requires at least one identifier
      (error 1601) and updating does not, and updating is destructive about `extra_data`. It is now
      `ContactCreate` and `ContactUpdate`. `SocialIdentifier` needed the same split, because `_id`
      always comes back and is never sent.
- Documented, rather than silently inherited, three things the server does that the specification
  promised otherwise: `GET /contacts?social_network=` always returns an empty list,
  `GET /products?product_id=` never reaches the network, and `MessageInput.in_response_external_id`
  is not read from the body — which is why `comment_message` and `publication_message` cannot be
  sent through the public API today.

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
