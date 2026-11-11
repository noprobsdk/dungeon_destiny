# Access and edge services

This page describes the standard response format, the public `gateway`
endpoints with the app version check and request log, and the Cloudflare
Access sign-in, staff users, and API of Content Studio that have been built.

Sources: [FR-00001: Worker dev workflow](../../../FR/FR-00001-worker-dev-workflow/README.md),
[FR-00003: Worker access policy](../../../FR/FR-00003-worker-access-policy/README.md),
[FR-00004: Content D1 and user model](../../../FR/FR-00004-content-d1-user-model/README.md),
[FR-00005: Godot Android client skeleton](../../../FR/FR-00005-godot-android-client/README.md).

## Standard response format

Every API response has the five fields defined by the `ApiResponse` type in
`@dungeon-destiny/contracts` (`packages/contracts/`):

| Field | Content |
|---|---|
| `status` | `"ok"` or `"error"` |
| `code` | `null` on success, otherwise a stable error code |
| `message` | A short human-readable message |
| `data` | The response data, or `null` |
| `meta` | `requestId`, `timestamp`, `service`, `environment`, and `version` |

- `meta.requestId` is generated with `crypto.randomUUID()` for each request.
- `meta.timestamp` is an ISO 8601 time in UTC.
- `meta.version` is the deployment version from Cloudflare's version metadata:
  `id`, `tag`, and `createdAt`. It is never a Git commit and reveals no source
  code or credential.

Clients act on `code`, never on the message text. A code is added to
`ERROR_CODES` before any Worker returns it. The shared codes are:

| Code | Used for |
|---|---|
| `NOT_FOUND` | No endpoint at the path |
| `METHOD_NOT_ALLOWED` | A method the endpoint does not accept |
| `UNAUTHENTICATED` | No valid Cloudflare Access token (HTTP 401) |
| `NOT_STAFF` | A valid Access token for someone who is not let in (HTTP 403) |
| `PERMISSION_DENIED` | A signed-in user without the permission an action needs (HTTP 403) |
| `VALIDATION_FAILED` | Input that does not match its schema, or a body that is not JSON (HTTP 400) |
| `CONFLICT` | A duplicate email address or role name, a role still in use, or a change to the person's own roles or status (HTTP 409) |
| `ACCESS_SYNC_FAILED` | Cloudflare refused to update the Access group, so nothing was saved (HTTP 502) |
| `INVALID_APP_HEADERS` | Missing or invalid `X-App-Platform` and `X-App-Build` headers (HTTP 400) |
| `APP_UPDATE_REQUIRED` | A game-client build below the minimum supported build (HTTP 426) |
| `SERVER_MISCONFIGURED` | The `gateway`'s version thresholds are missing or invalid (HTTP 500) |

## gateway

The `gateway` Worker, deployed as `dd-dev-gateway`, is the only Worker the game
client calls. Its two public endpoints need no authentication and return no
player, account, or secret data.

| Request | Response |
|---|---|
| `GET /health` | HTTP 200, `status` `"ok"`, `code` `null`, `data` `null`, service `gateway`, environment `dev`, and the deployed version |
| `GET /app/version` with the app headers | HTTP 200 with the version check result in `data`, described below |
| `GET /app/version` without valid app headers | HTTP 400, code `INVALID_APP_HEADERS` |
| Another method on `/health` or `/app/version` | HTTP 405 with `Allow: GET`, `status` `"error"`, code `METHOD_NOT_ALLOWED` |
| Another path | HTTP 404, `status` `"error"`, code `NOT_FOUND` |

The code is in `apps/gateway/src/index.ts`, with the version check in
`src/api-gateway/app-version.ts` and the request log in
`src/api-gateway/request-log.ts`.

### App version check

The game client sends two headers on every call: `X-App-Platform`, whose only
accepted value is `android`, and `X-App-Build`, a whole number of 0 or more
with at most 9 digits. For each platform the `gateway` holds two thresholds as
Wrangler variables in `apps/gateway/wrangler.jsonc`, so changing them needs a
deploy but no app update:

