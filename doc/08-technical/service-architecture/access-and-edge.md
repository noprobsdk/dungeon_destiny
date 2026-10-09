# Access and edge services

## Purpose

This document describes the services that stand at the edge of Dungeon
Destiny's backend: they decide who may come in, and they pass each request on
to the service that handles it.

There are two separate ways in:

- staff reach Content Studio and its administration routes through Cloudflare
  Access; and
- players reach the game's services through the API Gateway, after signing in
  with Player Identity.

The two never share sign-ins: Cloudflare Access is not used for players, and
Player Identity is not used for staff.

It is part of the [service architecture](../service-architecture.md). The
frontends that use these entry points are described in
[frontends](frontends.md).

## Cloudflare Access

Cloudflare Access protects:

- Content Studio;
- administration routes;
- upload routes;
- validation and publication operations;
- customer-service lookup and correction routes.

Cloudflare Access is not the player-login system.

Staff sign in with a one-time PIN: Access emails a code that works once and
expires after 10 minutes, so there is no password to remember. The Access
application, its policy, and its session duration are managed by Terraform.
See [DD-020](../../12-decisions/decision-log.md).

Access stands in front of the `studio-web` Worker, which serves Content Studio
and passes `/api/*` calls on to `studio-api`. `studio-api` has no public
address. `studio-web` validates the signed Access token in the
`Cf-Access-Jwt-Assertion` header on every request, against the team domain
and the application's audience tag, and passes the signed-in person's identity
on to `studio-api`.

### Staff users

The single list of staff users is a staff table in Content D1, owned by
`studio-api` and managed in Content Studio. Access proves that a person owns
their email address; `studio-api` then lets in only an Active staff user and
decides what their role allows. Staff users are deactivated, never deleted,
so audit records keep a valid author, and every change to a staff user is
audited.

A deactivated user is refused at once, even while their Access session is
still valid. Keeping an Access group in step with the staff table, so that
Access also blocks people who are not staff, is added later, once Worker
secret management is decided.

## Player Identity

Player Identity provides:

- player registration or account linking;
- login;
- secure tokens;
- account recovery;
- identity-provider integration;
- token validation information for the API Gateway.

Players sign in with Google or Apple; no passwords are stored. Player Identity is built into the `gateway` Worker: it verifies the Google or Apple sign-in, maps it to an Account, and issues a short-lived signed access token and a revocable refresh token. Accounts and refresh tokens are stored in Player D1 through the `player` Worker, which owns that database. No outside identity service is used. See [DD-011](../../12-decisions/decision-log.md).

## API Gateway

The API Gateway is the single public API entry point for players. Staff APIs are reached separately, through Cloudflare Access.

It provides:

- route dispatch;
- token validation;
- authorization;
- request validation;
- rate limiting;
- correlation identifiers;
- consistent error responses;
- API-version enforcement.

The gateway routes requests to the domain Workers through service bindings. It must not contain gameplay rules itself.

The API Gateway is part of the `gateway` Worker, which is the only Worker that player devices call. See [DD-017](../../12-decisions/decision-log.md).

### Standard response format

Every API response from every Worker uses one JSON format, so that both
frontends handle success and errors the same way. See
[DD-019](../../12-decisions/decision-log.md).

| Field | Meaning |
|---|---|
| `status` | `"ok"` or `"error"`. The HTTP status code is still set correctly. |
| `code` | `null` on success, or a stable error code, such as `TOKEN_EXPIRED`. Clients act on the code, never on the message text. |
| `message` | A short sentence for people. It may be reworded or translated. |
| `data` | The result, extra error details such as failed fields, or `null`. |
| `meta` | `requestId` (also written to the logs), `timestamp`, `service`, `environment`, and the deployment `version`: Cloudflare's version ID, tag, and creation time. |

The shared type lives in `packages/contracts/`.
