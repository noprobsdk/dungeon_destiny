# Frontends

This page describes the frontends that have been built for Dungeon Destiny:
Content Studio and the Godot game client.

Sources: [FR-00003: Worker access policy](../../../FR/FR-00003-worker-access-policy/README.md),
[FR-00004: Content D1 and user model](../../../FR/FR-00004-content-d1-user-model/README.md),
[FR-00005: Godot Android client skeleton](../../../FR/FR-00005-godot-android-client/README.md).

## Content Studio

Content Studio is the staff tool. It is served by the `studio-web` Worker,
deployed as `dd-dev-studio-web`, and its data comes from the `studio-api`
Worker, deployed as `dd-dev-studio-api`, through a service binding.

| Item | Value |
|---|---|
| Code | `apps/studio-web/` (`@dungeon-destiny/studio-web`) |
| Pages | React `19.3.0` in strict TypeScript, built with Vite `8.3.4` and `@vitejs/plugin-react` `6.1.2` into `apps/studio-web/dist/` |
| Components and styling | Mantine `9.7.1` (`@mantine/core`, `form`, `hooks`, `modals`, and `notifications`) with a theme in `src/app/theme.ts` |
| Routing | React Router `8.4.0` |
| API calls | TanStack Query `5.104.1`, through the API client in `src/shared/` |
| Form validation | The Zod `4.6.5` schemas in `@dungeon-destiny/contracts`, shared with `studio-api` |
| Folders | `src/app/` for the root component, layout, and theme; one folder per feature in `src/features/` (`home`, `session`, `status`, `users`, `roles`, and `permissions`); `src/shared/` for the API client, forms, and shared components; and `src/worker/` for the Worker |
| Serving | Workers static assets, with `single-page-application` handling and `run_worker_first`, so every request, pages included, passes the Access token check first |

Staff sign in through Cloudflare Access with a one-time PIN. Who is let in,
and what each permission allows, is described in
[Access and edge services](access-and-edge.md).

## Theme

The theme follows the POC Content Studio's colours, used as a design
reference and not copied: gold as the primary colour, parchment backgrounds,
and a dark side menu. Buttons and links use a darker gold, and the muted text
is darker than the POC's, so every declared text and background pair meets
WCAG AA contrast for normal text.

## Signing in

When Content Studio opens, it calls `GET /api/me` and shows one of these:

| Result of `/api/me` | Shown |
|---|---|
| The signed-in person | The layout and the requested page |
| `NOT_STAFF` | "Not allowed": the person is signed in but may not use Content Studio |
| `UNAUTHENTICATED` | "Sign in again": the sign-in is missing or has expired, and reloading the page signs in with a one-time PIN |
| Anything else | "Something went wrong" |

## Layout and pages

The layout has a side menu, the signed-in person, and a Sign out link through
Cloudflare Access. The menu shows only the pages the person may use; the
SuperAdmin sees every page. A page the person may not use shows that they have
no permission. Hiding a page or button is never the only protection:
`studio-api` checks every request.

| Page | Path | What it shows and does | Needs |
|---|---|---|---|
| Home | `/` | "Welcome to Content Studio", the signed-in email address, and the `studio-api` status | A person who is let in |
| Users | `/users` | All users with email, name, roles, and status; search by email or name; filter by status. The SuperAdmin is shown as a fixed row that cannot be changed. Check Access, for people with `users.manage`, shows any difference between the Access group and the users. | `users.view` |
| User | `/users/new`, `/users/{id}` | Create and edit email, display name, and roles; deactivate and reactivate | `users.view` to open, `users.manage` to change |
| Roles | `/roles` | All roles with their numbers of users and permissions | `roles.view` |
| Role | `/roles/new`, `/roles/{id}` | Create and edit name and description, and the permissions as a checklist grouped by area, with each permission's description and purpose; delete, after confirming, only while no user has the role | `roles.view` to open, `roles.manage` to change |
| Permissions | `/permissions` | Read-only: name, area, description, purpose, the roles that have it, and the Feature Request that added it | `roles.view` |

The `studio-api` status comes from `GET /api/health`. It shows that
`studio-api` is running, with the deployed version tag, or that it is not
responding.

Buttons that change data are shown only to people with the permission, such as
New user only with `users.manage`. Forms check their input with the shared
schemas before sending and show an error under each invalid field, including
field errors returned by `studio-api`. While a form is saved, its Save button
shows a spinner and is disabled, so a second click sends nothing. After a
save, the page returns to the list and shows a notification; when saving
fails, an error notification shows the message and the form keeps its values.
Back returns to the list without saving.

