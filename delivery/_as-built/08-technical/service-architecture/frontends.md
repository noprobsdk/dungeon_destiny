# Frontends

This page describes the frontends that have been built for Dungeon Destiny.

Sources: [FR-00003: Worker access policy](../../../FR/FR-00003-worker-access-policy/README.md).

## Content Studio

Content Studio is the staff tool. It is served by the `studio-web` Worker,
deployed as `dd-dev-studio-web`, and its data comes from the `studio-api`
Worker, deployed as `dd-dev-studio-api`, through a service binding.

| Item | Value |
|---|---|
| Code | `apps/studio-web/` (`@dungeon-destiny/studio-web`) |
| Pages | React `19.3.0` in strict TypeScript, built with Vite `8.3.4` and `@vitejs/plugin-react` `6.1.2` into `apps/studio-web/dist/` |
| Styling | Plain CSS |
| Routing | None; Content Studio has one page |
| Folders | `src/app/` for the root component, `src/features/session/` and `src/features/status/` for the features, `src/shared/` for the API client, and `src/worker/` for the Worker |
| Serving | Workers static assets, with `single-page-application` handling and `run_worker_first`, so every request, pages included, passes the Access token check first |

Staff sign in through Cloudflare Access with a one-time PIN, as described in
[Access and edge services](access-and-edge.md). Only the SuperAdmin is let in.

## Pages

When Content Studio opens, it calls `GET /api/me` and shows one of these
pages:

| Result of `/api/me` | Page |
|---|---|
| The signed-in person | "Welcome to Content Studio", with the signed-in email address and the role `superadmin`, and the `studio-api` status |
| `NOT_STAFF` | "Not allowed": the person is signed in but may not use Content Studio |
| `UNAUTHENTICATED` | "Sign in again": the sign-in is missing or has expired, and reloading the page signs in with a one-time PIN |
| Anything else | "Something went wrong" |

The `studio-api` status comes from `GET /api/health`. It shows that
`studio-api` is running, with the deployed version tag, or that it is not
responding.

Content Studio has no content screens and no Staff users screen, and it uses
no database.

## Verification

FR-00003, accepted on 2026-10-10. The page tests run in jsdom with React
Testing Library and cover the signed-in page with the `studio-api` status, the
not-allowed page, the sign-in-again page, and a `studio-api` that is not
running. The end-to-end tests run both Content Studio Workers locally and test
them in Chromium with Playwright `1.64.0`, using tokens from a local stand-in
for Access's key server; 3 pass. After deployment, the owner signed in with a
one-time PIN and saw the signed-in page with the `studio-api` status. Verified
from a clean clone of commit `2ca1885`.
