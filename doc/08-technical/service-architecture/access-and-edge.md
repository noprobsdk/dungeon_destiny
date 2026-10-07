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
