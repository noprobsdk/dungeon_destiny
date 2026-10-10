# FR-00003: Worker access policy

- **Status:** Pending documentation
- **Sprint:** Not used. The project has one developer, so sprints are not used.
- **Type:** Implementation
- **Tracking:** [GitHub Issue #4](https://github.com/noprobsdk/dungeon_destiny/issues/4), milestone "Content Studio - Basic user management".

## 1. Purpose

Deliver the first, empty Content Studio: the `studio-web` and `studio-api`
Workers, protected by Cloudflare Access, with one SuperAdmin who can sign in
and see a signed-in page showing that `studio-api` is running. It proves the
whole path from the browser through Access, `studio-web`, and the service
binding to `studio-api` (DD-020).

It uses no database and delivers no content screens. Content D1, the staff
table, and the Staff users screen follow in a later Feature Request.

## 2. Implementation sequence

1. Move this Feature Request to `Backlog`, then to `In Progress`.
2. Turn on Cloudflare Zero Trust and choose a team name, following the new
   setup-guide step; extend the onboarding script with the checks it needs.
3. Write the `studio-api` and `studio-web` tests and confirm they fail.
4. Create `apps/studio-api/` and `apps/studio-web/` until the tests pass.
5. Write the Terraform checks for the two Workers and the Access setup,
   confirm they fail, and add them to `infra/terraform/envs/dev/`.
6. Apply Terraform, deploy both Workers with Wrangler, and verify the deployed
   Content Studio.
7. Add the commands to `AGENTS.md`.
8. Complete `implementation_report.md` and move to `In Review`.
9. After acceptance, hand over to documentation and as-built.

## 3. Scope boundaries

This Feature Request creates or changes:

- `apps/studio-api/`, the `studio-api` Worker with `/health` and an endpoint
  that returns the signed-in person;
- `apps/studio-web/`, the `studio-web` Worker serving the React and Vite pages
  as static assets and passing `/api/*` to `studio-api`;
- shared types in `packages/contracts/`, where both Workers need them;
- the `dd-dev-studio-api` and `dd-dev-studio-web` Workers and the Cloudflare
  Access setup in `infra/terraform/envs/dev/`;
- `devops/onboarding.sh` and `devops/README.md`, with the new checks;
- `doc/howto-cloudflare-setup.md`, with the Zero Trust step and the emergency
  route;
- the FR-00003 tests in `tests/FR-00003/`; and
- the commands in `AGENTS.md`.

This Feature Request does not create or change:

- Content D1, Drizzle, migrations, or any other database or storage;
- the staff table, staff roles, or the Staff users screen;
- syncing staff users to an Access group;
- content screens, such as Heroes, Equipment, or Hero levels;
- the 3D asset store or private R2;
- the `gateway`, `player`, `session`, or `catalog` Workers;
- a custom domain; or
- deployment automation, such as GitHub Actions.

## 4. Source

- [DD-017 and DD-020](../../../doc/12-decisions/decision-log.md).
- [Frontends](../../../doc/08-technical/service-architecture/frontends.md).
- [Access and edge services](../../../doc/08-technical/service-architecture/access-and-edge.md),
  sections "Cloudflare Access", "Staff users", and "Standard response format".
- [Content Studio](../../../doc/09-content-studio/README.md).
- [`AGENTS.md`](../../../AGENTS.md), section "TypeScript and Cloudflare Workers".
- [FR-00001](../FR-00001-worker-dev-workflow/README.md): the
  workspace, Worker, and deployment workflow this Feature Request reuses.
- [`doc/test-driven-development.md`](../../../doc/test-driven-development.md).

Design baseline commit: `d03ad86`.

Source-document readiness gate: passes for this scope. The open decision on
Worker secret management concerns the later Access-group sync, which this
Feature Request does not include.

## 5. Target ownership

- **Online services:** `studio-web` owns the Content Studio pages and the
  Access token check; `studio-api` owns `/health` and the signed-in person
  endpoint. Terraform owns the Workers and the Access setup; Wrangler owns
  their code versions.
- **Content Studio:** the first, empty Content Studio frontend.
- **Database, runtime manifest, Godot app, 3D production:** N/A.

## 6. Prerequisites and deployment blockers

- FR-00001 is `Pending documentation` or later.
- Cloudflare Zero Trust is turned on for the account, with a team name, on its
  free plan. The plan's limits are confirmed before relying on it.
- The SuperAdmin email address is set as `STUDIO_SUPERADMIN_EMAIL` in the
  owner's private credential file.

Blockers: none.

## 7. Approved decisions

- Content Studio is a React single-page app in strict TypeScript, built with
  Vite, in `apps/studio-web/`, organized in feature folders (DD-020).
- `studio-web` (`dd-dev-studio-web`) serves the pages as Workers static assets
  and passes `/api/*` to `studio-api` (`dd-dev-studio-api`) through a service
  binding. `studio-api` has no public address (DD-017, DD-020).
- Staff sign in through Cloudflare Access with a one-time PIN sent by email.
  Terraform manages the Access application, its policy, and its session
  duration (DD-020).
- `studio-web` validates the Access token in the `Cf-Access-Jwt-Assertion`
  header on every request, against the team domain and the application's
  audience tag, and passes the signed-in person's identity to `studio-api`.
- One SuperAdmin is defined in configuration, not in a database. The
  SuperAdmin can always sign in and cannot be changed or deactivated from
  Content Studio. In this Feature Request, the SuperAdmin is the only person
  let in.
- The SuperAdmin email address is kept in the owner's private credential file
  as `STUDIO_SUPERADMIN_EMAIL`. Terraform reads it from there, and it is passed
  to the Workers at deploy time, so it never appears in the repository.
- The Access policy lets in only the SuperAdmin's email address, so nobody else
  can request a PIN. The later staff-users Feature Request opens it to any
  email address, with `studio-api` deciding who is let in.
- `studio-api` decides who is let in. Anyone else who passes Access receives
  the standard error response with a stable `code`, and the page shows that
  they are not allowed.
- No database is used.
- Responses use the standard response format (DD-019).
- No credential, key, or account ID is stored in the repository.

## 8. Data model and Content Studio

No data model, records, or migrations. Content Studio shows one signed-in page
with the SuperAdmin's email address and the status and version of
`studio-api`.

## 9. Runtime manifest and Godot runtime

N/A.

## 10. Online services and access

- Every request to `studio-web` passes Cloudflare Access, and `studio-web`
  refuses a request without a valid Access token, even if it reaches the
  Worker directly.
- `studio-api` is reachable only through the service binding.
- `GET /api/health` returns the standard response from `studio-api`.
- `GET /api/me` returns the signed-in person's email address and the role
  `superadmin` for the SuperAdmin, or HTTP 403 with the standard error
  response and a stable `code` for anyone else.
- An identity header sent by the browser is never trusted: `studio-web`
  replaces it with the identity from the validated Access token.
- No local or test-only way around the token check is present in deployed
  code.

## 11. Player experience and UX

N/A. There is no player-facing change. Staff see a sign-in through Access and
one signed-in page.

## 12. 3D assets and production contracts

N/A.

## 13. Logging, telemetry, and diagnostics

Each response's `meta.requestId` is generated with a cryptographically secure
random function. Refused requests are not logged with token values. No
application logging is added beyond Cloudflare's defaults.

## 14. Test-first implementation

Write these checks before the implementation and confirm they fail first:

- `studio-api` `GET /health` returns HTTP 200 and the standard response with
  service `studio-api`.
- `studio-web` refuses a request with no Access token, an invalid or expired
  token, or a token for another audience.
- With a valid token for the SuperAdmin, `GET /api/me` returns the email
  address and the role `superadmin`.
- With a valid token for anyone else, `GET /api/me` returns HTTP 403 and the
  standard error response.
- An identity header sent by the browser is ignored.
- `GET /api/health` through `studio-web` returns the `studio-api` health
  response.
- The signed-in page shows the SuperAdmin's email address and the `studio-api`
  status, and the not-allowed page is shown for anyone else.
- Terraform declares both Workers, `workers.dev` enabled only for
  `studio-web`, and the Access application and policy; `fmt` and `validate`
  pass.
- No credentials, account details, or the SuperAdmin email address are present
  in tracked files.

Every check is kept as a test in `tests/FR-00003/`, named after the check it
proves. Token checks use test keys generated by the tests, never real Access
tokens. Tests that need Cloudflare access are recorded as blocked, not passed,
when the credential file is missing.

The exact commands are added to `AGENTS.md` during implementation.

## 15. Implementation report

`implementation_report.md` is required before this Feature Request moves to
`In Review`. It must not contain credentials, keys, account IDs, tokens, or
email addresses.

## 16. Verification

- All Section 14 checks pass.
- The onboarding script passes on the owner's machine.
- `terraform apply` creates both Workers and the Access setup, and a second
  `plan` reports no changes.
- After deploying, the owner signs in with a one-time PIN and sees the
  signed-in page with the `studio-api` status.
- Without signing in, the deployed `studio-web` address does not return
  Content Studio pages or API responses.
- `studio-api` has no `workers.dev` address.
- The commands in `AGENTS.md` work from a clean checkout.

Acceptable evidence is command output, HTTP responses, and screenshots, with
credentials, tokens, and email addresses removed.

## 17. Acceptance criteria

- All verification checks in Section 16 have passed.
- `implementation_report.md` is complete.
- No unresolved decisions remain.
- No unapproved changes were made.

## 18. Unresolved decisions

None. Implementation details, such as the session duration, the identity
header name, and the token library, are settled in the implementation-decision
review before tests are written.
