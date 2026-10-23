# Frontends

This page describes the frontends that have been built for Dungeon Destiny.

Sources: [FR-00003: Worker access policy](../../../FR/FR-00003-worker-access-policy/README.md),
[FR-00004: Content D1 and user model](../../../FR/FR-00004-content-d1-user-model/README.md).

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
