# Access and edge services

This page describes the standard response format and the public endpoints that
have been built.

Sources: [FR-00001: Worker dev workflow](../../../FR/FR-00001-worker-dev-workflow/README.md).

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
`ERROR_CODES` before any Worker returns it. The shared codes are `NOT_FOUND`
and `METHOD_NOT_ALLOWED`.

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

## Verification

FR-00001, accepted on 2026-10-08. The Vitest tests in the Workers runtime
cover the 200, 405, and 404 responses and that two requests get different
request IDs. Against the deployed Worker, the 200, 405, and 404 responses were
verified, and `meta.version` matched the version Wrangler reported as
deployed.
