# Access and edge services

This page describes the standard response format, the public endpoints, and
the Cloudflare Access sign-in for Content Studio that have been built.

Sources: [FR-00001: Worker dev workflow](../../../FR/FR-00001-worker-dev-workflow/README.md),
[FR-00003: Worker access policy](../../../FR/FR-00003-worker-access-policy/README.md).

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

## gateway `/health`

The `gateway` Worker, deployed as `dd-dev-gateway`, has one public endpoint. It
needs no authentication and returns no player, account, configuration, or
secret data.

| Request | Response |
|---|---|
| `GET /health` | HTTP 200, `status` `"ok"`, `code` `null`, `data` `null`, service `gateway`, environment `dev`, and the deployed version |
| Another method on `/health` | HTTP 405 with `Allow: GET`, `status` `"error"`, code `METHOD_NOT_ALLOWED` |
| Another path | HTTP 404, `status` `"error"`, code `NOT_FOUND` |

No application logging is added beyond Cloudflare's defaults.

## Cloudflare Access

Content Studio is protected by Cloudflare Access. Terraform manages the
sign-in method, the Access application, and its policy, as described in the
[deployment model](deployment-model.md).

| Item | Value |
|---|---|
| Sign-in method | One-time PIN sent by email, the only method allowed; Access redirects to it |
| Application | A self-hosted Access application, "Content Studio (dev)", in front of the `dd-dev-studio-web` address |
| Session duration | 24 hours |
| Policy | Defined inside the application; allows only the SuperAdmin's email address, so nobody else can request a PIN |
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
upper and lower case; when the variable is not set, nobody is let in.

If the SuperAdmin cannot receive the one-time PIN, the owner signs in to the
Cloudflare dashboard with their own Cloudflare account, which does not use
Access, changes `STUDIO_SUPERADMIN_EMAIL`, applies Terraform, and redeploys
`studio-api`. The Access policy is not changed in the dashboard, because
Terraform would undo it. The steps are in `doc/howto-cloudflare-setup.md`.

## Content Studio API

`studio-web` passes signed-in requests under `/api` to `studio-api` through
the `STUDIO_API` service binding, using typed RPC with the `StudioApiRpc`
contract in `@dungeon-destiny/contracts`. `studio-api` has no public address,
and it answers any HTTP request with HTTP 404 and code `NOT_FOUND`.

| Request through `studio-web` | Response |
|---|---|
| `GET /api/me` as the SuperAdmin | HTTP 200 with `data` holding the email address and the role `superadmin` |
| `GET /api/me` as anyone else | HTTP 403, `status` `"error"`, code `NOT_STAFF` |
| `GET /api/health` | HTTP 200, the `studio-api` health response with service `studio-api` |
| Another method on an `/api` route | HTTP 405 with `Allow: GET`, code `METHOD_NOT_ALLOWED` |
| Another `/api` path | HTTP 404, code `NOT_FOUND` |

`studio-web` generates `meta.requestId` with `crypto.randomUUID()` and passes
it to `studio-api`, so both Workers report the same request ID. No database is
used.

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