| Variable | Meaning | Dev value |
|---|---|---|
| `APP_MIN_BUILD_ANDROID` | The minimum supported build | `1` |
| `APP_RECOMMENDED_BUILD_ANDROID` | The recommended build | `1` |
| `APP_UPDATE_URL_ANDROID` | The link to the new version | The Google Play address for `com.dungeondestiny.game.dev` |

`GET /app/version` answers HTTP 200 with `data` containing `platform`,
`build`, `minimumBuild`, `recommendedBuild`, `supported` (build at or above
the minimum), `upToDate` (build at or above the recommended build), and
`updateUrl`. `updateUrl` is the configured link when it is an `https`
address, and `null` otherwise, so a bad link never stops the check. The dev
link shows Google Play's "Item not found" until a store page exists. The
types are `AppVersionData` and the related constants in
`@dungeon-destiny/contracts`.

The build check runs before routing. A call with only one of the headers, an
unknown platform, or an invalid build is answered with HTTP 400 and code
`INVALID_APP_HEADERS`. Any call other than `/app/version` that carries a
build below the minimum is answered with HTTP 426 and code
`APP_UPDATE_REQUIRED` before it is handled, so a client kept open for a long
time is also caught. Calls without the headers, such as `GET /health` from a
monitor, are not checked. When the thresholds are missing, are not whole
numbers of at least 1, or have the minimum above the recommended build, a call
with the app headers is answered with HTTP 500 and code
`SERVER_MISCONFIGURED`.

Raising `APP_MIN_BUILD_ANDROID` needs the project owner's approval, because a
wrong value locks out players. A deploy takes a few seconds to reach every
Cloudflare location, so for a few seconds after a threshold change a client
can get answers from both the old and the new values.

### Request log

The `gateway` writes one JSON line for every request, kept in Workers Logs for
3 days on Cloudflare's Free plan and 7 days on the Paid plan:

| Field | Content |
|---|---|
| `event` | `request` |
| `requestId` | The same ID as `meta.requestId` in the response |
| `method`, `path`, `status`, `code` | The request method, the path without the query string, the HTTP status, and the error code or `null` |
| `durationMs`, `environment`, `versionId` | The time spent, the environment, and the deployed version ID |
| `platform`, `build`, `versionCheck` | Only with the app headers: the platform, the build, and `upToDate`, `updateAvailable`, `updateRequired`, or `invalidHeaders` |

The log never contains IP addresses, other request headers, query strings,
tokens, or personal data. Workers Logs leaves out fields that are `null`, so
a stored line without an error has no `code`.

The lines can be watched live with `wrangler tail`, read afterwards with
`devops/logs/tail.sh` or in the Cloudflare dashboard, and matched with the
game client's log by `requestId`, as described in `devops/README.md`.

## Cloudflare Access

Content Studio is protected by Cloudflare Access. Terraform manages the
sign-in method, the Access application, and its policy, as described in the
[deployment model](deployment-model.md).

| Item | Value |
|---|---|
| Sign-in method | One-time PIN sent by email, the only method allowed; Access redirects to it |
| Application | A self-hosted Access application, "Content Studio (dev)", in front of the `dd-dev-studio-web` address |
| Session duration | 24 hours |
| Policy | Defined inside the application; allows the SuperAdmin's email address and the members of the Access group "Content Studio users", so nobody else can request a PIN |
| Zero Trust | Turned on by hand in the Cloudflare dashboard, on its free plan; Terraform does not manage the Zero Trust organization |

### Token check in `studio-web`

`studio-web` checks the Access token in the `Cf-Access-Jwt-Assertion` header on
every request, pages included, even when the request reaches the Worker
directly. The check uses `jose` `6.2.12` and verifies:

- the signature, against the team's public keys, with RS256 only;
- the issuer, which is the team domain;
- the audience, which is the Access application's AUD tag; and
- the expiry.

The team domain and the AUD tag are set in `apps/studio-web/wrangler.jsonc`;
they are not secrets. A token sent only in the `CF_Authorization` cookie is not
accepted. When the token is missing or invalid, or the team domain or AUD tag
is not configured, `studio-web` returns HTTP 401 with code `UNAUTHENTICATED`
and serves no page.

The signed-in person's email address is taken from the token and passed to
`studio-api` as a typed RPC argument. An identity header sent by the browser
is never used. Token values are not logged.

### SuperAdmin