Content Studio has no content screens, no page for audit records, and no
"My account" page.

## Godot game client

The game client is a Godot Android app with one loading screen. It checks its
build with the `gateway` Worker, tests the connection to the cloud, and shows
the `gateway` health response. It has no gameplay, sign-in, or game-server
connection.

| Item | Value |
|---|---|
| Code | `apps/game-client/`, a Godot `4.6.3` project |
| Scene | `scenes/loading_screen.tscn`, with the scripts in `scripts/`: `loading_screen.gd` for the screen, `api_client.gd` and `http_transport.gd` for the calls, `response_parser.gd` for the standard response format, `version_check.gd` for the outcome of each answer, and `app_info.gd` for the version and build |
| Rendering and layout | Mobile renderer, portrait only, and a 720 × 1280 base viewport that stretches to fit phones and tablets; the UI stays inside the screen's safe area, and buttons are at least 48 dp high |
| Platform | Android only, `arm64-v8a` only, debug builds only |
| Package name | `com.dungeondestiny.game.dev` for development builds; `com.dungeondestiny.game` is reserved for the store app |
| Version | `0.1.0`, build `1`; the build number is defined once in `app_info.gd`, and a test checks that the export preset's version code matches it |
| `gateway` address | The project setting `dungeon_destiny/gateway_url`, the dev address |
| Calls | `GET /app/version` and `GET /health` only, each with the headers `X-App-Platform: android` and `X-App-Build`, no token, no personal data, and a 10-second timeout |

When the app opens, it shows the game title and `0.1.0 (build 1)`, then:

1. It calls `GET /app/version`, showing "Checking version…".
   - Not supported: it shows "Update required" and stops; there is no way to
     continue.
   - Supported but not up to date: it shows "A new version is available. You
     can keep playing and update later." with Continue.
   - Up to date: it continues.
2. It calls `GET /health`, showing "Connecting…", and shows the status, the
   environment, and the deployed server version.
3. It shows "Ready".

Both update screens have an Update button that opens the link the `gateway`
returns as `updateUrl`, outside the app. The client opens only `https`
addresses and hides the button when there is no link. After HTTP 426
`APP_UPDATE_REQUIRED` on a later call, it shows "Update required" with the
link from its version check. The link is described in
[Access and edge services](access-and-edge.md).

When a call fails, times out, or gets an answer that is not in the standard
format, the app shows "Could not connect to the server. Check your internet
connection and try again." with Retry, which starts again with the version
check. When the server answered, the screen also shows its `requestId` in
small text, so the request can be found in the `gateway` log. The app prints
each step and each `requestId` to the Godot log, read with
`adb logcat -s godot:V`.

## Verification

FR-00003, accepted on 2026-10-10. The page tests run in jsdom with React
Testing Library and cover the signed-in page with the `studio-api` status, the
not-allowed page, the sign-in-again page, and a `studio-api` that is not
running. The end-to-end tests run both Content Studio Workers locally and test
them in Chromium with Playwright `1.64.0`, using tokens from a local stand-in
for Access's key server; 3 pass. After deployment, the owner signed in with a
one-time PIN and saw the signed-in page with the `studio-api` status. Verified
from a clean clone of commit `2ca1885`.

FR-00004, accepted on 2026-10-14. The page tests in jsdom cover the menu for a
user and for the SuperAdmin, the no-permission page, the Users list with the
SuperAdmin row, saving with its spinner, notification, and error handling,
deactivating a user, hidden buttons without `users.manage`, the Roles list,
the Role page's permissions grouped by area, the read-only Permissions page,
form validation, Check Access, navigation back to the lists, the gold primary
colour, and WCAG AA contrast for every declared text and background pair. The
end-to-end test in Chromium has the SuperAdmin create a role and a user, who
is added to Access and sees only what the role allows; 4 end-to-end tests
pass. After deployment, the project owner signed in as that second user and
saw only the pages the role allows.

FR-00005, accepted on 2026-11-10. The client tests run headless with GUT
`9.6.1` and stubbed HTTP, and 51 pass. They cover each answer leading to the
right screen, the app headers on every call, HTTP 426 on any call, the Update
button shown only with an `https` link and opening exactly that link, Retry,
the `requestId` on the connection error screen, the safe area, button heights,
and the project settings and export preset. A screen test renders every state
at phone, tall phone, and tablet sizes and finds no text or button outside the
window. On a Samsung Android tablet, which the project owner accepted in place
of a phone, the app showed Ready; offline it showed the connection error, and
Retry reached Ready once back online; with raised thresholds deployed to dev,
it showed both update screens, and Update opened Google Play.
