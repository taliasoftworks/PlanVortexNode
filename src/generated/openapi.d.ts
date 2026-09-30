/**
 * GENERADO POR `npm run generate`. NO SE EDITA A MANO.
 *
 * Sale de `openapi/planvortex.openapi.json`, que a su vez sale de los `swagger/*-swagger.json`
 * de PlanVortexHome. Si algo de aqui no cuadra con la API, lo que hay que arreglar es el spec.
 *
 * Estos tipos son un DETALLE INTERNO: los nombres van prefijados por dominio para que el `Plan`
 * de un cliente y el de una organizacion no se pisen. La superficie publica del paquete son los
 * tipos con nombre legible de `src/types.ts`, que se construyen encima de estos.
 */

export interface paths {
    "/allowed_aspect_ratios": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Accepted aspect ratios per network
         * @description The crops each network accepts, as the numeric ratio used to validate and the label to show, side by side at the same index.
         *
         *     The keys are **not** always a network name: some networks have a different list per publication type, and those appear as `<network>_<type>` (`facebook_reels`, `facebook_stories`). A network missing from the map does not validate the ratio.
         */
        get: operations["getAllowedAspectRatios"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/allowed_social_messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * List the networks with direct messages
         * @description The subset of `/social_networks` whose conversations can be read and answered from PlanVortex.
         *
         *     **It is a POST and it takes no body.** That is historical, not a design decision, and it is kept as it is because changing the verb would break every integration already calling it. Send an empty body.
         */
        post: operations["getAllowedSocialMessages"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/allowed_social_publications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the networks that can publish
         * @description The subset of `/social_networks` that accepts publications. `google_business` is not in it: a local listing receives reviews, it does not receive posts.
         */
        get: operations["getAllowedSocialPublications"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Return all available clients
         * @description Return a list of clients ordered by creation date (desc)
         */
        get: operations["getClients"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients_organizations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Every client with its organizations, in one call
         * @description The whole tree the caller can see: their clients, and inside each one the organizations they have access to.
         *
         *     It exists to save the N+1 that building a client picker otherwise costs. **An app always gets exactly one client** — its own — with every organization of it.
         *
         *     The two pairs of pagination parameters are independent: `offset`/`limit` page the clients, `offsetOrganizations`/`limitOrganizations` page the organizations inside each one.
         */
        get: operations["getClientsWithOrganizations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients_permissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Retrieve the list of client permissions
         * @description Retrieve all client permissions that are allowed in client role creation
         */
        get: operations["getClientPermissions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Return a client by identifier
         * @description Return a client by identifier
         */
        get: operations["getClient"];
        /**
         * Update a client by identifier
         * @description Update a client by identifier
         */
        put: operations["updateClient"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/ai-settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Configure the client's own AI models (BYOK)
         * @description Set the client's Bring-Your-Own-Key AI provider configuration per scope. The request body is an object keyed by scope (orchestrator, text, image); a scope set to null clears it. Providers and capabilities are validated against a fixed catalogue. When a scope uses BYOK, its calls are billed to the client's own provider and do NOT consume PlanVortex AI credits, but the plan still has to include AI credits to use the feature. API keys are stored encrypted and never returned; the response client only exposes provider, model and has_api_key per scope. Requires the client:update permission.
         */
        put: operations["updateAiSettings"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/apps": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the client's apps
         * @description The apps of a client. Secrets never travel here: to read one, ask for it explicitly with the `secret` endpoint.
         *
         *     **Needs a USER token, not an app token.** With client credentials it answers `ERROR_CODE_512`. **No plan is required**: apps are on all four plans, the free one included — what the plan decides is how many you can hold at once and how fast you can call.
         */
        get: operations["getClientApps"];
        put?: never;
        /**
         * Create an app
         * @description Creates the app and its credentials.
         *
         *     **How many apps fit is decided by the plan**, not by a fixed limit of one: 1 on free, 2 on basic, 5 on pro and 10 on custom. Going over answers `ERROR_CODE_1308`, which carries `limit` and `used` in its `data`. Deleting an app frees its slot immediately, because only live apps count. If you just need to rotate credentials, update the existing app rather than creating another.
         *
         *     **The user's email must be verified** (`ERROR_CODE_546`). This is the only route in `/apps` that asks for it: an app is a key to the whole public API, and this is what stops a throwaway address from minting them in bulk. Reading, updating and deleting an app you already own do not check it.
         *
         *     **The identifier has a format** (error 533): lowercase letters, numbers, `.`, `-` and `_`, starting with a letter or a number, 3 to 64 characters. Pick it carefully — it cannot be changed later (error 547).
         *
         *     Every URL is validated: a bad entry in `allowed_domains` answers 531, in `redirect_urls` 532, and a bad `webhook_url` answers 535.
         *
         *     **The secret is not in the response.** Read it with `GET /clients/{id_client}/apps/{id_app}/secret`.
         *
         *     **Needs a USER token, not an app token.** With client credentials it answers `ERROR_CODE_512`. **No plan is required**: apps are on all four plans, the free one included — what the plan decides is how many you can hold at once and how fast you can call.
         */
        post: operations["createClientApp"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/apps/{id_app}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get one app
         * @description The app's record, without its secret. Note the envelope: `{client_app}` here, `{client_apps, total}` in the list.
         *
         *     **An app token works here.** This is the one part of `/apps` that does: an app can read and update its own record, but it cannot list, create, delete, or read the secret. **No plan is required**: apps are on all four plans, the free one included.
         */
        get: operations["getClientApp"];
        /**
         * Update an app
         * @description Replaces the app's configuration. **Every field is overwritten with what you send**, so a `redirect_urls` you leave out becomes an empty list — send the whole object, not a patch.
         *
         *     Changing `webhook_url` takes effect on the next event; there is no verification handshake.
         *
         *     **It replaces every field with what the body carries.** `name`, `keycloak_client_idenfifier`, `allowed_domains`, `redirect_urls` and `webhook_url` are all written as sent, so omitting one erases it — sending an update without `webhook_url` turns the webhook off. Read the app first and send it back whole.
         *
         *     **`keycloak_client_idenfifier` is the one field that is NOT overwritten.** Sending a different one answers `ERROR_CODE_547` and nothing is written: it is the `client_id` your integration authenticates with, and renaming it would lock out everything already asking for tokens with the old one. Send it unchanged, or leave it out. If you need a different identifier, create another app.
         *
         *     **An app token works here.** This is the one part of `/apps` that does: an app can read and update its own record, but it cannot list, create, delete, or read the secret. **No plan is required**: apps are on all four plans, the free one included.
         */
        put: operations["updateClientApp"];
        post?: never;
        /**
         * Delete an app
         * @description Revokes the credentials and marks the app as deleted. **Tokens already issued stop working**: the token endpoint checks that the app still exists before answering, and requests carrying an old token no longer resolve to an app.
         *
         *     **Needs a USER token, not an app token.** With client credentials it answers `ERROR_CODE_512`. **No plan is required**: apps are on all four plans, the free one included — what the plan decides is how many you can hold at once and how fast you can call.
         */
        delete: operations["deleteClientApp"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/apps/{id_app}/secret": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read the app's secret
         * @description Returns the `client_secret` in clear. It is a separate endpoint precisely so that the secret never travels inside a listing that gets logged, cached or drawn on a screen by accident.
         *
         *     The same secret is what signs the outgoing webhooks (`x-hub-signature`, `x-hub-signature-256`).
         *
         *     **Needs a USER token, not an app token.** With client credentials it answers `ERROR_CODE_512`. **No plan is required**: apps are on all four plans, the free one included — what the plan decides is how many you can hold at once and how fast you can call.
         *
         *     It comes straight from Keycloak, so it is the live secret and not a copy: treat the response as a credential and never log it.
         */
        get: operations["getClientAppSecret"];
        put?: never;
        /**
         * Regenerate the app's secret
         * @description Rotates the `client_secret` and returns the new one.
         *
         *     **The previous secret stops working the moment this answers** — there is no grace period and no overlap. Anything still holding it gets `invalid_client` from `POST /oauth/token` on its very next call, so roll it out before you rotate, not after.
         *
         *     **It also changes how your webhooks are signed.** `x-hub-signature` and `x-hub-signature-256` are HMACs of the body computed with this same secret, so a receiver that verifies the signature will start rejecting legitimate deliveries until it is updated too.
         *
         *     The new value comes back only here. If you lose it, read it again with `GET /clients/{id_client}/apps/{id_app}/secret` — it is not stored anywhere on our side except Keycloak.
         *
         *     **Needs a USER token, not an app token** (`ERROR_CODE_512`), and the `client_app:update` permission — reading the secret changes nothing, this invalidates what was there.
         */
        post: operations["regenerateClientAppSecret"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/organizations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get root organizations inside client
         * @description Return a list of organizations inside the client
         */
        get: operations["getClientOrganizations"];
        put?: never;
        /**
         * Create a new root organization inside a client
         * @description Within a client, organizations can be created to separate and isolate data between them
         */
        post: operations["addParentOrganization"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/organizations/{id_organization}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Update a root organization by identifier
         * @description Update data from the received organization
         */
        put: operations["updateParentOrganization"];
        post?: never;
        /**
         * Delete a root organization by identifier
         * @description Delete the root organization and all its resources
         */
        delete: operations["deleteClientOrganization"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/organizations/{id_organization}/ai_plans": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List AI publication plans
         * @description Return the organization's AI plans ordered by creation date (desc), paginated. Requires the ai_plans:read permission.
         *
         *     **Active plans by default, archived ones with `archived=true`** — never both at once. Archiving is visibility only (see `POST .../archive`): the plan leaves this listing and keeps every publication it had.
         *
         *     **Cancelled plans are not listed either.** Deleting a plan sets it to `cancelled` rather than removing it, and this listing filters those out — so a plan you deleted simply stops appearing, while `GET` by id still returns it.
         *
         *     Without `limit` the whole list comes back.
         */
        get: operations["getAiPlans"];
        put?: never;
        /**
         * Create an AI publication plan
         * @description Create a weekly AI publication plan. The plan is queued in state 'pending' and generated asynchronously by the generate-ai-plans job; poll GET by id while state is pending or generating. Validations at creation: the client plan allows AI (it contracts AI credits; Free does not), the accounts belong to the organization, there are enough AI credits for the deterministic base cost (orchestration + target texts), and there is room in the organization's monthly publication limit. Returns the created plan together with the deterministic cost estimate. Requires the ai_plans:create permission. Since the plan can be generated from a SOURCE (`template` + `source`), part of that validation is the source itself: the article is downloaded, the catalogue is read live and the product pictures are copied — all of it inside this request, so what does not work fails with the user in front of it. A plan whose source did not fit in the week is still created, and says so in ai_plan.warnings (2117). With a Pinterest account in the plan, two more checks run at creation: every Pinterest account needs its board in `destinations` (2118), and a configuration that would leave pins without an image is refused (2119).
         */
        post: operations["addAiPlan"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/organizations/{id_organization}/ai_plans/{id_ai_plan}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get an AI publication plan by id
         * @description Return a single AI plan with its generated publications populated. This is the endpoint clients poll while state is pending or generating to detect when generation finishes. Requires the ai_plans:read permission.
         */
        get: operations["getAiPlan"];
        put?: never;
        post?: never;
        /**
         * Delete an AI publication plan and its pending publications
         * @description Delete the plan **and every publication of it that has not gone out yet**: the generated drafts and, if the plan was already validated, whatever was still scheduled. Two states are deliberately left alone: `sended`, because it is already live on the network and deleting it here would only lose its history while the post stays up, and `publishing`, which the publishing job holds at that very moment.
         *
         *     AI credits already spent on generation are NOT refunded (same criterion as X: if the provider charged, we charge). A plan being generated cannot be deleted (state `generating`, error 2102): wait for the job to finish.
         *
         *     To keep the plan and its publications and only take it out of the listing, archive it instead (`POST .../archive`). Requires the ai_plans:delete permission.
         */
        delete: operations["deleteAiPlan"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/organizations/{id_organization}/ai_plans/{id_ai_plan}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Archive an AI publication plan
         * @description Take the plan out of the default listing and move it to the archived one (`GET .../ai_plans?archived=true`). It is **visibility only**: no publication is touched — anything scheduled keeps publishing — no credits are refunded, and nothing is cancelled. It is reversible with `POST .../unarchive` and valid in **any state**, `generating` included, because it does not interrupt the generation job.
         *
         *     Archiving an already archived plan just refreshes `archived_date`. Requires the ai_plans:update permission.
         */
        post: operations["archiveAiPlan"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/organizations/{id_organization}/ai_plans/{id_ai_plan}/publications/{id_publication}/regenerate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Regenerate the text or the image of one publication of the plan
         * @description Asks the model for another version of a single publication, for when the generated one does not work.
         *
         *     **It costs credits, and they are charged per use.** The balance is checked before the call and the real cost is charged afterwards, accumulating in the plan's `credits_spent`. As a reference: regenerating a text is billed around 2 credits and an image around 70, but what is actually charged is the provider's real cost.
         *
         *     It only works **while the plan is under review** (state `generated`) and on its drafts: a publication already validated or published is not a draft any more.
         *
         *     **What can be regenerated depends on the plan template**, and it is published in `regenerate` (`GET /planner_templates`). `from_images` and `from_catalog` cannot regenerate the image: nobody regenerates the photo they took themselves, and offering the button anyway charges the user 70 credits to replace their own photo with an invented one. Asking for it anyway is a 2102.
         */
        post: operations["regenerateAiPlanPublication"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/organizations/{id_organization}/ai_plans/{id_ai_plan}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Retry a failed AI publication plan
         * @description Re-queue a failed plan: it goes back to state 'pending' (attempts and error reset) and the background job regenerates it with the SAME data (prompt, accounts, options). Poll the plan while state is pending or generating, as after creation. Only valid from state 'failed'. Already-spent credits are NOT refunded and a new generation spends again; drafts left over from the failed attempt are discarded by the generation itself. If the failure was a business error (no AI credits, no monthly publication slots), retrying will fail the same way. Requires the ai_plans:update permission.
         */
        post: operations["retryAiPlan"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/organizations/{id_organization}/ai_plans/{id_ai_plan}/unarchive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Unarchive an AI publication plan
         * @description Return the plan to the default listing: `archived_date` is cleared. Unarchiving a plan that was not archived does nothing and answers 200. Requires the ai_plans:update permission.
         */
        post: operations["unarchiveAiPlan"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/organizations/{id_organization}/ai_plans/{id_ai_plan}/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Validate an AI publication plan
         * @description Validate a generated plan: its draft publications without errors are re-validated and moved to 'ready', and the plan moves to 'validated'. From that point the normal publish-pending flow publishes them at their publish_date. Only valid from state 'generated'. Requires the ai_plans:update permission.
         */
        post: operations["validateAiPlan"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/organizations/{id_organization}/ai_plans/results": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Compare the results of AI plans
         * @description What each AI plan achieved with what it published, the aggregate per template and the total — the data behind «which plan worked best?». Requires **both** `ai_plans:read` and `publication_stats:read`: it shows plans and it shows publication metrics.
         *
         *     **The range filters on the plan's week** (`week_start`), not on when it was created: a plan created today for next week has published nothing and has no results yet.
         *
         *     **Only plans that published something are listed** — with `social_network`, something on those networks. A plan whose posts are all still scheduled would be a row of blanks. Archived plans are included; cancelled ones are not.
         *
         *     **The default order is interactions per measured publication**, and only plans with at least 3 measured publications (or all of them, if they published fewer) compete in it; the rest come after. See `AiPlanResult` for why it is that number and not the total or the engagement rate.
         *
         *     Covers **this organization only**, not its children — it is the sibling of `GET .../ai_plans` and talks about the same plans. The dashboard's `ai_plan_results` block does include children.
         */
        get: operations["getAiPlanResultsService"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a list of roles
         * @description Return a list of client roles inside the received client
         */
        get: operations["getClientRoles"];
        put?: never;
        /**
         * Create a new client role
         * @description Allow the creation of new client roles
         */
        post: operations["createClientRole"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/roles/{id_rol}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Update a client rol
         * @description Update the client role received in parameters
         */
        put: operations["updateClientRole"];
        post?: never;
        /**
         * Delete a client rol
         * @description Delete the client role received in parameters
         */
        delete: operations["deleteRole"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/roles/{id_rol}/invite": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Invite an user to a client role
         * @description Invite an user to a client role by the email. The user will recieve an invitation to the email
         */
        post: operations["inviteRole"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/roles/{id_rol}/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get all users of the client role
         * @description Retrieve all users of the received client role
         */
        get: operations["getUsersInClientRole"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/roles/{id_rol}/users/{id_user}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Adds the received client role to the received user
         * @description Adds the received client role to the received user. The user is assigned to he received role
         */
        post: operations["addUserRole"];
        /**
         * delete the received user from the received client role
         * @description delete the received user from the received client role
         */
        delete: operations["removeUserRole"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/clients/{id_client}/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get all users of the client in any role
         * @description Retrieve all users of the received client in any role
         */
        get: operations["getClientUsers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/integration_providers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Catalogue of available integration providers
         * @description What every provider is and what it can do: whether it has an OAuth token behind it, whether it connects with a link (and what that link needs first), whether it contributes files to the library, whether it is polled for content, whether it has a product catalogue, which file formats it accepts and which fields its configuration form takes.
         *
         *     Consume this instead of hardcoding a provider list: a new provider shows up here without any client change.
         */
        get: operations["getIntegrationProviders"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/oauth/token": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Exchange client credentials for an access token
         * @description The way an integration authenticates. Send the app's `client_id` and `client_secret` and get back a bearer token to put in `Authorization` on every other call.
         *
         *     **This endpoint is different from the rest of the API in three ways, and all three matter:**
         *
         *     1. **It takes no token** — it is the one that gives you one. It is also the only endpoint with no authentication at all.
         *     2. **It accepts `application/x-www-form-urlencoded`**, which is what OAuth 2 says and what a generic OAuth client sends. JSON works too.
         *     3. **Its errors are OAuth 2 errors** — `{error, error_description}` with a 400 or a 401 — and *not* the `{code, message, data}` of everywhere else. This is the single exception in the whole API, and it exists so a generic OAuth client understands the answer.
         *
         *     Credentials travel either in the body (`client_secret_post`) or in `Authorization: Basic base64(client_id:client_secret)` (`client_secret_basic`). Both are standard and both are accepted.
         *
         *     **Cache the token until it expires.** The endpoint is rate limited per `client_id` and IP — 30 attempts a minute, and 10 *failures* in five minutes — so asking for a fresh token on every call will eventually get a 429 with a `Retry-After`. A correct integration asks once and refreshes shortly before `expires_in`.
         *
         *     What comes back is an access token and nothing else: **no refresh token and no id token**. When it expires, ask again.
         */
        post: operations["issueToken"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations_permissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List every organization permission that exists
         * @description Returns the catalogue of organization permissions accepted in the `permissions` property of a role. Static: it does not depend on the caller or on any organization. Only a valid token is required.
         */
        get: operations["getOrganizationPermissions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get an organization by identifier
         * @description Get one organization by its identifier
         */
        get: operations["getOrganization"];
        /**
         * Update a child organization by identifier
         * @description Update child organization by its identifier
         */
        put: operations["updateOrganizationInsideOrganization"];
        post?: never;
        /**
         * Delete a child organization by identifier
         * @description Delete child organization by its identifier
         */
        delete: operations["deleteChildOrganization"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/account-connect/{social_network}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Complete the connection of a social account
         * @description The endpoint the social network sends the user back to after they authorize. It turns the network's callback into one or more PlanVortex accounts.
         *
         *     **You do not build this URL, the network does.** It is the `redirect_uri` inside the link that `GET /organizations/{id_organization}/connect_links` handed out, so the query parameters are whatever the network appends — typically `code` and `state`. Pass them through untouched.
         *
         *     **One authorization can produce several accounts.** A Facebook user with four pages ends up with four; a Discord authorization produces the channel that was picked.
         *
         *     **It answers 200 even when it fails.** The result carries `errorCode` and `errorMsg` instead of an error body, because the browser lands here from a redirect and a raw 400 would be a broken page. Check `errorCode`: empty means everything went well.
         *
         *     **An app cannot call this** — it needs a user token or a temporal connect token (error 519 otherwise). See `GET /organizations/{id_organization}/temporal_connect_token`.
         *
         *     **A temporal connect token is spent here.** Once this call succeeds, that token cannot connect anything else and answers error 543; the `enable` calls that finish the same connection still work until it expires. And if the token was issued for one network, calling this for another answers error 544.
         *
         *     **Telegram does not come through here, and cannot be made to.** That network has no callback: the account is created by PlanVortex when the bot is added to a channel, and what authorizes it is a single-use voucher minted at that moment and spent in the same breath — it never leaves the server, so calling this endpoint for `telegram` answers error 700. It is deliberate: the bot is shared, so without it anyone could hang any channel where that bot is an admin off their own organization by passing a chat id by hand. What an integration listens for instead is the `new_account` webhook notification.
         *
         *     **And a Telegram account arrives already active.** In every other network this endpoint hands you accounts that are still off, and you pick which ones spend a plan slot with `POST .../accounts/{id_account}/enable`. Here there is nothing to call: one channel arrives — the one the person picked in Telegram — and PlanVortex takes the slot for it right then. If the plan has no free slot the account is still created, off, and the person is told so in the bot chat; `GET /organizations/{id_organization}/accounts` will not list it, because that listing only returns active accounts, but naming it in the `accounts` filter does return it.
         */
        get: operations["connectAccount"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get social accounts
         * @description Get social accounts list for the current organization paginated
         */
        get: operations["getAccountList"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get social accounts by identifier
         * @description Get social account by the received identifier
         */
        get: operations["getAccount"];
        /**
         * Update social accounts by identifier
         * @description Update social account by the received identifier
         */
        put: operations["updateAccount"];
        post?: never;
        /**
         * Delete social accounts by identifier
         * @description Delete social account by the received identifier
         */
        delete: operations["deleteAccount"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The thread of an account, read live
         * @description The twin of the publication endpoint, for networks whose comments **do not hang off a publication of yours**.
         *
         *     Today that is Google Business: a review hangs off the **listing**, so the account has no publication to ask about. Its `publication_external_id` is the listing itself (`locations/{id}`) and `id_publication` is always absent.
         *
         *     Same reconciliation, same permissions, same shape of response as the publication thread. Pick between the two by looking at the comment: if it has an `id_publication`, use that one; if it does not, use this.
         *
         *     One behaviour differs underneath, and it matters if you are reasoning about deletions: **reviews are exempt from the deletion sweep**. Google's review listing cannot be ordered by creation date (only by last update or by rating), so the rule that says "newer than the oldest row on this page and missing from it means it is gone" does not hold, and applying it would empty most of a busy listing's inbox in one pass. The trade is deliberate: a review Google removes may linger, which is rare, rather than good rows disappearing, which is not recoverable.
         *
         *     Requires the `comments:read` permission (`client_organization_comments:read` for apps) and a paid plan.
         */
        get: operations["getAccountComments"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/conversations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Conversations of an account
         * @description One entry per contact that has talked with this account, most recent first, with the contact already resolved and its unread count.
         *
         *     **The first call can be slow.** If PlanVortex has no message stored for the account yet, it goes to the network, imports the recent conversations and their messages, and only then answers. From then on it reads from our database.
         */
        get: operations["getConversations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/conversations_total": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Conversation counts of one account
         * @description How many conversations the account had in a date range, either as a single number or grouped into a series.
         *
         *     A *conversation* here is one participant on one day: the same contact writing three times in an afternoon counts once, and counts again tomorrow. It is the unit the plan is measured in, not the number of messages.
         */
        get: operations["getAccountConversationsTotal"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/destinations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List where this account can publish
         * @description The places inside the account a publication can go to: on Pinterest, the boards.
         *
         *     **Most networks have none, and that is not a failure of yours.** Connecting the account already says where a publication comes out — the wall, the channel, the profile — so only the networks that answer `destinations: true` in `GET /social_capabilities` have anything to list. Anywhere else this answers error 992.
         *
         *     **Where they exist, the destination is required.** What comes back here is what you send in `destination.id` when creating the publication, and one created without it is created in state `withErrors` with `publication_errors[].code = 987`, which the background job will not attempt.
         *
         *     The **sections** of a board are not in this listing: ask for one destination to get them.
         */
        get: operations["getAccountDestinations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/destinations/{id_destination}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read one destination and its sections
         * @description One destination with its detail: on Pinterest, the sections of the board, which is what goes in `destination.section_id`.
         *
         *     They are deliberately not in the listing — reading the sections of every board would cost one call to the network per board.
         *
         *     **It is checked against this account's own destinations, not asked of the network blind.** A destination that is not in this account answers error 993, whether it never existed, was just deleted, or belongs to somebody else; without that check the endpoint would read any public board's sections with your token.
         */
        get: operations["getAccountDestination"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/enable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Re-enable a disconnected account
         * @description Brings back an account that was removed, without going through the authorization again — as long as its stored token still works.
         *
         *     It takes a **slot of the plan**, so it fails with error 706 when the organization is already at its account limit. It also turns the network's webhooks back on, on any plan but the free one.
         *
         *     **On `telegram` you normally never call this.** That network's accounts are born active — there is no authorization return in which to choose them, so PlanVortex takes the slot when the bot is added to the channel. The one case left is a channel that arrived while the plan was full: it stays off until a slot frees up, and this is what turns it on.
         *
         *     **On `slack` this is also what puts the PlanVortex app inside the channel**, with `conversations.join`. It works on a **public** channel and it cannot work on a private one: Slack has no API for joining one. The account is enabled all the same and the connection looks healthy, and then the first publication fails with error 980 — so a private channel has to be told to the person **before** they pick it, together with the `/invite @PlanVortex` they have to run in that channel. Whether the app is inside travels in `extra_data.is_member`, and it can turn `false` later, the day somebody removes the app from an already connected channel.
         */
        post: operations["enableAccount"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/message_templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the account's message templates
         * @description The templates the **network** has approved for this account. They are read live from the network, not from our database, so a template approved a minute ago shows up here.
         *
         *     The shape of a template is the network's own: PlanVortex does not normalise it.
         *
         *     **WhatsApp only.** No other network implements message templates: asking any of them returns HTTP 500 with `code: 500` (an unhandled server error), not the 1502 you would expect. Check `messages` in `GET /social_capabilities` and that the account is WhatsApp before calling.
         */
        get: operations["getMessageTemplates"];
        put?: never;
        /**
         * Create a message template
         * @description Sends a template to the network for approval. The body travels to the network as it is, so its fields are the network's (for WhatsApp: `name`, `language`, `category`, `components`).
         *
         *     **Approval is not immediate.** The template comes back in a pending state and only becomes usable when the network approves it, which takes minutes or hours and can be refused.
         *
         *     **WhatsApp only.** No other network implements message templates: asking any of them returns HTTP 500 with `code: 500` (an unhandled server error), not the 1502 you would expect. Check `messages` in `GET /social_capabilities` and that the account is WhatsApp before calling.
         */
        post: operations["createMessageTemplate"];
        /**
         * Delete a message template
         * @description Deletes the template on the network. **The template is identified by query parameters, not by a path segment**, and WhatsApp needs both the id and the name.
         *
         *     **WhatsApp only.** No other network implements message templates: asking any of them returns HTTP 500 with `code: 500` (an unhandled server error), not the 1502 you would expect. Check `messages` in `GET /social_capabilities` and that the account is WhatsApp before calling.
         */
        delete: operations["deleteMessageTemplate"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete every message of an account
         * @description Removes the whole message history PlanVortex stores for this account. **It does not delete anything on the social network**: the conversation is still there, and reading the account again re-imports it.
         */
        delete: operations["deleteMessagesByAccount"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/messages/{id_contact}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Messages exchanged with one contact
         * @description The thread with one contact, newest first.
         *
         *     **Reading the first page marks the thread as read** (`offset=0` only), which is what makes `unread_messages` go down. If PlanVortex has nothing stored for that contact it imports the thread from the network first.
         */
        get: operations["getMessages"];
        put?: never;
        /**
         * Send a message to a contact
         * @description Writes to the contact through the account's network.
         *
         *     What is valid depends on `message_type` and on the network:
         *
         *     • `simple_message` needs `text`, and it is validated against `characters` in `GET /social_limits`.
         *     • **WhatsApp only allows a free-form message inside 24 hours** of the contact's last message. Outside that window the only thing that goes through is a `template_message` with a pre-approved template, and anything else answers an error.
         *     • `file_message` needs at least one entry in `message_options.files` (an upload of this organization) or in `files_urls`.
         *     • Facebook and Instagram accept **one** file per message.
         *     • `quick_reply_message`, `button_message`, `elements_message` and `interactive_message` are Meta-only shapes and each one requires its own block inside `message_options`.
         */
        post: operations["createMessage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/metric_list": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Retrieve a list of possible metrics
         * @description Retrieve a list of possible metrics
         */
        get: operations["getMetricList"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/metrics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Retrieve a list of possible metrics
         * @description Retrieve a list of possible metrics
         */
        get: operations["getAccountStats"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/persistent_menu": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read the account's persistent menu
         * @description The fixed menu shown inside the network's chat. **Only Meta messaging accounts have one** — ask `persistent_menu` in `GET /social_capabilities`; anywhere else this answers error 710.
         *
         *     It is read live from the network.
         */
        get: operations["getPersistentMenu"];
        put?: never;
        /**
         * Replace the account's persistent menu
         * @description **Replaces the whole menu.** There is no partial update: what you send is what the chat shows, and an empty array removes it.
         *
         *     One entry per locale. `default` is the fallback and has to be there.
         */
        post: operations["setPersistentMenu"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List products
         * @description The products of a catalogue, or a single product when `product_id` is sent. As with the catalogues, `total` counts the page.
         *
         *     **Facebook and Instagram only.** They are the only two networks with `products: true` in `GET /social_capabilities`; WhatsApp does not have it either, despite its own catalogue. Everything here speaks Meta Commerce, with Meta's own field names.
         */
        get: operations["getProducts"];
        put?: never;
        /**
         * Create or update a product
         * @description **One endpoint does both.** Send `id` in the body and the existing product is updated; leave it out and a new product is created inside `product_catalog_id`.
         *
         *     `product_catalog_id` travels as a **query parameter** and is required when creating. Without it the call answers error 2000.
         *
         *     **Facebook and Instagram only.** They are the only two networks with `products: true` in `GET /social_capabilities`; WhatsApp does not have it either, despite its own catalogue. Everything here speaks Meta Commerce, with Meta's own field names.
         */
        post: operations["createProduct"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/products_catalogs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the account's product catalogues
         * @description The catalogues owned by the business behind this account.
         *
         *     **`total` is the size of the page, not of the collection.** Meta paginates with cursors and does not return a count, so there is nothing better to report: keep asking with a larger `offset` until a page comes back short.
         *
         *     **Facebook and Instagram only.** They are the only two networks with `products: true` in `GET /social_capabilities`; WhatsApp does not have it either, despite its own catalogue. Everything here speaks Meta Commerce, with Meta's own field names.
         */
        get: operations["getProductCatalogs"];
        put?: never;
        /**
         * Create a product catalogue
         * @description Creates a catalogue under the business behind this account. Only `name` is required.
         *
         *     **The answer carries the identifier, not the object**, even though the field is called `product_catalog`. Read the list back if you need the full catalogue.
         *
         *     **Facebook and Instagram only.** They are the only two networks with `products: true` in `GET /social_capabilities`; WhatsApp does not have it either, despite its own catalogue. Everything here speaks Meta Commerce, with Meta's own field names.
         */
        post: operations["createProductCatalog"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Retrieve list of publications
         * @description Retrieve list of publications from one account (paginated)
         */
        get: operations["getAccountPublications"];
        put?: never;
        /**
         * Create new publications
         * @description Create new publications. For X (Twitter) accounts, paid actions consume the client's monthly X credit pool (shared across organizations). When a publication is sent immediately, the required credits are checked before publishing and only charged on success. A tweet costs 15 credits, or 200 credits if its text contains a link. Link detection uses the same rule the backend applies: an http(s):// URL, a www. host, or a bare domain with a recognized TLD (regex TWITTER_LINK_REGEX). A scheduled publication does not consume credits when created; it is charged when the background job publishes it. If there are not enough credits at publish time the scheduled publication is left in state 'withErrors' with publication_errors.code = 940 and the client-app webhook is fired (it is never thrown). Publishing immediately without enough credits returns error 940.
         */
        post: operations["addPublication"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/publish/{id_publication}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Update a publication (from its account)
         * @description Update publication by identifier
         *
         *     This is the same operation as `PUT /organizations/{id_organization}/publish/{id_publication}`, reachable from the account. Both accept the same body and do the same thing; use whichever path you already have the identifiers for.
         */
        put: operations["updatePublicationByAccount"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/accounts/{id_account}/social_publications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read the account's timeline on the network
         * @description What the account has actually published **on the social network**, whoever published it — including posts written outside PlanVortex.
         *
         *     This is not the same question as `GET /organizations/{id_organization}/publish`, which lists what PlanVortex has scheduled or sent. Use this one to show the real feed; use that one to manage your own publications.
         *
         *     **On X (Twitter) this costs credits.** Reading the timeline is billed at one credit per post read, and the budget is checked against `limit` before the call — the most it could cost — and charged afterwards for what actually came back. Ask for less than you need and you pay less.
         */
        get: operations["getSocialPublications"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/ai-context": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Replace the organization's brand context for AI
         * @description The brand context every AI plan of this organization starts from: what the business does, who it talks to, the tone, what must never appear.
         *
         *     **It replaces the whole context, it is not a patch.** A field you leave out is erased, and an empty body removes the context entirely — after which plans run on their own prompt alone.
         *
         *     There is no GET: the current context already travels inside the organization object, in `ai_context`.
         */
        put: operations["updateOrganizationAiContext"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The inbox: first-level comments across the whole organization
         * @description Served from PlanVortex's database, so it costs nothing and calls no social network. It is a **snapshot**: `collected_date` says when each row was last read. Open a thread to see what the network says right now.
         *
         *     Ordered by `creation_date` descending — the date on the network, not the date we collected it — so rows from ten networks interleave correctly.
         *
         *     **On `telegram` the inbox starts the day the channel was connected.** The Bot API has no way to read the past: a bot only learns what happens while it is inside, so nothing written before the connection exists here and never will. Say so in your UI — an inbox that opens empty on a busy channel reads like a failure.
         *
         *     **Your own replies are not in here.** Anything with `author.is_own: true` is filtered out: what you wrote is not incoming mail. They are still stored, and they do show up in the thread.
         *
         *     Requires the `comments:read` permission (`client_organization_comments:read` for apps) and a paid plan.
         */
        get: operations["getComments"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/comments/{id_comment}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Mark as read, or hide on the network
         * @description Two different kinds of change, accepted together because a panel changes them from the same place:
         *
         *     - `read` is **yours**. It touches no social network, costs nothing and can always be set.
         *     - `hidden` **touches the network**, and not every network allows it — LinkedIn and Google Business have no hide endpoint at all and return error `946`. Check `GET /social_comment_actions` before offering the control.
         *
         *     Requires the `comments:create` permission (`client_organization_comments:create` for apps) and a paid plan.
         */
        put: operations["updateComment"];
        post?: never;
        /**
         * Delete the comment on the social network
         * @description Deletes it **on the network** and marks the row `deleted: true` here. The row is kept on purpose rather than removed: if it were removed, the next read of the thread — or the webhook, which repeats — would create it again.
         *
         *     Which comments you may delete depends on the network and on whose comment it is, and the two cases use different permissions of the network's own: `delete_own` for yours, `delete_others` for somebody else's. Instagram and X refuse the second; **on Google Business the only thing that can be deleted is your own reply**, never a review. Reading `GET /social_comment_actions` first is the difference between a button that works and one that always errors.
         *
         *     On X this costs credits.
         *
         *     On `telegram` both are allowed by the network and both depend on a permission the customer controls: the bot has to be an administrator of the discussion group with the right to delete. When it is not, the answer is error 969 — which is the difference between "this network cannot" and "this particular channel cannot".
         *
         *     Requires the `comments:delete` permission (`client_organization_comments:delete` for apps) and a paid plan.
         */
        delete: operations["deleteComment"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/comments/{id_comment}/replies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The replies to a comment, read live
         * @description Second level, read against the network like the thread — and, on X, charged the same way.
         *
         *     Your own replies written in the last few minutes are injected into the first page even when the network does not list them yet: networks index what you just wrote with a delay, and without this you would post a reply, refresh, and see nothing.
         *
         *     On Google Business a review has **at most one** reply — yours — so this returns zero or one row and there is no tree to walk.
         *
         *     Requires the `comments:read` permission (`client_organization_comments:read` for apps) and a paid plan.
         */
        get: operations["getCommentReplies"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/comments/{id_comment}/reply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reply in public
         * @description Posts a **public** reply on the social network. This is not the same as replying privately to whoever commented — that is a Messenger feature and lives in the messaging endpoints.
         *
         *     The reply is stored immediately, with `author.is_own: true`, without waiting for the network to index it, and the comment it answers is left `replied: true` and `read: true` with `our_reply_external_id` pointing at it.
         *
         *     **On Google Business this is an upsert.** A review has at most one reply, so replying again does not add a second one: it replaces the text of the one that is there, and the stored row is updated in place. Label your button accordingly — "reply" the first time, "edit reply" afterwards.
         *
         *     The text is validated against that network's limit before anything is sent (`comment_characters` in `GET /social_limits`); an empty or over-long text returns error `948` with the limit in `data.max`.
         *
         *     **On X this costs credits**: 15, or 200 if the text contains a link, charged only on success.
         *
         *     **On `telegram` the reply is signed by the PlanVortex bot**, not by the channel. It is written in the channel's linked discussion group, which is where Telegram keeps the comments on a channel post — and a channel with no discussion group has no comments at all, which is error 965. Publishing is not affected: a channel post is signed by the channel.
         *
         *     Requires the `comments:create` permission (`client_organization_comments:create` for apps) and a paid plan.
         */
        post: operations["replyComment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/connect_links": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get the connection links of every connectable network
         * @description The authorization URL of each network, so the user can connect an account to this organization.
         *
         *     **A network that cannot produce a link simply does not appear.** That is a legitimate answer, not a failure: it is what happens with `discord` in an organization that has not saved its own bot credentials yet (see `PUT /organizations/{id_organization}/social_credentials/{social_network}`).
         *
         *     **An app cannot call this.** Connecting a social account is an OAuth flow with a person in front of it, so this endpoint only accepts a user token or a temporal connect token; with app credentials it answers error 519. The way an integration does it is to issue a temporal connect token with `GET /organizations/{id_organization}/temporal_connect_token` and hand it to its end user.
         *
         *     **Read `authorization`, not `link`.** Almost every network is `redirect` and you send the person to `link`. Two are not, and neither of them fails visibly if you treat it as one:
         *
         *     • **WhatsApp is not a URL at all.** Its sign-up is Meta's Embedded Signup, a popup you raise with the Facebook JavaScript SDK, so its `link` is an empty string and everything you need to open that popup travels in `authorization`. A client that loops over the list and redirects to `link` sends its user to its own page.
         *     • **Telegram has a link and still is not a redirect.** It opens a chat with the PlanVortex bot, and nobody comes back from it: the account is born minutes later, from the bot being added to a channel, and it is announced over the WebSocket. Open it in another tab and keep listening; redirect to it and there is nobody left to tell.
         */
        get: operations["getConnectLinks"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/contacts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the contacts of an organization
         * @description Newest first. `search` is a full-text search over the name, and `extra_data` filters by your own fields — which is what makes it possible to ask for "the contacts of this campaign" without keeping a second database.
         */
        get: operations["getContacts"];
        put?: never;
        /**
         * Create a contact
         * @description Creates a contact by hand, which is how you bring people in from your own system.
         *
         *     **Creating a contact does not let you write to them.** To send the first message the network has to allow it: WhatsApp needs an approved template, and Meta only allows an answer inside 24 hours of the contact writing first. What `social_identifiers` gives you is the link, not the permission.
         */
        post: operations["createContact"];
        /**
         * Delete every contact of an organization
         * @description Deletes all the contacts of the organization **and every message exchanged with them**. There is no confirmation step and no undo.
         *
         *     Nothing is deleted on the social networks: the conversations are still there, and reading an account again re-imports the contacts.
         */
        delete: operations["deleteOrganizationContacts"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/contacts/{id_contact}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get one contact
         * @description The contact's record. Note the envelope: this one answers `{contact}`, while the list answers `{contacts, total}`.
         */
        get: operations["getContact"];
        /**
         * Update a contact
         * @description Updates the contact's fields. **It answers `{success: true}`, not the updated contact** — read it back if you need the new state.
         */
        put: operations["updateContact"];
        post?: never;
        /**
         * Delete a contact
         * @description Deletes the contact **and every message exchanged with them**. Nothing is deleted on the social network.
         */
        delete: operations["deleteContact"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/conversations_total": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Conversation counts of the whole organization
         * @description The same count as the per-account endpoint, adding up every account of the organization. Use it for the plan-consumption screen; use the per-account one to compare channels.
         */
        get: operations["getOrganizationConversationsTotal"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The whole home screen in one call
         * @description Composes every block of the home screen in a single round trip: operational health, publications, publication metrics, account metrics, plan use, AI plans, the best AI plans and unread messages.
         *
         *     **A block the caller cannot read is omitted, not refused.** The endpoint only demands the minimum permission — reading the organization — and then checks each block on its own: somebody who can only see publications still gets their home instead of a 403. `available_blocks` says which blocks were allowed, so an absent block for lack of permission and an absent block for lack of data can be drawn differently.
         *
         *     The messages block is also omitted when the client's plan has no messaging.
         */
        get: operations["getDashboard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/integrations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the integrations of an organization
         * @description Requires the `integrations:read` permission (`client_organization_integrations:read` for apps).
         */
        get: operations["getIntegrations"];
        put?: never;
        /**
         * Connect an integration
         * @description Creates the connection. The body depends on the provider:
         *
         *     - `google_drive`: `{ provider, code }`, where `code` is the OAuth code returned to the redirect of `connect_link`. It is single-use, so the plan allowance is checked **before** the exchange.
         *     - `rss`: `{ provider, url, id_accounts, template?, publication_type?, auto_publish?, import_image? }`. The feed is read once to validate it and to take its title, and every item it already has is recorded as seen — connecting a blog never publishes its back catalogue.
         *     - `woocommerce`: `{ provider, url, consumer_key, consumer_secret }`, a **read** key created by hand in the store. The keys are tried against the store before anything is saved, and an organization can connect several stores: each one takes one integration of the allowance. The approval button (`connect_link`) does the same without anyone copying a key, and is the better way whenever the store allows it.
         *
         *     Requires the `integrations:create` permission.
         */
        post: operations["addIntegration"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/integrations/{id_integration}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get one integration
         * @description Requires the `integrations:read` permission.
         */
        get: operations["getIntegration"];
        /**
         * Update an integration
         * @description Only what the user owns: its name, whether it is enabled and its `config` (merged, not replaced — `seen_guids` and `last_checked` belong to the job). Credentials are never updated here; for that, `POST .../reconnect`. Changing a feed's `url` here keeps the items it had already seen, so the new feed's back catalogue would be published on the next sweep — change a feed's URL through `/reconnect`, which revalidates it and marks its current items as seen.
         *
         *     **A store's `config` cannot be edited at all** (`2220`, and nothing of the request is applied): its `url` decides which server receives the stored key, so whoever could change it could send the key, which also reads the store's orders and customers, anywhere. Changing store is reconnecting, which tries the key against the new URL.
         *
         *     A disabled integration stops consuming plan allowance. Enabling one or changing its config clears `error_code`, so the job retries it.
         *
         *     Requires the `integrations:update` permission.
         */
        put: operations["updateIntegration"];
        post?: never;
        /**
         * Disconnect an integration
         * @description Revokes the credentials at the provider, when the provider allows it, and deletes the connection.
         *
         *     **A WooCommerce key cannot be revoked from outside**: WooCommerce does not let an app delete its own key. Tell the user to delete it in WooCommerce → Settings → Advanced → REST API; it is the one whose description starts with "PlanVortex - API" (when it was created with the button) and whose key ends in `config.key_ending`. Until then the key stays alive in their WordPress, unused.
         *
         *     Files already imported are **not** touched: they are your files, in your library, counting against your storage. Disconnecting Drive never empties anyone's library.
         *
         *     Requires the `integrations:delete` permission.
         */
        delete: operations["deleteIntegration"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/integrations/{id_integration}/picker_config": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Short-lived configuration for the provider's own file picker
         * @description Everything the browser needs to open Google's Picker: a fresh access token for the connected account (scope `drive.file`, ~1 hour), the browser API key and the project number that acts as the Picker's `appId`.
         *
         *     Behind `files:create` and **not** `files:read`: whoever cannot put files into the library has no use for a Drive token.
         *
         *     Returns `2203` if the connection needs reconnecting, and `2201` if the provider has no picker.
         */
        get: operations["getIntegrationPickerConfig"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/integrations/{id_integration}/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Products of a connected store
         * @description One page of the catalogue of an integration whose provider has `catalog: true` (a WooCommerce store), to choose the products of a `from_catalog` AI plan. Read **live** from the store on every call.
         *
         *     - **Paginated by an opaque `cursor`**, not by page number: send back `next_cursor` as it came, and stop when it is absent.
         *     - **What the public cannot see does not come**: drafts, private products and products hidden from the catalogue. **What is out of stock DOES come, with `available: false`**: show it marked and do not let it be chosen.
         *     - `price` is text to copy verbatim, as the store displays it. Absent means no price, and it is also absent on taxable products while the store's `config.tax_location_missing` is true.
         *
         *     A store that rejects its key (`2211`) is marked with that `error_code` until it is reconnected, and shows up as `connected: false`. A firewall (`2212`) or a store that does not answer (`2213`) does not mark it: that fixes itself, or on the store's side.
         *
         *     Requires the `integrations:read` permission.
         */
        get: operations["getIntegrationProducts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/integrations/{id_integration}/reconnect": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reconnect an integration
         * @description Renews the credentials of an integration that already exists — the OAuth token expired or the provider revoked it (`2203`) — or revalidates a feed's configuration, **on the same document**.
         *
         *     The body is the same one you would send to connect: `{ provider, code }` for an OAuth provider, or the form fields for a feed or a store. A store can also be reconnected with its approval button: `connect_link` with `id_integration`, and no call here. It is handled by the same provider logic, so a feed that still cannot be read is still a `2205`.
         *
         *     Use this instead of deleting and connecting again. Reconnecting keeps the `_id` (publications created by a feed reference it), the connection date and the feed's seen items — deleting and reconnecting a feed would republish the blog's whole back catalogue on the next sweep.
         *
         *     What it does not touch: `enabled` (reconnecting never switches on a disabled integration, because that consumes plan allowance) and the creation date. `error_code` is cleared, so the background jobs pick it up again. `name` is kept unless the connection now points somewhere else (another Google account, another feed URL, another store), in which case the new one is taken.
         *
         *     No allowance check: nothing new is created, so it works even with the plan full.
         *
         *     Requires the `integrations:update` permission.
         */
        post: operations["reconnectIntegration"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/integrations/{provider}/connect_link": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Connection link of a provider (OAuth or a store's approval page)
         * @description The link to send the user to, for providers whose `connect_link` is true; anything else returns `2201`.
         *
         *     - `google_drive`: Google's consent screen. The user comes back to `{FRONT_APP}/connect/integration/google_drive` with a `code` to post to `POST /organizations/{id_organization}/integrations`.
         *     - `woocommerce`: the store's own approval page (`/wc-auth/v1/authorize`), so the store `url` is required (`connect_link_fields`). The store is checked **now, without credentials** (https, a firewall in front, whether WooCommerce is there), so what is going to fail fails while the user is still in your app. The person approving must be able to manage WooCommerce in that WordPress (an administrator or a shop manager). After approving, the store sends a read-only key straight to PlanVortex, and the user comes back to `{FRONT_APP}/connect/integration/woocommerce?id_integration=…&success=…&user_id=…`.
         *
         *     **After a store's link, do not trust `success`: read `GET .../integrations/{id_integration}`.** A `2200` means the key never arrived (the user cancelled, or the store's call failed); `error_code` `2219` means it is still being checked (a few seconds; poll, and if it stays there, reconnect); any other `error_code` is what failed; none means connected. The link lasts 15 minutes and works once. The allowance is checked here (`1404`) so nobody approves a key that would be refused, and again when the key arrives.
         *
         *     Requires the `integrations:create` **or** `integrations:update` permission: the consent link is needed both to connect a new integration and to reconnect one that already exists (`POST /organizations/{id_organization}/integrations/{id_integration}/reconnect`). Reconnecting a store with `id_integration` requires `integrations:update`.
         */
        get: operations["getIntegrationConnectLink"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/limits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Retrieve actual limitations for the received organization
         * @description etrieve actual limitations for the received organization
         */
        get: operations["getOrganizationLimits"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/metrics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Account metrics of the organization
         * @description Account statistics added up across the organization, on the axis asked for in `group_by`.
         *
         *     **Not every metric adds up the same way.** `impressions` over a week is the sum of the seven days, but `followers` is the *last* value of each account: adding up seven snapshots of "1.200 followers" would report 8.400. The aggregation already knows which is which — do not add up the series yourself.
         *
         *     A metric that a network does not publish is simply absent. It is not a zero.
         */
        get: operations["getOrganizationMetrics"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/organizations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get child organizations of the received organization
         * @description Return a list of child organizations inside the received organization
         */
        get: operations["getChildOrganizations"];
        put?: never;
        /**
         * Create a child organization inside the received organization
         * @description Create a new child organization with its own resources inside the received parent organization
         */
        post: operations["createOrganizationInsideOrganization"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/publications/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List publications with their metrics
         * @description Publications sent in the range, each with its last known normalized metrics, ordered by the requested metric. Covers the organization **and its children**.
         *
         *     Two things to keep in mind when reading the response:
         *
         *     - `summary` always covers the **whole organization**; `social_network` and `accounts` filter only the listing. Pass `summary=false` when paging so the aggregates are not recomputed on every page — they only depend on the date range.
         *     - Publications that have **not been measured yet** are included, with `metrics` absent. That is the difference with `/publications/top`, which can only rank what has already been measured. An absent metric is not a zero.
         *
         *     Only `sended` publications are listed: a draft or a scheduled publication has nothing to measure.
         */
        get: operations["getPublicationsStats"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/publications/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Publication counts of the range
         * @description How many publications there are by state, by network and by day.
         *
         *     **`by_day` and `published_by_day` answer different questions over different sets.** `by_day` counts by *creation* date — work done — and `published_by_day` counts by *publish* date and only what actually went out. A publication written last month and published yesterday appears in the second and not in the first, which is the normal case for anybody scheduling two weeks ahead.
         */
        get: operations["getPublicationsSummary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/publications/top": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Best publications of the range
         * @description The publications with the highest value of one metric.
         *
         *     **A publication whose network does not report that metric does not compete**, it is left out of the ranking rather than ranked as a zero. That is why asking for `saves` can return fewer rows than asking for `engagement`.
         */
        get: operations["getTopPublications"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Retrieve list of publications
         * @description Retrieve all publications of the organization (paginated)
         */
        get: operations["getPublications"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/publish/{id_publication}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Retrieve publication by identifier
         * @description Retrieve publication by identifier.
         *
         *     A **deleted** publication answers error 917, the same as one that never existed: the delete is soft on our side, but it is a delete for the API.
         */
        get: operations["getPublication"];
        /**
         * Update publication by identifier
         * @description Update publication by identifier
         */
        put: operations["updatePublication"];
        post?: never;
        /**
         * Delete publication by identifier
         * @description Delete publication by identifier. It stops being readable by identifier afterwards, so deleting twice answers error 917. For an already-sent X (Twitter) publication, removing the tweet on X is a paid action that consumes 15 X credits; it is only removed on X when there are enough credits. Returns error 940 when the X credit pool is exhausted.
         *
         *     **On Telegram there is a 48-hour window.** Past it the Bot API refuses to delete a message whatever the bot's role is, and the answer is error 966 with `published_date` and `max_hours` in `data` — so the sensible thing is to grey the button out rather than offer it and fail. Error 969 is the other case: the bot is no longer allowed to delete there. And an album is several messages: all of them go, or the post would be left half-published in the channel.
         */
        delete: operations["deletePublication"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/publish/{id_publication}/comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The thread of a publication, read live
         * @description Asks the social network and reconciles with what is stored: the network wins on text, counters and existence; the stored copy only contributes `_id`, `read` and `replied`. Comments the network no longer returns are marked deleted and stop appearing in the inbox.
         *
         *     **On X this call costs money.** X bills per unit read, so the response carries `credits_consumed` with what this particular read spent from the client's monthly pool. It is `0` on every other network. Charging happens after the read and by real units: a failed call charges nothing, and a page with three replies is not charged for fifty.
         *
         *     Use this one when the comment has an `id_publication`. When it does not — a review hangs off a listing — use the per-account endpoint instead.
         *
         *     **On `telegram` it is not live**, and that is the one exception to everything above: there is no endpoint in the Bot API that lists the replies to a post, so this returns PlanVortex's own inbox — what the bot has seen since the channel was connected. Nothing is reconciled and nothing is swept as deleted, because there is nothing to compare against.
         *
         *     Requires the `comments:read` permission (`client_organization_comments:read` for apps) and a paid plan.
         */
        get: operations["getPublicationComments"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/publish/{id_publication}/metrics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get metrics from the received publication
         * @description Get metrics from the received publication. Retrieve only metrics associated to the social network of the publication. For X (Twitter) publications, fetching metrics on demand is a paid owned-read that consumes 1 X credit from the client's monthly pool; returns error 940 when it is exhausted.
         *
         *     Fields the network did not report are **omitted from the response**, which is not the same as a zero — see the `PublicationStats` schema.
         */
        get: operations["getPublicationMetrics"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/publish/{id_publication}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Retry a failed publication
         * @description Sends a publication that ended in state `withErrors` to its social network again, WITHOUT changing its content.
         *
         *     The publication is sent during the request, so the response already carries the outcome: `state: "sended"` if it went out, or `state: "withErrors"` with the errors of THIS attempt if it failed again. A scheduled publication whose date has not arrived yet goes back to `ready` and the scheduler picks it up at its time.
         *
         *     Every accepted call spends one retry, even when the publication fails again — what the endpoint promises is an attempt, not a success. The limit is `max_retries`, also served by `GET /publication_limits`. Once it is spent the way to try again is to update the publication (`PUT`), which resets the counter to 0, or to create a new one.
         */
        post: operations["retryPublication"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/publish/{id_publication}/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get the measured history of a publication
         * @description Time series of everything already measured for this publication: one row per day, from oldest to newest.
         *
         *     Unlike `/metrics`, this endpoint **does not call the social network** and therefore **never consumes X (Twitter) credits** — it only reads what the collector already stored. Use it to draw a publication's evolution; use `/metrics` only when you deliberately want a fresh read.
         *
         *     Statistics are collected for **30 days** after publishing, on a decreasing cadence (every 6 h for the first 48 h, then daily, then weekly). Past that window `next_stats_update` is omitted and the series stops growing.
         *
         *     Each row is the publication's **running total** at that date, not that day's increment: to get the daily delta, subtract consecutive rows. An empty `series` is a valid answer (publication just sent, or a network that reports no statistics for that content), not an error.
         */
        get: operations["getPublicationStatsHistory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the roles of an organization
         * @description Returns the roles defined in the organization, paginated.
         *
         *     Access: the caller needs either the client-level permission `client_organization_roles:read` or the organization-level permission `organization_roles:read`. Every endpoint under this organization also requires the client plan to allow at least 2 users (error `511` otherwise).
         */
        get: operations["getOrganizationRoles"];
        put?: never;
        /**
         * Create a role in an organization
         * @description Creates a role with its permission list. The name must be unique within the organization (error `1205`) and every permission must be a valid organization permission (error `1201`).
         *
         *     Access: the caller needs either the client-level permission `client_organization_roles:create` or the organization-level permission `organization_roles:create`. Every endpoint under this organization also requires the client plan to allow at least 2 users (error `511` otherwise).
         */
        post: operations["createOrganizationRole"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/roles/{id_rol}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Update a role
         * @description Replaces the name and the permission list of the role. **Both properties are overwritten**, so send the complete permission list and not just the ones you are adding.
         *
         *     Default roles cannot be updated (error `1207`).
         *
         *     Access: the caller needs either the client-level permission `client_organization_roles:update` or the organization-level permission `organization_roles:update`. Every endpoint under this organization also requires the client plan to allow at least 2 users (error `511` otherwise).
         */
        put: operations["updateOrganizationRole"];
        post?: never;
        /**
         * Delete a role
         * @description Deletes the role. Users that belonged to it lose the permissions it granted. Default roles cannot be deleted (error `1207`).
         *
         *     Access: the caller needs either the client-level permission `client_organization_roles:delete` or the organization-level permission `organization_roles:delete`. Every endpoint under this organization also requires the client plan to allow at least 2 users (error `511` otherwise).
         */
        delete: operations["deleteOrganizationRole"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/roles/{id_rol}/invite": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Invite somebody to a role by email
         * @description Sends an invitation email with a temporary link and assigns the invited user to the role.
         *
         *     If nobody exists with that address, a disabled user is created and enabled when the invitation is accepted. If the address is already a disabled invited user, the invitation is re-sent.
         *
         *     Returns `609` if the address is not valid and `508` if the email could not be sent.
         *
         *     Access: the caller needs either the client-level permission `client_organization_roles:create` or the organization-level permission `organization_roles:create`. Every endpoint under this organization also requires the client plan to allow at least 2 users (error `511` otherwise).
         */
        post: operations["inviteUserToOrganizationRole"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/roles/{id_rol}/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the users of a role
         * @description Returns the users that belong to the role, with the roles each of them holds in this organization. Paginated.
         *
         *     A user that no longer exists in the identity provider is skipped instead of breaking the listing, so `users` may be shorter than `total`.
         *
         *     Access: the caller needs either the client-level permission `client_organization_users_roles:read` or the organization-level permission `organization_users_roles:read`. Every endpoint under this organization also requires the client plan to allow at least 2 users (error `511` otherwise).
         */
        get: operations["getUsersInOrganizationRole"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/roles/{id_rol}/users/{id_user}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Add an existing user to a role
         * @description Adds a user who already exists to the role. Idempotent: adding the same user twice does nothing.
         *
         *     The organization cannot exceed the number of users its plan allows (error `1109`). To bring in somebody who is not a PlanVortex user yet, use the invite endpoint instead.
         *
         *     Access: the caller needs either the client-level permission `client_organization_users_roles:create` or the organization-level permission `organization_users_roles:create`. Every endpoint under this organization also requires the client plan to allow at least 2 users (error `511` otherwise).
         */
        post: operations["addUserToOrganizationRole"];
        /**
         * Remove a user from a role
         * @description Removes the user from the role. The last user of a default role can be removed too: an organization's `Admin` role is allowed to end up with nobody in it.
         *
         *     Access: the caller needs either the client-level permission `client_organization_users_roles:delete` or the organization-level permission `organization_users_roles:delete`. Every endpoint under this organization also requires the client plan to allow at least 2 users (error `511` otherwise).
         */
        delete: operations["removeUserFromOrganizationRole"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/social_credentials/{social_network}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Save the organization's own application credentials for a network
         * @description **Bring your own bot.** On every network but one, the application talking to the social network is PlanVortex's. On `discord` it is the client's: the organization creates its own application in Discord's developer portal and saves its credentials here.
         *
         *     The reason is not technical. The permission that lets an application read the **text** of messages (`MESSAGE_CONTENT`) is reviewed **per application** once it is reachable by more than 10.000 users, so one shared application would drag every client on the platform into an annual review the first time a single community grew. This way the exposure stays with the client that caused it.
         *
         *     Three consequences worth building against:
         *
         *     • **Until this is saved, `discord` does not appear in `GET /organizations/{id_organization}/connect_links` at all** and every Discord call answers error 960. That is the initial state of every organization, not a failure.
         *     • **Secrets are write-only.** They are stored encrypted and never come back: the organization object returns `client_id`, `application_name`, `verified_date` and the two booleans `has_client_secret` / `has_bot_token`, never the values. **What you do not send is kept**, so the `client_id` can be corrected without resending the token.
         *     • **Saving validates against Discord first** (`GET /oauth2/applications/@me`) and stores nothing if that fails. It also catches the two portal switches that would otherwise break the OAuth flow with no explanation: *Public Bot* must be **on** and *Requires OAuth2 Code Grant* must be **off**.
         *
         *     Requires the `organization:update` permission (`client_organization:update` for apps).
         *
         *     There is no GET on purpose: everything readable already travels inside the normal organization object, in `social_credentials`.
         */
        put: operations["updateOrganizationSocialCredentials"];
        post?: never;
        /**
         * Remove the organization's own credentials for a network
         * @description The organization stops being able to connect accounts on that network, and the network disappears from `connect_links` again.
         *
         *     **Accounts already connected are not touched.** Publishing through a Discord channel goes out through that channel's incoming webhook, which does not depend on these credentials — what stops working is reading comments and statistics, which needs the bot.
         */
        delete: operations["deleteOrganizationSocialCredentials"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/temporal_connect_token": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Issue a temporal connect token for an end user
         * @description Returns a URL that lets **a person** connect a social account to this organization, without that person having a PlanVortex account and without your `client_secret` ever leaving your server.
         *
         *     It exists because **an app cannot connect accounts**: `connect_links` and `account-connect` refuse app credentials with error 519, since authorizing Instagram is an OAuth flow with a human in front of it. The shape of the integration is therefore:
         *
         *     1. Your server asks for this token — **this endpoint is the one that requires app credentials**, and a user token is refused. So is a temporal connect token: it cannot renew itself, which is what keeps its life a real limit rather than the first link of a chain.
         *     2. You send your end user to the `url` that comes back, by redirect or in an iframe. The bare
         *        `token` comes back too, so a server-side client can authenticate with it directly instead of
         *        parsing it out of that URL.
         *     3. With that token the browser completes `connect_links` and `account-connect`.
         *
         *     The token lasts **fifteen minutes**, is tied to **this** organization — using it against another answers error 1101 — and carries only two permissions: create accounts and read the organization. It is the piece designed for a browser, and the only credential of ours that belongs there.
         *
         *     **It connects once.** As soon as an `account-connect` succeeds, the token stops being able to connect anything else and answers error 543; the `enable` calls that finish that same connection keep working until it expires. Issue a new one per connection — they are free and immediate.
         *
         *     **If you pass `social_network`, the token is bound to that network** and will not connect any other (error 544). Leave it out to let the person pick.
         *
         *     If you send `redirect_uri` it has to be one of the app's `redirect_urls`, or the call answers error 532.
         */
        get: operations["createTemporalConnectToken"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/unread_comments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * How many comments are waiting
         * @description The badge number. Counts unread, non-deleted comments of the organization, leaving out the ones you wrote yourself.
         *
         *     Requires the `comments:read` permission (`client_organization_comments:read` for apps) and a paid plan.
         */
        get: operations["getTotalUnreadComments"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/unread_messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Unread messages in the organization
         * @description How many incoming messages are still unread across every account of the organization. It is the number for a badge, and it costs one query: do not compute it by walking the conversations.
         */
        get: operations["getUnreadMessages"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/uploads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get all uploads (paginated) from received organization
         * @description Return a list of files from the received organization
         */
        get: operations["getUploads"];
        put?: never;
        /**
         * Upload new file
         * @description Upload new file to the received organization
         */
        post: operations["addUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/uploads/{id_upload}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Retrieve a file by identifier
         * @description Retrieve a file by identifier
         */
        get: operations["getUpload"];
        /**
         * Update file by identifier
         * @description Update file by identifier
         */
        put: operations["updateUpload"];
        post?: never;
        /**
         * Delete file by identifier
         * @description Delete file by identifier
         */
        delete: operations["deleteUpload"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/uploads/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Import files into the library from a connected integration
         * @description Brings files the user picked in the provider (Google Drive's own Picker) into the organization's library. See the Integrations schema for how to connect one and get the picker token.
         *
         *     The checks run in this order, and the order matters: format first (before touching the network — downloading 180 MB only to reject the format would be absurd), then the organization's storage quota, then a streamed download that counts the bytes as they arrive and aborts on the limit (the size the provider declares is informative and is never trusted), then HEIC→JPEG conversion where needed.
         *
         *     **The response is deliberately partial**: `uploads` carries what got in and `errors` what did not, so picking six files and getting five plus one named failure is the normal, expected outcome — not an error.
         *
         *     Requires the `files:create` permission (`client_organization_files:create` for apps).
         */
        post: operations["importUploads"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/use": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Plan consumption of the organization
         * @description What this organization has been assigned, what it is using, and the limits in force, in one call.
         *
         *     It exists so that drawing a progress bar does not mean asking for the client's whole organization list — which is what it used to take, and which needs a client-level permission an organization user has no reason to have.
         *
         *     An organization with no plan of its own inherits the closest parent that has one.
         */
        get: operations["getOrganizationUse"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/organizations/{id_organization}/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Retrieve all users in the received organization
         * @description Retrieve all users with any role in the received organization
         */
        get: operations["getUserInOrganizationRole"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/planner_templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * AI planner templates
         * @description What an AI plan can be generated FROM, and what each source allows.
         *
         *     A template is the **source** of the content, not the wizard's flow: sharing, publish days, language, tone and images stay cross-cutting options, and every template declares which of them it accepts. Send the chosen one as `template` when creating a plan (`POST /ai_plans`), together with its `source`.
         *
         *     • **`generates_images: false` means the pictures come from the source** — your own photos, your catalogue — so the plan spends **no image credits at all**. A week of 7 publications with a picture on each goes from 519 credits to 48, and it is worth saying out loud before the plan is created.
         *     • **`regenerate` is per template.** A template that did not generate the image cannot regenerate it: offer that button anyway and the user pays 70 credits to replace their own photo with an invented one.
         *     • **`orchestration_cost` is an ESTIMATE, not the bill.** The real charge is per use (what the provider reports). `orchestration_cost_per_source_item` is what each unit of the source adds on top — one vision pass per image.
         *     • **A plan is WEEKLY, and the source does not extend it.** With `max_source_items` photos but fewer slots left in the week, the extra ones are dropped and the plan carries warning 2117 in `ai_plan.warnings`. Say it in your UI *before* creating the plan, not after charging for it.
         *     • **`source_fields` is what the source step is made of.** The simple types are ordinary controls; `uploads_with_description` and `catalog_products` are the signal that the step needs a component of its own.
         *     • **Not every network fits every template.** `unsupported_networks` lists the ones whose accounts a plan of that template cannot carry (2120): offer only the rest, instead of letting the user pick a YouTube account for a week of product photos.
         *     • **The fields carry their own limits.** `max` and `min` are in the field's own units — characters of a text, items of a list, **days** for a date — and `source_requires_any` names the fields of which at least one is needed (`from_text`: the URL or the pasted text; `from_catalog`: a Meta catalogue account or a connected store). Read them from here; hardcoding them is how a wizard ends up rejecting at a number the server does not use.
         */
        get: operations["getPlannerTemplates"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/publication_limits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Publication limits that do not depend on the network
         * @description Limits that apply to a publication whatever network it goes to. Today there is one: how many times a failed publication can be retried by hand with `POST /organizations/{id_organization}/publish/{id_publication}/retry`.
         *
         *     It is published for the same reason as `/social_limits`: a 3 written into a client stays a 3 the day the server raises it to 5, and the button would promise a retry the API refuses.
         */
        get: operations["getPublicationLimits"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/social_capabilities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * What every network supports
         * @description The full matrix network → capabilities. It is the **single source of truth** about what a network can do: the catalogue publishes it, the backend checks it before acting, and your integration should filter its account pickers with it rather than keeping a list of its own.
         *
         *     `comments` is the coarse gate — whether the network has comments at all. Which *actions* it allows on one is a finer question and lives in `GET /social_comment_actions`, because the shape here is `{[capability]: boolean}` and nesting an object inside would break it.
         *
         *     Today ten networks answer `comments: true`: Facebook, Instagram, Threads, LinkedIn, X, YouTube, Google Business, Bluesky, Discord and Telegram. TikTok, WhatsApp, Slack and Pinterest answer `false`, for reasons of theirs and not ours — on Pinterest the API *counts* a pin's comments and offers no way to read them, so the figure shows up in the publication's statistics and there is still no inbox.
         *
         *     **Two of the keys are about publishing, not about reading.** `destinations` says the network publishes into places inside the account and every publication has to name one — a Pinterest board, read with `GET /organizations/{id_organization}/accounts/{id_account}/destinations`. `link` says a publication carries a destination link of its own, separate from its text. Both are `false` everywhere but `pinterest` today, and both are the reason to ask this matrix instead of keeping a list of your own: a composer with its own copy of which network has which field is exactly what drifted with the character limits.
         *
         *     A `true` here is about the **network**, not about one account of it: a Telegram channel with no linked discussion group answers 965 on its comments even though the network has them.
         *
         *     Only needs authentication.
         */
        get: operations["getSocialCapabilities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/social_comment_actions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * What each network lets you do to a comment
         * @description The fine-grained matrix: reply, hide, delete your own, delete somebody else's — network by network. Read it before painting controls. Networks without comments answer `false` to all four.
         *
         *     The differences are real and each has a reason in the network's own API:
         *
         *     | Network | reply | hide | delete_own | delete_others |
         *     | --- | --- | --- | --- | --- |
         *     | `facebook` | yes | yes | yes | yes |
         *     | `instagram` | yes | yes | yes | **no** — Instagram only lets you hide someone else's |
         *     | `youtube` | yes | yes | yes | yes — the channel owner really does moderate |
         *     | `linkedin` | yes | **no** — there is no hide endpoint | yes | yes |
         *     | `twitter` | yes | yes | yes | **no** — you cannot delete another account's post |
         *     | `google_business` | yes | **no** | yes — **your reply**, never the review | **no** |
         *     | `bluesky` | yes | yes — through the post's `threadgate` | yes | **no** — the reply lives in somebody else's repository |
         *     | `discord` | yes | **no** — Discord has no hide, only delete | yes | yes |
         *     | `telegram` | yes | **no** — Telegram has no hide either | yes | yes — with the bot as an admin of the discussion group, otherwise error 969 |
         *     | `threads` | yes | yes | yes | **no** — deleting somebody else's reply is not a permission you lack, it is a call that does not exist in the API |
         *     | `tiktok`, `whatsapp` | no | no | no | no |
         *
         *     Only needs authentication.
         */
        get: operations["getSocialCommentActions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/social_limits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Per-network publication limits
         * @description Every limit a publication is validated against, indexed by limit and then by network.
         *
         *     Read it before building a composer. A few traps worth knowing:
         *
         *     • **`characters` is not always the only text limit.** Bluesky counts 300 *graphemes* **and** 3.000 *bytes*; the second one travels in `max_post_bytes`, where `0` means "this network does not measure text in bytes". A family emoji is one grapheme and eleven UTF-16 units, so counting with `String.length` is wrong in both directions.
         *     • **`0` in `title_characters` means the network has no title field**, not a title of zero length.
         *     • **`comment_characters` is a different limit from `characters`.** Facebook takes 63.206 in a post and 8.000 in a comment.
         *     • **`characters` is not one number per network either.** Telegram takes 4.096 in a text post and **1.024** in the caption of a photo or a video, and it is the same composer field: the second number is the key `telegram_media`. Over the limit the publication is created in state `withErrors` with `publication_errors[].code = 967`, which carries `characters`, `max_characters` and `has_media`.
         *     • Every network in `/social_networks` appears in every map. A missing key is a bug, and the backend's conformance suite fails on it.
         */
        get: operations["getSocialLimits"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/social_networks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the supported social networks
         * @description Every network PlanVortex can connect, as a flat array of identifiers.
         *
         *     This is the list every other enumeration in the API is built from. It grows several times a year, so a client that hardcodes it will reject a value it should have accepted.
         */
        get: operations["getSocialNetworks"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export interface webhooks {
    comments: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * A change happened (notification to your app)
         * @description PlanVortex `POST`s to the `webhook_url` of your client app when something happens. **The body is an array of changes**, and each one carries `field` telling you what it is — switch on it and ignore what you do not handle, because the list grows with the product.
         *
         *     Two shapes travel in that array. A change on an **account** (`WebhookChange`) always carries `id_account`, `id_organization` and `social_network`. A change on an **integration** (`IntegrationWebhookChange`) carries none of those, because an integration hangs off the organization and not off any account.
         *
         *     The events delivered today are `new_account`, `change_state_account`, `messages`, `messaging_postbacks`, `messaging_seen`, `messaging_error`, `comments` and `integration_error`.
         *
         *     ### Comments
         *
         *     `field: "comments"` is the one for this section, and the comment itself travels in **`commentObj`** — a property of its own, never in `messageObj`. That is deliberate: a comment is not a message, it has no contact and it hangs off a publication. A consumer that only understands messages sees `commentObj` as absent and ignores the change, which is exactly what should happen.
         *
         *     **Which networks arrive this way:** Facebook and Instagram, because Meta pushes them. YouTube, LinkedIn and Google Business have no comment webhook, so those are polled by a background job and appear in the inbox within a few hours rather than instantly. X is polled too, and only when the organization turns it on, because reading replies there is billed per unit.
         *
         *     **Meta repeats deliveries.** The same comment can arrive more than once; the backend is idempotent about it and so should you be — deduplicate on `commentObj.external_id`.
         *
         *     ### Verifying the signature
         *
         *     Every delivery carries the body signed with your app's secret, twice:
         *
         *     - `x-hub-signature`: `sha1=<hmac>`
         *     - `x-hub-signature-256`: `sha256=<hmac>`
         *
         *     Compute the HMAC over the **raw** request body — not over a re-serialized copy of the parsed JSON — and compare in constant time. Prefer the sha256 header.
         *
         *     Delivery is best effort: PlanVortex does not retry a webhook that fails.
         */
        post: operations["onCommentsWebhook"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export interface components {
    schemas: {
        /**
         * @description A social account connected to an organization.
         *
         *     On `discord`, on `telegram` and on `slack` an account is a **channel**, not a profile: publishing to two Discord channels of the same server — or to two Telegram channels of the same brand, or to `#anuncios` and `#general` of the same Slack workspace — costs two accounts of the plan.
         *
         *     `error_code` other than `0` means the connection is broken — an expired token, a permission taken away — and the account has to be connected again. On `telegram` nothing expires, because there is no account token: what breaks the connection is the bot being removed from the channel or losing its permission to post there (error 968). On `slack` the bot token does not expire either: what breaks it is the app being removed from the channel (error 980) or the channel being archived or deleted (error 985).
         */
        Account: {
            _id: string;
            /** Format: date-time */
            creation_date: string;
            /** @description `0` is a healthy account. Anything else is a PlanVortex error code explaining why the connection stopped working; the account keeps its data but cannot be used until it is reconnected. */
            error_code: number;
            /** @description Followers the network reports. Absent on an account that has never been measured. On `telegram` and on `slack` it is the channel's member count, and it is the **only** audience figure either network publishes: there are no views, no impressions and no reach anywhere in the Bot API nor in the Slack Web API. */
            followers_count?: number;
            /** @description The client the organization hangs from. Denormalized here for the plan checks. */
            id_client: string;
            id_organization: string;
            /** @description Avatar URL as the network publishes it. Empty string when there is none. */
            image?: string;
            /** @description Display name of the profile, page or channel. */
            name: string;
            /**
             * Format: date-time
             * @description When the collector will read this account's comments again. Only on the networks whose comments hang off the account and not off a publication — today, `google_business`, whose reviews belong to the listing.
             */
            next_comments_update?: string;
            /**
             * Format: date-time
             * @description When the collector will ask the network for this account's stats again.
             */
            next_stats_update?: string;
            /** @description A link that opens a private chat with this account (`m.me`, `ig.me`, `wa.me`). Absent on every other network. */
            private_message_link?: string;
            /** @description Network this account belongs to. **Not every network publishes**: `whatsapp` is a messaging channel with no feed, and `google_business` is a local business listing that receives reviews — both can be connected and both appear here, but neither accepts publications (see `GET /social_capabilities`). */
            social_network: components["schemas"]["SocialNetwork"];
            /** @description The handle, when the network has one. Absent on the networks that do not (a Discord channel, a WhatsApp number, a Google Business listing) and on a **private** Telegram channel, which has no `@name` at all — only public ones do. That is also why a private channel's publications come back with no `url`. */
            username?: string;
        };
        AccountsAccountList: {
            accounts: components["schemas"]["Account"][];
            total: number;
        };
        AccountsAccountOne: {
            account: components["schemas"]["Account"];
        };
        AccountsMetricList: ("page_total_actions" | "page_call_phone_clicks_logged_in_unique" | "page_get_directions_clicks_logged_in_unique" | "page_website_clicks_logged_in_unique" | "page_post_engagements" | "page_consumptions_unique" | "page_negative_feedback" | "page_negative_feedback_unique" | "page_fans_online_per_day" | "page_impressions" | "page_impressions_unique" | "page_impressions_paid" | "page_impressions_paid_unique" | "page_impressions_organic_v2" | "page_impressions_organic_unique_v2" | "page_impressions_viral" | "page_impressions_viral_unique" | "page_impressions_nonviral" | "page_impressions_nonviral_unique" | "page_posts_impressions" | "page_posts_impressions_unique" | "page_posts_impressions_paid" | "page_posts_impressions_paid_unique" | "page_posts_impressions_organic" | "page_posts_impressions_organic_unique" | "page_posts_served_impressions_organic_unique" | "page_posts_impressions_viral" | "page_posts_impressions_viral_unique" | "page_posts_impressions_nonviral" | "page_posts_impressions_nonviral_unique" | "impressions" | "reach" | "total_interactions" | "accounts_engaged" | "likes" | "comments" | "saves" | "shares" | "replies" | "follows_and_unfollows" | "profile_links_taps" | "website_clicks" | "profile_views" | "paidFollowers" | "organicFollowerGain" | "careersPageBannerPromoClicks" | "careersPagePromoLinksClicks" | "careersPageEmployeesClicks" | "careersPageJobsClicks" | "careersPageViewsUnique" | "careersPageViews" | "overviewPageViewsUnique" | "overviewPageViews" | "allPageViews" | "follows" | "share" | "views")[];
        /** @description A metric series for one account, already grouped. `group` says what each row covers: a range of 31 days or less is grouped by day, up to 720 by month, and beyond that by year. */
        AccountsMetricModel: {
            /** @enum {string} */
            group: "day" | "month" | "year";
            /** @description One row per metric and per group. Empty when nothing was measured in the range. */
            stats: {
                /**
                 * Format: date-time
                 * @description First measurement of the group, which is what dates the row.
                 */
                date: string;
                /** @enum {string} */
                group: "day" | "month" | "year";
                /** @description The group's ordinal: day of the year, month, or year, matching `group`. */
                group_value: number;
                /** @description The metric's RAW name, the one the network publishes — the same names `GET .../metric_list` returns. */
                name: string;
                /** @description Sum of the measurements in the group. */
                value: number;
            }[];
        };
        /** @description The chat's fixed menu, one entry per locale, in Meta's own format. The entry with `locale: "default"` is required and is what is shown when no other locale matches. */
        AccountsPersistentMenu: {
            /** @description The buttons. A `postback` sends you its `payload` as a message; a `web_url` opens a page; a `nested` holds more buttons. */
            call_to_actions?: {
                [key: string]: unknown;
            }[];
            /** @description `true` hides the text box, leaving the menu as the only way to answer. */
            composer_input_disabled?: boolean;
            /** @description `default`, or a locale such as `es_ES`. */
            locale?: string;
        }[];
        /**
         * @description **How** an account of this network is authorized, which is not always "send the user to this URL".
         *
         *     Almost every network is `redirect`: open `link` and the network sends the person back to PlanVortex with a code. Two are not:
         *
         *     • **WhatsApp.** Its sign-up is Meta's *Embedded Signup*: a popup raised by the Facebook JavaScript SDK from your own page, which returns — over `postMessage` — session data (`waba_id`, `phone_number_id`) that no query string carries. Its `link` is therefore an empty string.
         *     • **Telegram.** There is no OAuth here: no consent screen, no `code`, no account token. `link` opens a private chat with the PlanVortex bot, the person then adds that bot to their channel, and **the account is created from that event**, not from any request of yours. Which means the connection cannot be finished by calling `GET /organizations/{id_organization}/account-connect/telegram` — see that endpoint.
         *
         *     Branch on `authorization.type`, never on whether `link` is empty.
         */
        AccountsSocialAuthorizationMethod: {
            /** @description `telegram_bot` only. The **second** step, and it does not follow from the first: `link` opens the list of channels and this one opens the list of groups. It adds the bot to the channel's linked discussion group, which is what turns comments on — a Telegram channel with no discussion group has no comment inbox at all (error 965). Optional for the user: publishing and statistics work without it. */
            add_to_group_link?: string;
            /** @description `meta_embedded_signup` only. Goes to `FB.init({appId})`. It is the same Meta app whose secret PlanVortex uses to exchange the code afterwards. */
            app_id?: string;
            /** @description `telegram_bot` only. The bot's `@name`, **without the at sign**. Published here so you never have to write it by hand: it is the name the person will see in Telegram, and it changes with the deployment. */
            bot_username?: string;
            /** @description `meta_embedded_signup` only. Goes to `FB.login(cb, {config_id})` — the Embedded Signup configuration. */
            config_id?: string;
            /** @description `meta_embedded_signup` only. Goes to `extras.featureType`. */
            feature_type?: string;
            /** @description `meta_embedded_signup` only. Goes to `FB.init({version})`. This is the JavaScript SDK version, not the Graph version PlanVortex calls server-side: they move independently. */
            graph_version?: string;
            /** @description `meta_embedded_signup` only. Goes to `extras.sessionInfoVersion`. */
            session_info_version?: string;
            /**
             * @description `redirect`: send the user to `link`. `meta_embedded_signup`: open the Meta popup with the fields below. `telegram_bot`: open `link` in another tab and wait for the account to show up.
             * @enum {string}
             */
            type: "redirect" | "meta_embedded_signup" | "telegram_bot";
        };
        AccountsSocialLinksList: {
            /** @description One entry per network that can be connected right now. */
            links: {
                authorization: components["schemas"]["AccountsSocialAuthorizationMethod"];
                /**
                 * @description The network's authorization URL. Send the user there. **Empty when `authorization.type` is `meta_embedded_signup`** — WhatsApp has no URL to give at all.
                 *
                 *     On `telegram_bot` it is filled in, and it still is not somewhere to redirect: it opens a Telegram chat, not an authorization screen. Open it in another tab.
                 */
                link: string;
                social_network: components["schemas"]["SocialNetwork"];
            }[];
        };
        /** @description Brand context for AI generation. Every field is optional; the ones you fill in are what the model is told about the business. */
        AiContext: {
            /** @description Who the content is aimed at. */
            audience?: string;
            /** @description Topics, expressions or competitors that must never appear. */
            avoid?: string;
            blog_url?: string;
            /** @description Commercial name, when it differs from the organization's. */
            brand_name?: string;
            /** @description Default tone. A tone set on the plan itself wins over this one. */
            default_tone?: string;
            /** @description What the organization does. */
            description?: string;
            /** @description Recurring keywords and hashtags. */
            keywords?: string[];
            /** @description Anything else the model should know. */
            notes?: string;
            /** @description Products or services that may be promoted. */
            products?: string;
            sector?: string;
            shop_url?: string;
            /** @description Social profiles or other reference links. */
            social_urls?: string[];
            value_proposition?: string;
            website?: string;
        };
        /**
         * @description What ONE AI plan achieved with what it published.
         *
         *     **Where the numbers come from.** A plan keeps its publications, and each publication keeps the last known value of its metrics (the same ones `GET /organizations/{id}/publications/stats` returns). This adds those up — nothing here is measured twice or asked to the network again.
         *
         *     **Only the publications that went out and were measured count** (`publications.measured`). A post scheduled for tomorrow, one that failed or one published an hour ago that nobody has measured yet does not lower the average: it is simply not in it.
         *
         *     **A missing metric is not a zero**, as everywhere else: if no publication of the plan reports `reach`, the plan has no `reach` key.
         */
        AiPlanResult: {
            /** @description Accounts the plan was generated for. */
            accounts: number;
            /**
             * Format: date-time
             * @description Archived plans are included: archiving is visibility only, and what they published is still published.
             */
            archived_date?: string;
            /** Format: date-time */
            creation_date: string;
            /** @description AI credits per interaction: what each interaction cost. Lower is better. Absent with no interactions, with no credits spent (your own AI key) and **whenever `social_network` is filtered** — the cost belongs to the whole plan, and dividing it by one network's interactions would overprice every one of them. */
            credits_per_engagement?: number;
            /** @description AI credits the plan cost, for the whole plan. */
            credits_spent: number;
            /** @description Interactions per measured publication — **the number plans are ranked by**. The total rewards size (seven accounts for seven days beat one account even if each post does half as well), and the engagement rate divides by reach on some networks and by followers on others, which makes two plans on different networks incomparable. Absent when nothing is measured yet. */
            engagement_per_publication?: number;
            /** @description `engagement_per_publication` divided by `expected_engagement_per_publication`: **1 means like your average, 2 twice as much, 0.5 half**. This is the number that says whether a plan is *good*, not just first — the ranking still orders by `engagement_per_publication`, so the first plan can be below 1. Absent with nothing measured or no average to compare with. */
            engagement_vs_average?: number;
            /**
             * @description What **your usual posts** would get with the same mix of networks: the organization's average interactions per measured post on each network, weighted by how many measured posts the plan has there. Two measured posts on Instagram (average 5) and two on LinkedIn (average 1) expect (2·5 + 2·1) / 4 = 3.
             *
             *     The average covers **every** measured post of the organization in the range, AI ones included, on the same networks. Weighting by network is what keeps a LinkedIn-only plan from always reading as below average just because LinkedIn moves less than Instagram.
             */
            expected_engagement_per_publication?: number;
            id_ai_plan: string;
            /** @description The organization the plan belongs to. In the dashboard block it can be a **child** of the organization you asked about, and a plan is only reachable by id through its own organization. */
            id_organization: string;
            /** Format: date-time */
            last_publish_date?: string;
            /** @description Its numbers are still moving: something is still scheduled, or its last publication is less than 7 days old. Comparing it with a plan from last month is unfair to the new one — say so rather than hiding it. */
            maturing: boolean;
            metrics: components["schemas"]["NormalizedMetrics"];
            prompt: string;
            publications: {
                /** @description Failed to publish. */
                failed: number;
                /** @description Published **and** with metrics collected: the only ones the averages use. */
                measured: number;
                /** @description Went out to the network. */
                published: number;
                /** @description Scheduled, or being published right now. */
                scheduled: number;
                /** @description Publications of the plan that still exist. Deleted ones do not count. */
                total: number;
            };
            /** @description Whether the plan competes in the ranking: it needs at least **3 measured publications**, or all of them if it published fewer. With a single measurement, one lucky post would put its plan first. */
            ranked: boolean;
            /** @description Networks the plan published on. With the `social_network` filter, only the filtered ones. */
            social_networks: components["schemas"]["SocialNetwork"][];
            /**
             * @description Only these two can have results. A `generated` plan was never validated, but someone may have published some of its drafts by hand.
             * @enum {string}
             */
            state: "generated" | "validated";
            /**
             * @description What the plan was generated from. A plan created before templates existed reads `standard`.
             * @enum {string}
             */
            template: "standard" | "from_images" | "from_text" | "from_catalog" | "campaign";
            /**
             * Format: date-time
             * @description The week the plan publishes in. **This is what the range filters on**, not the creation date.
             */
            week_start: string;
        };
        /** @description The aggregate of a set of plans: all of them, or those of one template. */
        AiPlanResultsGroup: {
            /** @description Credits per interaction, counting **only the plans that already have something measured**: a plan validated yesterday brings its whole cost and no interactions, and would make the group look expensive for arriving late. Absent with the `social_network` filter. */
            credits_per_engagement?: number;
            /** @description Credits of every plan in the group. */
            credits_spent: number;
            /** @description A **weighted** average: every interaction of the group divided by every measured publication of the group — not the average of each plan's average, which would let a one-post plan weigh as much as a forty-post one. */
            engagement_per_publication?: number;
            /** @description The group's interactions per post over what was expected, computed over the **same** plans on both sides — a plan with no reference cannot add its interactions to one side only. */
            engagement_vs_average?: number;
            /** @description What your usual posts would get with the group's mix of networks, weighted like its average. Only plans that have a reference count. */
            expected_engagement_per_publication?: number;
            metrics: components["schemas"]["NormalizedMetrics"];
            plans: number;
            publications: {
                measured: number;
                published: number;
            };
            /** @description How many of them compete in the ranking (see `AiPlanResult.ranked`). */
            ranked_plans: number;
        };
        AiPlansAiPlan: {
            /** @example 66d04a6a427f4c43b9d97f54 */
            _id: string;
            /** @description Accounts the plan was generated for. */
            accounts: string[];
            /**
             * Format: date-time
             * @description When the plan was archived. Absent means it is active, which is how every plan created before archiving existed comes back.
             *
             *     It is a field of its own and NOT a value of `state` on purpose: `state` is the generation lifecycle and archiving is orthogonal to it — a `validated` plan that already published gets archived just like a `failed` one. Inside the enum you would have to decide which state it returns to when unarchived, and that question has no answer.
             *
             *     Archiving is visibility only: it takes the plan out of the default listing and touches no publication. Anything it had scheduled keeps publishing.
             */
            archived_date?: string;
            /** @description Generation attempts consumed (transient failures are retried, max 2). */
            attempts: number;
            /** Format: date-time */
            creation_date: string;
            /** @description AI credits actually consumed by the generation. */
            credits_spent: number;
            /** @description The destination of each account of the plan that needs one (today, the board of every Pinterest account). Empty on a plan without such accounts, and on every plan created before destinations existed. */
            destinations?: components["schemas"]["AiPlansAiPlanDestination"][];
            /** @description Last generation error. Present only in state `failed`. */
            error?: components["schemas"]["AiPlansAiPlanNotice"];
            /** Format: date-time */
            generation_end_date?: string;
            id_client: string;
            id_organization: string;
            /** @description User who requested the generation. */
            keycloak_identifier?: string;
            options: components["schemas"]["AiPlansAiPlanOptions"];
            /** @description Raw plan returned by the orchestrator, kept for audit (before validation/trimming). */
            orchestrator_result?: Record<string, never>;
            /** @description SNAPSHOT of the organization's brand context taken when the plan was created, so a retry or a regeneration reproduces the same plan even if the configuration changed. Absent when the plan was asked for without context, or when the organization had none. */
            organization_context?: components["schemas"]["AiContext"];
            prompt: string;
            /**
             * @description The generated publications — ordinary drafts of the publication domain.
             *
             *     **It is not always the same shape.** Reading one plan (`GET`, `validate`, `retry`) returns whole publications with their files resolved; the LISTING returns their identifiers as strings. Check before using them.
             */
            publications: (string | components["schemas"]["Publication"])[];
            /** @description The source snapshot. Absent on a `standard` plan, which has no source. */
            source?: components["schemas"]["AiPlansAiPlanSource"];
            /**
             * @description State machine: pending -> generating -> generated -> validated | failed | cancelled. Poll the plan while state is pending or generating.
             * @enum {string}
             */
            state: "pending" | "generating" | "generated" | "validated" | "failed" | "cancelled";
            /**
             * @description What this plan was generated from. Always present: a plan created before templates existed reads `standard`.
             * @enum {string}
             */
            template?: "standard" | "from_images" | "from_text" | "from_catalog" | "campaign";
            /**
             * @description Non-blocking notices about the LAST attempt (they are cleared when a new one starts). The plan is generated and perfectly usable; your UI just has to say what happened.
             *
             *     Today there are two.
             *
             *     **2117 — some source items did not fit in the plan week.** A plan is weekly and the source does not extend it, so 12 photos with 6 slots left publish 6 and the rest are dropped. `data` carries `{ source_items, capacity }`. Better said BEFORE creating the plan (the slots are the publish days x the accounts) than after charging for it.
             *
             *     **922 — a publication of a network that cannot publish without an image was left without one.** On Pinterest a pin is an image or a video, never text. The plan cannot be created with a configuration that would cause this (2119), but an image generation that fails halfway through the plan cannot be foreseen. `data` carries `{ step, social_network, id_account, id_publication }`: that draft will not publish until it has an image — regenerate it or attach one.
             */
            warnings?: components["schemas"]["AiPlansAiPlanNotice"][];
        };
        /** @description Deterministic cost estimate computed by the backend (never by the model). BYOK scopes cost 0 credits. */
        AiPlansAiPlanCostEstimate: {
            available_credits: number;
            /** @description Mandatory cost (orchestration + target texts). The orchestration half depends on the TEMPLATE and on the size of its source: `orchestration_cost` + `orchestration_cost_per_source_item` x units, both published in `GET /planner_templates`. The plan is rejected if this exceeds the available credits. */
            base_cost: number;
            /** @description Total estimated cost including the financeable images (upper bound). */
            estimated_cost: number;
            /** @description How many images the plan will generate. **0 when the template does not generate them** (`from_images`, `from_catalog`): the pictures come from the source, so the plan spends no image credits at all — a week of 7 publications with a picture on each goes from 519 credits to 48. That is worth saying out loud before the plan is created. */
            images_target: number;
            texts_target: number;
        };
        AiPlansAiPlanCreateRequest: {
            /** @description Account ids (belonging to the organization) to generate the plan for. **Not every network fits every template**: leave out the ones in the template's `unsupported_networks` (`GET /planner_templates`), or the plan is refused with 2120. */
            accounts: string[];
            /**
             * @description Where each account publishes, for the networks that answer `destinations: true` in `GET /social_capabilities` — today `pinterest` alone, where it is the board of every pin of that account.
             *
             *     **On Pinterest it is required, one entry per Pinterest account of the plan.** A plan without it — or with a board id that is not a string of digits — is rejected with **2118**, listing EVERY account that fails in `data.accounts[]` with the same `reason` as the publication's 987 (`missing`, `invalid_id`, `invalid_section_id`), so your UI can mark them all at once. Without this check the plan would be created, charged, and leave a week of drafts in `withErrors` with the 987.
             *
             *     Entries for accounts on networks without destinations are dropped, not rejected. The board is **not** checked against Pinterest at creation — that would make creating a plan depend on Pinterest answering; a board that does not exist fails when the pin is published. Read the account's boards with `GET /organizations/{id_organization}/accounts/{id_account}/destinations`.
             */
            destinations?: components["schemas"]["AiPlansAiPlanDestination"][];
            options?: components["schemas"]["AiPlansAiPlanOptionsInput"];
            /** @description Theme prompt written by the user. */
            prompt: string;
            /** @description The source itself. Which fields it carries depends on `template`. Required for every template except `standard`, and validated at creation — 2112, 2113, 2114, 2115, 2116 or a store's own errors (2200, 2207-2214) come back while the user is still there. */
            source?: components["schemas"]["AiPlansAiPlanSourceInput"];
            /**
             * @description What the plan is generated FROM. Optional; defaults to `standard`, which is exactly what every plan did before templates existed — send nothing and nothing changes.
             *
             *     A template is the **source** of the content, not a different flow: `shared`, `publish_days`, `language`, `tone` and the images stay cross-cutting options, and each template declares which of them it accepts. Sending one it does not accept is a 2106, not a silent ignore.
             *
             *     Read the list, the costs and the fields from `GET /planner_templates`; do not hardcode them.
             * @enum {string}
             */
            template?: "standard" | "from_images" | "from_text" | "from_catalog" | "campaign";
        };
        AiPlansAiPlanCreateResponse: {
            ai_plan: components["schemas"]["AiPlansAiPlan"];
            estimate: components["schemas"]["AiPlansAiPlanCostEstimate"];
            /** @description Shortcut to estimate.estimated_cost. */
            estimated_cost: number;
        };
        /**
         * @description The destination of ONE account of the plan: the Pinterest board where **all** of that account's publications of the plan go.
         *
         *     One per ACCOUNT, not one per plan, because a plan can carry three Pinterest profiles and each one has its own boards. And it travels with the account, not with the content: in a `shared` plan the same content replicated to three profiles lands on three boards with nothing else to touch.
         *
         *     There is no default destination stored on the account: it lives in the plan alone.
         */
        AiPlansAiPlanDestination: {
            destination: components["schemas"]["PublicationDestination"];
            /** @description An account of the plan — one of `accounts`. An entry for an account that is not in the plan is a 2106 (almost always an id swapped by mistake). */
            id_account: string;
        };
        AiPlansAiPlanList: {
            ai_plans: components["schemas"]["AiPlansAiPlan"][];
            total: number;
        };
        /** @description Something the plan has to say about itself, in the same shape as an API error. */
        AiPlansAiPlanNotice: {
            code: number;
            data?: {
                [key: string]: unknown;
            };
            message: string;
        };
        AiPlansAiPlanOne: {
            ai_plan: components["schemas"]["AiPlansAiPlan"];
        };
        /** @description Generation options as they were STORED, already normalised: `publish_days` comes sorted and deduplicated, and every default has been resolved. */
        AiPlansAiPlanOptions: {
            /**
             * @description Whether images may be generated. Each image costs 70 AI credits.
             * @default true
             */
            allow_images: boolean;
            /** @description Upload ids from the organization's gallery used as visual reference for the generated images. */
            gallery_uploads: string[];
            /**
             * @description Language of the generated texts.
             * @default es
             */
            language: string;
            /** @description The destination link given to the plan's publications on the networks with `link: true` (today `pinterest`). Absent when none was sent or the plan has no such network. */
            link?: string;
            /** @description Optional cap on the number of images; the credit budget may reduce it further. */
            max_images?: number;
            /**
             * @description Days of the week the plan publishes on, in ISO 8601 numbering (1 = Monday ... 7 = Sunday). Defaults to the whole week. There is still at most ONE publication per day and account, so this is what bounds the size and the cost of the plan: the number of generated posts is (selected days x accounts). Must be a non-empty array of unique integers between 1 and 7, or the request is rejected with 2106. The 7-day window starts at week_start, so each ISO day appears exactly once: with a week_start in mid-week, day 1 (Monday) is the FOLLOWING Monday. If the selected days leave no future slot at all, the request is rejected with 2108.
             * @default [
             *       1,
             *       2,
             *       3,
             *       4,
             *       5,
             *       6,
             *       7
             *     ]
             */
            publish_days: number[];
            /**
             * @description Generate ONE piece of content per day and replicate it across every account, each scheduled at the best hour for ITS network, instead of one publication per account and day. Cheaper — one text and one image per day — and it caps images at 7.
             * @default false
             */
            shared: boolean;
            /**
             * @description IANA timezone for the optimal publish slots (typically the user's browser timezone). publish_date is stored in UTC.
             * @default Europe/Madrid
             */
            timezone: string;
            /** @description Optional tone (e.g. 'cercano', 'profesional') passed to the prompt. */
            tone?: string;
            /**
             * @description Use the organization's brand context in the prompts. It is copied into the plan as a SNAPSHOT when the plan is created, so a retry or a regeneration uses the context the plan was asked with even if the configuration changed meanwhile.
             * @default true
             */
            use_organization_context: boolean;
            /**
             * Format: date-time
             * @description Start of the week to plan (slots are generated between this date and +7 days). Defaults to now.
             */
            week_start: string;
        };
        /** @description Generation options, as you SEND them: every one is optional and the server fills in its default. Optimal publish slots are chosen deterministically by the backend from a fixed table per network, converted to this timezone; the model never invents times. */
        AiPlansAiPlanOptionsInput: {
            /** @description Whether images may be generated. Each image costs 70 AI credits. Optional; defaults to `true`. Forced to `false` when the template does not generate images (`generates_images: false`), where the picture comes from the source and costs nothing. */
            allow_images?: boolean;
            /** @description Upload ids from the organization's gallery used as visual reference for the generated images. They are references for the images the model GENERATES, so a template that does not generate them does not accept them either (`allows_gallery`): sending them to `from_images` or `from_catalog` is a 2106. */
            gallery_uploads?: string[];
            /** @description Language of the generated texts. Optional; defaults to `"es"`. */
            language?: string;
            /**
             * @description **The destination link** of the plan's publications — the pin's `link`, the same for every publication of the plan. Optional: a pin without a link is legitimate, it just takes nobody anywhere. On `from_catalog`, each pin leads to **its product's page** (`permalink`) when this is absent; when it is present, it wins.
             *
             *     It only reaches the publications of the networks that answer `link: true` in `GET /social_capabilities` (today `pinterest`); with none of them in the plan it is dropped. With one, it is validated **at creation**: a URL Pinterest would reject is a **994** now (`data.reason` `invalid_url` or `too_long`), not a week of pins failing at publish time.
             */
            link?: string;
            /** @description Optional cap on the number of images; the credit budget may reduce it further. */
            max_images?: number;
            /** @description Days of the week the plan publishes on, in ISO 8601 numbering (1 = Monday ... 7 = Sunday). Defaults to the whole week. There is still at most ONE publication per day and account, so this is what bounds the size and the cost of the plan: the number of generated posts is (selected days x accounts). Must be a non-empty array of unique integers between 1 and 7, or the request is rejected with 2106. The 7-day window starts at week_start, so each ISO day appears exactly once: with a week_start in mid-week, day 1 (Monday) is the FOLLOWING Monday. If the selected days leave no future slot at all, the request is rejected with 2108. Optional; defaults to `[1,2,3,4,5,6,7]`. */
            publish_days?: number[];
            /** @description Generate ONE piece of content per day and replicate it across every account, each scheduled at the best hour for ITS network, instead of one publication per account and day. Cheaper — one text and one image per day — and it caps images at 7. Optional; defaults to `false`. **Not every template accepts it** (`allows_shared` in `GET /planner_templates`): `from_images` and `from_catalog` do not, because each of their publications carries a photo of its own, and sending `true` to them is rejected with 2106. */
            shared?: boolean;
            /** @description IANA timezone for the optimal publish slots (typically the user's browser timezone). publish_date is stored in UTC. Optional; defaults to `"Europe/Madrid"`. */
            timezone?: string;
            /** @description Optional tone (e.g. 'cercano', 'profesional') passed to the prompt. */
            tone?: string;
            /** @description Use the organization's brand context in the prompts. It is copied into the plan as a SNAPSHOT when the plan is created, so a retry or a regeneration uses the context the plan was asked with even if the configuration changed meanwhile. Optional; defaults to `true`. */
            use_organization_context?: boolean;
            /**
             * Format: date-time
             * @description Start of the week to plan (slots are generated between this date and +7 days). Defaults to now.
             */
            week_start?: string;
        };
        AiPlansAiPlanResults: {
            /** @description The page of plans, in `sort` order. */
            ai_plans: components["schemas"]["AiPlanResult"][];
            /** @description One entry per template that has plans in the range, best `engagement_per_publication` first. This is the answer to «which kind of plan works for me?». */
            by_template: components["schemas"]["AiPlansAiPlanResultsTemplateGroup"][];
            /** @description The range that was actually used. The plans in it are those whose **week** starts inside it. */
            range: {
                /** Format: date-time */
                from_date: string;
                /** Format: date-time */
                previous_from_date?: string;
                /** Format: date-time */
                previous_to_date?: string;
                /** Format: date-time */
                to_date: string;
            };
            /** @description The order that was applied. */
            sort: string;
            /** @description Plans with results in the range (and filters), across every page. */
            total: number;
            totals: components["schemas"]["AiPlanResultsGroup"];
        };
        AiPlansAiPlanResultsTemplateGroup: components["schemas"]["AiPlanResultsGroup"] & {
            /** @enum {string} */
            template: "standard" | "from_images" | "from_text" | "from_catalog" | "campaign";
        };
        /** @description The plan source as it was STORED: a snapshot taken when the plan was created, not a live reference. It is what makes a retry reproduce the same plan even if the article went offline or the product left the catalogue — same reason as `organization_context`. */
        AiPlansAiPlanSource: {
            /** @description `campaign`. The event and its date, already normalised to the start of ITS day in the plan timezone. */
            event?: {
                /** Format: date-time */
                date?: string;
                name?: string;
            };
            /** @description `from_catalog`. The account whose Meta catalogue was read. */
            id_account_catalog?: string;
            /** @description `from_catalog`. The connected store (an integration) whose catalogue was read. Only one of the two is present. */
            id_integration_catalog?: string;
            /** @description `from_images`. The chosen photos with their descriptions, in the order they were sent — the position IS the `source_index` of the publication that uses it. */
            images?: {
                description?: string;
                id_upload?: string;
            }[];
            /** @description `from_catalog`. Snapshot of the chosen products. */
            products?: components["schemas"]["AiPlansAiPlanSourceProduct"][];
            /** @description `from_text`. The article, already downloaded and truncated. It is never downloaded again. */
            text?: string;
            /** @description `from_text`. The original address, kept for the record and to show where the plan came from. */
            url?: string;
        };
        /** @description One photo of `from_images`. */
        AiPlansAiPlanSourceImageInput: {
            /** @description What is in the photo. **Mandatory on purpose**: without it the model writes about what it believes it sees, and with a product photo it gets the product wrong about half the time. */
            description: string;
            /** @description An upload of the organization. It has to be an image: a video or an audio is rejected here, not later at publish time. */
            id_upload: string;
        };
        /**
         * @description The plan's source, as you SEND it. **One shape per template**: send only the fields of the template you chose — what it does not read is ignored, and what it needs and does not get is a 2112.
         *
         *     It is validated when the plan is **created**, not when it is generated: the article is downloaded, the catalogue or the store is read live and the product pictures are copied. So a source that does not work fails while the user is still there and can fix it, and what gets stored is a SNAPSHOT — a retry three days later does not depend on the article still being online or the product still being in the catalogue.
         *
         *     | Template | Fields |
         *     | --- | --- |
         *     | `standard` | none — no source |
         *     | `from_images` | `images` |
         *     | `from_text` | `url` **or** `text` |
         *     | `from_catalog` | `id_account_catalog` + `product_catalog_id` (a Meta catalogue) **or** `id_integration_catalog` (a connected store), and `products` |
         *     | `campaign` | `event_name`, `event_date` |
         */
        AiPlansAiPlanSourceInput: {
            /**
             * Format: date
             * @description `campaign`. The day of the event. **Send a calendar day, `YYYY-MM-DD` — never an ISO instant.** A bare date is read in the plan's `options.timezone`, which is the whole point: `2026-09-15T00:00:00Z` is midnight UTC, that is the 14th in the afternoon in New York — a whole day off in a countdown, for half of America, with no error anywhere. It cannot fall before the plan week (`options.week_start`) nor more than 60 days after it (2112). And it does **not** move `publish_days`: if the event lands on a day you did not choose, the plan respects your choice and it is up to you to say so.
             */
            event_date?: string;
            /** @description `campaign`. What the countdown is towards ("Rebajas de verano", "Apertura del local"). Over 120 characters it is **rejected, not truncated**: a name cut mid-word would come out that way in all seven publications, and whatever else needs saying goes in `prompt`. */
            event_name?: string;
            /** @description `from_catalog`, from a **Meta catalogue**. Which account's catalogue the products come from. It has to belong to the organization (2103) and be on a network that supports products (2115). It only chooses the catalogue: the publications still go to every account in `accounts` — a LinkedIn account can publish a product from a Facebook catalogue. **Exclusive with `id_integration_catalog`** (both at once is a 2112). */
            id_account_catalog?: string;
            /** @description `from_catalog`, from a **connected store**. An integration of the organization whose provider has `catalog: true` (a WooCommerce store), enabled; another organization's is a 2200, without confirming it exists. The products are its `external_id`s, from `GET .../integrations/{id_integration}/products`. Like the account, it only chooses the catalogue: the publications go to every account in `accounts`. **Exclusive with `id_account_catalog`.** */
            id_integration_catalog?: string;
            /** @description `from_images`. Your own photos, each with its own description, **in the order that tells the story**: the orchestrator picks one per publication and keeps its position in `source_index`, so photo 3 can be the "before" and photo 7 the "after". Up to 20 (`max_source_items`), and each one has to be an image upload of this organization (806 otherwise). */
            images?: components["schemas"]["AiPlansAiPlanSourceImageInput"][];
            /** @description `from_catalog` with `id_account_catalog` only. The catalogue itself, as the network identifies it: an account can have several catalogues, a store is one. */
            product_catalog_id?: string;
            /** @description `from_catalog`. Ids of the chosen products, **in the order they should tell the week**. Up to 12 — a unit here is not an id already in the database: it is a live read plus a real download inside this request, with the user waiting. Repeated ids are deduplicated. They are ALL checked against the catalogue before a single picture is downloaded (2112 naming the missing one, or the one that is out of stock), and each picture is copied into an upload of the organization: a catalogue's picture URL expires or changes, and a plan published weeks later would carry a broken file. Those uploads count against the storage quota. */
            products?: string[];
            /** @description `from_text`. The article pasted by hand. **It wins over `url`** when both come: pasting is what a user does when the download did not work (a paywall, a page that needs JavaScript), so re-downloading to ignore what they wrote would take away their only way out. Truncated to 12.000 characters — the cap is what keeps the estimate honest, since the real charge is per use. Under 200 characters it is not an article, it is the theme, which is `prompt` and another field (2116). */
            text?: string;
            /**
             * Format: uri
             * @description `from_text`. The article the plan is written from. It is downloaded at creation, and only `http`/`https` addresses that resolve to a **public** IP are accepted — checked again before every redirect (2114). A page that answers something that is not text or HTML, or that carries no usable text once stripped, is a 2113: paste the text in `text` instead.
             */
            url?: string;
        };
        /** @description A product of the catalogue, copied when the plan was created. */
        AiPlansAiPlanSourceProduct: {
            description?: string;
            /** @description The id it has in the catalogue: the network's, or the store's. */
            external_id?: string;
            /** @description The product picture, copied into an upload of the organization. The network CDN URL expires; this one does not. */
            id_upload?: string;
            name?: string;
            /** @description The product's public page (a store's product page, or the `url` of the Meta catalogue item), kept only when it is an http(s) address. The texts use it on the networks where a link in the text can be clicked, never on Instagram or TikTok; and a Pinterest pin leads there unless the plan has its own `options.link`. Absent on plans created before the field existed. */
            permalink?: string;
            /** @description The price **exactly as the source gave it**: Meta's formatted price ("9,99 €"), or a store's displayed price with its tax, symbol and range ("14,52 € IVA incluido"). It is never converted: the same field is a number in other paths of Meta's API and there is no way to tell units from cents, and dividing by 100 "just in case" is precisely how a 10 € product gets advertised at 0,10 €. The prompt is told to copy it verbatim or to say nothing. Absent when the product has no price, and on a store's taxable products while its `config.tax_location_missing` is true. */
            price?: string;
        };
        /**
         * @description An app: the credentials a third-party integration authenticates with.
         *
         *     **The secret is not here.** It lives in Keycloak and is read with `GET /clients/{id_client}/apps/{id_app}/secret`, which needs a user token.
         */
        AppsClientApp: {
            _id: string;
            allowed_domains: string[];
            /** Format: date-time */
            creation_date: string;
            /** @description Deleting an app marks it instead of removing it — the Keycloak client is gone, so it can no longer get a token — and the listing filters those out. */
            deleted: boolean;
            /** Format: date-time */
            deleted_date?: string;
            id_client: string;
            /** @description The user who created the app, when it was created from the panel. */
            id_user?: string;
            /** @description The app's `client_id`. Fixed for the life of the app: it cannot be changed once created (error 547). */
            keycloak_client_idenfifier: string;
            name: string;
            redirect_urls: string[];
            /**
             * @description Where PlanVortex posts events, when one is configured.
             *
             *     **The body is an array of changes, not a single object**, and it carries two signature headers computed with this app's secret over the **raw** body: `x-hub-signature` (`sha1=<hex>`) and `x-hub-signature-256` (`sha256=<hex>`). Verify against the bytes you received — parsing the JSON and re-serialising it changes them and the signature will not match.
             *
             *     The events delivered today are `new_account`, `change_state_account`, `messages`, `messaging_postbacks`, `messaging_seen`, `messaging_error`, `comments` and `integration_error`. The payload is documented in the `comments` specification. Delivery is best effort: PlanVortex does not retry a webhook that fails.
             */
            webhook_url?: string;
        };
        AppsClientAppInput: {
            /** @description Origins allowed to call the API with this app's identity. Every entry has to be a valid URL (error 531). */
            allowed_domains?: string[];
            /**
             * @description The app's `client_id`, which is what you send to `POST /oauth/token`.
             *
             *     **Format is enforced** (error 533): lowercase letters, numbers, `.`, `-` and `_`, starting with a letter or a number, between 3 and 64 characters — `shop-integration`, not `Shop Integration`. Keycloak itself accepts anything, so an identifier with a space in it used to create an app that could never get a token.
             *
             *     It also has to be unique across PlanVortex (error 534), and **it cannot be changed once the app exists** (error 547): it is what your integration authenticates with, so renaming it would lock out everything already using the old one. Send it unchanged on an update, or leave it out. The spelling of the field is historical and kept for compatibility.
             * @example shop-integration
             */
            keycloak_client_idenfifier: string;
            /** @description A name for the app. Cannot be blank (error 525). */
            name: string;
            /** @description URLs the connect flow is allowed to come back to. A `redirect_uri` that is not in this list is refused when issuing a temporal connect token (error 532). */
            redirect_urls?: string[];
            /** @description Where PlanVortex posts events. Has to be a valid URL (error 535). See `ClientApp.webhook_url` for what arrives and how it is signed. */
            webhook_url?: string;
        };
        /** @description The error shape of the token endpoint, and **only** of the token endpoint. Every other endpoint in the API answers with `Error` instead. */
        AppsOAuthError: {
            /** @enum {string} */
            error: "invalid_request" | "invalid_client" | "unsupported_grant_type" | "slow_down" | "server_error";
            error_description?: string;
        };
        AppsTokenRequest: {
            /** @description The app's identifier. Can travel here or in `Authorization: Basic`. */
            client_id?: string;
            /** @description The app's secret. Can travel here or in `Authorization: Basic`. */
            client_secret?: string;
            /**
             * @description Only `client_credentials` is supported.
             * @enum {string}
             */
            grant_type: "client_credentials";
            /** @description Optional. Passed through to the identity provider; there are no PlanVortex-defined scopes today. */
            scope?: string;
        };
        AppsTokenResponse: {
            /** @description Send it as `Authorization: Bearer <access_token>`. */
            access_token: string;
            /** @description Seconds the token is valid for. Refresh shortly before it runs out; there is no refresh token. */
            expires_in: number;
            scope?: string;
            /** @description Always `Bearer`. */
            token_type: string;
        };
        /** @description Accepted crops. `values` and `text` are parallel arrays: same index, same ratio. */
        CatalogAspectRatios: {
            /** @description The same ratio written the way a person reads it. */
            text: string[];
            /** @description The ratio as a number (width divided by height), which is what validation compares against. */
            values: number[];
        };
        CatalogPlannerTemplate: {
            /** @description Does it accept `options.gallery_uploads` (visual references for the generated images)? */
            allows_gallery?: boolean;
            /** @description Does it accept `options.shared` (one content replicated across every account)? */
            allows_shared?: boolean;
            /** @description false = the pictures come from the source, and the plan spends no image credits. */
            generates_images?: boolean;
            /** @description Hard cap of source units accepted. 0 = this template has no unit-based source. */
            max_source_items?: number;
            /** @description Estimated credits for this template's orchestration pass. The real charge is per use. */
            orchestration_cost?: number;
            /** @description Extra estimated credits per unit of source (per image, in `from_images`). 0 when the source does not scale the prompt. */
            orchestration_cost_per_source_item?: number;
            /** @description What can be regenerated on a publication of this plan. */
            regenerate?: {
                image?: boolean;
                text?: boolean;
            };
            source_fields?: components["schemas"]["CatalogPlannerTemplateField"][];
            /**
             * @description Fields of which AT LEAST ONE is needed, even though none of them is required on its own: `from_text` takes the URL or the pasted text, never both empty (2116); `from_catalog` takes `id_account_catalog` or `id_integration_catalog`, and exactly one (2112 with both).
             *
             *     It exists because a field's `required` cannot say "one or the other", and without it your UI would have to hardcode that rule — exactly the copy this catalogue exists to avoid. Absent = there is nothing of the sort to resolve.
             */
            source_requires_any?: string[];
            /**
             * @description What the plan is generated FROM, and what you send as `template` when creating it:
             *
             *     • **`standard`** — a theme prompt, images generated by the model. What every plan was before templates existed.
             *     • **`from_images`** — the user's own photos, each with its own description. One vision pass over ALL of them at once, so the model can sequence a narrative (photo 3 the "before", photo 7 the "after") instead of writing seven independent posts. It generates no images.
             *     • **`from_text`** — an article: a URL that is downloaded at creation, or the text pasted by hand.
             *     • **`from_catalog`** — products read LIVE from a connected catalogue (a Meta catalogue through a connected account, or a connected store such as WooCommerce), with their name, their description, their price, their picture and the link to their page. The one template that cannot be copied by a generic AI tool, because it needs the catalogue connection.
             *     • **`campaign`** — a countdown towards a date, with a narrative arc: teaser, announcement, reminder, today, thank you. The only plan that is a story instead of seven loose posts.
             * @enum {string}
             */
            template?: "standard" | "from_images" | "from_text" | "from_catalog" | "campaign";
            /**
             * @description Networks whose accounts cannot be in a plan of this template: creating one is refused with 2120, before anything is read or charged. The ones that do not publish (`whatsapp`, `google_business`) on every template; and on the templates where every publication is the photo of its source (`from_images`, `from_catalog`), also the ones that do not publish images: `youtube`, which only uploads video.
             *
             *     It is computed from the same data that validates publishing, not from a list: a new network that does not publish photos drops out on its own. Filter the accounts you offer with it.
             * @example [
             *       "whatsapp",
             *       "google_business",
             *       "youtube"
             *     ]
             */
            unsupported_networks?: components["schemas"]["SocialNetwork"][];
        };
        /** @description One field of the source step. `uploads_with_description` (photos, each with its own description) and `catalog_products` (products read live from a connected catalogue) need a dedicated component; the rest are ordinary controls. */
        CatalogPlannerTemplateField: {
            default?: unknown;
            /** @description Cap in the field's **own units**: characters of a text, items of a list, and **days** of a `date` — the `event_date` of `campaign` carries 60, which is how far ahead of the plan week the countdown may point. */
            max?: number;
            /** @description Floor in the field's own units. Today only `from_text`: under 200 characters it is not an article, it is the theme, which is `prompt` and another field. Published for the same reason as `max` — without it your UI hardcodes the 200 and the user gets a 2116 AFTER pasting the text instead of while pasting it. */
            min?: number;
            name?: string;
            options?: string[];
            required?: boolean;
            /** @enum {string} */
            type?: "text" | "textarea" | "url" | "boolean" | "select" | "date" | "uploads_with_description" | "catalog_products";
        };
        CatalogSocialLimits: {
            /**
             * @description Maximum length of a publication's text. **Bluesky and Threads count GRAPHEMES**, everyone else counts characters — Telegram included, where `String.length` is exactly the right unit. The difference is not academic: an emoji is one grapheme and two `String.length` units, so counting a Threads post with `.length` rejects at 250 emojis what the network publishes happily at 500.
             *
             *     On Telegram there are **two numbers for the same field**: `telegram` (4.096) while the publication is text only, and `telegram_media` (1.024) the moment it carries an image or a video, because then the text is a media caption and not a message. Switch the counter when the file is attached, not when publish is pressed.
             */
            characters: components["schemas"]["CatalogSocialLimitsMap"];
            /** @description Maximum length of a reply to a comment. `0` means the network has no comments. */
            comment_characters: components["schemas"]["CatalogSocialLimitsMap"];
            /**
             * @description Maximum size of one file, in megabytes.
             *
             *     **On `slack` this one is a ceiling, not a promise.** 1.024 MB is what the network allows; the real limit is the lesser of that and the storage the client's own workspace plan still has, which no API exposes. A file inside this number can still come back as error 986. It is the only key in this map with that property.
             *
             *     **On `pinterest` this number is the IMAGE one** (~20 MB); a video is allowed two orders of magnitude more. It is the one entry in this map that does not apply to every file of its network, so a size warning shown against it would be wrong on every video. Over whichever ceiling applies, the publication is created in state `withErrors` with `publication_errors[].code = 996` and `data.max_mb`.
             */
            max_file_size_mb: components["schemas"]["CatalogSocialLimitsMap"];
            /** @description Second text limit, in UTF-8 bytes. `0` means the network does not measure text in bytes; only Bluesky does, at 3.000. */
            max_post_bytes: components["schemas"]["CatalogSocialLimitsMap"];
            /** @description Maximum length of the title. `0` means the network has no title field at all. */
            title_characters: components["schemas"]["CatalogSocialLimitsMap"];
            /**
             * @description How many images one publication accepts. `0` means images are not a publication on that network.
             *
             *     **On `discord`, `threads` and `slack` it counts images and videos together**, because there the carousel is one message carrying several attachments and not several publications: what is validated is the total number of files. Over it, the publication is created in state `withErrors` — on `slack` with `publication_errors[].code = 982`.
             *
             *     **On `pinterest` it is a ceiling with a floor under it.** Several images are a carousel of 2 to 5: one image is not a small carousel (it is a plain image pin, which is a different call) and six is not a trimmed one. Outside that range the publication is created in state `withErrors` with `publication_errors[].code = 990`.
             */
            total_images: components["schemas"]["CatalogSocialLimitsMap"];
            /** @description Maximum video duration. A network that limits weight instead of duration is not here but in `max_file_size_mb`. */
            video_duration_in_seconds: components["schemas"]["CatalogSocialLimitsMap"];
        };
        /**
         * @description One number per network. Every network in `/social_networks` is present.
         *
         *     **And a few keys are not a network.** Some limits depend on the *kind* of publication rather than on the network alone, and those get a compound key next to the plain one: `instagram_story`, `facebook_reel`, `telegram_media`. Read the plain key by default and the compound one when it applies.
         */
        CatalogSocialLimitsMap: {
            [key: string]: number;
        };
        /** @description AI provider configuration for a single scope (BYOK). On write, api_key is required the first time and is stored encrypted; on subsequent writes it can be omitted to keep the existing key (send only provider/model). On read, the api_key is NEVER returned — only has_api_key is exposed. */
        ClientsAiScopeSetting: {
            /** @description Provider API key. Write-only: accepted on PUT, stored encrypted (AES-256-GCM), never returned. */
            api_key?: string;
            /** @description Read-only. True when an encrypted API key is stored for this scope. */
            readonly has_api_key?: boolean;
            /** @description Model identifier at the chosen provider (e.g. google/gemini-3-flash). */
            model: string;
            /**
             * @description Fixed catalogue of allowed providers. The provider must support the capability of the scope (text for orchestrator/text, image for image).
             * @enum {string}
             */
            provider: "openrouter" | "openai" | "google" | "anthropic";
        };
        /** @description Per-scope AI provider configuration (BYOK). Only the scopes you send are touched; a scope set to `null` clears its configuration and returns that scope to PlanVortex credits. `orchestrator` and `text` need a text-capable provider, `image` needs an image-capable one. `video` is reserved for a later phase. */
        ClientsAiSettings: {
            /** @description Configuration of the `image` scope. **`null` clears it** and returns the scope to PlanVortex credits. */
            image?: components["schemas"]["ClientsAiScopeSetting"] | null;
            /** @description Configuration of the `orchestrator` scope. **`null` clears it** and returns the scope to PlanVortex credits. */
            orchestrator?: components["schemas"]["ClientsAiScopeSetting"] | null;
            /** @description Configuration of the `text` scope. **`null` clears it** and returns the scope to PlanVortex credits. */
            text?: components["schemas"]["ClientsAiScopeSetting"] | null;
        };
        /** @description Who contracts the plan and whom the organizations hang from. */
        ClientsClient: {
            /** @example 66d04a6a427f4c43b9d97f54 */
            _id: string;
            /** @description What is already handed out to the client's root organizations, which is what is left to assign. **Only present with `getUse=true`.** */
            actual_asigned?: components["schemas"]["PlanData"];
            actual_plan: components["schemas"]["ClientsPlan"];
            /** @description Current consumption across every organization of the client. **Only present with `getUse=true`.** `twitter_credits` and `ai_credits` are what has been spent this calendar month. */
            actual_use?: components["schemas"]["PlanUseData"];
            /** @description Read-only view of the client's own AI provider configuration (BYOK). Written via `PUT /clients/{id_client}/ai-settings`. API keys are stored encrypted and are NEVER returned: each scope only exposes provider, model and has_api_key. */
            ai_settings?: components["schemas"]["ClientsAiSettings"];
            /** @enum {string} */
            client_type?: "personal" | "company";
            /** Format: date-time */
            creation_date: string;
            name: string;
            /** @description Whether this client has already used its trial. */
            trial_tested?: boolean;
        };
        ClientsClientList: {
            clients: components["schemas"]["ClientsClient"][];
            total: number;
        };
        ClientsClientOne: {
            client: components["schemas"]["ClientsClient"];
        };
        /** @description Body accepted when creating an organization. Only these properties are read. */
        ClientsOrganizationCreate: {
            /** @description Resources assigned to this organization, taken from what the client has contracted. */
            actual_plan?: components["schemas"]["PlanData"];
            /** @description Organization name. */
            name: string;
        };
        ClientsOrganizationList: {
            organizations: components["schemas"]["Organization"][];
            total: number;
        };
        ClientsOrganizationOne: {
            organization: components["schemas"]["Organization"];
        };
        /** @description Body accepted when updating an organization. NOTE: `name` and `parent_organization` are NOT updatable through this endpoint - the server keeps their current value and silently ignores them. */
        ClientsOrganizationUpdate: {
            /** @description New resource assignment. Validated against what is left of the client's contracted plan; lowering it below what the organization already uses is rejected. */
            actual_plan?: components["schemas"]["PlanData"];
            /** @description Statistics collection settings. */
            stats_settings?: components["schemas"]["StatsSettings"];
        };
        /** @description The client's SUBSCRIPTION, which is not the same thing as the resources it grants: the numbers live in `plan_data`. */
        ClientsPlan: {
            /**
             * Format: date-time
             * @description When the current billing period ends. A cancelled plan keeps working until then.
             */
            current_period_end?: string;
            /** Format: date-time */
            current_period_start?: string;
            /** @description Whether the plan is usable. A disabled client cannot connect accounts or publish. */
            enabled: boolean;
            /** @description The same thing as `enabled`, recomputed on read rather than stored. Read either; they only disagree if the plan was never saved after changing. */
            isEnabled: boolean;
            /** @description **The client's actual limits**, resolved: the named plan's table, or the agreed numbers when `plan_identifier` is `custom`. This is what to read, not the plan's name. */
            plan_data: components["schemas"]["PlanData"];
            /**
             * @description Which plan was contracted. `custom` carries its own numbers in `plan_data`.
             * @enum {string}
             */
            plan_identifier: "free" | "basic" | "pro" | "custom";
            /** @description The payment needs the customer to do something (3-D Secure, a new card). */
            require_action?: boolean;
            /** @description The subscription's state at the payment provider (`active`, `past_due`, `canceled`, `trialing`, `unpaid`...). A cancelled subscription still works until `current_period_end`. */
            status: string;
            stripe_customer_id?: string;
        };
        /** @enum {string} */
        ClientsRolesClientPermissions: "client:update" | "client:read" | "client:delete" | "client_app:create" | "client_app:update" | "client_app:read" | "client_app:delete" | "client_roles:create" | "client_roles:update" | "client_roles:read" | "client_roles:delete" | "client_roles_users:read" | "client_roles_users:create" | "client_roles_users:delete" | "client_organization:create" | "client_organization:update" | "client_organization:read" | "client_organization:delete" | "client_organization_roles:read" | "client_organization_roles:create" | "client_organization_roles:update" | "client_organization_roles:delete" | "client_organization_users_roles:read" | "client_organization_users_roles:create" | "client_organization_users_roles:delete" | "client_organization_accounts:read" | "client_organization_accounts:create" | "client_organization_accounts:update" | "client_organization_accounts:delete" | "client_organization_files:read" | "client_organization_files:create" | "client_organization_files:update" | "client_organization_files:delete" | "client_organization_publications:read" | "client_organization_publications:create" | "client_organization_publications:update" | "client_organization_publications:delete" | "client_organization_publications_stats:read" | "client_organization_account_stats:read";
        ClientsRolesClientPermissionsList: components["schemas"]["ClientsRolesClientPermissions"][];
        ClientsRolesClientPermissionsOne: {
            permissions?: components["schemas"]["ClientsRolesClientPermissionsList"];
        };
        ClientsRolesRole: {
            name?: string;
            permissions?: components["schemas"]["ClientsRolesClientPermissionsList"];
        };
        /** @description Name and permission list of a role. */
        ClientsRolesRoleInput: {
            /** @description Role name, shown when inviting a user. */
            name: string;
            /** @description Permissions granted by this role. */
            permissions: ("client:update" | "client:read" | "client:delete" | "client_app:create" | "client_app:update" | "client_app:read" | "client_app:delete" | "client_roles:create" | "client_roles:update" | "client_roles:read" | "client_roles:delete" | "client_roles_users:read" | "client_roles_users:create" | "client_roles_users:delete" | "client_organization:create" | "client_organization:update" | "client_organization:read" | "client_organization:delete" | "client_organization_roles:read" | "client_organization_roles:create" | "client_organization_roles:update" | "client_organization_roles:delete" | "client_organization_users_roles:read" | "client_organization_users_roles:create" | "client_organization_users_roles:delete" | "client_organization_accounts:read" | "client_organization_accounts:create" | "client_organization_accounts:update" | "client_organization_accounts:delete" | "client_organization_products:create" | "client_organization_products:update" | "client_organization_products:read" | "client_organization_products:delete" | "client_organization_files:read" | "client_organization_files:create" | "client_organization_files:update" | "client_organization_files:delete" | "client_organization_publications:read" | "client_organization_publications:create" | "client_organization_publications:update" | "client_organization_publications:delete" | "client_organization_publications_stats:read" | "client_organization_account_stats:read" | "client_organization_messages:create" | "client_organization_messages:read" | "client_organization_messages:delete" | "client_organization_contacts:create" | "client_organization_contacts:read" | "client_organization_contacts:update" | "client_organization_contacts:delete" | "client_organization_ai_plans:create" | "client_organization_ai_plans:read" | "client_organization_ai_plans:update" | "client_organization_ai_plans:delete")[];
        };
        ClientsRolesRoleList: {
            roles?: components["schemas"]["ClientsRolesRole"][];
            total?: number;
        };
        ClientsRolesRoleOne: {
            rol?: components["schemas"]["ClientsRolesRole"];
        };
        ClientsRolesUser: {
            email?: string;
            firstname?: string;
            id?: string;
            lastname?: string;
            username?: string;
        };
        ClientsRolesUserList: {
            total?: number;
            users?: components["schemas"]["ClientsRolesUser"][];
        };
        /** @description A comment — or a review — as PlanVortex stores it. Remember it is a **snapshot** of what the network said at `collected_date`; the live thread endpoints return the same shape reconciled against the network. */
        CommentsComment: {
            _id: string;
            author: components["schemas"]["CommentsCommentAuthor"];
            /**
             * Format: date-time
             * @description When PlanVortex last read it. The inbox is a photograph and this says how old it is.
             */
            collected_date: string;
            /**
             * Format: date-time
             * @description When it was written **on the network**. This is what orders the inbox.
             */
            creation_date: string;
            /** @description Gone from the network. The row is kept so it is not created again by the next read or by a repeated webhook; it stops appearing in the inbox. */
            deleted: boolean;
            /**
             * @description The comment's id on the network. Unique per account, and what makes repeated webhook deliveries idempotent.
             *
             *     Two exceptions worth knowing, and both are composite ids you should treat as opaque:
             *
             *     • A Google Business reply has no id of its own — it is a *field* of the review — so PlanVortex fabricates a stable one, `{reviewId}/reply`.
             *     • A Telegram comment lives in a **different chat** from the post it answers (the channel's linked discussion group), so it needs two ids at once and travels as `{thread}/{message}`: replying wants the first, deleting wants the second.
             */
            external_id: string;
            /** @description Hidden on the network. A hidden comment is never swept as deleted: on YouTube, hiding one makes the API stop returning it forever, and without that exception hiding would be indistinguishable from deleting. */
            hidden: boolean;
            /**
             * @description The connected account it arrived on.
             *
             *     **It is not always the same shape.** The inbox listing (`GET /organizations/{id}/comments`) returns the whole account resolved; every other operation — the live threads, the reply, the update — returns its identifier as a string. Check before using it.
             */
            id_account: string | components["schemas"]["Account"];
            id_organization: string;
            /**
             * @description **Your** publication, when there is one — and there often is not: a video uploaded to the channel by hand, a post that predates PlanVortex, and every Google Business review have comments with no publication of ours behind them. What always identifies the target is `publication_external_id`.
             *
             *     Same asymmetry as `id_account`: the inbox listing resolves it into the whole publication, every other operation returns the identifier as a string.
             */
            id_publication?: string | components["schemas"]["Publication"];
            /** @description Absent when the network does not publish it — not zero */
            like_count?: number;
            /** @description The network id of your reply, so you can find it or delete it later */
            our_reply_external_id?: string;
            /** @description Present only when this is a reply to another comment */
            parent_external_id?: string;
            /** @description What the comment hangs off, on the network: the post/video id in most networks, the **listing** (`locations/{id}`) for a Google Business review, and the published message's id on Telegram — where the thread that holds the comments *is* the forwarded post. */
            publication_external_id: string;
            /**
             * @description Star rating of a **review**. Present only on review networks — today Google Business. Its absence means "this network has no such thing", never zero.
             *
             *     It is not decorative: without it a one-star review and a five-star one are the same row, and a stars-only review is a blank line.
             */
            rating?: number;
            /** @description Yours, not the network's. A live read never overwrites it. */
            read: boolean;
            /** @description Yours, not the network's. Set when you reply through the API. */
            replied: boolean;
            /** @description Absent when the network does not publish it — not zero */
            reply_count?: number;
            social_network: components["schemas"]["CommentsCommentNetworkName"];
            /** @description **May legitimately be empty.** A stars-only review carries no text at all, so render `rating` alongside it and never assume a blank comment is a loading failure. */
            text: string;
        };
        /** @description What one network lets you do to a comment. Four booleans and never fewer: an absent key would be indistinguishable from an oversight. */
        CommentsCommentActions: {
            /** @description Delete somebody else's comment */
            delete_others: boolean;
            /** @description Delete a comment **you** wrote. On Google Business this means your reply to a review — the review itself is never deletable. */
            delete_own: boolean;
            hide: boolean;
            reply: boolean;
        };
        /** @description Who wrote it. Embedded in the comment and **not** a contact: a YouTube commenter has no private inbox you could ever write to, so they get no contact record. */
        CommentsCommentAuthor: {
            /** @description The author's id on the network. When the network gives none — Google Business publishes no identifier for a reviewer — this falls back to the review's own id, which means two reviews by the same person look like two different authors. There is no way around it from the API. */
            external_id: string;
            /** @description Whether the connected account wrote it. This is what separates "delete mine" from "delete theirs", and what keeps your own replies out of the inbox. */
            is_own: boolean;
            /** @description Display name. Always present for a review, including anonymous ones, which get a placeholder rather than an empty string. */
            name?: string;
            profile_pic?: string;
        };
        /**
         * @description A network that has comments. Treat it as an open list: a new one is added before your integration hears about it.
         * @enum {string}
         */
        CommentsCommentNetworkName: "facebook" | "instagram" | "twitter" | "linkedin" | "youtube" | "google_business" | "bluesky" | "discord" | "telegram" | "threads";
        /** @description A live read: asked of the network and reconciled with what was stored. */
        CommentsCommentThread: {
            comments: components["schemas"]["CommentsComment"][];
            /** @description X credits this read spent from the client's monthly pool. `0` on every other network. Charged after the fact and by real units, so a failed read charges nothing. */
            credits_consumed: number;
            /** @description Opaque page token from the network. Pass it back as `offset`; absent means there is no next page. */
            next_cursor?: string;
            /** @description What the network says the total is. On a Google Business listing it is the number of **reviews**, which is not the length of `comments`: your replies travel in the same array as children of the review they answer. */
            total: number;
        };
        /**
         * @description One change in the array PlanVortex posts to your app's `webhook_url`, when an **integration** stopped working: a revoked Google Drive token, a feed that no longer answers, a publication quota that ran out.
         *
         *     It carries neither `id_account` nor `social_network`, because an integration hangs off the organization and not off any account — which is exactly why it is a type of its own. A consumer that only understands account changes sees a `field` it does not know and ignores it, which is what should happen.
         */
        CommentsIntegrationWebhookChange: {
            /** @description PlanVortex error code saying what went wrong. Integration codes live in the 2200-2299 range. */
            error_code: number;
            /** @enum {string} */
            field: "integration_error";
            id_integration: string;
            id_organization: string;
            /** @description `google_drive` or `rss` today. **This list grows**: treat it as an open enumeration. */
            provider: string;
        };
        /** @description The coarse gates of one network */
        CommentsSocialCapabilities: {
            comments: boolean;
            /** @description The network publishes into **places inside the account**, and every publication has to name one: a Pinterest board. When this is `true`, read `GET /organizations/{id_organization}/accounts/{id_account}/destinations` and send one back in `destination` — a publication created without it lands in state `withErrors` with `publication_errors[].code = 987`. Today only `pinterest`. */
            destinations: boolean;
            /** @description The publication carries a **destination link of its own** (`link`), separate from its text: where a pin takes whoever clicks it. On a network that answers `false` the field is deleted on save, so do not offer it. Today only `pinterest`. */
            link: boolean;
            messages: boolean;
            persistent_menu: boolean;
            products: boolean;
            publications: boolean;
            webhooks: boolean;
        };
        /**
         * @description One change in the array PlanVortex posts to your app's `webhook_url`, when the change concerns a social **account**.
         *
         *     An integration that stopped working has a shape of its own — `IntegrationWebhookChange` — and one delivery can mix both. Switch on `field`, and ignore what you do not handle.
         */
        CommentsWebhookChange: {
            /** @description The comment. Present only when `field` is `comments`, and absent even then if the author deleted a comment we had never seen. */
            commentObj?: components["schemas"]["CommentsComment"];
            /**
             * @description What kind of change this is. **Treat it as an open list** and ignore what you do not handle: it grows with the product.
             *
             *     - `new_account` / `change_state_account`: an account was connected, or its state changed — it stopped working, its token was refreshed, it was disconnected. On `telegram` this is the **only** way to hear about a connection: there is no callback there, so no request of yours ever returns that account.
             *     - `messages`: a message came in. It travels in `messageObj`.
             *     - `messaging_postbacks`: the contact pressed a button or a quick reply. Also in `messageObj`.
             *     - `messaging_seen`: the contact read the conversation. `messageObj` carries the message they read, when we still have it.
             *     - `messaging_error`: the network refused a message we sent. The reason is in `messageObj.message_errors`.
             *     - `comments`: a comment came in. It travels in `commentObj`, never in `messageObj`.
             * @enum {string}
             */
            field: "new_account" | "change_state_account" | "messages" | "messaging_postbacks" | "messaging_seen" | "messaging_error" | "comments";
            id_account: string;
            /** @description Only for messaging fields. A comment has no contact: its author is not someone you can write to. */
            id_contact?: string;
            id_organization: string;
            /**
             * @description The message. Present for the messaging fields, never for a comment — a comment is not a message and does not travel in here.
             *
             *     It arrives **populated**: `contact_id`, `from_contact_id` and `message_options.files` carry whole objects. On `messaging_seen` and `messaging_error` it can be absent, because the message being acknowledged may not be one of ours.
             */
            messageObj?: components["schemas"]["Message"];
            /** @description The raw payload the social network sent, passed through untouched. Absent on the changes PlanVortex raises itself, such as `new_account`. */
            originalChange?: {
                [key: string]: unknown;
            };
            social_network: components["schemas"]["SocialNetwork"];
        };
        /** @description A person the organization exchanges messages with. The same contact can be reachable on several channels — that is what `social_identifiers` is. */
        Contact: {
            _id: string;
            /** Format: date-time */
            creation_date: string;
            /** @description The user who created the contact, when it was created from the panel instead of arriving from a network. */
            creator_keycloak_identifier?: string;
            extra_data?: components["schemas"]["ContactExtraData"];
            id_organization: string;
            /**
             * Format: date-time
             * @description Last time the contact's profile was refreshed from the network.
             */
            last_contact_update: string;
            name?: string;
            /** @description URL of the contact's avatar on the network. It belongs to the network and it can stop working. */
            profile_image?: string;
            social_identifiers: components["schemas"]["SocialIdentifier"][];
        };
        /**
         * @description Where a contact can be reached. Every social network that has messaging, plus `email` for a contact created by hand instead of arriving from a network.
         *
         *     **This list grows** with the networks: treat it as an open enumeration.
         * @enum {string}
         */
        ContactChannel: "facebook" | "instagram" | "linkedin" | "tiktok" | "twitter" | "whatsapp" | "youtube" | "google_business" | "bluesky" | "discord" | "email";
        /** @description Your own fields on the contact. The address block is known to PlanVortex; the six generic properties are yours to use, and they are what `extra_data` filters on. */
        ContactExtraData: {
            address?: string;
            boolean_property?: boolean;
            boolean_property2?: boolean;
            building?: string | number;
            city?: string;
            /** @description Longitude and latitude, in that order. */
            coords?: number[];
            country?: string;
            country_code?: string;
            door?: string | number;
            floor?: string | number;
            number?: string | number;
            number_property?: number;
            number_property2?: number;
            place_id?: string;
            state?: string;
            string_property?: string;
            string_property2?: string;
            zip_code?: string | number;
        };
        /**
         * @description A new contact. **At least one identifier is mandatory** (`ERROR_CODE_1601` otherwise): a contact with no channel is a contact nobody can write to.
         *
         *     Creating is idempotent on the FIRST identifier: if the organization already has a contact with that channel and that `external_identifier`, you get the existing one back untouched — `name`, `profile_image` and `extra_data` of the request are ignored. There is no "already exists" error.
         */
        ContactsContactCreate: {
            extra_data?: components["schemas"]["ContactExtraData"];
            name?: string;
            profile_image?: string;
            social_identifiers: components["schemas"]["ContactsSocialIdentifierInput"][];
        };
        /**
         * @description Changes to a contact. `name`, `profile_image` and `social_identifiers` are left alone when you omit them.
         *
         *     **`extra_data` is the exception and it is destructive**: it is written with whatever the body carries, so omitting it ERASES every custom field on the contact. Read the contact, change what you need and send the whole block back.
         */
        ContactsContactUpdate: {
            /** @description Written as sent. **Omitting it erases the contact's custom fields.** */
            extra_data?: components["schemas"]["ContactExtraData"];
            name?: string;
            profile_image?: string;
            /** @description Replaces the whole list, it does not merge into it. Omit it to keep the current one. */
            social_identifiers?: components["schemas"]["ContactsSocialIdentifierInput"][];
        };
        /** @description The same person on one channel, as you SEND it. `_id` is optional here and PlanVortex mints one when it is missing — which is the difference with `SocialIdentifier`, where it always travels back. */
        ContactsSocialIdentifierInput: {
            /** @description Only when you are keeping an identifier the API already gave you. */
            _id?: string;
            /** @description The contact id on that channel — the phone number on WhatsApp, the PSID on Messenger. Optional in the model, but a contact without it cannot be written to, and it is what deduplicates on create. */
            external_identifier?: string;
            social_network: components["schemas"]["ContactChannel"];
        };
        /** @description A connected account that has stopped working: an expired token or a revoked permission. Until it is reconnected it neither publishes nor measures. */
        DashboardAccountWithError: {
            _id: string;
            /** @description PlanVortex error code that broke it. `0` means healthy, so anything here is non-zero. */
            error_code: number;
            image?: string;
            name: string;
            social_network: components["schemas"]["SocialNetwork"];
            username?: string;
        };
        /**
         * @description Everything the home screen needs, in ONE round trip.
         *
         *     **A missing block is not an error.** Each one is checked against its own permission and omitted when the caller cannot read it, instead of failing the whole request; `available_blocks` says which ones were allowed. A block that is `true` in `available_blocks` and absent from the body means there was no data — except `messages`, which also turns to `false` when the plan does not include chat.
         */
        DashboardDashboard: {
            account_metrics?: {
                by_day: components["schemas"]["DashboardMetricRow"][];
                by_network: components["schemas"]["DashboardMetricRow"][];
                previous_total: components["schemas"]["NormalizedMetrics"];
                total: components["schemas"]["NormalizedMetrics"];
            };
            /**
             * @description The best AI plans of the range, by interactions per measured publication — the short version of `GET /clients/{id}/organizations/{id}/ai_plans/results`, with the same rules: the range filters on the plan's **week**, and only plans with at least 3 measured publications compete.
             *
             *     Unlike that endpoint it covers the organization **and its children**, like the rest of this screen, so each plan carries its `id_organization`.
             */
            ai_plan_results?: {
                /** @description Interactions per measured publication across every plan of the range. */
                engagement_per_publication?: number;
                /** @description Interactions per post of every plan of the range over what your usual posts would get on the same networks. 1 means like your average. */
                engagement_vs_average?: number;
                /** @description Plans with results in the range. */
                plans: number;
                /** @description How many of those compete in the ranking. `plans > 0` with `ranked_plans: 0` means there are results, just not enough measured yet. */
                ranked_plans: number;
                /** @description Up to three plans, best first. Only ranked ones. */
                top: components["schemas"]["AiPlanResult"][];
            };
            ai_plans?: {
                by_state: {
                    state?: string;
                    total?: number;
                }[];
                credits_spent: number;
                /** @description Publications generated by the plans of the range. */
                generated_publications: number;
                /** @description The most recent plan of the organization, **whatever the range**. Absent when there has never been one. */
                last_plan?: components["schemas"]["DashboardDashboardAiPlanRef"];
                /** @description Plans already generated and **waiting for someone to validate them**: work paid for that is not publishing anything yet. */
                pending_validation: number;
                total: number;
            };
            /** @description Which blocks the caller was allowed to see. A `false` here is a permission (or plan) answer; a block that is `true` but empty means there is no data. */
            available_blocks: {
                account_metrics: boolean;
                /** @description Needs both `ai_plans:read` and `publication_stats:read`: the block shows plans and their publications' metrics. */
                ai_plan_results: boolean;
                ai_plans: boolean;
                health: boolean;
                messages: boolean;
                plan_use: boolean;
                publication_metrics: boolean;
                publications: boolean;
            };
            /** @description What needs fixing today. Each half has its own permission: somebody who cannot read accounts still sees the failed publications. */
            health?: {
                accounts_with_errors?: components["schemas"]["DashboardAccountWithError"][];
                /** @description Up to ten publications in state `with_errors`, newest first. */
                publications_with_errors?: components["schemas"]["DashboardDashboardPublicationRef"][];
                total_drafts?: number;
                /** @description Up to ten publications due in the next 48 hours. */
                upcoming_publications?: components["schemas"]["DashboardDashboardPublicationRef"][];
            };
            messages?: {
                unread: number;
            };
            plan_use?: components["schemas"]["DashboardPlanUse"];
            publication_metrics?: {
                by_network: {
                    metrics?: components["schemas"]["NormalizedMetrics"];
                    publications?: number;
                    social_network?: components["schemas"]["SocialNetwork"];
                }[];
                previous_total: components["schemas"]["NormalizedMetrics"];
                top: components["schemas"]["DashboardTopPublication"][];
                total: components["schemas"]["NormalizedMetrics"];
            };
            publications?: components["schemas"]["DashboardPublicationsSummary"] & {
                /** @description The same count for the previous period, for the delta. */
                previous_total?: number;
            };
            range: components["schemas"]["DashboardDashboardRange"];
        };
        /** @description The most recent AI plan, projected: enough to tell at a glance whether one is still generating, failed, or is waiting to be validated. `publications` are identifiers here. */
        DashboardDashboardAiPlanRef: {
            _id: string;
            /** Format: date-time */
            creation_date: string;
            credits_spent?: number;
            error?: {
                code: number;
                data?: {
                    [key: string]: unknown;
                };
                message: string;
            };
            /** Format: date-time */
            generation_end_date?: string;
            prompt?: string;
            publications?: string[];
            /** @enum {string} */
            state: "pending" | "generating" | "generated" | "validated" | "failed" | "cancelled";
        };
        /** @description A publication as the health block projects it: a handful of fields, not a whole `Publication`. `state` is not among them — the list it came from already says what state it is in. */
        DashboardDashboardPublicationRef: {
            _id: string;
            /** Format: date-time */
            creation_date?: string;
            name?: string;
            /** @description Only on the failed ones. Same shape as in a full `Publication`. */
            publication_errors?: {
                code: number;
                data?: {
                    [key: string]: unknown;
                };
                message: string;
            }[];
            /** Format: date-time */
            publish_date?: string;
            social_network: components["schemas"]["SocialNetwork"];
            text?: string;
        };
        /** @description The range that was actually used, plus the previous period of exactly the same length. The previous one is not "last month": comparing 30 days against a calendar month would move the delta with the calendar. */
        DashboardDashboardRange: {
            /** Format: date-time */
            from_date: string;
            /** Format: date-time */
            previous_from_date: string;
            /** Format: date-time */
            previous_to_date: string;
            /** Format: date-time */
            to_date: string;
        };
        /**
         * @description A metric in PlanVortex's common vocabulary. Each network reports what it reports and PlanVortex translates it; a metric a network does not publish is absent, never zero.
         * @enum {string}
         */
        DashboardMetricName: "impressions" | "reach" | "engagement" | "likes" | "comments" | "shares" | "saves" | "clicks" | "video_views" | "profile_views" | "followers" | "followers_gained";
        DashboardMetricRow: {
            /** @description The value of the axis: the day, the network or the account identifier. **`null` when `group_by` was `total`** — the field is always there, the value is not always a string. */
            group: string | null;
            name: components["schemas"]["DashboardMetricName"];
            value: number;
        };
        DashboardPlanUse: {
            /** @description What has been handed down to child organizations out of this organization's plan. */
            actual_asigned: components["schemas"]["PlanData"];
            /** @description What the organization and its children are consuming right now. */
            actual_use: components["schemas"]["PlanUseData"];
            /** @description The plan in force. An organization with no plan of its own inherits the closest parent that has one. */
            limits: components["schemas"]["PlanData"];
        };
        DashboardPublicationsSummary: {
            /** @description Publications **created** each day, split by state. */
            by_day: {
                /** @description `YYYY-MM-DD`, in UTC. */
                day?: string;
                state?: string;
                total?: number;
            }[];
            by_network: {
                social_network?: components["schemas"]["SocialNetwork"];
                total?: number;
            }[];
            by_state: {
                state?: string;
                total?: number;
            }[];
            /** @description Publications that actually **went out** each day, split by network. Only the ones in state `sended`. */
            published_by_day: {
                /** @description `YYYY-MM-DD`, in UTC. */
                day?: string;
                social_network?: components["schemas"]["SocialNetwork"];
                total?: number;
            }[];
            /** @description Publications created in the range. */
            total: number;
        };
        /**
         * @description One row of the ranking. It comes out of the stats aggregation, not out of the publications collection, so it does **not** have the shape of a `Publication`: there is no `_id` (the identifier is `id_publication`) and the content travels nested under `publication`.
         *
         *     Only publications that have already been measured can appear here. For a listing that includes the unmeasured ones, use `GET /organizations/{id}/publications/stats`.
         */
        DashboardTopPublication: {
            /**
             * Format: date-time
             * @description When this measurement was taken.
             */
            collected_date?: string;
            /**
             * @description What this row's engagement rate is divided by. **Two rows with different bases are not comparable**, so say which one it is when you put them in the same table.
             * @enum {string}
             */
            engagement_base?: "reach" | "impressions" | "followers";
            id_publication: string;
            metrics: components["schemas"]["NormalizedMetrics"];
            /** @description The bit of the publication needed to render the row. Nothing else is projected. */
            publication: {
                external_identifier?: string;
                files?: components["schemas"]["Upload"][];
                publication_type?: string;
                text?: string;
                title?: string;
                url?: string;
            };
            /** Format: date-time */
            publish_date?: string;
            social_network: components["schemas"]["SocialNetwork"];
        };
        /**
         * @description Error payload returned by every failing request.
         *
         *     **Classify by `code`, never by the HTTP status.** Every domain error travels with HTTP 400 — an expired token, a disconnected account, an exhausted plan quota and a text that is too long are all 400. Only error 520 (permissions) answers 401, and an unexpected failure answers 500.
         *
         *     The catalogue grows with the product, so treat an unknown `code` as a generic failure instead of rejecting it.
         */
        Error: {
            /** @description PlanVortex error code. Ranges: 500-548 auth, tokens and client apps · 601-612 user · 700-716 social accounts · 800-810 files · 900-996 publications · 1000-1003 general · 1100-1111 organizations · 1200-1207 roles · 1300-1308 client plan · 1400-1408 organization plan · 1500-1512 messaging · 1600-1601 contacts · 1900-1906 payments · 2000-2099 products · 2100-2199 AI plans · 2200-2299 integrations. */
            code: number;
            /** @description Extra context attached to the error, when there is any. */
            data?: {
                [key: string]: unknown;
            };
            /** @description Human readable description of the error. */
            message: string;
        };
        /** @description Measurements taken when the file was ingested. Always present on an upload. */
        FileProperties: {
            /** @description The networks whose accepted crops this file's ratio matches, with a 0.1 margin. It is about the RATIO only: a network listed here can still reject the file for its duration or its weight (see `GET /social_limits`). */
            allowed_social_networks: string[];
            /** @description Width divided by height, as a number and as a person writes it. */
            aspect_ratio: {
                /** @example 16:9 */
                text: string;
                /** @example 1.7777777777777777 */
                value: number;
            };
            /** @description Seconds. `0` on an image. */
            duration: number;
            height: number;
            size_in_bytes: number;
            /** @description `0` on a file whose dimensions could not be read. */
            width: number;
        };
        IntegrationsGoogleDriveConnectRequest: {
            /** @description OAuth code returned to the redirect of connect_link. Single-use. */
            code: string;
            /** @enum {string} */
            provider: "google_drive";
        };
        /** @description Credentials are never returned. `connected` is the summary the panel paints: false means the connection failed and needs attention. */
        IntegrationsIntegration: {
            _id: string;
            /** @description Provider-specific configuration, built by the server. **Empty object for `google_drive`** (the Picker supplies everything), the feed settings for `rss` and the store connection for `woocommerce`, so every field here is optional. It never carries a secret. */
            config: components["schemas"]["IntegrationsIntegrationConfig"];
            /** @description `error_code` is empty. It is computed on the way out, not stored: the panel needs to know whether the connection is alive, not with which credentials. */
            connected: boolean;
            /** Format: date-time */
            creation_date: string;
            /** @description Only enabled integrations consume plan allowance. */
            enabled: boolean;
            /** @description PlanVortex error code of the last failure (2203 token revoked, 2205 feed unreachable, 2211 the store rejected its key, 924 no publication allowance left…). **2219 is not a failure**: a store connected with the button is being checked, for a few seconds; if it stays there, the check never finished and the store has to be reconnected. */
            error_code?: number | null;
            /**
             * @description The Google account email, the feed URL, or the store URL.
             * @example ana@empresa.com
             */
            external_identifier?: string;
            id_client: string;
            id_organization: string;
            /** Format: date-time */
            last_used_date?: string;
            /**
             * @description The Google account, the feed title, or the store's site name.
             * @example Drive de ana@empresa.com
             */
            name: string;
            provider: components["schemas"]["IntegrationsIntegrationProviderName"];
        };
        IntegrationsIntegrationCatalogPage: {
            items: components["schemas"]["IntegrationsIntegrationCatalogProduct"][];
            /** @description Absent on the last page. **Opaque**: send it back as `cursor` exactly as it came, and never build or parse one. A cursor the server did not issue is a `2208`. */
            next_cursor?: string;
        };
        /** @description A product of a connected store, already normalised: the same shape whatever the store is. */
        IntegrationsIntegrationCatalogProduct: {
            /** @description Can it be chosen? **false for what is out of stock**: show it, marked, but do not let it be picked. Advertising what cannot be bought is worse than not advertising, and a plan with one is rejected (`2112`). A product on backorder is available. */
            available: boolean;
            /** @description Plain text, already stripped of HTML, entities and page-builder shortcodes, cut at 400 characters without splitting a word. */
            description?: string;
            /**
             * @description The id it has in the store. **Always a string**, even where the store uses numbers. It is what goes into `source.products` of a `from_catalog` plan.
             * @example 68
             */
            external_id: string;
            /** @description The first image of the product. It is the store's own URL: it can be slow, or blocked when loaded from another domain. */
            image_url?: string;
            /** @example Taza de cerámica */
            name: string;
            /** @description The product's public page in the store. */
            permalink?: string;
            /**
             * @description Text ready to be copied **verbatim**, as the store displays it: with its tax suffix, its currency symbol and the range of a variable product ("36,30 € - 48,40 € IVA incluido"); for a product on sale, the sale price alone. Never a number to do arithmetic with. **Absent = no price**: the product has none, or it is taxable and the store's `config.tax_location_missing` is true.
             * @example 14,52 € IVA incluido
             */
            price?: string;
        };
        /** @description What `config` holds, per provider. `google_drive`: nothing. `rss`: the feed settings. `woocommerce`: how to reach the store, which the server detects when connecting. None of it is a secret. */
        IntegrationsIntegrationConfig: {
            /**
             * @description `woocommerce`. Where the store's REST API answers: `wp-json` (`/wp-json/wc/v3/…`) or `rest_route` (`/?rest_route=/wc/v3/…`), the fallback for stores with plain permalinks. A `rest_route` store cannot use the approval button (`2216`).
             * @enum {string}
             */
            api_base?: "wp-json" | "rest_route";
            /**
             * @description `woocommerce`. How the key travels: `basic` (the `Authorization` header) or `query` (in the URL, only for hostings that drop that header). Detected when connecting.
             * @enum {string}
             */
            auth_mode?: "basic" | "query";
            /** @description `rss`. */
            auto_publish?: boolean;
            /**
             * @description `woocommerce`. The store currency, when the key could read it (it needs a shop manager's key). Only used for a product that comes without `price_html`.
             * @example EUR
             */
            currency?: string;
            /** @description `rss`. */
            id_accounts?: string[];
            /** @description `rss`. */
            import_image?: boolean;
            /**
             * @description `woocommerce`. The last 7 characters of the consumer key, which is what WooCommerce shows in its key list (WooCommerce → Settings → Advanced → REST API). Disconnecting cannot revoke the key: this is how the user finds which one to delete there.
             * @example 3f9a2c1
             */
            key_ending?: string;
            /**
             * Format: date-time
             * @description `rss`.
             */
            last_checked?: string;
            /** @description `rss`. */
            publication_type?: string;
            /** @description `rss`. Entries already processed (last 200, FIFO). Owned by the job: filled at connection time with everything the feed already had, so the back catalogue is never published. */
            seen_guids?: string[];
            /** @description `woocommerce`. **true when the store's API gives prices WITHOUT tax, labelled as tax included.** It happens with the default customer location set to geolocate (or to no location), prices entered without tax and tax based on the customer's address: an API request has no customer, so WooCommerce has nowhere to charge tax, and `price_html` reads "20,00 € IVA incluido" where the shop charges 24,20 €. While it is true, the store's **taxable products come back without a price** rather than with a wrong one; products with no tax keep theirs. It is checked when connecting, so after fixing the setting (WooCommerce → Settings → General → Default customer location → Shop country/region) the store has to be reconnected. Always present on a store, also as `false`. */
            tax_location_missing?: boolean;
            /** @description `rss`. */
            template?: string;
            /** @description `rss`: the feed. `woocommerce`: the store, as it was resolved when connecting (after its own redirects, which from then on are never followed). **A store's `url` cannot be changed with `PUT`** (`2220`): it decides which server receives the stored key. Changing store is reconnecting. */
            url?: string;
        };
        /** @description One field of a provider's form. Build the form from these, not from a copy of your own: the server that validates the field is the one that announces it. */
        IntegrationsIntegrationFormField: {
            default?: unknown;
            name: string;
            options?: string[];
            required: boolean;
            /**
             * @description `accounts` is a picker of the organization's accounts. `secret` is a credential (WooCommerce's consumer secret): mask it, never prefill it when editing, and mark the input as a new password (`autocomplete="new-password"`), or the browser's password manager fills it with the user's own PlanVortex password and the store answers `2211`.
             * @enum {string}
             */
            type: "url" | "text" | "textarea" | "boolean" | "accounts" | "select" | "secret";
        };
        IntegrationsIntegrationProvider: {
            /**
             * @description File formats accepted at the door. **Empty when `file_import` is false** — that is what `rss` returns, and it does not mean "anything goes". heic/heif are accepted and converted to JPEG on ingestion, so what ends up stored is always jpeg.
             * @example [
             *       "mp4",
             *       "jpeg",
             *       "gif",
             *       "png",
             *       "jpg",
             *       "heic",
             *       "heif"
             *     ]
             */
            accepted_formats: string[];
            /** @description Has a product catalogue: `GET .../integrations/{id_integration}/products`, and a source for the `from_catalog` planner template (`source.id_integration_catalog`). WooCommerce. */
            catalog: boolean;
            /** @description The connection form. Empty when the provider connects through OAuth alone. */
            config_fields: components["schemas"]["IntegrationsIntegrationFormField"][];
            /** @description Can be connected by sending the user to `GET .../integrations/{provider}/connect_link`: Google Drive (its OAuth) and WooCommerce (the store's approval button, which creates the key without anyone copying it). A provider with a link can ALSO have `config_fields`: a WooCommerce store accepts API keys by hand too. */
            connect_link: boolean;
            /** @description What `connect_link` needs in its query before it can build the link: the store `url` on WooCommerce, because the link points at the store's own WordPress. Empty on Google Drive. */
            connect_link_fields: components["schemas"]["IntegrationsIntegrationFormField"][];
            /** @description Polled by the poll-feeds job, which turns new entries into publications. */
            content_feed: boolean;
            /** @description Contributes files to the library through POST /uploads/import. */
            file_import: boolean;
            provider: components["schemas"]["IntegrationsIntegrationProviderName"];
            /** @description true = there is an OAuth token behind the connection (Google Drive): connect with `connect_link` + `code`, one per organization and provider. false = no token to renew. **Having a link is not being OAuth**: read `connect_link` for that. */
            requires_oauth: boolean;
        };
        /** @enum {string} */
        IntegrationsIntegrationProviderName: "google_drive" | "rss" | "woocommerce";
        /** @description Provider-specific configuration. Empty for google_drive. */
        IntegrationsRssConfig: {
            auto_publish?: boolean;
            id_accounts?: string[];
            import_image?: boolean;
            /** Format: date-time */
            last_checked?: string;
            publication_type?: string;
            /** @description Entries already processed (last 200, FIFO). Owned by the job: filled at connection time with everything the feed already had, so the back catalogue is never published. */
            seen_guids?: string[];
            template?: string;
            url?: string;
        };
        IntegrationsRssConnectRequest: {
            /** @description false (the default) creates each entry as a draft for review. true schedules it a few minutes out, so there is a window to catch it before it goes out on the client's networks. Optional; defaults to `false`. */
            auto_publish?: boolean;
            /** @description Accounts of this organization the entries will be published to. At least one, otherwise 2206. */
            id_accounts: string[];
            /** @description Import the entry's featured image (enclosure, media:content or the first <img> of the content) into the library and attach it. Optional; defaults to `true`. */
            import_image?: boolean;
            /** @enum {string} */
            provider: "rss";
            /** @description Optional; defaults to `"profile"`. */
            publication_type?: string;
            /** @description Text template. Placeholders: {{title}}, {{link}}, {{summary}}. The result is truncated to the character limit of each network, taken from GET /social_limits. Optional; defaults to `"{{title}}\n\n{{link}}"`. */
            template?: string;
            /**
             * @description Public feed URL (RSS 2.0 or Atom). Private or authenticated feeds are not supported.
             * @example https://blog.cliente.com/feed
             */
            url: string;
        };
        IntegrationsWooCommerceConnectRequest: {
            /** @description Starts with `ck_`. Created in WooCommerce → Settings → Advanced → REST API with **Read** permission. */
            consumer_key: string;
            /** @description Starts with `cs_`. Stored encrypted and never returned by any endpoint. */
            consumer_secret: string;
            /** @enum {string} */
            provider: "woocommerce";
            /**
             * @description The store address. **https only**: a store that only answers on http is not connected, because the key would travel in the clear. Its redirects (http to https, bare domain to www) are resolved now, without credentials, and the final URL is what gets stored.
             * @example https://tienda.example.com
             */
            url: string;
        };
        /**
         * @description A message exchanged with a contact.
         *
         *     **Careful with the three reference fields.** `contact_id`, `from_contact_id` and `message_options.files` arrive **populated** — the whole object, not the identifier — in the messages list and in the webhook PlanVortex posts to your app, and as plain identifiers everywhere else. The types say `string | object` because both really happen.
         */
        Message: {
            _id: string;
            /** @description Set when **we** wrote to the contact. Exactly one of `contact_id` and `from_contact_id` is present, and which one tells you the direction of the message. */
            contact_id?: string | components["schemas"]["Contact"];
            /** Format: date-time */
            creation_date: string;
            /** @description Identifier of this message on the network. */
            element_external_id?: string;
            /** @description Set when the **contact** wrote to us. */
            from_contact_id?: string | components["schemas"]["Contact"];
            id_account: string;
            /** @description Identifier on the network of the publication, comment or message this one answers. */
            in_response_external_id?: string;
            /** @description Identifier of the PlanVortex message this one answers. */
            in_response_to?: string;
            /** @description Why the network refused this message, if it did. Same shape as an API error. Empty when nothing went wrong. */
            message_errors: components["schemas"]["Error"][];
            message_options: components["schemas"]["MessageOptions"];
            message_type: components["schemas"]["MessageType"];
            read: boolean;
            /** @description Absent on the messages that carry no text of their own, such as a `messaging_seen` acknowledgement. */
            text?: string;
        };
        /** @description Everything a message can carry besides its text. Which block is required depends on `message_type`. */
        MessageOptions: {
            /** @description The uploads attached to the message. **Populated** wherever the message itself is: the messages list and webhook deliveries carry whole uploads, everything else carries their identifiers. Handle both. */
            files: (string | components["schemas"]["Upload"])[];
            /** @description Files already hosted somewhere else. Filled in by PlanVortex when a message arrives from the network. */
            files_urls: {
                mime_type?: string;
                url?: string;
            }[];
            /** @description Meta cards, for `elements_message` and `button_message`. */
            metaElements?: {
                [key: string]: unknown;
            }[];
            /** @description Meta quick replies, for `quick_reply_message`. */
            metaQuickReplies?: {
                [key: string]: unknown;
            }[];
            /** @description Payload of a Meta postback. */
            payload?: string;
            /** @description Required for `template_message`, as the network's language code. */
            template_language?: string;
            /** @description Required for `template_message`. */
            template_name?: string;
            /** @description WhatsApp interactive list, for `interactive_message`. It needs at least one section. */
            whatsappInteractive?: {
                [key: string]: unknown;
            };
        };
        /** @description One contact's thread, as it looks in an inbox list. */
        MessagesConversation: {
            contact: components["schemas"]["Contact"];
            /**
             * Format: date-time
             * @description When the last message of the thread was written, which is what the list is sorted by.
             */
            date: string;
            /** @description Unread messages **from the contact**. Ours never count. */
            unread_messages: number;
        };
        /** @description Two different answers, not one with optional fields: **without** `group_by` you get `{total}`, **with** it you get `{stats, group}`. Never both. */
        MessagesConversationTotals: {
            /** @description Conversations in the range. A conversation is one contact on one day, so the same person writing on Monday and on Tuesday counts twice. */
            total: number;
        } | {
            /**
             * @description The grouping that was applied.
             * @enum {string}
             */
            group: "day" | "month" | "year";
            /** @description The series, sorted ascending. Empty when the range has no conversations. */
            stats: {
                /** @description The **number** Mongo's `$dayOfYear` / `$month` / `$year` gives, not a date: 240 for day, 8 for month, 2026 for year. Two years in the same `day` series collide on the same value — narrow the range instead. */
                groupValue: number;
                totalConversations: number;
            }[];
        };
        /**
         * @description What you send to write a message.
         *
         *     `comment_message` and `publication_message` need `in_response_external_id`, the identifier of the comment or the publication being answered ON THE NETWORK. The endpoint did not read it from the body until 2026-08-24, which left both types unreachable from the public API; it does now.
         */
        MessagesMessageInput: {
            /**
             * @description Required by `comment_message` and `publication_message`, and ignored by every other type (error `1510` when it is missing). It is the identifier the NETWORK gives: a comment's `external_id` or a publication's `external_identifier`, never a PlanVortex `_id`.
             *
             *     Only Facebook and Instagram do anything with it: `comment_message` sends a private reply to a public comment (Meta's `recipient.comment_id`) and `publication_message` attaches the post as a `MEDIA_SHARE`.
             */
            in_response_external_id?: string;
            message_options?: components["schemas"]["MessageOptions"];
            message_type: components["schemas"]["MessageType"];
            /** @description Required for the text-based types. Validated against `characters` in `GET /social_limits`. */
            text?: string;
        };
        /**
         * @description What kind of message this is. `simple_message` and `file_message` work everywhere; the rest are network-specific shapes.
         * @enum {string}
         */
        MessageType: "simple_message" | "file_message" | "comment_message" | "publication_message" | "quick_reply_message" | "button_message" | "elements_message" | "postback_message" | "template_message" | "interactive_message";
        /**
         * @description Metrics translated to a **common vocabulary** shared by every network, which is what makes two networks comparable and summable (each network names them differently: `page_post_engagements`, `total_interactions`, `views`…).
         *
         *     **A missing key means the network does not publish that metric** — it is never an implicit zero. A key present with value `0` means it was measured and came out zero. Never default a missing key to 0 when displaying it.
         *
         *     `engagement` is the network's own total when it provides one, and otherwise the sum of likes, comments, shares, saves and clicks. Video views are deliberately excluded from it: a view is not an interaction.
         */
        NormalizedMetrics: {
            clicks?: number;
            comments?: number;
            /** @description Total interactions */
            engagement?: number;
            /** @description Followers accumulated at that date, not the day's gain. */
            followers?: number;
            /** @description Followers gained that day. */
            followers_gained?: number;
            /** @description Times the content was shown (not unique) */
            impressions?: number;
            likes?: number;
            profile_views?: number;
            /** @description Unique users reached */
            reach?: number;
            saves?: number;
            shares?: number;
            video_views?: number;
        };
        /** @description The container of accounts, publications and files. Organizations can nest. */
        Organization: {
            /** @example 66d04a6a427f4c43b9d97f54 */
            _id: string;
            /** @description What is already handed out to the organizations sharing this plan, which is what is left to assign. **Only present with `getUse=true`.** */
            actual_asigned?: components["schemas"]["PlanData"];
            /** @description The slice of the client's plan assigned to this organization. **Absent when nothing was assigned**, and then the organization shares whatever its nearest parent with a plan has — or, failing that, the client's unassigned remainder. Ask `GET /organizations/{id_organization}/limits` for the effective numbers instead of reading this. */
            actual_plan?: components["schemas"]["PlanData"];
            /** @description Current consumption. **Only present with `getUse=true`.** `twitter_credits` and `ai_credits` are what has been spent in the current calendar month; the rest is what exists right now. */
            actual_use?: components["schemas"]["PlanUseData"];
            ai_context?: components["schemas"]["AiContext"];
            /** Format: date-time */
            creation_date: string;
            /** @description The client this organization belongs to. */
            id_client: string;
            name: string;
            /** @description The organization this one hangs from. Absent on a root organization. */
            parent_organization?: string;
            /** @description The organization's own application credentials, by network. A network that is absent is not configured, and then it does not even appear as connectable. */
            social_credentials?: {
                discord?: components["schemas"]["SocialCredentials"];
            };
            stats_settings?: components["schemas"]["StatsSettings"];
        };
        /** @description What this organization may actually use. An organization with no plan of its own inherits the nearest parent's, and failing that the share of the client's plan that is not assigned to anyone. */
        OrganizationsLimit: components["schemas"]["PlanData"];
        /** @description Body accepted when creating an organization. Only these properties are read. */
        OrganizationsOrganizationCreate: {
            /** @description Resources assigned to this organization, taken from what the client has contracted. */
            actual_plan?: components["schemas"]["PlanData"];
            /** @description Organization name. */
            name: string;
        };
        OrganizationsOrganizationList: {
            organizations: components["schemas"]["Organization"][];
            total: number;
        };
        OrganizationsOrganizationOne: {
            organization: components["schemas"]["Organization"];
        };
        /** @description Body accepted when updating an organization. NOTE: `name` and `parent_organization` are NOT updatable through this endpoint - the server keeps their current value and silently ignores them. */
        OrganizationsOrganizationUpdate: {
            /** @description New resource assignment. Validated against what is left of the client's contracted plan; lowering it below what the organization already uses is rejected. */
            actual_plan?: components["schemas"]["PlanData"];
            /** @description Statistics collection settings. */
            stats_settings?: components["schemas"]["StatsSettings"];
        };
        /** @description An organization role as the API returns it. Note it exposes `total_users` and never the list of user identifiers. */
        OrganizationsRolesOrganizationRole: {
            /** @description Role identifier. */
            _id?: string;
            /**
             * Format: date-time
             * @description When the role was created.
             */
            creation_date?: string;
            /** @description Whether this is a default role. Default roles cannot be updated or deleted, and their last user cannot be removed. */
            default?: boolean;
            /** @description Organization the role belongs to. */
            id_organization?: string;
            /** @description Role name. */
            name?: string;
            /** @description Organization permissions granted by this role. */
            permissions?: ("organization:create" | "organization:update" | "organization:read" | "organization:delete" | "organization_roles:create" | "organization_roles:update" | "organization_roles:read" | "organization_roles:delete" | "organization_users_roles:read" | "organization_users_roles:create" | "organization_users_roles:delete" | "accounts:create" | "accounts:update" | "accounts:read" | "accounts:delete" | "products:create" | "products:update" | "products:read" | "products:delete" | "files:create" | "files:update" | "files:read" | "files:delete" | "publications:create" | "publications:update" | "publications:read" | "publications:delete" | "account_stats:read" | "publication_stats:read" | "messages:create" | "messages:read" | "messages:delete" | "contacts:create" | "contacts:read" | "contacts:update" | "contacts:delete" | "ai_plans:create" | "ai_plans:read" | "ai_plans:update" | "ai_plans:delete")[];
            /** @description Number of users in the role. */
            total_users?: number;
        };
        /** @description Name and permission list of an organization role. Both properties overwrite the stored value. */
        OrganizationsRolesOrganizationRoleInput: {
            /** @description Role name. Must be unique inside the organization. */
            name: string;
            /** @description Complete list of organization permissions granted by this role. */
            permissions: ("organization:create" | "organization:update" | "organization:read" | "organization:delete" | "organization_roles:create" | "organization_roles:update" | "organization_roles:read" | "organization_roles:delete" | "organization_users_roles:read" | "organization_users_roles:create" | "organization_users_roles:delete" | "accounts:create" | "accounts:update" | "accounts:read" | "accounts:delete" | "products:create" | "products:update" | "products:read" | "products:delete" | "files:create" | "files:update" | "files:read" | "files:delete" | "publications:create" | "publications:update" | "publications:read" | "publications:delete" | "account_stats:read" | "publication_stats:read" | "messages:create" | "messages:read" | "messages:delete" | "contacts:create" | "contacts:read" | "contacts:update" | "contacts:delete" | "ai_plans:create" | "ai_plans:read" | "ai_plans:update" | "ai_plans:delete")[];
        };
        OrganizationsRolesOrganizationRoleList: {
            roles?: components["schemas"]["OrganizationsRolesOrganizationRole"][];
            /** @description Total number of roles in the organization, ignoring pagination. */
            total?: number;
        };
        OrganizationsRolesOrganizationRoleOne: {
            rol?: components["schemas"]["OrganizationsRolesOrganizationRole"];
        };
        OrganizationsRolesPermissionList: {
            permissions?: ("organization:create" | "organization:update" | "organization:read" | "organization:delete" | "organization_roles:create" | "organization_roles:update" | "organization_roles:read" | "organization_roles:delete" | "organization_users_roles:read" | "organization_users_roles:create" | "organization_users_roles:delete" | "accounts:create" | "accounts:update" | "accounts:read" | "accounts:delete" | "products:create" | "products:update" | "products:read" | "products:delete" | "files:create" | "files:update" | "files:read" | "files:delete" | "publications:create" | "publications:update" | "publications:read" | "publications:delete" | "account_stats:read" | "publication_stats:read" | "messages:create" | "messages:read" | "messages:delete" | "contacts:create" | "contacts:read" | "contacts:update" | "contacts:delete" | "ai_plans:create" | "ai_plans:read" | "ai_plans:update" | "ai_plans:delete")[];
        };
        OrganizationsRolesUserInOrganization: {
            /** Format: email */
            email?: string;
            /** @description `false` while an invitation is still pending acceptance. */
            enabled?: boolean;
            firstname?: string;
            /** @description User identifier. */
            id?: string;
            lastname?: string;
            /** @description Roles this user holds in the organization. */
            roles?: {
                _id?: string;
                name?: string;
            }[];
            username?: string;
        };
        OrganizationsRolesUserInOrganizationList: {
            /** @description Total number of users, ignoring pagination. May be higher than the length of `users` if some user no longer exists in the identity provider. */
            total?: number;
            users?: components["schemas"]["OrganizationsRolesUserInOrganization"][];
        };
        /**
         * @description Credentials of the organization's own Discord application. **Write-only**: nothing sent here ever comes back.
         *
         *     All three are required the first time. Afterwards, what you leave out is kept — so the `client_id` can be fixed without resending the secrets.
         */
        OrganizationsSocialCredentialsInput: {
            /** @description The bot's token. Stored encrypted, and validated against Discord before anything is saved. */
            bot_token?: string;
            /** @description The Discord application's id (its *Application ID*, which is also its client id). */
            client_id?: string;
            /** @description The application's OAuth2 secret. Stored encrypted. */
            client_secret?: string;
        };
        OrganizationsUser: {
            email?: string;
            firstname?: string;
            id?: string;
            lastname?: string;
            username?: string;
        };
        OrganizationsUserList: {
            total?: number;
            users?: components["schemas"]["OrganizationsUser"][];
        };
        /**
         * @description The resources a plan grants. On a client it is what was contracted; on an organization, the slice of it that was assigned. The sum across all the organizations of a client can never exceed what the client has contracted.
         *
         *     Users are NOT here: every plan has unlimited users, so they are neither charged nor split between organizations. They are still counted, in `PlanUseData.users`. There are no `artificial_inteligence`, `whatsapp` or `stats` flags either: statistics and WhatsApp are on every plan, and what gates AI is `ai_credits` — a plan with credits has AI, and Free has zero.
         */
        PlanData: {
            /** @description Social accounts that may be connected. */
            accounts: number;
            /** @description Monthly AI credits (1 credit = $0.001 of provider cost): 15 per plan orchestration pass, 2 per generated text, 70 per generated image. Resets monthly and does not roll over. A client using its own provider key (BYOK) does not consume them in that scope. */
            ai_credits?: number;
            /** @description Apps this plan allows: 1 on Free, 2 on Basic, 5 on Pro, 10 on Custom. Each one is a `client_id` with a secret, so each one is a key to the whole public API — which every plan has, Free included. Unlike accounts or storage this is NOT split between organizations: an app belongs to the client. On a use payload it is how many exist right now. */
            apps?: number;
            /** @description Connections to a third-party tool material is pulled from (Google Drive, an RSS feed). Not the same thing as an app: an app is API access, and it has its own allowance in `apps`. */
            integrations: number;
            /** @description Storage, in GB. */
            space: number;
            /** @description Monthly X (Twitter) credits. X bills per use: 15 per post, 200 if the text contains a link, 15 per deletion, 1 per stat read, 1 per timeline item. The pool resets on the 1st of each calendar month and does not roll over. */
            twitter_credits?: number;
        };
        /** @description What is being consumed right now. Same shape as PlanData plus `publications` and `users`, which are counted but neither charged nor split between organizations. */
        PlanUseData: {
            /** @description Publications created in the current calendar month. A METRIC, not a quota: publications are unlimited on every plan, so there is no limit to compare it against. What throttles publishing is rate, not plan — see the per-hour and per-network daily caps. */
            publications?: number;
            /** @description Users with access right now. A METRIC, not a quota: users are unlimited on every plan, so there is no limit to compare it against. */
            users?: number;
        } & components["schemas"]["PlanData"];
        /** @description A product as the network returns it. `id` is always present here. */
        ProductsProduct: components["schemas"]["ProductsProductInput"];
        /** @description A Meta commerce catalogue, as the network returns it. */
        ProductsProductCatalog: {
            default_image_url?: string;
            feed_count?: number;
            id?: string;
            is_catalog_segment?: boolean;
            is_local_catalog?: boolean;
            name?: string;
            product_count?: number;
        } & {
            [key: string]: unknown;
        };
        ProductsProductCatalogInput: {
            name: string;
        };
        /** @description A product in Meta's Commerce vocabulary. Only the fields PlanVortex depends on are listed; anything else Meta accepts travels through untouched. */
        ProductsProductInput: {
            additional_image_urls?: string[];
            /** @enum {string} */
            availability?: "in stock" | "out of stock" | "preorder" | "available for order" | "discontinued" | "pending" | "mark_as_sold";
            brand?: string;
            category?: string;
            color?: string;
            /** @enum {string} */
            condition?: "new" | "refurbished" | "used" | "used_like_new" | "used_good" | "used_fair" | "cpo" | "open_box_new";
            /** @description ISO 4217 code, for example `EUR`. */
            currency: string;
            description?: string;
            /** @description Send it to update an existing product. Leave it out to create one. */
            id?: string;
            image_url: string;
            name: string;
            /** @description In **cents** of `currency`. 1250 is 12,50. */
            price: number;
            /** @description **Your** identifier for the product. It is what ties the Meta catalogue to your system. */
            retailer_id: string;
            /** @description The product's page on your site. */
            url?: string;
        } & {
            [key: string]: unknown;
        };
        Publication: {
            _id: string;
            /** Format: date-time */
            creation_date: string;
            /** @description Where inside the account this publication goes. Only present on the networks that answer `destinations: true` in `GET /social_capabilities`. */
            destination?: components["schemas"]["PublicationDestination"];
            /**
             * @description What this publication's engagement rate is divided by.
             * @enum {string}
             */
            engagement_base?: "reach" | "impressions" | "followers";
            /** @description The network's own identifier, once published. On `telegram` an album is one publication that is **several messages**, and this holds the first one; the rest travel in `extra_data.telegram_message_ids`. */
            external_identifier?: string;
            /**
             * @description What one network needs to remember about **this** publication and that has no common field. Absent on a publication whose network needs nothing, which is almost all of them.
             *
             *     Today only `telegram` writes here, and only `telegram_message_ids`: the ids of every message an album turned into, because deleting the album means deleting all of them.
             */
            extra_data?: {
                [key: string]: unknown;
            };
            /** @description The attached files, **already resolved**: every read and write path returns full uploads, not identifiers. Identifiers are what you SEND (see `PublicationInput.files`). */
            files: components["schemas"]["Upload"][];
            /**
             * @description The account the publication goes out through.
             *
             *     **It is not always the same shape.** The single-publication operations (create, read, retry) return the account already resolved; the listing and the update return its identifier as a string. Check before using it.
             */
            id_account: string | components["schemas"]["Account"];
            /** @description The integration this publication came from — an RSS feed, for instance. Set when it is created and never changed afterwards. */
            id_integration?: string;
            id_organization: string;
            /**
             * @description **The destination link**: where the publication takes whoever clicks it. Not to be confused with `url`, which is the link to the publication *on the network* and only exists once it is published.
             *
             *     Only the networks that answer `link: true` in `GET /social_capabilities` carry it — today `pinterest` alone, where a pin has a `link` field of its own and sending traffic somewhere is the whole point of publishing there. Putting the URL inside `text` instead leaves it visible and unclickable.
             *
             *     **On every other network the field is deleted on save**, like `destination`.
             */
            link?: string;
            /** @description Last known measurement, in the common vocabulary. Absent until it is measured. */
            metrics?: components["schemas"]["NormalizedMetrics"];
            /** @description Internal name. Never shown on the social network. */
            name?: string;
            /** Format: date-time */
            next_stats_update?: string;
            /**
             * @description Why the publication failed, one entry per problem. **It is an array**, and it is empty on a publication that has not failed.
             *
             *     For a scheduled X (Twitter) publication that runs out of credits at publish time, `code` is 940 and `data` is `{ used, limit }`; the publication stays in state `withErrors` and the client-app webhook is fired.
             */
            publication_errors: {
                code: number;
                data?: {
                    [key: string]: unknown;
                };
                message: string;
            }[];
            /** @enum {string} */
            publication_type: "profile" | "page" | "group" | "reels" | "stories" | "message";
            /** Format: date-time */
            publish_date?: string;
            /** @description Manual retries already spent on a failed publication, against the `max_retries` published by `GET /publication_limits`. Only `POST .../retry` increases it; updating the publication resets it to 0. */
            retries: number;
            /** @description Always the network of the account in `id_account`. */
            social_network: components["schemas"]["SocialNetwork"];
            /**
             * @description `draft` is never sent; `ready` is scheduled; `publishing` is in the network's hands right now; `sended` went out; `withErrors` failed and carries the reason in `publication_errors`.
             * @enum {string}
             */
            state: "ready" | "withErrors" | "sended" | "draft" | "publishing";
            statistics?: components["schemas"]["PublicationStats"];
            /** Format: date-time */
            stats_updated_date?: string;
            text?: string;
            /** @description Only the networks that have a title field use it. */
            title?: string;
            /** @description Link to the publication on the network, when there is one. A **private** Telegram channel has no public URL, so it comes back empty even though the post went out. */
            url?: string;
        };
        /**
         * @description **Where inside the account** a publication goes, on the networks where choosing the account is not yet choosing the destination. Today that is `pinterest` alone, where it is the board the pin is saved to.
         *
         *     Ask `destinations` in `GET /social_capabilities` instead of keeping a list of your own, and read the account's boards with `GET /organizations/{id_organization}/accounts/{id_account}/destinations`.
         *
         *     **On Pinterest it is required.** A publication created without it is created in state `withErrors` with `publication_errors[].code = 987` and the background job will not attempt it — the same treatment as a YouTube video with no title, and for the same reason: a scheduled publication that dies at 3 a.m. over a board that was missing from the start is a failure that could have been told to the person while they were still there.
         *
         *     **On every other network the field is deleted, not rejected.** A `destination` on a Facebook publication would be a field that does nothing, and giving it back in the response would be worse than dropping it.
         *
         *     `name` and `section_name` are labels for display ("Recipes > Desserts"). The server never checks them and nothing is decided by them: what publishes is `id`.
         */
        PublicationDestination: {
            /** @description The board id. **Always a string**, never a number: Pinterest's ids are long integers, so a client that sends one as a JSON number has already lost digits to rounding before the request arrives. That is refused — `publication_errors[].code = 987` with `data.reason = "invalid_id"` — rather than published to some other board. Sending the board's *name* instead of its id fails the same way, which is the likeliest first mistake of an integration. */
            id?: string;
            /** @description The board's label, for display. Decides nothing. */
            name?: string;
            /** @description Pinterest only: the section of the board, optional. Absent or empty means the board itself. Same rule as `id` — anything that is not a string of digits is `data.reason = "invalid_section_id"`. A board's sections arrive in the detail of one destination, not in the list of them. */
            section_id?: string;
            /** @description The section's label, for display. Decides nothing. */
            section_name?: string;
        };
        /** @description A place inside the account a publication can be sent to: on Pinterest, a board. */
        PublicationsDestination: {
            /** @description The destination's own description, when the network has one. */
            description?: string;
            /** @description What goes in `destination.id` when creating a publication. **Always a string**, even though Pinterest's are long integers — parse it as text or you will lose digits. */
            id: string;
            /** @description A cover image for the picker, when the network has one. */
            image?: string;
            /** @description The name to show in a picker. */
            name: string;
            /** @description Pinterest: `PUBLIC`, `PROTECTED` or `SECRET`. Worth showing: a pin on a secret board is seen by nobody else, and afterwards there is nothing in the statistics that explains why it has no impressions. */
            privacy?: string;
            /** @description Pinterest: the board's sections, which is what goes in `destination.section_id`. **Only in the detail of one destination** — listing them for every board would cost one call to the network per board. */
            sections?: {
                id: string;
                name: string;
            }[];
        };
        /** @description Body accepted when creating or updating a publication. Only these properties are read; anything else in the payload is ignored. */
        PublicationsPublicationInput: {
            /**
             * @description Where inside the account the publication goes. **Required on the networks that answer `destinations: true` in `GET /social_capabilities`** — today `pinterest`, where it is the board — and **deleted** on every other one.
             *
             *     Read the account's destinations with `GET /organizations/{id_organization}/accounts/{id_account}/destinations` and send back the `id` you got from there. Missing or malformed, the publication is still created, in state `withErrors` with `publication_errors[].code = 987` and a `data.reason` of `missing`, `invalid_id` or `invalid_section_id`. It is **not** checked against the network at creation: that would cost a call to Pinterest on every publication and make creating one depend on Pinterest answering.
             *
             *     On an update, omitting it keeps the destination that was there.
             */
            destination?: components["schemas"]["PublicationDestination"];
            /**
             * @description Identifiers of uploads previously created through the uploads endpoints, attached to this publication.
             *
             *     **On Slack the files travel inside the message**, not as publications of their own: up to 10 attachments counting images and videos together (`publication_errors[].code = 982` over it), each one under the `max_file_size_mb.slack` ceiling (code 983), and anything the upload itself refuses comes back as code 986.
             *
             *     **On Pinterest a pin is an image or a video, never text alone** (code 922 with neither), and it is of one kind only: two to five images make a carousel — outside that range, code 990 — images and videos are not mixed and there is no more than one video (code 916). The weight ceilings are two orders of magnitude apart, so `max_file_size_mb.pinterest` is the **image** one (~20 MB) while a video is allowed far more; over either, code 996 with `data.max_mb`.
             */
            files?: string[];
            /**
             * @description **The destination link**: where the publication takes whoever clicks it. Only on the networks that answer `link: true` in `GET /social_capabilities` — today `pinterest`, where it is the whole point of a pin — and **deleted** on every other one. It is not `url`, which is the link to the publication on the network once published.
             *
             *     It is optional (a pin with no link is legitimate), but if it is sent it must be a real `http(s)://` URL of at most 2.048 characters: a bare domain such as `mysite.com/recipe` is created in state `withErrors` with `publication_errors[].code = 994` and `data.reason` of `invalid_url` or `too_long`. It is checked when the publication is **created**, not when it is published, so a scheduled pin does not die at 3 a.m. over a link that was already wrong.
             *
             *     On an update: omit it to keep what was there, send `null` or `""` to remove it.
             */
            link?: string;
            /** @description Internal name for the publication. Useful for grouping; never shown on the social network. */
            name?: string;
            /**
             * @description Defaults to `profile`. Not every network accepts every type, and an unsupported combination returns error 923. Allowed values are: facebook and instagram -> profile, reels, stories; twitter, linkedin, tiktok and youtube -> profile; whatsapp -> stories. YouTube has no separate type for Shorts: any vertical video of 3 minutes or less is classified as one automatically.
             * @enum {string}
             */
            publication_type?: "profile" | "page" | "group" | "reels" | "stories";
            /**
             * Format: date-time
             * @description When the publication must go out. If omitted, it is published immediately. An invalid date returns error 938.
             */
            publish_date?: string;
            /**
             * @description Network the publication targets. **Required when creating**: the request fails with error 702 if it is missing or not one of these values. It must match the network of the account in the path.
             *
             *     Not every connectable network publishes — a local business listing receives reviews, not posts — so this list is shorter than the one in `GET /social_networks`. Ask `GET /allowed_social_publications` rather than hardcoding it, because it grows.
             * @enum {string}
             */
            social_network?: "facebook" | "instagram" | "twitter" | "linkedin" | "tiktok" | "whatsapp" | "youtube" | "bluesky" | "discord" | "telegram" | "threads" | "slack" | "pinterest";
            /**
             * @description Send `draft` to store the publication without publishing it. If omitted, the state is resolved automatically: `ready` when everything validates, `withErrors` otherwise. Forcing `sended` marks it as published without actually sending it.
             * @enum {string}
             */
            state?: "ready" | "withErrors" | "sended" | "draft" | "publishing";
            /**
             * @description Body text of the publication. Either `text` or at least one entry in `files` is required: if both are empty the publication is still created, but in state `withErrors` with `publication_errors[].code = 915`. Maximum length depends on the network. On YouTube this is the video **description** (5,000 characters), and the publication must carry exactly one video file and no images — otherwise it is created in state `withErrors` with `publication_errors[].code = 943`. For X (Twitter), a text containing a link costs 200 credits instead of 15.
             *
             *     **On Telegram the limit depends on what else the publication carries**: 4.096 characters while it is text only, and **1.024** the moment it has an image or a video, because then the text is the caption of a photo, a video or an album and no longer a message. Over the limit it is created in state `withErrors` with `publication_errors[].code = 967`, whose `data` carries `characters`, `max_characters` and `has_media`. Both numbers are published, as `characters.telegram` and `characters.telegram_media` in `GET /social_limits`.
             *
             *     **On Slack the limit is 4.000 characters** and it is counted over the text you send, not over what travels: `&`, `<` and `>` are escaped before publishing, so a text made of ampersands grows on the wire and is still measured here. Over the limit the publication is created in state `withErrors` with `publication_errors[].code = 981`. And because the escaped text is what is measured on the wire, a text that passed at 4.000 characters and is full of `&` is **trimmed** before going out — Slack does not reject a long `text`, it truncates it or splits it into several messages, and one publication showing up as two posts is worse. The text goes out **plain**: Slack speaks *mrkdwn* and not Markdown, and PlanVortex sends no `blocks`, so `**bold**` is published literally.
             *
             *     **On Pinterest `text` is the pin's description**, at most 800 characters — the title is the separate `title` field, which is the first thing anyone arriving from Facebook gets wrong. Over it, `publication_errors[].code = 995` with `data.field = "description"`.
             */
            text?: string;
            /**
             * @description Title for the publication. Only some networks use it: optional on LinkedIn, and **required on YouTube**, where it is the video title and must be 100 characters or fewer — a publication without it, or with a longer one, is created in state `withErrors` with `publication_errors[].code = 944`.
             *
             *     **On Pinterest it is the pin's title**, optional and at most 100 characters; over it the publication is created in state `withErrors` with `publication_errors[].code = 995` and `data.field = "title"`.
             */
            title?: string;
        };
        PublicationsPublicationList: {
            publications: components["schemas"]["Publication"][];
            total: number;
        };
        PublicationsPublicationOne: {
            publication: components["schemas"]["Publication"];
        };
        PublicationsPublicationRetry: {
            /** @description Retries a failed publication accepts in total. Read it from here instead of hardcoding it: it is the same number the server enforces. */
            max_retries: number;
            publication: components["schemas"]["Publication"];
        };
        PublicationsPublicationsStatsList: {
            /** @description Metric the listing is ordered by */
            metric?: string;
            /** @description The requested page. Each publication carries its last known `metrics`, `engagement_base` and `stats_updated_date`; a publication that has not been measured yet has none of them. */
            publications?: components["schemas"]["Publication"][];
            /** @description The resolved range and the immediately preceding period of the same length, which is what `summary.previous_total` covers. */
            range?: {
                /** Format: date-time */
                from_date?: string;
                /** Format: date-time */
                previous_from_date?: string;
                /** Format: date-time */
                previous_to_date?: string;
                /** Format: date-time */
                to_date?: string;
            };
            /** @description Aggregates for the whole organization in the range. Omitted when `summary=false`. */
            summary?: {
                by_network?: {
                    metrics?: components["schemas"]["NormalizedMetrics"];
                    publications?: number;
                    social_network?: string;
                }[];
                previous_total?: components["schemas"]["NormalizedMetrics"];
                total?: components["schemas"]["NormalizedMetrics"];
            };
            /** @description Publications matching the filters, for paging */
            total?: number;
        };
        /** @description A publication's measured history plus its last known values. */
        PublicationsPublicationStatsHistory: {
            /** @enum {string} */
            engagement_base?: "reach" | "impressions" | "followers";
            id_publication: string;
            /** @description The most recent row of the series, with the network's raw payload attached. Absent when the series is empty. */
            latest?: {
                /** Format: date-time */
                collected_date: string;
                /** @enum {string} */
                engagement_base?: "reach" | "impressions" | "followers";
                metrics: components["schemas"]["NormalizedMetrics"];
                /** @description What the network answered, unprocessed. */
                raw?: components["schemas"]["PublicationStats"];
            };
            metrics?: components["schemas"]["NormalizedMetrics"];
            /**
             * Format: date-time
             * @description When the collector will look again. Absent means the 30-day window is over
             */
            next_stats_update?: string;
            /** Format: date-time */
            publish_date?: string;
            /** @description One row per measured day, oldest first. Empty is valid: nothing has been measured yet. */
            series: components["schemas"]["PublicationsPublicationStatsPoint"][];
            social_network: components["schemas"]["SocialNetwork"];
            statistics?: components["schemas"]["PublicationStats"];
            /**
             * Format: date-time
             * @description Last time it was measured. Absent means never
             */
            stats_updated_date?: string;
        };
        /** @description One measurement of a publication. `metrics` is the **running total** at `collected_date`, not that day's increment. */
        PublicationsPublicationStatsPoint: {
            /**
             * Format: date-time
             * @description Day of the measurement, normalized to 00:00
             */
            collected_date: string;
            /**
             * @description What the engagement rate is divided by. Two rows with different bases are not comparable: state the base whenever you put them in the same table.
             * @enum {string}
             */
            engagement_base?: "reach" | "impressions" | "followers";
            metrics: components["schemas"]["NormalizedMetrics"];
        };
        /**
         * @description Raw, per-network metrics for a publication. Only the fields that belong to the publication's own social network are returned.
         *
         *     **An absent field is not a zero.** A field is present only when the network actually reported it; `0` means the network measured zero. This matters most on X (Twitter), where metrics are split into groups with different access levels: `public_metrics` (likes, replys, retwets, quotes, bookmarks, impressions) is always available, while clicks, the pre-computed `engagement` and the video playback quartiles come from X's non-public metrics — only for your own posts, within 30 days of publishing, and only if the app is entitled to them. When they are unavailable they are omitted rather than returned as `0`. Do not default missing fields to zero when displaying them.
         *
         *     On `discord` there are only two: `likes` (the reactions on the message) and `comments` (the messages in its thread). There is no impressions figure anywhere in Discord's API, so engagement is computed over the server's member count.
         *
         *     On `bluesky` there are no impressions and no reach either — only the public counters — so engagement is computed over followers.
         *
         *     On `threads` there are six, and the one that matters is `views`: it is the only one of the four newest networks with something like impressions, so its engagement rate is computed over a real base and not over followers. Sharing arrives split in three — `reposts`, `quotes` and `shares` (outside Threads) — and the three are added into one figure, the same criterion as on X; the breakdown stays in `raw`. A reply is what every other network calls a comment.
         *
         *     On `telegram` there are two as well, and **neither of them is asked for**: the Bot API has no method that returns a message's metrics, so `reactions` arrives on its own through the bot and `comments` is counted in PlanVortex's own inbox. There are no impressions, no reach, no views and no forwards to be had anywhere in it, so engagement is computed over followers.
         *
         *     On `slack` there is exactly **one**, `reactions`, and the other absences are the informative part: the Web API publishes no impressions, no reach, no views and no clicks for a message, so those keys are missing rather than zero. There is no `comments` either — Slack threads are not read at all (`comments` is `false` in `GET /social_capabilities`). Engagement is computed over the channel's members.
         *
         *     On `pinterest` there are seven, and three of them exist nowhere else: `saves` — the gesture the whole network is built on —, `outbound_clicks` (clicks that left the pin towards its `link`, which is the one normalised as the common `clicks`) and `pin_clicks` (clicks that opened the pin inside Pinterest, with no common equivalent). `impressions` is real here, so the engagement rate is computed over it and not over followers. `video_views` only exists on a video pin. And `comments` is the odd one: Pinterest **counts** them and offers no way to read them, so the number is reported while `comments` is `false` in `GET /social_capabilities` — this network has no comment inbox, and it is not a gap waiting to be filled.
         */
        PublicationStats: {
            angers?: number;
            /** @description X (Twitter). Times the post was saved to bookmarks. Always available (`public_metrics`). Normalised as `saves` and counted towards engagement. */
            bookmarks?: number;
            clicks?: number;
            comments?: number;
            /** @description Total interactions. LinkedIn reports it directly. On X it comes from the non-public metrics and, when present, takes precedence over the sum of the individual interactions — it includes interactions the API does not break down. */
            engagement?: number;
            follows?: number;
            hahas?: number;
            impressions?: number;
            likes?: number;
            loves?: number;
            negative_feedback?: number;
            /** @description Pinterest. Clicks that left the pin towards its `link`. This is the one normalised as the common `clicks`. */
            outbound_clicks?: number;
            page_likes?: number;
            /** @description Pinterest. Clicks that opened the pin inside Pinterest without leaving it. No common equivalent, so it lives only here. */
            pin_clicks?: number;
            /** @description X (Twitter). Video playbacks that reached 0% — i.e. started. Comes from X's non-public metrics: omitted when unavailable. */
            playback_0_count?: number;
            /** @description X (Twitter). Video playbacks that reached 25%. Comes from X's non-public metrics: omitted when unavailable. */
            playback_25_count?: number;
            /** @description X (Twitter). Video playbacks that reached 50%. Comes from X's non-public metrics: omitted when unavailable. */
            playback_50_count?: number;
            /** @description X (Twitter). Video playbacks that reached 75%. Comes from X's non-public metrics: omitted when unavailable. */
            playback_75_count?: number;
            /** @description X (Twitter). Video playbacks that reached 100%. Comes from X's non-public metrics: omitted when unavailable. */
            playback_100_count?: number;
            profile_activity?: number;
            profile_visits?: number;
            quotes?: number;
            reach?: number;
            /** @description Telegram, Slack and Pinterest. Every reaction on the post, all emoji together, normalised as `likes`. On `telegram` and `slack` it is the **complete state and not an increment**: it goes down when somebody takes theirs back. On `slack` it is the only metric the network gives. */
            reactions?: number;
            /** @description Telegram. The same total broken down by emoji. Reactions with a custom emoji are grouped under a single key: their identifier means nothing outside the server that created it. */
            reactions_by_emoji?: {
                [key: string]: number;
            };
            replys?: number;
            retwets?: number;
            saved?: number;
            /** @description Pinterest. Times the pin was saved to a board — the gesture the network is built on. Normalised as `saves` and counted towards engagement. Not the same key as `saved`, which is Instagram's. */
            saves?: number;
            share?: number;
            shareMentions?: number;
            shares?: number;
            sorrys?: number;
            /** @description X (Twitter). Clicks on links in the post. Comes from X's non-public metrics: omitted when unavailable. */
            url_link_clicks?: number;
            /** @description X (Twitter). Clicks on the author's profile from the post. Comes from X's non-public metrics: omitted when unavailable. */
            user_profile_clicks?: number;
            video_views?: number;
            views?: number;
            wows?: number;
        };
        /** @description What can be read back about an organization's own application. The secrets are not here and never will be. */
        SocialCredentials: {
            /** @description The application's name, as Discord returned it when the credentials were validated. */
            application_name?: string;
            client_id?: string;
            /** @description Whether a bot token is stored. Never the token. */
            has_bot_token?: boolean;
            /** @description Whether a secret is stored. Never the secret. */
            has_client_secret?: boolean;
            /**
             * Format: date-time
             * @description When the credentials were last validated against Discord.
             */
            verified_date?: string;
        };
        /** @description The same person, on one channel. */
        SocialIdentifier: {
            _id: string;
            /** @description Identifier of the contact on that channel. */
            external_identifier?: string;
            /**
             * Format: date-time
             * @description Last message received from the contact. On WhatsApp it is what opens the 24-hour window in which a free-form message is allowed.
             */
            last_send_date?: string;
            social_network: components["schemas"]["ContactChannel"];
        };
        /**
         * @description A social network supported by PlanVortex.
         *
         *     **This list grows.** Treat it as an open enumeration: a client that rejects an unknown value breaks the day a network is added, which happens several times a year. Not every network does everything — ask `GET /social_capabilities`.
         * @enum {string}
         */
        SocialNetwork: "facebook" | "instagram" | "linkedin" | "tiktok" | "twitter" | "whatsapp" | "youtube" | "google_business" | "bluesky" | "discord" | "telegram" | "threads" | "slack" | "pinterest";
        /** @description Statistics collection settings. Only `auto_refresh_twitter` is read; any other key is ignored. */
        StatsSettings: {
            /**
             * @description Whether the background job refreshes X (Twitter) statistics automatically. Every other network is free and always refreshed; X charges 1 credit per read, so this is the one setting that makes the robot spend the client's credits. Anything other than an explicit `false` is treated as `true`.
             * @default true
             */
            auto_refresh_twitter: boolean;
        };
        /** @description What an operation with nothing to return answers. A failure never looks like this: it comes back as an `Error` with HTTP 400. */
        Success: {
            success: boolean;
        };
        /**
         * @description A file in the organization's library.
         *
         *     **`public_path` is a signed, temporary URL, not a permanent link.** Do not store it: it expires. Ask for the upload again when you need it.
         */
        Upload: {
            _id: string;
            /** @description Cover of a video, which is another upload of its own and comes back already resolved. It never appears on its own in the library listing. */
            cover_image?: components["schemas"]["Upload"];
            /** @description Point of the video, in milliseconds, used as the cover frame. */
            cover_offset?: number;
            /** Format: date-time */
            creation_date: string;
            /** @description Where this file ended up on each network it has been published to. Some networks keep their own copy and give it an identifier that is reused instead of uploading the bytes again. */
            file_externals: {
                external_identifier: string;
                external_url: string;
                social_network: components["schemas"]["SocialNetwork"];
            }[];
            /**
             * @description The format of the stored bytes. `heic`/`heif` are accepted at the door — that is what an iPhone produces — but never stored: they are converted to JPEG while being ingested, so an upload never comes back with one.
             * @enum {string}
             */
            file_format: "mp4" | "jpeg" | "gif" | "png" | "jpg";
            file_properties: components["schemas"]["FileProperties"];
            /** @enum {string} */
            file_type: "video" | "image";
            id_organization: string;
            /** @description `true` on a file the platform created for itself — a crop made to fit a network's aspect ratio. Temporary files are not part of the library listing. */
            is_temporal: boolean;
            name: string;
            /**
             * Format: uri
             * @description Download URL. IMPORTANT: it is a TEMPORARY, signed URL, not a permanent link. It expires (24 hours by default) and must not be stored or shared: ask for the upload again to get a valid one. The URL stays byte-identical within the same hour, so it can be cached for that long.
             * @example https://a1b2c3d4e5f6.eu.r2.cloudflarestorage.com/planvortex-prod/orgs/60b.../60c.../foto.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=86400&X-Amz-Signature=...
             */
            public_path: string;
        };
        UploadsUploadList: {
            total: number;
            uploads: components["schemas"]["Upload"][];
        };
        UploadsUploadOne: {
            upload: components["schemas"]["Upload"];
        };
    };
    responses: {
        /** @description Error. Classify by `code` in the body, never by the HTTP status. */
        AppsError: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /**
         * @description The request failed. The body carries the PlanVortex error code in `code`:
         *
         *     | Code | Meaning |
         *     | --- | --- |
         *     | `516` | Comments require a paid plan. Every endpoint here returns this on the free plan. |
         *     | `700` | The account is not connected — no valid token, or nothing to ask the network about. |
         *     | `936` | The publication was never sent, so it has no thread to read. |
         *     | `940` | The client's monthly X credits are exhausted. Only X. |
         *     | `945` | This network has no comments (TikTok, WhatsApp). Carries `social_network` in `data`. |
         *     | `946` | The network has comments but does not allow **this action**: hiding on LinkedIn or Google Business, deleting someone else's on Instagram or X, deleting a review. Carries `social_network` and `action` in `data`. See `GET /social_comment_actions`. |
         *     | `947` | The comment no longer exists on the network. What is stored is a photograph; the network always wins. Carries `external_id` in `data`. |
         *     | `948` | The reply is empty or longer than the network allows. Carries the limit in `data.max`; the same number is published in `comment_characters` of `GET /social_limits`. |
         *     | `951` | The Google Business listing is not verified, so it cannot reply to its reviews. It is the state of the customer's profile, not of your token. |
         *     | `952` | PlanVortex's Google Cloud project has no approved access to the Google Business API yet. Until it does, reviews cannot be read or replied to. |
         *     | `965` | This Telegram channel has no linked discussion group, so it has no comments. The network gate says `true`; what is missing is a setting of **that channel**, which its owner fixes in two taps. Carries `chat_id` in `data`. |
         *     | `969` | The PlanVortex bot is not allowed to delete messages in this Telegram discussion group. The network allows it; this installation does not. Carries `chat_id` in `data`. |
         *     | `970` | Telegram is rate limiting the bot and the wait was longer than PlanVortex is willing to hold the request for. Carries `retry_after_seconds` in `data`: retry after it. |
         *     | `1101` | Invalid organization. |
         *     | `1501` | The comment's account could not be resolved. |
         */
        CommentsCommentError: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Error. Classify by `code` in the body, never by the HTTP status. */
        ContactsError: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Error. Classify by `code` in the body, never by the HTTP status. */
        DashboardError: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Error. Classify by `code` in the body, never by the HTTP status. */
        MessagesError: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Error. Classify by `code` in the body, never by the HTTP status. */
        ProductsError: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
    };
    parameters: {
        /** @description Start of the range, ISO 8601. Defaults to 30 days before `to_date`. A range longer than 366 days answers error 1003. */
        AiPlansfromDate: string;
        /** @description AI plan identifier */
        AiPlansidAiPlan: string;
        /** @description Client identifier */
        AiPlansidClient: string;
        /** @description Organization identifier */
        AiPlansidOrganization: string;
        /** @description End of the range, ISO 8601. Defaults to now. */
        AiPlanstoDate: string;
        /** @description App identifier */
        AppsidApp: string;
        /** @description Client identifier */
        AppsidClient: string;
        /** @description Records per page (pagination) */
        Appslimit: number;
        /** @description Records to skip (pagination) */
        Appsoffset: number;
        /** @description Connected account identifier */
        CommentsidAccount: string;
        /** @description Comment identifier (PlanVortex's `_id`, not the network's `external_id`) */
        CommentsidComment: string;
        /** @description Organization identifier */
        CommentsidOrganization: string;
        /** @description Publication identifier */
        CommentsidPublication: string;
        /** @description How many to read from the network. **On X it is capped** regardless of what you send: a page there is a spending ceiling, not a pagination preference. */
        CommentsthreadLimit: number;
        /** @description Page cursor. Pass back the `next_cursor` of the previous response — it is an opaque token from the network, not a numeric offset. */
        CommentsthreadOffset: string;
        /** @description Contact identifier */
        ContactsidContact: string;
        /** @description Organization identifier */
        ContactsidOrganization: string;
        /** @description Records per page (pagination) */
        Contactslimit: number;
        /** @description Records to skip (pagination) */
        Contactsoffset: number;
        /** @description Start of the range, ISO 8601. Defaults to 30 days before `to_date`. A range longer than 366 days answers error 1003. */
        DashboardfromDate: string;
        /** @description Organization identifier */
        DashboardidOrganization: string;
        /** @description End of the range, ISO 8601. Defaults to now. */
        DashboardtoDate: string;
        /** @description Integration identifier */
        IntegrationsidIntegration: string;
        /** @description Organization identifier */
        IntegrationsidOrganization: string;
        /** @description Start of the range, ISO 8601. Defaults to the start of the current month. */
        MessagesfromDate: string;
        /** @description Group the count into a series. Omit it and the answer is a single `total` instead. */
        MessagesgroupBy: "day" | "month" | "year";
        /** @description Connected account identifier */
        MessagesidAccount: string;
        /** @description Contact identifier */
        MessagesidContact: string;
        /** @description Organization identifier */
        MessagesidOrganization: string;
        /** @description Records per page (pagination) */
        Messageslimit: number;
        /** @description Records to skip (pagination) */
        Messagesoffset: number;
        /** @description End of the range, ISO 8601. Defaults to the end of the current month. */
        MessagestoDate: string;
        /** @description Organization identifier */
        OrganizationsRolesidOrganization: string;
        /** @description Role identifier */
        OrganizationsRolesidRol: string;
        /** @description User identifier */
        OrganizationsRolesidUser: string;
        /** @description Maximum number of records returned (pagination) */
        OrganizationsRoleslimit: number;
        /** @description Number of records to skip (pagination) */
        OrganizationsRolesoffset: number;
        /** @description Connected account identifier */
        ProductsidAccount: string;
        /** @description Organization identifier */
        ProductsidOrganization: string;
        /** @description Records per page (pagination) */
        Productslimit: number;
        /** @description Records to skip (pagination) */
        Productsoffset: number;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getAllowedAspectRatios: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Aspect ratios per network */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "instagram": {
                     *         "values": [
                     *           1,
                     *           0.8,
                     *           1.91,
                     *           0.5625
                     *         ],
                     *         "text": [
                     *           "1:1",
                     *           "4:5",
                     *           "1.91:1",
                     *           "9:16"
                     *         ]
                     *       },
                     *       "facebook_reels": {
                     *         "values": [
                     *           0.5625
                     *         ],
                     *         "text": [
                     *           "9:16"
                     *         ]
                     *       }
                     *     }
                     */
                    "application/json": {
                        [key: string]: components["schemas"]["CatalogAspectRatios"];
                    };
                };
            };
            /** @description Error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getAllowedSocialMessages: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Networks with conversations */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SocialNetwork"][];
                };
            };
            /** @description Error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getAllowedSocialPublications: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Networks that accept publications */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SocialNetwork"][];
                };
            };
            /** @description Error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getClients: {
        parameters: {
            query?: {
                /** @description Boolean determine if the server will response with the actual use of each client */
                getUse?: boolean;
                /** @description The limit of records will be retrieved (pagination) */
                limit?: number;
                /** @description Number of records from which you will get clients (pagination) */
                offset?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientsClientList"];
                };
            };
            /** @description Error. Classify by `code` in the body, never by the HTTP status: every domain error travels with HTTP 400. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getClientsWithOrganizations: {
        parameters: {
            query?: {
                /** @description Send `true` to add each client's plan consumption. It costs several aggregations per client, so leave it off for a picker. */
                getUse?: boolean;
                /** @description Clients per page */
                limit?: number;
                /** @description Organizations per page inside each client */
                limitOrganizations?: number;
                /** @description Clients to skip */
                offset?: number;
                /** @description Organizations to skip inside each client */
                offsetOrganizations?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Clients, each with its organizations */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        clients: (components["schemas"]["ClientsClient"] & {
                            organizations: components["schemas"]["Organization"][];
                            /** @description Organizations this client has, ignoring the pagination. */
                            total: number;
                        })[];
                        /** @description Clients the caller can see. */
                        total: number;
                    };
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `521` | Invalid client. The identifier is invalid or doesn't exist |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getClientPermissions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientsRolesClientPermissionsOne"];
                };
            };
            /** @description Error. Classify by `code` in the body, never by the HTTP status: every domain error travels with HTTP 400. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getClient: {
        parameters: {
            query?: {
                /** @description Boolean determine if the server will response with the actual use of each client */
                getUse?: boolean;
            };
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientsClientOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updateClient: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /**
                     * @description Type of client.
                     * @enum {string}
                     */
                    client_type?: "personal" | "professional" | "enterprise" | "agency";
                    /** @description Client name. */
                    name?: string;
                };
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientsClientOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updateAiSettings: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: string;
            };
            cookie?: never;
        };
        /** @description AI provider configuration keyed by scope */
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClientsAiSettings"];
            };
        };
        responses: {
            /** @description Successful operation. Returns the client with the sanitized ai_settings (no API keys). */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientsClientOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `2104` | Invalid AI provider, scope or model. Returned when the scope is unknown, the provider is not in the catalogue, the provider does not support the scope's capability, or model/api_key are missing. |
             *     | `521` | Invalid client. The identifier is invalid or doesn't exist |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getClientApps: {
        parameters: {
            query?: {
                /** @description Records per page (pagination) */
                limit?: components["parameters"]["Appslimit"];
                /** @description Records to skip (pagination) */
                offset?: components["parameters"]["Appsoffset"];
            };
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: components["parameters"]["AppsidClient"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Apps */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        client_apps: components["schemas"]["AppsClientApp"][];
                        total: number;
                    };
                };
            };
            400: components["responses"]["AppsError"];
        };
    };
    createClientApp: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: components["parameters"]["AppsidClient"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AppsClientAppInput"];
            };
        };
        responses: {
            /** @description The created app */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        client_app: components["schemas"]["AppsClientApp"];
                    };
                };
            };
            400: components["responses"]["AppsError"];
        };
    };
    getClientApp: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description App identifier */
                id_app: components["parameters"]["AppsidApp"];
                /** @description Client identifier */
                id_client: components["parameters"]["AppsidClient"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The app */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        client_app: components["schemas"]["AppsClientApp"];
                    };
                };
            };
            400: components["responses"]["AppsError"];
        };
    };
    updateClientApp: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description App identifier */
                id_app: components["parameters"]["AppsidApp"];
                /** @description Client identifier */
                id_client: components["parameters"]["AppsidClient"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AppsClientAppInput"];
            };
        };
        responses: {
            /** @description The updated app */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        client_app: components["schemas"]["AppsClientApp"];
                    };
                };
            };
            400: components["responses"]["AppsError"];
        };
    };
    deleteClientApp: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description App identifier */
                id_app: components["parameters"]["AppsidApp"];
                /** @description Client identifier */
                id_client: components["parameters"]["AppsidClient"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            400: components["responses"]["AppsError"];
        };
    };
    getClientAppSecret: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description App identifier */
                id_app: components["parameters"]["AppsidApp"];
                /** @description Client identifier */
                id_client: components["parameters"]["AppsidClient"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The secret */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        secret: string;
                    };
                };
            };
            400: components["responses"]["AppsError"];
        };
    };
    regenerateClientAppSecret: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description App identifier */
                id_app: components["parameters"]["AppsidApp"];
                /** @description Client identifier */
                id_client: components["parameters"]["AppsidClient"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The new secret */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        secret: string;
                    };
                };
            };
            400: components["responses"]["AppsError"];
        };
    };
    getClientOrganizations: {
        parameters: {
            query?: {
                /** @description Boolean determine if the server will response with the actual use of each client */
                getUse?: boolean;
                /** @description The limit of records will be retrieved (pagination) */
                limit?: number;
                /** @description The limit of records will be retrieved (pagination) */
                name?: string;
                /** @description Number of records from which you will get clients (pagination) */
                offset?: number;
            };
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientsOrganizationList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    addParentOrganization: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Client the organization will belong to */
                id_client: string;
            };
            cookie?: never;
        };
        /** @description Creates a top-level organization for the client. `parent_organization` is ignored: this endpoint always creates a root organization. */
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClientsOrganizationCreate"];
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientsOrganizationOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1400` | Account limit reached for the organization plan |
             *     | `1401` | Publication limit reached for the organization plan |
             *     | `1402` | Users limit reached for the organization plan |
             *     | `1403` | Shared space limit reached for the organization plan |
             *     | `1407` | Twitter credits limit reached for the organization plan. The sum of twitter_credits assigned to the client's organizations cannot exceed the client's plan twitter_credits. |
             *     | `1408` | AI credits limit reached for the organization plan. The sum of ai_credits assigned to the client's organizations cannot exceed the client's plan ai_credits. |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updateParentOrganization: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Client the organization belongs to */
                id_client: string;
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClientsOrganizationUpdate"];
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientsOrganizationOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `1400` | Account limit reached for the organization plan |
             *     | `1401` | Publication limit reached for the organization plan |
             *     | `1402` | Users limit reached for the organization plan |
             *     | `1403` | Shared space limit reached for the organization plan |
             *     | `1407` | Twitter credits limit reached for the organization plan. The sum of twitter_credits assigned to the client's organizations cannot exceed the client's plan twitter_credits. |
             *     | `1408` | AI credits limit reached for the organization plan. The sum of ai_credits assigned to the client's organizations cannot exceed the client's plan ai_credits. |
             *     | `1301` | Client plan invalid. Min accounts must be X |
             *     | `1302` | Client plan invalid. Min publications must be X |
             *     | `1303` | Client plan invalid. Min users must be at least X |
             *     | `1306` | Client plan invalid. Min shared space must be at least X |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    deleteClientOrganization: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: string;
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAiPlans: {
        parameters: {
            query?: {
                /** @description `true` returns the archived plans instead of the active ones. Anything other than the literal string `true` is read as false. */
                archived?: boolean;
                /** @description Maximum number of records to return (pagination) */
                limit?: number;
                /** @description Number of records to skip (pagination) */
                offset?: number;
            };
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: components["parameters"]["AiPlansidClient"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["AiPlansidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AiPlansAiPlanList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `521` | Invalid client. The identifier is invalid or doesn't exist |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    addAiPlan: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: components["parameters"]["AiPlansidClient"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["AiPlansidOrganization"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AiPlansAiPlanCreateRequest"];
            };
        };
        responses: {
            /** @description Plan created and queued. estimated_cost is the deterministic upper bound in AI credits; the actual credits_spent may be lower if the model produces fewer publications/images. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AiPlansAiPlanCreateResponse"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `806` | Invalid upload identifier. One of the gallery_uploads, or one of the `source.images`, does not belong to the organization. |
             *     | `924` | Max publications reached per month. There is no room in the organization's monthly publication limit for the generated posts. |
             *     | `941` | AI credits exhausted for this month. The base cost of the plan exceeds the remaining AI credits. The response data carries { used, limit, cost }. |
             *     | `2101` | This functionality requires a plan with artificial intelligence (available from the basic plan). |
             *     | `2103` | All accounts must belong to the organization. Also when `source.id_account_catalog` is not one of them. |
             *     | `2105` | AI plan requires at least one account. |
             *     | `2106` | Invalid AI plan options (missing prompt, invalid timezone, invalid week_start, invalid max_images or invalid publish_days). Also when an option is not accepted by the chosen template: `shared` on one whose `allows_shared` is false, or `gallery_uploads` on one whose `allows_gallery` is false. |
             *     | `2108` | The selected publish days leave no available slot in the plan week: every slot of the chosen days is already in the past. Pick more days or a later week_start. The response data carries { publish_days, week_start, timezone }. |
             *     | `2111` | Invalid planner template: `template` is not one of the ones published by `GET /planner_templates`. |
             *     | `2112` | Invalid or missing `source` for the chosen template: a field is missing, an id is not valid, there are more units than `max_source_items`, an image has no description, a product is no longer in the catalogue or is out of stock, both `id_account_catalog` and `id_integration_catalog` were sent (the catalogue comes from one of them), or the event date falls before the plan week or more than 60 days after it. `data` says which one and why. |
             *     | `2113` | Could not read the source URL (`from_text`): the download failed, answered something that is not text or HTML, or the page carried no usable text. Paste the article in `source.text` instead. |
             *     | `2114` | The source URL points to a non-public address (`from_text`): loopback, private, link-local or CGNAT. Checked before every redirect and again when the socket opens. |
             *     | `2115` | The selected account has no usable product catalogue (`from_catalog` with `id_account_catalog`): its network has no products, or the catalogue could not be read — expired token, deleted catalogue, missing permission — or came back empty. |
             *     | `2116` | The source has no usable items: no images, no products, or no text at all (neither `url` nor `text`, or a pasted text under 200 characters). |
             *     | `994` | Invalid `options.link` with a network that uses it (`pinterest`) in the plan. `data.reason` is `invalid_url` or `too_long`. |
             *     | `2118` | A Pinterest account of the plan has no valid board in `destinations`. `data.accounts[]` lists every one that fails, as `{ _id, social_network, reason }`, with `reason` `missing`, `invalid_id` or `invalid_section_id`. |
             *     | `2119` | The plan would leave pins without an image: a pin is never text-only. Only checked with Pinterest in the plan and a template that GENERATES images (`from_images` and `from_catalog` bring their own photo). `data.reason` is `images_disabled` (`allow_images: false`), `max_images` (a cap below what is needed) or `credits` (not enough credits for that many images); `data` also carries `{ required, images_target, social_networks }`. The images needed are one per day and per account of a network that requires one — Instagram included, because both networks draw on the same image budget. |
             *     | `2120` | An account of the plan is on a network this template cannot publish to: the networks in the template's `unsupported_networks` (`GET /planner_templates`). Today that is `youtube` on `from_images` and `from_catalog`, whose every publication is the photo of its source, while YouTube only uploads video. Checked before the store is read or a picture downloaded, and `data.accounts[]` lists every account that does not fit, as `{ _id, social_network }`. |
             *     | `2200` | `source.id_integration_catalog` is not an integration of this organization. |
             *     | `2207` | `source.id_integration_catalog` has no product catalogue (a Google Drive or a feed). |
             *     | `2209` | `source.id_integration_catalog` is disabled. |
             *     | `2208`, `2210`-`2214` | The store could not be read. They are the same errors as `GET .../integrations/{id_integration}/products`, and a `2211` (the store rejected its key) also marks the integration until it is reconnected. |
             *     | `521` | Invalid client. The identifier is invalid or doesn't exist |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAiPlan: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description AI plan identifier */
                id_ai_plan: components["parameters"]["AiPlansidAiPlan"];
                /** @description Client identifier */
                id_client: components["parameters"]["AiPlansidClient"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["AiPlansidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AiPlansAiPlanOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `2100` | AI plan doesn't exist. The identifier is invalid or doesn't exist. |
             *     | `521` | Invalid client. The identifier is invalid or doesn't exist |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    deleteAiPlan: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description AI plan identifier */
                id_ai_plan: components["parameters"]["AiPlansidAiPlan"];
                /** @description Client identifier */
                id_client: components["parameters"]["AiPlansidClient"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["AiPlansidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `2100` | AI plan doesn't exist. The identifier is invalid or doesn't exist. |
             *     | `2102` | Invalid AI plan state for this operation. |
             *     | `521` | Invalid client. The identifier is invalid or doesn't exist |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    archiveAiPlan: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description AI plan identifier */
                id_ai_plan: components["parameters"]["AiPlansidAiPlan"];
                /** @description Client identifier */
                id_client: components["parameters"]["AiPlansidClient"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["AiPlansidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation. Returns the plan with `archived_date` set. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AiPlansAiPlanOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `2100` | AI plan doesn't exist. The identifier is invalid or doesn't exist. |
             *     | `521` | Invalid client. The identifier is invalid or doesn't exist |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    regenerateAiPlanPublication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description AI plan identifier */
                id_ai_plan: string;
                /** @description Client identifier */
                id_client: string;
                /** @description Organization identifier */
                id_organization: string;
                /** @description Identifier of the plan's publication to regenerate */
                id_publication: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /**
                     * @description What to regenerate. `image` needs the plan to have been created with images allowed.
                     * @enum {string}
                     */
                    target: "text" | "image";
                };
            };
        };
        responses: {
            /** @description The regenerated publication and what the plan has spent so far */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description AI credits this plan has spent in total, this regeneration included. */
                        credits_spent: number;
                        publication: components["schemas"]["Publication"];
                    };
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `2102` | The plan is not under review (only a `generated` plan can be regenerated), or this plan template does not allow regenerating that target — read `regenerate` in `GET /planner_templates` |
             *     | `2106` | Invalid `target`: it has to be `text` or `image` |
             *     | `935` | That publication does not belong to this plan, or is no longer a draft |
             *     | `941` | AI credits exhausted for this month |
             *     | `2101` | This functionality requires a plan with artificial intelligence |
             *     | `521` | Invalid client. The identifier is invalid or doesn't exist |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    retryAiPlan: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description AI plan identifier */
                id_ai_plan: components["parameters"]["AiPlansidAiPlan"];
                /** @description Client identifier */
                id_client: components["parameters"]["AiPlansidClient"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["AiPlansidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation. Returns the plan back in state 'pending'. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AiPlansAiPlanOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `2100` | AI plan doesn't exist. The identifier is invalid or doesn't exist. |
             *     | `2102` | Invalid AI plan state for this operation. Only a plan in state 'failed' can be retried. |
             *     | `521` | Invalid client. The identifier is invalid or doesn't exist |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    unarchiveAiPlan: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description AI plan identifier */
                id_ai_plan: components["parameters"]["AiPlansidAiPlan"];
                /** @description Client identifier */
                id_client: components["parameters"]["AiPlansidClient"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["AiPlansidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation. Returns the plan without `archived_date`. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AiPlansAiPlanOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `2100` | AI plan doesn't exist. The identifier is invalid or doesn't exist. |
             *     | `521` | Invalid client. The identifier is invalid or doesn't exist |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    validateAiPlan: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description AI plan identifier */
                id_ai_plan: components["parameters"]["AiPlansidAiPlan"];
                /** @description Client identifier */
                id_client: components["parameters"]["AiPlansidClient"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["AiPlansidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation. Returns the plan (state validated) with its publications populated. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AiPlansAiPlanOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `2100` | AI plan doesn't exist. The identifier is invalid or doesn't exist. |
             *     | `2102` | Invalid AI plan state for this operation. Only a plan in state 'generated' can be validated. |
             *     | `521` | Invalid client. The identifier is invalid or doesn't exist |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAiPlanResultsService: {
        parameters: {
            query?: {
                /** @description Start of the range, ISO 8601. Defaults to 30 days before `to_date`. A range longer than 366 days answers error 1003. */
                from_date?: components["parameters"]["AiPlansfromDate"];
                /** @description Plans per page. At most 100. */
                limit?: number;
                /** @description Number of plans to skip (pagination) */
                offset?: number;
                /** @description Recompute every plan with **only** its publications on these networks, which is what makes plans on different networks comparable. Repeat the parameter for several. `credits_per_engagement` disappears with this filter. */
                social_network?: components["schemas"]["SocialNetwork"][];
                /** @description Order of the plans. Each one has its natural direction — `credits_per_engagement` cheapest first, `week_start` newest first, everything else highest first — and plans without that value go last. */
                sort?: "engagement_per_publication" | "engagement" | "impressions" | "reach" | "credits_per_engagement" | "credits_spent" | "week_start";
                /** @description Only plans generated from this template. An unknown one answers error 2111. */
                template?: "standard" | "from_images" | "from_text" | "from_catalog" | "campaign";
                /** @description End of the range, ISO 8601. Defaults to now. */
                to_date?: components["parameters"]["AiPlanstoDate"];
            };
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: components["parameters"]["AiPlansidClient"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["AiPlansidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AiPlansAiPlanResults"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1000` | Invalid `from_date`, or an unknown `sort` or `social_network` (`data.allowed` lists the valid values) |
             *     | `1001` | Invalid `to_date` |
             *     | `1003` | Range longer than 366 days |
             *     | `2111` | Unknown `template` |
             *     | `1101` | Invalid organization |
             *     | `521` | Invalid client. The identifier is invalid or doesn't exist |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getClientRoles: {
        parameters: {
            query?: {
                /** @description The limit of records will be retrieved (pagination) */
                limit?: number;
                /** @description Number of records from which you will get roles (pagination) */
                offset?: number;
            };
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientsRolesRoleList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    createClientRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Client the role belongs to */
                id_client: string;
            };
            cookie?: never;
        };
        /** @description Creates a client-level role. Valid values for `permissions` are the client permissions listed in the schema. */
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClientsRolesRoleInput"];
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientsRolesRoleOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updateClientRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Client the role belongs to */
                id_client: string;
                /** @description Role identifier */
                id_rol: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClientsRolesRoleInput"];
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientsRolesRoleOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1203` | Invalid client role |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    deleteRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: string;
                /** @description Rol identifier */
                id_rol: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1203` | Invalid client role |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    inviteRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Client the role belongs to */
                id_client: string;
                /** @description Role the invited user will be assigned */
                id_rol: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /**
                     * Format: email
                     * @description Email address to invite. Returns error 609 if it is not a valid address. If no user exists with that address, a disabled one is created and an invitation email is sent with a temporary token; the account is enabled when the invitation is accepted.
                     */
                    email: string;
                };
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1203` | Invalid client role |
             *     | `609` | Invalid email |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             *     | `508` | Error sending the invitation |
             *     | `509` | User already invited to the rol |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getUsersInClientRole: {
        parameters: {
            query?: {
                /** @description The limit of records will be retrieved (pagination) */
                limit?: number;
                /** @description Number of records from which you will get users (pagination) */
                offset?: number;
            };
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: string;
                /** @description Rol identifier */
                id_rol: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientsRolesUserList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1203` | Invalid client role |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    addUserRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: string;
                /** @description Rol identifier */
                id_rol: string;
                /** @description User identifier */
                id_user: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1203` | Invalid client role |
             *     | `605` | User id invalid |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    removeUserRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: string;
                /** @description Rol identifier */
                id_rol: string;
                /** @description User identifier */
                id_user: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1203` | Invalid client role |
             *     | `605` | User id invalid |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getClientUsers: {
        parameters: {
            query?: {
                /** @description The limit of records will be retrieved (pagination) */
                limit?: number;
                /** @description Number of records from which you will get users (pagination) */
                offset?: number;
            };
            header?: never;
            path: {
                /** @description Client identifier */
                id_client: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientsRolesUserList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `521` | Invalid client. The identifier is invalid o doesn't exists |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getIntegrationProviders: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        providers: components["schemas"]["IntegrationsIntegrationProvider"][];
                    };
                };
            };
            /** @description Error. Classify by `code` in the body, never by the HTTP status: every domain error travels with HTTP 400. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    issueToken: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AppsTokenRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["AppsTokenRequest"];
            };
        };
        responses: {
            /** @description The access token. The response is never cached (`Cache-Control: no-store`). */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppsTokenResponse"];
                };
            };
            /** @description `invalid_request` when `client_id` or `client_secret` is missing, `unsupported_grant_type` when `grant_type` is not `client_credentials`. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppsOAuthError"];
                };
            };
            /** @description `invalid_client`: the credentials are not valid, or the app no longer exists. **The message does not say which**, on purpose — telling the two apart is exactly what somebody enumerating clients wants to know. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppsOAuthError"];
                };
            };
            /** @description `slow_down`: too many attempts, or too many failures. The `Retry-After` header says how many seconds to wait. */
            429: {
                headers: {
                    /** @description Seconds to wait before trying again. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AppsOAuthError"];
                };
            };
        };
    };
    getOrganizationPermissions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationsRolesPermissionList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `501` | Invalid authorization token |
             *     | `518` | User or application deleted |
             *     | `522` | Invalid token: expired |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Insufficient permissions. The body carries error code `520` with the permissions that were required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server (PlanVortex error code `500`). */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getOrganization: {
        parameters: {
            query?: {
                /** @description Determine if the query will return the actual use of the organization plan */
                getUse?: boolean;
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationsOrganizationOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updateOrganizationInsideOrganization: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OrganizationsOrganizationUpdate"];
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationsOrganizationOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    deleteChildOrganization: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    connectAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
                /** @description The network being connected. */
                social_network: components["schemas"]["SocialNetwork"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The result of the connection. **Read `errorCode` before trusting `accounts`.** */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description The accounts that were connected. Can be empty when the authorization produced nothing usable. */
                        accounts?: components["schemas"]["Account"][];
                        /** @description PlanVortex error code as a string, or an empty string when it all went well. **It travels in a 200.** */
                        errorCode?: string;
                        /** @description The matching message, or an empty string. */
                        errorMsg?: string;
                        /** @description Where to send the user next. Only present when the call was made with a temporal connect token that carried one. */
                        redirect_uri?: string;
                    };
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `519` | This endpoint does not accept app credentials |
             *     | `543` | This temporal connect token has already connected an account. Issue a new one |
             *     | `544` | This temporal connect token was issued for a different social network |
             *     | `700` | The connection cannot be completed through this endpoint. It is what `telegram` always answers here: that network's accounts are created from the bot being added to a channel, never from a call of yours |
             *     | `1101` | Invalid organization, or a temporal token for a different one |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAccountList: {
        parameters: {
            query?: {
                /** @description Only these accounts, by identifier. Repeat the parameter for more than one. */
                accounts?: string[];
                /** @description Only accounts whose network can do this. It is the same matrix `GET /social_capabilities` publishes, applied server-side: the way to ask for 'the accounts I can publish with' without keeping your own table of which network does what. */
                capability?: "publications" | "messages" | "products" | "webhooks" | "persistent_menu" | "comments";
                /** @description The limit of records will be retrieved (pagination) */
                limit?: number;
                /** @description Free-text search over the account's name and username. */
                name?: string;
                /** @description Number of records from which you will get roles (pagination) */
                offset?: number;
                /** @description Only accounts of these networks. Repeat the parameter for more than one. */
                social_network?: components["schemas"]["SocialNetwork"][];
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountsAccountList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Account identifier */
                id_account: string;
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountsAccountOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `701` | Account doesn't exists or invalid |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updateAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Connected social account identifier */
                id_account: string;
                /** @description Organization the account belongs to */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Display name for the connected account inside PlanVortex. It does not rename anything on the social network. If omitted, the current name is kept. */
                    name?: string;
                };
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountsAccountOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `701` | IAccount doesn't exists or invalid |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    deleteAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Account identifier */
                id_account: string;
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `701` | Account doesn't exists or invalid |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAccountComments: {
        parameters: {
            query?: {
                /** @description How many to read from the network. **On X it is capped** regardless of what you send: a page there is a spending ceiling, not a pagination preference. */
                limit?: components["parameters"]["CommentsthreadLimit"];
                /** @description Page cursor. Pass back the `next_cursor` of the previous response — it is an opaque token from the network, not a numeric offset. */
                offset?: components["parameters"]["CommentsthreadOffset"];
            };
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: components["parameters"]["CommentsidAccount"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["CommentsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CommentsCommentThread"];
                };
            };
            400: components["responses"]["CommentsCommentError"];
        };
    };
    getConversations: {
        parameters: {
            query?: {
                /** @description Records per page (pagination) */
                limit?: components["parameters"]["Messageslimit"];
                /** @description Records to skip (pagination) */
                offset?: components["parameters"]["Messagesoffset"];
            };
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: components["parameters"]["MessagesidAccount"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["MessagesidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Conversations */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        conversations: components["schemas"]["MessagesConversation"][];
                        /** @description Conversations this account has in total, ignoring the pagination. */
                        total: number;
                    };
                };
            };
            400: components["responses"]["MessagesError"];
        };
    };
    getAccountConversationsTotal: {
        parameters: {
            query?: {
                /** @description Start of the range, ISO 8601. Defaults to the start of the current month. */
                from_date?: components["parameters"]["MessagesfromDate"];
                /** @description Group the count into a series. Omit it and the answer is a single `total` instead. */
                group_by?: components["parameters"]["MessagesgroupBy"];
                /** @description End of the range, ISO 8601. Defaults to the end of the current month. */
                to_date?: components["parameters"]["MessagestoDate"];
            };
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: components["parameters"]["MessagesidAccount"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["MessagesidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Conversation counts */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessagesConversationTotals"];
                };
            };
            400: components["responses"]["MessagesError"];
        };
    };
    getAccountDestinations: {
        parameters: {
            query?: {
                /** @description `true` skips the short cache and asks the network again. For a board that was created a moment ago — not on every call: all of PlanVortex's Pinterest traffic leaves through one application, and the cache is what keeps a picker that opens on every compose from spending it. */
                refresh?: "true" | "false";
            };
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: string;
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The account's destinations */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "destinations": [
                     *         {
                     *           "id": "1093847562910384756",
                     *           "name": "Recipes",
                     *           "privacy": "PUBLIC",
                     *           "image": "https://i.pinimg.com/…/board.jpg"
                     *         },
                     *         {
                     *           "id": "1093847562910384799",
                     *           "name": "Drafts",
                     *           "privacy": "SECRET"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": {
                        destinations: components["schemas"]["PublicationsDestination"][];
                    };
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `992` | This network has no destinations: the account itself is where publications go. `data` carries `social_network` |
             *     | `701` | Account not found in this organization |
             *     | `700` | Account not connected, missing authorization tokens |
             *     | `1101` | Invalid organization |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Pinterest is rate limiting, and the request was correct: wait and repeat it. `code` is 991 and `data.retry_after_seconds` says how long. The ceiling is the **application's**, shared by every PlanVortex client on the network, so this is not a sign that the account is broken. */
            429: {
                headers: {
                    /** @description Seconds to wait before trying again. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAccountDestination: {
        parameters: {
            query?: {
                /** @description `true` skips the short cache and asks the network again. For a board that was created a moment ago — not on every call: all of PlanVortex's Pinterest traffic leaves through one application, and the cache is what keeps a picker that opens on every compose from spending it. */
                refresh?: "true" | "false";
            };
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: string;
                /** @description The destination's id **on the network** — the `id` of an entry in the listing, not a PlanVortex identifier. */
                id_destination: string;
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The destination */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "destination": {
                     *         "id": "1093847562910384756",
                     *         "name": "Recipes",
                     *         "privacy": "PUBLIC",
                     *         "sections": [
                     *           {
                     *             "id": "5039281746501928374",
                     *             "name": "Desserts"
                     *           },
                     *           {
                     *             "id": "5039281746501928375",
                     *             "name": "Breakfast"
                     *           }
                     *         ]
                     *       }
                     *     }
                     */
                    "application/json": {
                        destination: components["schemas"]["PublicationsDestination"];
                    };
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `993` | That destination is not in this account. `data` carries `social_network` and `destination_id` |
             *     | `992` | This network has no destinations: the account itself is where publications go |
             *     | `701` | Account not found in this organization |
             *     | `700` | Account not connected, missing authorization tokens |
             *     | `1101` | Invalid organization |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Pinterest is rate limiting, and the request was correct: wait and repeat it. `code` is 991 and `data.retry_after_seconds` says how long. The ceiling is the **application's**, shared by every PlanVortex client on the network, so this is not a sign that the account is broken. */
            429: {
                headers: {
                    /** @description Seconds to wait before trying again. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    enableAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: string;
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Enabled. When the call came from a temporal connect token with a `redirect_uri`, the answer is that URL instead of `{success: true}`. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        redirect_uri?: string;
                        success?: boolean;
                    };
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `700` | The account has no usable token: it has to be connected again |
             *     | `706` | The organization has no account slots left in its plan |
             *     | `519` | This endpoint does not accept app credentials |
             *     | `544` | This temporal connect token was issued for a different social network |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getMessageTemplates: {
        parameters: {
            query?: {
                /** @description Records per page (pagination) */
                limit?: components["parameters"]["Messageslimit"];
                /** @description Records to skip (pagination) */
                offset?: components["parameters"]["Messagesoffset"];
            };
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: components["parameters"]["MessagesidAccount"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["MessagesidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Templates */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Templates as the network returns them. */
                        templates: {
                            [key: string]: unknown;
                        }[];
                        total: number;
                    };
                };
            };
            400: components["responses"]["MessagesError"];
        };
    };
    createMessageTemplate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: components["parameters"]["MessagesidAccount"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["MessagesidOrganization"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    [key: string]: unknown;
                };
            };
        };
        responses: {
            /** @description The created template */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        template: {
                            [key: string]: unknown;
                        };
                    };
                };
            };
            400: components["responses"]["MessagesError"];
        };
    };
    deleteMessageTemplate: {
        parameters: {
            query: {
                /** @description Identifier of the template on the network. */
                template_id: string;
                /** @description Name of the template on the network. */
                template_name: string;
            };
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: components["parameters"]["MessagesidAccount"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["MessagesidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            400: components["responses"]["MessagesError"];
        };
    };
    deleteMessagesByAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: components["parameters"]["MessagesidAccount"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["MessagesidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            400: components["responses"]["MessagesError"];
        };
    };
    getMessages: {
        parameters: {
            query?: {
                /** @description Records per page (pagination) */
                limit?: components["parameters"]["Messageslimit"];
                /** @description Records to skip (pagination) */
                offset?: components["parameters"]["Messagesoffset"];
            };
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: components["parameters"]["MessagesidAccount"];
                /** @description Contact identifier */
                id_contact: components["parameters"]["MessagesidContact"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["MessagesidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Messages */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        messages: components["schemas"]["Message"][];
                        total: number;
                    };
                };
            };
            400: components["responses"]["MessagesError"];
        };
    };
    createMessage: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: components["parameters"]["MessagesidAccount"];
                /** @description Contact identifier */
                id_contact: components["parameters"]["MessagesidContact"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["MessagesidOrganization"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MessagesMessageInput"];
            };
        };
        responses: {
            /** @description The message that was sent */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: components["schemas"]["Message"];
                    };
                };
            };
            400: components["responses"]["MessagesError"];
        };
    };
    getMetricList: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Account identifier */
                id_account: string;
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountsMetricList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `701` | Account doesn't exists or invalid |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAccountStats: {
        parameters: {
            query?: {
                /** @description Start of the range. Defaults to a day before `to_date`. */
                from_date?: string;
                /** @description Only these metrics, by their RAW name — the ones `GET .../metric_list` returns. Repeat the parameter for more than one. Without it, every measured metric comes back. */
                names?: string[];
                /** @description End of the range. Defaults to now. */
                to_date?: string;
            };
            header?: never;
            path: {
                /** @description Account identifier */
                id_account: string;
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountsMetricModel"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `701` | Account doesn't exists or invalid |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getPersistentMenu: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: string;
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The menu */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        persistent_menu?: components["schemas"]["AccountsPersistentMenu"];
                    };
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `710` | This network has no persistent menu |
             *     | `1101` | Invalid organization |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    setPersistentMenu: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: string;
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    persistent_menu?: components["schemas"]["AccountsPersistentMenu"];
                };
            };
        };
        responses: {
            /** @description The menu as the network stored it */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        persistent_menu?: components["schemas"]["AccountsPersistentMenu"];
                    };
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `710` | This network has no persistent menu |
             *     | `1101` | Invalid organization |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getProducts: {
        parameters: {
            query?: {
                /** @description Records per page (pagination) */
                limit?: components["parameters"]["Productslimit"];
                /** @description Records to skip (pagination) */
                offset?: components["parameters"]["Productsoffset"];
                /** @description The catalogue to list. **Effectively required**: without it the request fails with `ERROR_CODE_2000`. Get one from `GET .../products_catalogs`. */
                product_catalog_id?: string;
                /**
                 * @description One product, by its identifier on the network. It takes precedence over `product_catalog_id`, and one of the two has to travel or the call answers `ERROR_CODE_2000`. It used to be forwarded under a name the SDK does not read, so it never reached the network; that was fixed on 2026-08-24.
                 *
                 *     **The answer is shaped differently.** Asking for one product goes to that product's node, so the network answers with the product itself and `items` carries an object rather than an array. Handle both shapes, or use `product_catalog_id` and pick the product out of the page.
                 */
                product_id?: string;
            };
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: components["parameters"]["ProductsidAccount"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["ProductsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Products */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: components["schemas"]["ProductsProduct"][];
                        /** @description **Always 0 today.** It is read from Meta's `summary.total_count`, and PlanVortex does not ask for the summary, so the field never arrives. Page until you get a short page instead of trusting this number. */
                        total: number;
                    };
                };
            };
            400: components["responses"]["ProductsError"];
        };
    };
    createProduct: {
        parameters: {
            query?: {
                /** @description Catalogue the product is created in. Required unless the body carries an `id`. */
                product_catalog_id?: string;
            };
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: components["parameters"]["ProductsidAccount"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["ProductsidOrganization"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductsProductInput"];
            };
        };
        responses: {
            /** @description Identifier of the created or updated product */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        product_id: string;
                    };
                };
            };
            400: components["responses"]["ProductsError"];
        };
    };
    getProductCatalogs: {
        parameters: {
            query?: {
                /** @description Records per page (pagination) */
                limit?: components["parameters"]["Productslimit"];
                /** @description Records to skip (pagination) */
                offset?: components["parameters"]["Productsoffset"];
            };
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: components["parameters"]["ProductsidAccount"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["ProductsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Catalogues */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: components["schemas"]["ProductsProductCatalog"][];
                        /** @description How many catalogues came back **in this page**, not how many exist. It is the length of `items`, so it can never tell you there is another page. */
                        total: number;
                    };
                };
            };
            400: components["responses"]["ProductsError"];
        };
    };
    createProductCatalog: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: components["parameters"]["ProductsidAccount"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["ProductsidOrganization"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductsProductCatalogInput"];
            };
        };
        responses: {
            /** @description Identifier of the created catalogue */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Identifier of the catalogue on the network. **A string, not the catalogue**: the name says otherwise and it is the id. Read it back with `GET .../products_catalogs` if you need the rest. */
                        product_catalog: string;
                    };
                };
            };
            400: components["responses"]["ProductsError"];
        };
    };
    getAccountPublications: {
        parameters: {
            query?: {
                /** @description Retrieve publications based on a list of identifier accounts */
                accounts?: string[];
                /** @description Date from which records will be returned */
                from_date?: string;
                /** @description The limit of records will be retrieved (pagination) */
                limit?: number;
                /** @description Number of records from which you will get publications (pagination) */
                offset?: number;
                /** @description Determine if the results will be ordered by publication_date instead of creation_date */
                orderByPublish?: boolean;
                /** @description String used to search results */
                search?: string;
                /** @description Only publications of these networks. Repeat the parameter for more than one. */
                social_network?: components["schemas"]["SocialNetwork"][];
                /** @description Retrieve publications based on a list of states */
                state?: ("ready" | "withErrors" | "sended" | "draft" | "publishing")[];
                /** @description Date until which records will be returned */
                to_date?: string;
            };
            header?: never;
            path: {
                /** @description Account identifier */
                id_account: string;
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationsPublicationList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    addPublication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Connected social account the publication will be published to */
                id_account: string;
                /** @description Organization the publication belongs to */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublicationsPublicationInput"] & unknown;
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationsPublicationOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `924` | Max publication reached per month |
             *     | `918` | Publications must be attached to an account. Missing property: id_account |
             *     | `913` | Invalid publication type |
             *     | `914` | Invalid publication state |
             *     | `923` | Social network doesn't allow this publication type |
             *     | `700` | Account not connected, missing authorizations tokens |
             *     | `915` | You should write a text or, at least, upload some image or video |
             *     | `940` | X (Twitter) credits exhausted. Not enough monthly credits to publish this tweet. Response data: { used, limit }. |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updatePublicationByAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: string;
                /** @description Organization identifier */
                id_organization: string;
                /** @description Publication identifier */
                id_publication: string;
            };
            cookie?: never;
        };
        /** @description Only the properties you send are updated; the rest keep their current value. `social_network` is already set on the publication, so it is optional here. */
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublicationsPublicationInput"];
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationsPublicationOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `917` | Publication doesn't exists |
             *     | `935` | Invalid publication |
             *     | `921` | Can't update a publication already sended |
             *     | `940` | X (Twitter) credits exhausted. Not enough monthly credits to publish this tweet (same link detection and 15/200 tariff as on create). Response data: { used, limit }. |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getSocialPublications: {
        parameters: {
            query?: {
                /** @description Records per page. On X this is also the ceiling of what the call can cost. */
                limit?: number;
                /** @description Records to skip (pagination) */
                offset?: number;
            };
            header?: never;
            path: {
                /** @description Connected account identifier */
                id_account: string;
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The timeline */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        publications: components["schemas"]["Publication"][];
                        total: number;
                    };
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1305` | The client has no X credits left |
             *     | `1405` | The organization has no X credits left |
             *     | `1101` | Invalid organization |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updateOrganizationAiContext: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AiContext"];
            };
        };
        responses: {
            /** @description The organization with its new context */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationsOrganizationOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getComments: {
        parameters: {
            query?: {
                /** @description Only comments on this connected account */
                id_account?: string;
                /** @description Only comments on this publication of yours. Reviews never match it: a review hangs off the listing and has no publication. */
                id_publication?: string;
                limit?: number;
                offset?: number;
                /**
                 * @description Only comments with these star ratings. **Repeat the parameter** for several (`?rating=1&rating=2`), which is the usual way to work a listing: show me the one- and two-star reviews first.
                 *
                 *     Only review networks carry a rating, so this filter leaves everything else out — it is not a way to select "comments without a rating".
                 */
                rating?: number[];
                /** @description Case-insensitive substring match on the comment text */
                search?: string;
                /** @description Filter by network. **Repeat the parameter** for several (`?social_network=youtube&social_network=instagram`); a comma-separated string is read as one network name and silently matches nothing. */
                social_network?: components["schemas"]["CommentsCommentNetworkName"][];
                /** @description Only unread ones. Any value other than the literal `false` turns the filter on. */
                unread?: boolean;
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["CommentsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        comments: components["schemas"]["CommentsComment"][];
                        /** @description Rows matching the filters, not rows returned */
                        total: number;
                    };
                };
            };
            400: components["responses"]["CommentsCommentError"];
        };
    };
    updateComment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Comment identifier (PlanVortex's `_id`, not the network's `external_id`) */
                id_comment: components["parameters"]["CommentsidComment"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["CommentsidOrganization"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Hide or show it **on the social network**. Only the literal `true` hides. */
                    hidden?: boolean;
                    /** @description Your own state. Only the literal `true` marks it read. */
                    read?: boolean;
                };
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        comment: components["schemas"]["CommentsComment"];
                    };
                };
            };
            400: components["responses"]["CommentsCommentError"];
        };
    };
    deleteComment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Comment identifier (PlanVortex's `_id`, not the network's `external_id`) */
                id_comment: components["parameters"]["CommentsidComment"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["CommentsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted on the network */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        success: boolean;
                    };
                };
            };
            400: components["responses"]["CommentsCommentError"];
        };
    };
    getCommentReplies: {
        parameters: {
            query?: {
                /** @description How many to read from the network. **On X it is capped** regardless of what you send: a page there is a spending ceiling, not a pagination preference. */
                limit?: components["parameters"]["CommentsthreadLimit"];
                /** @description Page cursor. Pass back the `next_cursor` of the previous response — it is an opaque token from the network, not a numeric offset. */
                offset?: components["parameters"]["CommentsthreadOffset"];
            };
            header?: never;
            path: {
                /** @description Comment identifier (PlanVortex's `_id`, not the network's `external_id`) */
                id_comment: components["parameters"]["CommentsidComment"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["CommentsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CommentsCommentThread"];
                };
            };
            400: components["responses"]["CommentsCommentError"];
        };
    };
    replyComment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Comment identifier (PlanVortex's `_id`, not the network's `external_id`) */
                id_comment: components["parameters"]["CommentsidComment"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["CommentsidOrganization"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description The public reply. Must not be empty and must fit the network's `comment_characters` limit. */
                    text: string;
                };
            };
        };
        responses: {
            /** @description Reply published */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        comment: components["schemas"]["CommentsComment"];
                        /** @description X credits this reply spent. `0` on every other network. */
                        credits_consumed: number;
                        /** @description Your reply as it was stored. **It can arrive without `_id`**: the reply is published on the network first and stored afterwards, and storing it is deliberately not allowed to fail the request — the network already published it. When that write fails you get what the network returned, which has no PlanVortex identifier. `comment.our_reply_external_id` is the field that always identifies it. */
                        reply: components["schemas"]["CommentsComment"];
                    };
                };
            };
            400: components["responses"]["CommentsCommentError"];
        };
    };
    getConnectLinks: {
        parameters: {
            query?: {
                /** @description Which PlanVortex front the network sends the user back to, for a white-labelled deployment. It has to be one of the fronts the server has registered (`FRONT_URL_REDIRECT`) or the call answers error 532 — it is **not** your app's `redirect_urls`, and it cannot be a URL of yours: the networks only accept redirect URIs registered in their own app settings. Where your user goes once they have finished is the `redirect_uri` of `GET /organizations/{id_organization}/temporal_connect_token`. */
                redirect_uri?: string;
                /** @description Only these networks. Repeat the parameter for several. Omit it and every connectable network comes back. */
                social_network?: components["schemas"]["SocialNetwork"][];
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountsSocialLinksList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `523` | Invalid application |
             *     | `532` | `redirect_uri` is not one of the fronts registered on the server |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getContacts: {
        parameters: {
            query?: {
                /** @description Filter by your own fields, as `key`/`value` pairs. A `value` that is an array matches any of its entries. */
                extra_data?: {
                    key?: string;
                    /** @description A string, a number, or an array of either. */
                    value?: unknown;
                }[];
                /** @description Records per page (pagination) */
                limit?: components["parameters"]["Contactslimit"];
                /** @description Records to skip (pagination) */
                offset?: components["parameters"]["Contactsoffset"];
                /** @description Full-text search over the contact's name. */
                search?: string;
                /** @description Only the contacts reachable on this network. It matches on `social_identifiers[].social_network`, so a contact with several channels comes back through any of them. It used to return an empty list always, because the server compared the whole array of objects against the network name; that was fixed on 2026-08-24. */
                social_network?: components["schemas"]["SocialNetwork"];
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["ContactsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Contacts */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        contacts: components["schemas"]["Contact"][];
                        total: number;
                    };
                };
            };
            400: components["responses"]["ContactsError"];
        };
    };
    createContact: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["ContactsidOrganization"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ContactsContactCreate"];
            };
        };
        responses: {
            /** @description The created contact */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        contact: components["schemas"]["Contact"];
                    };
                };
            };
            400: components["responses"]["ContactsError"];
        };
    };
    deleteOrganizationContacts: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["ContactsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            400: components["responses"]["ContactsError"];
        };
    };
    getContact: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Contact identifier */
                id_contact: components["parameters"]["ContactsidContact"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["ContactsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The contact */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        contact: components["schemas"]["Contact"];
                    };
                };
            };
            400: components["responses"]["ContactsError"];
        };
    };
    updateContact: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Contact identifier */
                id_contact: components["parameters"]["ContactsidContact"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["ContactsidOrganization"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ContactsContactUpdate"];
            };
        };
        responses: {
            /** @description Updated. **It does not return the contact**: read it again if you need the new state. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            400: components["responses"]["ContactsError"];
        };
    };
    deleteContact: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Contact identifier */
                id_contact: components["parameters"]["ContactsidContact"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["ContactsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            400: components["responses"]["ContactsError"];
        };
    };
    getOrganizationConversationsTotal: {
        parameters: {
            query?: {
                /** @description Start of the range, ISO 8601. Defaults to the start of the current month. */
                from_date?: components["parameters"]["MessagesfromDate"];
                /** @description Group the count into a series. Omit it and the answer is a single `total` instead. */
                group_by?: components["parameters"]["MessagesgroupBy"];
                /** @description End of the range, ISO 8601. Defaults to the end of the current month. */
                to_date?: components["parameters"]["MessagestoDate"];
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["MessagesidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Conversation counts */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessagesConversationTotals"];
                };
            };
            400: components["responses"]["MessagesError"];
        };
    };
    getDashboard: {
        parameters: {
            query?: {
                /** @description Start of the range, ISO 8601. Defaults to 30 days before `to_date`. A range longer than 366 days answers error 1003. */
                from_date?: components["parameters"]["DashboardfromDate"];
                /** @description End of the range, ISO 8601. Defaults to now. */
                to_date?: components["parameters"]["DashboardtoDate"];
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["DashboardidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The dashboard */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardDashboard"];
                };
            };
            400: components["responses"]["DashboardError"];
        };
    };
    getIntegrations: {
        parameters: {
            query?: {
                /** @description How many to return. **Without it there is no limit at all** and the whole list comes back — unlike every other listing in this API, which caps at 10. */
                limit?: number;
                offset?: number;
                /** @description Filter by provider */
                provider?: components["schemas"]["IntegrationsIntegrationProviderName"];
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["IntegrationsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        integrations: components["schemas"]["IntegrationsIntegration"][];
                        total: number;
                    };
                };
            };
            /** @description Error. Classify by `code` in the body, never by the HTTP status: every domain error travels with HTTP 400. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    addIntegration: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["IntegrationsidOrganization"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IntegrationsGoogleDriveConnectRequest"] | components["schemas"]["IntegrationsRssConnectRequest"] | components["schemas"]["IntegrationsWooCommerceConnectRequest"];
            };
        };
        responses: {
            /** @description Integration connected */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        integration: components["schemas"]["IntegrationsIntegration"];
                    };
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1404` | Integrations limit reached for the organization plan. On the free plan the allowance is 0, so this always fires. |
             *     | `2201` | Integration provider not supported (or the payload is missing what that provider needs). |
             *     | `2202` | Integration already connected for this organization and provider. Applies to OAuth providers; the body carries its `id_integration` in `data`, and the `code` you sent is still unused — post it to that integration's `/reconnect` to renew it. |
             *     | `2203` | Integration token expired or revoked, reconnect required. |
             *     | `2205` | Feed URL unreachable or not a valid feed. |
             *     | `2206` | Feed has no target accounts configured. |
             *     | `2210` | The store URL cannot be used. `data.reason`: `invalid_url`, `not_https` (the store only answers on http, and a key never travels in the clear), `non_public_address`, `redirect` (the store redirected a request carrying credentials, which is never followed) or `too_many_redirects`. |
             *     | `2211` | The store rejected the API key: it does not exist, it was deleted in WordPress, the secret does not match, or it has no read permission. `data` carries what the store said. |
             *     | `2212` | A firewall or a security plugin in front of the store answered instead of WooCommerce (an HTML challenge from Cloudflare, Wordfence…). **It is not the keys**: the store's hosting has to let PlanVortex's server through. |
             *     | `2213` | The store could not be reached, timed out or failed on its side (a 5xx). |
             *     | `2214` | There is no WooCommerce REST API at this URL: not a WordPress, WooCommerce not active, or the REST API disabled. |
             *     | `2215` | The keys are missing or do not have WooCommerce's shape: the consumer key starts with `ck_` and the secret with `cs_`. Pasting them the other way round is the usual mistake. |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getIntegration: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Integration identifier */
                id_integration: components["parameters"]["IntegrationsidIntegration"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["IntegrationsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        integration: components["schemas"]["IntegrationsIntegration"];
                    };
                };
            };
            /** @description `2200` Integration not found, or `1102` if it belongs to another organization. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    updateIntegration: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Integration identifier */
                id_integration: components["parameters"]["IntegrationsidIntegration"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["IntegrationsidOrganization"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    config?: components["schemas"]["IntegrationsRssConfig"];
                    enabled?: boolean;
                    name?: string;
                };
            };
        };
        responses: {
            /** @description Integration updated */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        integration: components["schemas"]["IntegrationsIntegration"];
                    };
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `2200` | Integration not found. |
             *     | `2220` | This `config` key cannot be edited on this provider (on WooCommerce, none can): reconnect the integration to change it. `data.keys` lists the ones that were refused. |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    deleteIntegration: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Integration identifier */
                id_integration: components["parameters"]["IntegrationsidIntegration"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["IntegrationsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Integration deleted */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        success: boolean;
                    };
                };
            };
            /** @description Error. Classify by `code` in the body, never by the HTTP status: every domain error travels with HTTP 400. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getIntegrationPickerConfig: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Integration identifier */
                id_integration: components["parameters"]["IntegrationsidIntegration"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["IntegrationsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        access_token: string;
                        /** @description Google Cloud project NUMBER. With scope drive.file the permission over a picked file is granted to the project that picked it, so this must belong to the same project as the OAuth client. */
                        app_id: string;
                        developer_key: string;
                        /** Format: date-time */
                        expires_in: string;
                    };
                };
            };
            /** @description Error. Classify by `code` in the body, never by the HTTP status: every domain error travels with HTTP 400. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getIntegrationProducts: {
        parameters: {
            query?: {
                /** @description The `next_cursor` of the previous page, as it came. Absent = the first page. */
                cursor?: string;
                /** @description Products per page. A value outside 1-100 is clamped, not refused. */
                limit?: number;
                /** @description Text to look for, with the store's own product search. A store's catalogue is not something to walk through 50 at a time. */
                search?: string;
            };
            header?: never;
            path: {
                /** @description Integration identifier */
                id_integration: components["parameters"]["IntegrationsidIntegration"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["IntegrationsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IntegrationsIntegrationCatalogPage"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `2200` | Integration not found (`1102` if it belongs to another organization). |
             *     | `2207` | This integration has no product catalogue (a Google Drive or a feed). |
             *     | `2208` | The catalogue could not be read and the store gave nothing more specific, or `cursor` is not one this API issued. `data.error` carries the cause. |
             *     | `2209` | The integration is disabled. Enable it first: a disabled one does not take allowance, so it cannot be read either. |
             *     | `2210` | The store URL cannot be used. `data.reason`: `invalid_url`, `not_https` (the store only answers on http, and a key never travels in the clear), `non_public_address`, `redirect` (the store redirected a request carrying credentials, which is never followed) or `too_many_redirects`. |
             *     | `2211` | The store rejected the API key: it does not exist, it was deleted in WordPress, the secret does not match, or it has no read permission. `data` carries what the store said. |
             *     | `2212` | A firewall or a security plugin in front of the store answered instead of WooCommerce (an HTML challenge from Cloudflare, Wordfence…). **It is not the keys**: the store's hosting has to let PlanVortex's server through. |
             *     | `2213` | The store could not be reached, timed out or failed on its side (a 5xx). |
             *     | `2214` | There is no WooCommerce REST API at this URL: not a WordPress, WooCommerce not active, or the REST API disabled. |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    reconnectIntegration: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Integration identifier */
                id_integration: components["parameters"]["IntegrationsidIntegration"];
                /** @description Organization identifier */
                id_organization: components["parameters"]["IntegrationsidOrganization"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IntegrationsGoogleDriveConnectRequest"] | components["schemas"]["IntegrationsRssConnectRequest"] | components["schemas"]["IntegrationsWooCommerceConnectRequest"];
            };
        };
        responses: {
            /** @description Integration reconnected */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        integration: components["schemas"]["IntegrationsIntegration"];
                    };
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `2200` | Integration not found. |
             *     | `2201` | The `provider` in the body is not the one of this integration, or the payload is missing what that provider needs. |
             *     | `2203` | The provider refused the new credentials. |
             *     | `2205` | Feed URL unreachable or not a valid feed. |
             *     | `2206` | Feed has no target accounts configured. |
             *     | `2210` | The store URL cannot be used. `data.reason`: `invalid_url`, `not_https` (the store only answers on http, and a key never travels in the clear), `non_public_address`, `redirect` (the store redirected a request carrying credentials, which is never followed) or `too_many_redirects`. |
             *     | `2211` | The store rejected the API key: it does not exist, it was deleted in WordPress, the secret does not match, or it has no read permission. `data` carries what the store said. |
             *     | `2212` | A firewall or a security plugin in front of the store answered instead of WooCommerce (an HTML challenge from Cloudflare, Wordfence…). **It is not the keys**: the store's hosting has to let PlanVortex's server through. |
             *     | `2213` | The store could not be reached, timed out or failed on its side (a 5xx). |
             *     | `2214` | There is no WooCommerce REST API at this URL: not a WordPress, WooCommerce not active, or the REST API disabled. |
             *     | `2215` | The keys are missing or do not have WooCommerce's shape: the consumer key starts with `ck_` and the secret with `cs_`. Pasting them the other way round is the usual mistake. |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getIntegrationConnectLink: {
        parameters: {
            query?: {
                /** @description `woocommerce`: reconnect THIS store with the button instead of connecting a new one. The key is renewed on the same document and no allowance is taken. Requires `integrations:update`. */
                id_integration?: string;
                /** @description Alternative return URL. It must be one of the redirects allowed for the installation, otherwise the request fails with `532`. */
                redirect_uri?: string;
                /** @description `woocommerce`: the store address. Required for that provider, ignored by the rest. */
                url?: string;
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["IntegrationsidOrganization"];
                provider: components["schemas"]["IntegrationsIntegrationProviderName"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example https://accounts.google.com/o/oauth2/v2/auth?response_type=code&... */
                        url: string;
                    };
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1404` | Integrations limit reached for the organization plan. On the free plan the allowance is 0, so this always fires. |
             *     | `2201` | The provider does not connect with a link (`rss`), or `id_integration` is of another provider. |
             *     | `2200` | `id_integration` does not exist (`1102` if it belongs to another organization). |
             *     | `2210` | The store URL cannot be used. `data.reason`: `invalid_url`, `not_https` (the store only answers on http, and a key never travels in the clear), `non_public_address`, `redirect` (the store redirected a request carrying credentials, which is never followed) or `too_many_redirects`. |
             *     | `2212` | A firewall or a security plugin in front of the store answered instead of WooCommerce (an HTML challenge from Cloudflare, Wordfence…). **It is not the keys**: the store's hosting has to let PlanVortex's server through. |
             *     | `2213` | The store could not be reached, timed out or failed on its side (a 5xx). |
             *     | `2214` | There is no WooCommerce REST API at this URL: not a WordPress, WooCommerce not active, or the REST API disabled. |
             *     | `2216` | This store cannot use the approval button: connect it with API keys instead. `data.reason`: `plain_permalinks` (the store uses plain permalinks, and without rewrite rules WooCommerce's approval page does not exist) or `callback_not_https` (this PlanVortex deployment has no public https address for the store to send the key to). |
             *     | `532` | `redirect_uri` is not one of the allowed redirects. |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getOrganizationLimits: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationsLimit"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getOrganizationMetrics: {
        parameters: {
            query?: {
                /** @description Start of the range, ISO 8601. Defaults to 30 days before `to_date`. A range longer than 366 days answers error 1003. */
                from_date?: components["parameters"]["DashboardfromDate"];
                /** @description The axis of the answer. `day` for a series, `network` or `account` for a breakdown, `total` for one number per metric. */
                group_by?: "day" | "network" | "account" | "total";
                /** @description Only these metrics. Repeat the parameter for several. An unknown name answers error 1000 with the list of valid ones. */
                names?: components["schemas"]["DashboardMetricName"][];
                /** @description End of the range, ISO 8601. Defaults to now. */
                to_date?: components["parameters"]["DashboardtoDate"];
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["DashboardidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Metrics */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /**
                         * @description The axis that was applied. Defaults to `day`; anything else is rejected with 1000.
                         * @enum {string}
                         */
                        group_by: "day" | "network" | "account" | "total";
                        range: components["schemas"]["DashboardDashboardRange"];
                        stats: components["schemas"]["DashboardMetricRow"][];
                    };
                };
            };
            400: components["responses"]["DashboardError"];
        };
    };
    getChildOrganizations: {
        parameters: {
            query?: {
                /** @description Boolean determine if the server will response with the actual use of each client */
                getUse?: boolean;
                /** @description The limit of records will be retrieved (pagination) */
                limit?: number;
                /** @description The limit of records will be retrieved (pagination) */
                name?: string;
                /** @description Number of records from which you will get clients (pagination) */
                offset?: number;
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationsOrganizationList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    createOrganizationInsideOrganization: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Parent organization. The new organization hangs from this one */
                id_organization: string;
            };
            cookie?: never;
        };
        /** @description Creates a child organization. `parent_organization` is taken from the path, so sending it in the body has no effect. */
        requestBody: {
            content: {
                "application/json": components["schemas"]["OrganizationsOrganizationCreate"];
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationsOrganizationOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `1107` | Organizations doesn't allow set parent_organization as his own _id |
             *     | `1100` | Max deep of parents allowed |
             *     | `1400` | Account limit reached for the organization plan |
             *     | `1401` | Publication limit reached for the organization plan |
             *     | `1402` | Users limit reached for the organization plan |
             *     | `1403` | Shared space limit reached for the organization plan |
             *     | `1407` | Twitter credits limit reached for the organization plan. The sum of twitter_credits assigned to the client's organizations cannot exceed the client's plan twitter_credits. |
             *     | `1408` | AI credits limit reached for the organization plan. The sum of ai_credits assigned to the client's organizations cannot exceed the client's plan ai_credits. |
             *     | `1301` | Client plan invalid. Min accounts must be X |
             *     | `1302` | Client plan invalid. Min publications must be X |
             *     | `1303` | Client plan invalid. Min users must be at least X |
             *     | `1306` | Client plan invalid. Min shared space must be at least X |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getPublicationsStats: {
        parameters: {
            query?: {
                /** @description Filter the listing by account identifier. Repeat the parameter for several. Does not affect `summary`. */
                accounts?: string[];
                /** @description Start of the range, filtered by publication date. Defaults to 30 days before `to_date`. The range cannot be longer than 366 days. */
                from_date?: string;
                /** @description Publications per page */
                limit?: number;
                /** @description Normalized metric the listing is ordered by, descending. Publications that lack it are not dropped: they sort last. */
                metric?: "impressions" | "reach" | "engagement" | "likes" | "comments" | "shares" | "saves" | "clicks" | "video_views" | "profile_views";
                /** @description Publications to skip */
                offset?: number;
                /** @description Filter the listing by network. Repeat the parameter for several. Does not affect `summary`. */
                social_network?: string[];
                /** @description Set to `false` to skip the aggregates and return only the listing page. They depend on the range alone, so paging with `summary=false` avoids recomputing them. */
                summary?: boolean;
                /** @description End of the range, filtered by publication date. Defaults to now. */
                to_date?: string;
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationsPublicationsStatsList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `1000` | Invalid `from_date` or `metric` |
             *     | `1001` | Invalid `to_date` |
             *     | `1003` | Range longer than 366 days. Response data: { max_days } |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getPublicationsSummary: {
        parameters: {
            query?: {
                /** @description Start of the range, ISO 8601. Defaults to 30 days before `to_date`. A range longer than 366 days answers error 1003. */
                from_date?: components["parameters"]["DashboardfromDate"];
                /** @description End of the range, ISO 8601. Defaults to now. */
                to_date?: components["parameters"]["DashboardtoDate"];
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["DashboardidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Counts */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        range: components["schemas"]["DashboardDashboardRange"];
                    } & components["schemas"]["DashboardPublicationsSummary"];
                };
            };
            400: components["responses"]["DashboardError"];
        };
    };
    getTopPublications: {
        parameters: {
            query?: {
                /** @description Start of the range, ISO 8601. Defaults to 30 days before `to_date`. A range longer than 366 days answers error 1003. */
                from_date?: components["parameters"]["DashboardfromDate"];
                /** @description How many publications to return. */
                limit?: number;
                /** @description Metric to rank by. */
                metric?: components["schemas"]["DashboardMetricName"];
                /** @description End of the range, ISO 8601. Defaults to now. */
                to_date?: components["parameters"]["DashboardtoDate"];
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["DashboardidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Top publications */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        metric: components["schemas"]["DashboardMetricName"];
                        publications: components["schemas"]["DashboardTopPublication"][];
                        range: components["schemas"]["DashboardDashboardRange"];
                    };
                };
            };
            400: components["responses"]["DashboardError"];
        };
    };
    getPublications: {
        parameters: {
            query?: {
                /** @description Retrieve publications based on a list of identifier accounts */
                accounts?: string[];
                /** @description Date from which records will be returned */
                from_date?: string;
                /** @description The limit of records will be retrieved (pagination) */
                limit?: number;
                /** @description Number of records from which you will get publications (pagination) */
                offset?: number;
                /** @description Determine if the results will be ordered by publication_date instead of creation_date */
                orderByPublish?: boolean;
                /** @description String used to search results */
                search?: string;
                /** @description Only publications of these networks. Repeat the parameter for more than one. */
                social_network?: components["schemas"]["SocialNetwork"][];
                /** @description Retrieve publications based on a list of states */
                state?: ("ready" | "withErrors" | "sended" | "draft" | "publishing")[];
                /** @description Date until which records will be returned */
                to_date?: string;
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationsPublicationList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getPublication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
                /** @description Publication identifier */
                id_publication: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationsPublicationOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `917` | Publication doesn't exists |
             *     | `935` | Invalid publication |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updatePublication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization the publication belongs to */
                id_organization: string;
                /** @description Publication identifier */
                id_publication: string;
            };
            cookie?: never;
        };
        /** @description Only the properties you send are updated; the rest keep their current value. `social_network` is already set on the publication, so it is optional here. */
        requestBody: {
            content: {
                "application/json": components["schemas"]["PublicationsPublicationInput"];
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationsPublicationOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `917` | Publication doesn't exists |
             *     | `935` | Invalid publication |
             *     | `921` | Can't update a publication already sended |
             *     | `940` | X (Twitter) credits exhausted. Not enough monthly credits to publish this tweet (same link detection and 15/200 tariff as on create). Response data: { used, limit }. |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    deletePublication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
                /** @description Publication identifier */
                id_publication: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `917` | Publication doesn't exists |
             *     | `935` | Invalid publication |
             *     | `940` | X (Twitter) credits exhausted. Deleting the tweet on X could not be charged. Response data: { used, limit }. |
             *     | `966` | The Telegram message is older than 48 hours and the Bot API will not delete it any more. Response data: { published_date, max_hours }. |
             *     | `969` | The PlanVortex bot is not allowed to delete messages in that Telegram chat. Response data: { chat_id }. |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getPublicationComments: {
        parameters: {
            query?: {
                /** @description How many to read from the network. **On X it is capped** regardless of what you send: a page there is a spending ceiling, not a pagination preference. */
                limit?: components["parameters"]["CommentsthreadLimit"];
                /** @description Page cursor. Pass back the `next_cursor` of the previous response — it is an opaque token from the network, not a numeric offset. */
                offset?: components["parameters"]["CommentsthreadOffset"];
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["CommentsidOrganization"];
                /** @description Publication identifier */
                id_publication: components["parameters"]["CommentsidPublication"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CommentsCommentThread"];
                };
            };
            400: components["responses"]["CommentsCommentError"];
        };
    };
    getPublicationMetrics: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
                /** @description Publication identifier */
                id_publication: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationStats"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `917` | Publication doesn't exists |
             *     | `935` | Invalid publication |
             *     | `940` | X (Twitter) credits exhausted. Not enough monthly credits to fetch these metrics. Response data: { used, limit }. |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    retryPublication: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization the publication belongs to */
                id_organization: string;
                /** @description Publication identifier */
                id_publication: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The attempt ran. `publication.state` and `publication.publication_errors` carry the outcome. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationsPublicationRetry"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `917` | Publication doesn't exists |
             *     | `935` | Invalid publication |
             *     | `949` | Only a publication with errors can be retried. Response data: { state }. |
             *     | `950` | Publication retry limit reached. Response data: { retries, max_retries }. Update the publication to reset the counter. |
             *     | `940` | X (Twitter) credits exhausted. Nothing was sent and no retry was spent. Response data: { used, limit }. |
             *     | `942` | Social network doesn't allow publications |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getPublicationStatsHistory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
                /** @description Publication identifier */
                id_publication: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationsPublicationStatsHistory"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `917` | Publication doesn't exists |
             *     | `935` | Invalid publication |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getOrganizationRoles: {
        parameters: {
            query?: {
                /** @description Maximum number of records returned (pagination) */
                limit?: components["parameters"]["OrganizationsRoleslimit"];
                /** @description Number of records to skip (pagination) */
                offset?: components["parameters"]["OrganizationsRolesoffset"];
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["OrganizationsRolesidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationsRolesOrganizationRoleList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `501` | Invalid authorization token |
             *     | `511` | This functionality requires a plan with at least 2 users |
             *     | `518` | User or application deleted |
             *     | `522` | Invalid token: expired |
             *     | `1101` | Invalid organization |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Insufficient permissions. The body carries error code `520` with the permissions that were required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server (PlanVortex error code `500`). */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    createOrganizationRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["OrganizationsRolesidOrganization"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OrganizationsRolesOrganizationRoleInput"];
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationsRolesOrganizationRoleOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `501` | Invalid authorization token |
             *     | `511` | This functionality requires a plan with at least 2 users |
             *     | `518` | User or application deleted |
             *     | `522` | Invalid token: expired |
             *     | `1101` | Invalid organization |
             *     | `1201` | Invalid organization permission detected |
             *     | `1205` | Role name already exists in this organization |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Insufficient permissions. The body carries error code `520` with the permissions that were required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server (PlanVortex error code `500`). */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    updateOrganizationRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["OrganizationsRolesidOrganization"];
                /** @description Role identifier */
                id_rol: components["parameters"]["OrganizationsRolesidRol"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OrganizationsRolesOrganizationRoleInput"];
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationsRolesOrganizationRoleOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `501` | Invalid authorization token |
             *     | `511` | This functionality requires a plan with at least 2 users |
             *     | `518` | User or application deleted |
             *     | `522` | Invalid token: expired |
             *     | `1101` | Invalid organization |
             *     | `1201` | Invalid organization permission detected |
             *     | `1202` | Invalid organization role |
             *     | `1205` | Role name already exists in this organization |
             *     | `1207` | Default roles cannot be updated or deleted |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Insufficient permissions. The body carries error code `520` with the permissions that were required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server (PlanVortex error code `500`). */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    deleteOrganizationRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["OrganizationsRolesidOrganization"];
                /** @description Role identifier */
                id_rol: components["parameters"]["OrganizationsRolesidRol"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `501` | Invalid authorization token |
             *     | `511` | This functionality requires a plan with at least 2 users |
             *     | `518` | User or application deleted |
             *     | `522` | Invalid token: expired |
             *     | `1101` | Invalid organization |
             *     | `1202` | Invalid organization role |
             *     | `1207` | Default roles cannot be updated or deleted |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Insufficient permissions. The body carries error code `520` with the permissions that were required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server (PlanVortex error code `500`). */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    inviteUserToOrganizationRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["OrganizationsRolesidOrganization"];
                /** @description Role identifier */
                id_rol: components["parameters"]["OrganizationsRolesidRol"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /**
                     * Format: email
                     * @description Address to invite.
                     */
                    email: string;
                };
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `501` | Invalid authorization token |
             *     | `508` | Error sending invitation |
             *     | `511` | This functionality requires a plan with at least 2 users |
             *     | `518` | User or application deleted |
             *     | `522` | Invalid token: expired |
             *     | `609` | Invalid email |
             *     | `1101` | Invalid organization |
             *     | `1202` | Invalid organization role |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Insufficient permissions. The body carries error code `520` with the permissions that were required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server (PlanVortex error code `500`). */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getUsersInOrganizationRole: {
        parameters: {
            query?: {
                /** @description Maximum number of records returned (pagination) */
                limit?: components["parameters"]["OrganizationsRoleslimit"];
                /** @description Number of records to skip (pagination) */
                offset?: components["parameters"]["OrganizationsRolesoffset"];
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["OrganizationsRolesidOrganization"];
                /** @description Role identifier */
                id_rol: components["parameters"]["OrganizationsRolesidRol"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationsRolesUserInOrganizationList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `501` | Invalid authorization token |
             *     | `511` | This functionality requires a plan with at least 2 users |
             *     | `518` | User or application deleted |
             *     | `522` | Invalid token: expired |
             *     | `1101` | Invalid organization |
             *     | `1202` | Invalid organization role |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Insufficient permissions. The body carries error code `520` with the permissions that were required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server (PlanVortex error code `500`). */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    addUserToOrganizationRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["OrganizationsRolesidOrganization"];
                /** @description Role identifier */
                id_rol: components["parameters"]["OrganizationsRolesidRol"];
                /** @description User identifier */
                id_user: components["parameters"]["OrganizationsRolesidUser"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `501` | Invalid authorization token |
             *     | `511` | This functionality requires a plan with at least 2 users |
             *     | `518` | User or application deleted |
             *     | `522` | Invalid token: expired |
             *     | `1101` | Invalid organization |
             *     | `1109` | Max users per organization reached |
             *     | `1202` | Invalid organization role |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Insufficient permissions. The body carries error code `520` with the permissions that were required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server (PlanVortex error code `500`). */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    removeUserFromOrganizationRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["OrganizationsRolesidOrganization"];
                /** @description Role identifier */
                id_rol: components["parameters"]["OrganizationsRolesidRol"];
                /** @description User identifier */
                id_user: components["parameters"]["OrganizationsRolesidUser"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `501` | Invalid authorization token |
             *     | `511` | This functionality requires a plan with at least 2 users |
             *     | `518` | User or application deleted |
             *     | `522` | Invalid token: expired |
             *     | `1101` | Invalid organization |
             *     | `1202` | Invalid organization role |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Insufficient permissions. The body carries error code `520` with the permissions that were required. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server (PlanVortex error code `500`). */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    updateOrganizationSocialCredentials: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
                /** @description The network the credentials belong to. Only `discord` has its own application today; any other value answers error 702. */
                social_network: "discord";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OrganizationsSocialCredentialsInput"];
            };
        };
        responses: {
            /** @description The organization, with the credentials it now has. Never with their values. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationsOrganizationOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `702` | That network has no own-application credentials |
             *     | `1406` | A required field is missing: `client_id`, `client_secret` or `bot_token` |
             *     | `959` | Discord refused the credentials, or the application is misconfigured in the portal |
             *     | `1101` | Invalid organization |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    deleteOrganizationSocialCredentials: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
                /** @description The network whose credentials are removed. */
                social_network: "discord";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The organization without those credentials */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationsOrganizationOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `702` | That network has no own-application credentials |
             *     | `1101` | Invalid organization |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    createTemporalConnectToken: {
        parameters: {
            query?: {
                /** @description Where the user comes back after connecting. Has to be one of the app's `redirect_urls` (error 532). */
                redirect_uri?: string;
                /** @description Network the user is going to connect. It travels inside the returned URL **and inside the token itself**, so the token will only connect that network (error 544 otherwise). A network outside the allowed list is rejected here with error 702. */
                social_network?: components["schemas"]["SocialNetwork"];
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The URL to send the user to, the bare token, and when it expires. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /**
                         * Format: date-time
                         * @description When the token stops working. Fifteen minutes after it was issued.
                         */
                        expires_at: string;
                        /** @description The same token, on its own. This is what you pass to a client that authenticates with a temporal token; do not parse it out of `url`. */
                        token: string;
                        /** @description Ready to redirect to. Carries the token in its `token` query parameter, and the network in `social_network` when one was asked for. */
                        url: string;
                    };
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `514` | This endpoint needs app credentials: neither a user token nor a temporal connect token can issue one |
             *     | `532` | `redirect_uri` is not one of the app's registered `redirect_urls` |
             *     | `702` | `social_network` is not one of the networks PlanVortex supports |
             *     | `1101` | Invalid organization |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getTotalUnreadComments: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["CommentsidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        total: number;
                    };
                };
            };
            400: components["responses"]["CommentsCommentError"];
        };
    };
    getUnreadMessages: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["MessagesidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Unread count */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        total: number;
                    };
                };
            };
            400: components["responses"]["MessagesError"];
        };
    };
    getUploads: {
        parameters: {
            query?: {
                /** @description The limit of records will be retrieved (pagination) */
                limit?: number;
                /** @description Number of records from which you will get files (pagination) */
                offset?: number;
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UploadsUploadList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    addUpload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description file uploaded as multipart/formdata
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UploadsUploadOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `804` | Max folder size reached per organization |
             *     | `800` | Invalid image format file, only allow:  JPEG, PNG, BMP, GIF, JPG |
             *     | `801` | Invalid video format, only mp4 allowed |
             *     | `802` | Invalid image size, max allowed 5mb |
             *     | `803` | Invalid video size, max allowed 512mb |
             *     | `805` | Invalid file type, only allow videos and images |
             *     | `809` | Only videos con have a thumbnail image |
             *     | `810` | Thumbnail must be an image |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getUpload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
                /** @description Upload identifier */
                id_upload: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UploadsUploadOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `806` | Invalid upload identifier |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updateUpload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization the upload belongs to */
                id_organization: string;
                /** @description Upload identifier */
                id_upload: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Identifier of ANOTHER upload, which must be an image, to use as the cover. Returns error 810 if it does not exist or is not an image. Replacing an existing cover deletes the previous file. */
                    cover_image?: string;
                    /** @description Point of the video, in milliseconds, used as the cover frame. Used by TikTok videos. WARNING: this property is written unconditionally, so omitting it clears the stored value - always send it back if you want to keep it. */
                    cover_offset?: number;
                };
            };
        };
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UploadsUploadOne"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `806` | Invalid upload identifier |
             *     | `809` | Only videos con have a thumbnail image |
             *     | `810` | Thumbnail must be an image |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    deleteUpload: {
        parameters: {
            query?: {
                /** @description Delete the file even if a publication still points at it. Without it, a file in use is kept and only unlinked from the library. */
                forceDelete?: boolean;
            };
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
                /** @description Upload identifier */
                id_upload: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Success"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `806` | Invalid upload identifier |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    importUploads: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    files: {
                        /** @description File identifier at the provider (the Drive file id). */
                        external_id: string;
                        /** @description Type reported by the picker. Used to reject early; the real type of the body wins. */
                        mime_type?: string;
                        /** @description File name as shown by the picker. Used for the visible name and to report which file failed. */
                        name?: string;
                    }[];
                    /** @description A connected integration of this organization whose provider has file_import: true. */
                    id_integration: string;
                };
            };
        };
        responses: {
            /** @description Import finished. Partial by design: check `errors` even on 200. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /**
                         * @description One entry per file that did not get in.
                         *
                         *     | Code | Meaning |
                         *     | --- | --- |
                         *     | `800` | Invalid image format. |
                         *     | `801` | Invalid video format. |
                         *     | `802` | Image over the size limit (5 MB). |
                         *     | `803` | Video over the size limit (200 MB). |
                         *     | `804` | Organization storage quota exhausted. |
                         *     | `805` | Not an image or a video. |
                         *     | `2204` | Not downloadable from the provider: a native Google file (Doc, Sheet, Slides) has no bytes to download, or the file is not reachable with the granted permission. |
                         */
                        errors: {
                            code: number;
                            data?: Record<string, never>;
                            external_id?: string;
                            message: string;
                            name?: string;
                        }[];
                        uploads: components["schemas"]["Upload"][];
                    };
                };
            };
            /** @description `2200` the integration does not exist or belongs to another organization; `2201` its provider does not contribute files; `807` the body carries no files. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getOrganizationUse: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: components["parameters"]["DashboardidOrganization"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Consumption */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardPlanUse"];
                };
            };
            400: components["responses"]["DashboardError"];
        };
    };
    getUserInOrganizationRole: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Organization identifier */
                id_organization: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationsUserList"];
                };
            };
            /**
             * @description The request failed. The body carries the PlanVortex error code in `code`:
             *
             *     | Code | Meaning |
             *     | --- | --- |
             *     | `1101` | Invalid organization |
             *     | `523` | Invalid application |
             */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Unhandled error by the server */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getPlannerTemplates: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Available planner templates */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        templates?: components["schemas"]["CatalogPlannerTemplate"][];
                    };
                };
            };
            /** @description Error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getPublicationLimits: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Publication limits */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "max_retries": 3
                     *     }
                     */
                    "application/json": {
                        /** @description How many manual retries a failed publication accepts before `retry` starts answering an error. */
                        max_retries: number;
                    };
                };
            };
            /** @description Error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getSocialCapabilities: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "instagram": {
                     *         "publications": true,
                     *         "messages": true,
                     *         "products": false,
                     *         "webhooks": true,
                     *         "persistent_menu": false,
                     *         "comments": true,
                     *         "destinations": false,
                     *         "link": false
                     *       },
                     *       "google_business": {
                     *         "publications": false,
                     *         "messages": false,
                     *         "products": false,
                     *         "webhooks": false,
                     *         "persistent_menu": false,
                     *         "comments": true,
                     *         "destinations": false,
                     *         "link": false
                     *       },
                     *       "pinterest": {
                     *         "publications": true,
                     *         "messages": false,
                     *         "products": false,
                     *         "webhooks": false,
                     *         "persistent_menu": false,
                     *         "comments": false,
                     *         "destinations": true,
                     *         "link": true
                     *       }
                     *     }
                     */
                    "application/json": {
                        [key: string]: components["schemas"]["CommentsSocialCapabilities"];
                    };
                };
            };
            /** @description Error. Classify by `code` in the body, never by the HTTP status: every domain error travels with HTTP 400. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getSocialCommentActions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful operation */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "linkedin": {
                     *         "reply": true,
                     *         "hide": false,
                     *         "delete_own": true,
                     *         "delete_others": true
                     *       },
                     *       "google_business": {
                     *         "reply": true,
                     *         "hide": false,
                     *         "delete_own": true,
                     *         "delete_others": false
                     *       }
                     *     }
                     */
                    "application/json": {
                        [key: string]: components["schemas"]["CommentsCommentActions"];
                    };
                };
            };
            /** @description Error. Classify by `code` in the body, never by the HTTP status: every domain error travels with HTTP 400. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getSocialLimits: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Limits per network */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogSocialLimits"];
                };
            };
            /** @description Error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getSocialNetworks: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Supported networks */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example [
                     *       "facebook",
                     *       "twitter",
                     *       "instagram",
                     *       "linkedin",
                     *       "whatsapp",
                     *       "tiktok",
                     *       "youtube",
                     *       "google_business",
                     *       "bluesky",
                     *       "discord",
                     *       "telegram",
                     *       "threads",
                     *       "slack",
                     *       "pinterest"
                     *     ]
                     */
                    "application/json": components["schemas"]["SocialNetwork"][];
                };
            };
            /** @description Error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    onCommentsWebhook: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example [
                 *       {
                 *         "field": "comments",
                 *         "id_account": "66b0f4a1c2d3e4f5a6b7c8d9",
                 *         "id_organization": "66b0f4a1c2d3e4f5a6b7c8d0",
                 *         "social_network": "instagram",
                 *         "commentObj": {
                 *           "_id": "66c1a2b3c4d5e6f7a8b9c0d1",
                 *           "id_account": "66b0f4a1c2d3e4f5a6b7c8d9",
                 *           "id_organization": "66b0f4a1c2d3e4f5a6b7c8d0",
                 *           "publication_external_id": "17900000000000000",
                 *           "external_id": "17800000000000001",
                 *           "social_network": "instagram",
                 *           "author": {
                 *             "external_id": "9988776655",
                 *             "name": "un_seguidor",
                 *             "is_own": false
                 *           },
                 *           "text": "Me interesa, ¿cuánto cuesta?",
                 *           "creation_date": "2026-08-19T09:12:00.000Z",
                 *           "collected_date": "2026-08-19T09:12:01.000Z",
                 *           "read": false,
                 *           "replied": false,
                 *           "hidden": false,
                 *           "deleted": false
                 *         }
                 *       }
                 *     ]
                 */
                "application/json": (components["schemas"]["CommentsWebhookChange"] | components["schemas"]["CommentsIntegrationWebhookChange"])[];
            };
        };
        responses: {
            /** @description Your endpoint acknowledged the delivery. PlanVortex does not retry: a delivery that fails is logged and dropped, so treat the inbox endpoints as the way to catch up on anything you missed. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
}