One SuperAdmin is defined in configuration, not in a database. The email
address is kept in the owner's private credential file as
`STUDIO_SUPERADMIN_EMAIL`, never in the repository. Terraform reads it for the
Access policy, and the `studio-api` deploy passes it to the Worker as the
`SUPERADMIN_EMAIL` variable. `studio-api` compares addresses without regard to
upper and lower case; when the variable is not set, nobody is the SuperAdmin.
The SuperAdmin passes every permission check, is not a row in the `users`
table, and cannot be changed or deactivated in Content Studio.

If the SuperAdmin cannot receive the one-time PIN, the owner signs in to the
Cloudflare dashboard with their own Cloudflare account, which does not use
Access, changes `STUDIO_SUPERADMIN_EMAIL`, applies Terraform, and redeploys
`studio-api`. The Access policy is not changed in the dashboard, because
Terraform would undo it. The steps are in `doc/howto-cloudflare-setup.md`.

### Access group sync

Every active user is a member of the Access group "Content Studio users",
together with the SuperAdmin. Terraform creates the group and leaves its
members to `studio-api`, which replaces the whole member list through
Cloudflare's API whenever a user is created, deactivated, reactivated, or
changes email address. `studio-api` updates the group first and saves the
user change only when that succeeded; otherwise nothing is saved and the
response has code `ACCESS_SYNC_FAILED`. Because the whole list is sent, every
update also repairs any earlier difference. A user added in Content Studio can
sign in at once, with no Terraform change.

`studio-api` calls Cloudflare's API with a Cloudflare account API token that
has only the permission `Access: Organizations, Identity Providers, and Groups
Write`. The project owner creates it by hand and stores it only as the
`CF_ACCESS_GROUP_TOKEN` Worker secret with `wrangler secret put`, never in the
repository, Terraform state, credential file, or a log (DD-021). The secret is
declared as required, so a deploy fails without it. It is rotated by creating
a new token, storing it, and then deleting the old one. The token is sent only
to Cloudflare's API and is never returned, logged, or shown. The steps are in
`doc/howto-cloudflare-setup.md`, step 13.

Check Access, for users with `users.manage`, compares the group with the
active users and reports the users missing from the group and the group
members who are not active users.

## Staff users

A user is anyone who signs in to Content Studio; players are never users.
Users, roles, and permissions are stored in Content D1, as described in
[Data services](data-services.md). The model follows
spatie/laravel-permission, adapted: users have roles, roles have permissions,
and there are no direct user permissions, guards, or teams.

`studio-api` decides who is let in on every request, from the `users` table:

- the SuperAdmin is let in with every permission;
- an active user with at least one role is let in with the permissions of
  their roles; and
- a deactivated user, a user with no role, and an unknown email address are
  refused with code `NOT_STAFF`, even while their Access session lasts.

Permissions are defined in code in `packages/contracts/`, each with a name, an
area, a description of what it allows, a purpose saying why it exists and who
should have it, and the Feature Request that added it. Roles, and the
permissions each role has, are managed in Content Studio.

| Permission | Area | Allows |
|---|---|---|
| `users.view` | Users | Seeing the users, with their email addresses, names, roles, and status |
| `users.manage` | Users | Creating users, changing their names, email addresses, and roles, deactivating and reactivating them, and Check Access |
| `roles.view` | Roles | Seeing the roles, the permissions each role has, and the permission list |
| `roles.manage` | Roles | Creating, changing, and deleting roles, and choosing their permissions |

Users are deactivated, never deleted. A role can be deleted only while no
user has it. Nobody can change their own roles or status, so nobody can lock
themselves out or give themselves more permissions. Every change to a user or
a role is written to `audit_events` with the person, the action, the record,
the values before and after, and the request ID.

## Content Studio API

`studio-web` passes signed-in requests under `/api` to `studio-api` through
the `STUDIO_API` service binding, using typed RPC with the `StudioApiRpc`
contract in `@dungeon-destiny/contracts`. `studio-api` has no public address,
and it answers any HTTP request with HTTP 404 and code `NOT_FOUND`.

Every `studio-api` method first decides whether the person is let in, then
checks the permission it needs before reading or changing data, and refuses
with HTTP 403 and code `PERMISSION_DENIED` otherwise. Hiding a page or button
is never the only protection. Input is checked with Zod schemas shared with
the Content Studio forms.

