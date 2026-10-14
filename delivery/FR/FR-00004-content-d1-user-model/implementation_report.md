# FR-00004 implementation report

Implementation of [FR-00004: Content D1 and user model](README.md). This
report contains no credentials, keys, tokens, account IDs, or email addresses.

## Created and changed

| Path | Result |
|---|---|
| `apps/studio-api/src/db/schema.ts`, `apps/studio-api/migrations/`, `apps/studio-api/drizzle.config.ts` | The Content D1 schema in Drizzle (`users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `audit_events`), migration `0000_user_model.sql` for the tables and `0001_permissions_fr_00004.sql` for the four permissions. |
| `apps/studio-api/src/` | The users, roles, permissions, and audit services, the permission check on every RPC method, the request context, and the Access group sync through Cloudflare's API in `src/access-group/`. |
| `apps/studio-api/wrangler.jsonc` | The `CONTENT_D1` binding to `dd-dev-content`, the Access group ID, the Cloudflare API address, the account ID set at deploy time, and `CF_ACCESS_GROUP_TOKEN` declared as a required secret. |
| `apps/studio-web/src/` | The `/api/` routes for users, roles, and permissions; the Mantine layout and theme; the Users, User, Roles, Role, and Permissions pages; form validation with the shared schemas; Check Access. |
| `packages/contracts/` | The permission list with area, description, purpose, and Feature Request; the Content Studio types and Zod schemas. |
| `infra/terraform/envs/dev/studio.tf` | `dd-dev-content` with EU jurisdiction, the Access group "Content Studio users" with its members left to `studio-api`, and the Access policy allowing only the SuperAdmin and the group. |
| `devops/deploy-studio-api.sh` | Also passes the account ID and masks it. |
| `devops/db/query.sh` | Read-only Content D1 queries: named queries and single `SELECT` statements, Cloudflare by default and the local database with `--local`. |
| `devops/onboarding.sh` | A documented ShellCheck disable, listed under findings. |
| `doc/howto-cloudflare-setup.md` | Step 13, creating, storing, and rotating the Access group token. |
| `doc/howto-content-d1.md`, `doc/document-structure.md` | The Content D1 how-to, and its place in the document list. |
| `AGENTS.md` | The Content D1 commands, the query script, the deploy requirements, and the FR-00004 tests. |
| `package.json`, `pnpm-lock.yaml`, `vitest.config.ts` | The pinned packages below; a local Content D1 for the `studio-api` tests; a 30-second timeout for the Workers-runtime test projects. |
| `tests/FR-00004/` | The FR-00004 tests. |
| `tests/FR-00000/` to `tests/FR-00003/` | Harness updates, listed under findings. |

Final deployed state: `dd-dev-content` exists in Cloudflare with both
migrations applied; `dd-dev-studio-api` and `dd-dev-studio-web` are deployed
from commit `a51d669`; `terraform plan` reports no changes.

## Implementation decisions

These were made during implementation, without the implementation-decision
review that Section 2 schedules before the tests, and were confirmed by the
project owner on 2026-10-13.

| # | Decision |
|---|---|
| 1 | Mantine 9.7.1: `@mantine/core`, `form`, `hooks`, `modals`, and `notifications`. |
| 2 | React Router 8.4.0 for the pages. |
| 3 | TanStack Query 5.104.1 for API calls from the pages. |
| 4 | Zod 4.6.5 for the input schemas in `packages/contracts/`, shared by `studio-api` and the forms. |
| 5 | Drizzle ORM 0.45.4 and drizzle-kit 0.31.11, as approved; the permissions are copied in by a separate migration per Feature Request. |
| 6 | The end-to-end test gives `studio-api` a fresh local Content D1 with every migration applied and a local stand-in for Cloudflare's API. |
| 7 | `devops/db/query.sh`, added to the scope on 2026-10-13. |

## Findings during implementation

- **The implementation-decision review was skipped.** The choices above were
  made while building and confirmed by the owner afterwards.
- **The owner's WSL was rebuilt** before verification. The credential file and
  the R2 token were recreated; the old R2 key pair no longer worked. The
  onboarding script then passed 21 of 21.
- **pnpm was not on the PATH** of terminals opened before onboarding installed
  it. `devops/db/query.sh` therefore uses the workspace's own Wrangler.
- **ShellCheck 0.9 to 0.11** report the `check_*` and `fix_*` functions in
  `devops/onboarding.sh` (FR-00000) as unreachable (SC2317, or SC2329 in 0.11),
  because they are called by name. A file-wide disable with its reason was
  added at the owner's request.
- **The first gateway test timed out at 5 seconds** on the owner's machine,
  while the Worker started from the repository on a Windows drive. The
  Workers-runtime test projects now have a 30-second timeout.
- **The clean clone found two files without the executable bit.**
  `core.filemode` is off on the Windows drive, so `devops/db/query.sh` and
  `tests/FR-00004/db_query_test.sh` were committed as `100644` in `5ca93fe`;
  `5d33b5f` makes them executable.
- **Harness updates in earlier Feature Requests' tests:** the onboarding tests
  clear real credential variables, and the end-to-end run uses its own Wrangler
  dev registry and a fresh local Content D1.

## Test results

| Test | Result |
|---|---|
| `pnpm test` (Workers runtime and jsdom) | 128 passed |
| `pnpm run typecheck` | passed |
| `pnpm run test:e2e` (Chromium) | 4 passed |
| `tests/FR-00004/terraform_test.sh` | 8 passed |
| `tests/FR-00004/db_query_test.sh` | 18 passed |
| FR-00000 to FR-00003 shell tests | all passed, including `tests/FR-00000/terraform_test.sh` with 9 passed and `tests/FR-00003/deployed_test.sh` with 3 passed |
| ShellCheck | no findings |
| `devops/onboarding.sh` on the owner's machine | 21 passed |

On the owner's machine `pnpm test` first passed 127 of 128; the gateway
timeout above was the one failure. After the timeout change it passed 128 of
128 from the clean clone below.

`tests/FR-00004/db_query_test.sh` was written before the script and failed
18 of 18 first. The other FR-00004 tests were written before the code they
check, as recorded in commit `c24756e`.

Verified against Cloudflare: `terraform plan` reports no changes; no
migrations are waiting for `dd-dev-content`; its `permissions` table holds the
four FR-00004 permissions. The project owner signed in as the SuperAdmin,
created a role and a user for a second email address, signed in as that user
and saw only the pages the role allows, confirmed that an address that is not
a user cannot request a PIN, and deactivated the second user, who was refused
and removed from the Access group.

Verified from a clean clone of commit `5d33b5f` in a separate Linux
environment with Node.js 24.21.0 and pnpm 12.10.1: `pnpm install
--frozen-lockfile`, `pnpm run typecheck`, `pnpm test` (128 passed), every
shell test that needs no credentials or network (all passed), and ShellCheck;
no file in the clone changed. That environment has no credentials, cannot
download Chromium, and cannot reach `workers.dev`, so the end-to-end,
Terraform, and deployed tests were run on the owner's machine against the same
files.

## Limitations and follow-up work

- There is no page for audit records and no "My account" page.
- Users cannot be invited by email; the owner tells them to sign in.
- The deployed site cannot be tested past Access automatically; an Access
  service token for automation belongs with the CI/CD decision.
- Deployments and migrations in Cloudflare are manual.

## GitHub Issue completion recap

> FR-00004 Content D1 and user model is implemented. Content D1
> (`dd-dev-content`, EU) holds Content Studio's users, roles, permissions, and
> audit records, and Content Studio has its Mantine layout with the Users,
> Roles, and Permissions pages. Every active user is kept in the Access group
> "Content Studio users", so only users can request a PIN, and every
> `studio-api` method checks its permission. `devops/db/query.sh` reads the
> database safely. All FR-00000 to FR-00004 tests pass.