| Route through `studio-web` | Method | Permission |
|---|---|---|
| `/api/me`: the signed-in person's email address, display name, roles, permissions, and whether they are the SuperAdmin | `GET` | A person who is let in |
| `/api/health`: the `studio-api` health response | `GET` | A valid Access token |
| `/api/users` | `GET`, `POST` | `users.view`, `users.manage` |
| `/api/users/{id}` | `GET`, `PATCH` | `users.view`, `users.manage` |
| `/api/users/{id}/deactivate`, `/api/users/{id}/reactivate` | `POST` | `users.manage` |
| `/api/access-sync`: Check Access | `GET` | `users.manage` |
| `/api/roles` | `GET`, `POST` | `roles.view`, `roles.manage` |
| `/api/roles/{id}` | `GET`, `PATCH`, `DELETE` | `roles.view`, `roles.manage` |
| `/api/permissions` | `GET` | `roles.view` |

Another method on a route returns HTTP 405 with an `Allow` header listing the
accepted methods and code `METHOD_NOT_ALLOWED`, and another `/api` path
returns HTTP 404 with code `NOT_FOUND`. `studio-web` generates
`meta.requestId` with `crypto.randomUUID()` and passes it to `studio-api`, so
both Workers report the same request ID, and it is stored in the audit
records.

## Verification

FR-00001, accepted on 2026-10-08. The Vitest tests in the Workers runtime
cover the 200, 405, and 404 responses and that two requests get different
request IDs. Against the deployed Worker, the 200, 405, and 404 responses were
verified, and `meta.version` matched the version Wrangler reported as
deployed.

FR-00003, accepted on 2026-10-10. The Vitest tests in the Workers runtime use
keys the tests generate, never real Access tokens. They cover a missing token,
a token signed with another key, an expired token, a token for another
audience or issuer, a token not signed with RS256, a token sent only in the
cookie, and a missing AUD tag; `/api/me` for the SuperAdmin and for anyone
else; that a browser identity header is ignored; `/api/health`; the 404 and
405 responses; and that `studio-api` matches the SuperAdmin without regard to
case and lets nobody in when the address is not set. The end-to-end tests in
Chromium cover the same path through both Workers run locally. Against
Cloudflare: without signing in, the deployed `studio-web` address redirects
pages and `/api/me` to Access, and `studio-api` has no address. The owner
signed in with a one-time PIN. `tests/FR-00003/deployed_test.sh` repeats the
deployed checks after every deploy.

FR-00004, accepted on 2026-10-14. The Vitest tests in the Workers runtime
cover who is let in, the SuperAdmin passing every permission check, each
method refusing a person without its permission, creating, changing,
deactivating, and reactivating users and creating, changing, and deleting
roles with the refusals for duplicates, roles in use, and changes to the
person's own roles or status, the audit records, the Access group updates
with nothing saved when Cloudflare's API fails, Check Access, and that the
token is never returned. The end-to-end tests run against a local Content D1
and a stand-in for Cloudflare's API. Against Cloudflare: the project owner
signed in as the SuperAdmin, created a role and a user for a second email
address, and signed in as that user, who saw only the pages the role allows;
an address that is not a user could not request a PIN; and after the second
user was deactivated, they were refused and removed from the Access group.
The FR-00003 deployed tests still pass.

FR-00005, accepted on 2026-11-10. The Vitest tests in the Workers runtime, 43
for FR-00005, cover `/app/version` for current, outdated, and unsupported
builds, the update link and its `null` cases, every kind of invalid header,
HTTP 426 on other calls, `/health` without the headers, the thresholds, the
response types, and one log line per request with the right fields and none of
the forbidden values. Two more test projects run the `gateway` with raised and
with invalid thresholds. Against Cloudflare, the 6 tests in
`tests/FR-00005/deployed_test.sh` pass. The game client's requests were seen
live with `wrangler tail`, with the same request IDs as the client's log, and
the deployed tests' requests were read back from Workers Logs with
`devops/logs/tail.sh`. Both update screens were shown on a tablet by deploying
dev with raised thresholds; the thresholds are back at `1`. The FR-00001 and
FR-00003 deployed tests still pass.
