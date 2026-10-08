# FR-00001: Worker dev workflow

- **Status:** Pending documentation
- **Sprint:** Not used. The project has one developer, so sprints are not used.
- **Type:** Implementation
- **Tracking:** No GitHub Issue yet.

## 1. Purpose

Deliver the first domain Worker, `gateway`, deployed as `dd-dev-gateway`, with
one public `/health` endpoint. It sets up the development workflow every later
Worker uses: the TypeScript workspace, tests in the real Workers runtime, the
Worker created by Terraform, its code deployed by Wrangler, and the standard
API response format.

It delivers no game, player, or Content Studio functionality.

## 2. Implementation sequence

1. Move this Feature Request to `Backlog`, then to `In Progress`.
2. Guard the FR-00000 Terraform test so it applies only when `plan` reports no
   changes.
3. Write the onboarding checks for Node.js, pnpm, and the project dependencies,
   confirm they fail, extend `devops/onboarding.sh` until they pass, and run it
   on the owner's machine.
4. Write the workspace, contract, and `/health` tests and confirm they fail.
5. Create the pnpm workspace, `packages/contracts/`, and `apps/gateway/` until
   the tests pass.
6. Write the Terraform checks for the `dd-dev-gateway` Worker, confirm they
   fail, and add the Worker to `infra/terraform/envs/dev/`.
7. Apply Terraform, deploy the code with Wrangler, and verify the deployed
   `/health`.
8. Add the commands to `AGENTS.md`.
9. Complete `implementation_report.md` and move to `In Review`.
10. After acceptance, hand over to documentation and as-built.

## 3. Scope boundaries

This Feature Request creates or changes:

- a pnpm workspace at the repository root for `apps/*` and `packages/*`, with
  Node.js 24 pinned;
- `packages/contracts/` with the shared type for the standard response format;
- `apps/gateway/`, the `gateway` Worker with the `/health` endpoint;
- the `dd-dev-gateway` Worker resource in `infra/terraform/envs/dev/`, with its
  `workers.dev` address enabled;
- `devops/onboarding.sh` and `devops/README.md`, extended to check and help
  install Node.js 24, pnpm, and the project dependencies;
- `doc/howto-cloudflare-setup.md`, with a step for Node.js and pnpm;
- `tests/FR-00000/terraform_test.sh`, guarded so `apply` runs only when `plan`
  reports no changes;
- the FR-00001 tests in `tests/FR-00001/`; and
- the commands in `AGENTS.md`.

This Feature Request does not create or change:

- the `player`, `session`, `catalog`, or `studio-api` Workers;
- any binding to D1, R2, Durable Objects, Queues, or another Worker;
- Player Identity, the API Gateway's routing, or authentication;
- Content Studio or the Godot client;
- a custom domain;
- deployment automation, such as GitHub Actions; or
- logging beyond Cloudflare's defaults.

## 4. Source

- [Initial deployment model](../../../doc/08-technical/service-architecture/deployment-model.md),
  section "Domain Workers".
- [Technology and tooling](../../../doc/08-technical/service-architecture/technology.md).
- [Access and edge services](../../../doc/08-technical/service-architecture/access-and-edge.md),
  section "Standard response format".
- [DD-015, DD-016, DD-017, and DD-019](../../../doc/12-decisions/decision-log.md).
- [`AGENTS.md`](../../../AGENTS.md), section "TypeScript and Cloudflare Workers".
- [FR-00000](../FR-00000-feature-request-terraform-setup/README.md): the
  Terraform setup and onboarding script this Feature Request extends.
- [`doc/test-driven-development.md`](../../../doc/test-driven-development.md).

Design baseline commit: `831eba7`.

Source-document readiness gate: passes for this scope. The open technical
decisions in the service architecture concern identity details, sessions,
recovery, queues, D1, observability, notifications, secrets, CI/CD, game
servers, and the 3D pipeline, which this Feature Request does not use.

## 5. Target ownership

- **Online services:** the `gateway` Worker owns `/health`. Terraform owns the
  Worker resource; Wrangler owns its code versions.
- **Database, Content Studio, runtime manifest, Godot app, 3D production:**
  N/A. This Feature Request does not touch them.

## 6. Prerequisites and deployment blockers

- FR-00000 is `Pending documentation` or later.
- The onboarding script passes for the FR-00000 checks on the owner's machine.
- Node.js 24 and pnpm are installed, with help from the extended onboarding
  script.

Blockers: none.

## 7. Approved decisions

- The first domain Worker is `gateway`, deployed as `dd-dev-gateway`, with code
  in `apps/gateway/src/` (DD-017).
- Terraform creates the Worker with the `cloudflare_worker` resource and enables
  its `workers.dev` address; Wrangler uploads its code (DD-016).
- TypeScript, following the rules in `AGENTS.md` (DD-015).
- Node.js 24 LTS, pinned to an exact version; pnpm workspaces at the repository
  root for `apps/*` and `packages/*`; Vitest with `@cloudflare/vitest-plugin`.
- `/health` returns the standard response format (DD-019): `status` `"ok"`,
  `code` `null`, a short `message`, `data` `null`, and `meta` with the request
  ID, timestamp, service `gateway`, environment `dev`, and the deployment
  version from Cloudflare's version metadata: version ID, tag, and creation
  time, never a Git commit.
- URL: the `workers.dev` address, `dd-dev-gateway.hj-d8e.workers.dev`.
- The onboarding script is extended, not duplicated.
- Wrangler and Terraform use the credentials already in the owner's credential
  file; no new credential is stored in the repository.

## 8. Data model and Content Studio

N/A. No records, migrations, or Content Studio behaviour.

## 9. Runtime manifest and Godot runtime

N/A. The Godot runtime does not use this endpoint.

## 10. Online services and access

`/health` is public and needs no authentication. It returns the standard
response format and no player, account, configuration, or secret data. The
deployment version it reports is Cloudflare's version metadata, which reveals
no source code or credential.

- `GET /health` returns HTTP 200 with `status` `"ok"`.
- Any other method on `/health` returns HTTP 405 with an `Allow: GET` header
  and the standard response format, `status` `"error"`, and a stable `code`.
- Any other path returns HTTP 404 with the standard response format,
  `status` `"error"`, and a stable `code`.

## 11. Player experience and UX

N/A. There is no player-facing change.

## 12. 3D assets and production contracts

N/A. No assets are used.

## 13. Logging, telemetry, and diagnostics

Each response's `meta.requestId` is generated with a cryptographically secure
random function. No application logging is added beyond Cloudflare's defaults.

## 14. Test-first implementation

Write these checks before the implementation and confirm they fail first:

- The onboarding script fails when Node.js is missing or older than 24, when
  pnpm is missing, or when the project dependencies are not installed, and in
  guided mode installs each only after Yes.
- The pnpm workspace includes `apps/*` and `packages/*`, and Node.js 24 is
  pinned.
- `packages/contracts/` exports the standard response type.
- TypeScript type checking passes in strict mode.
- `GET /health` returns HTTP 200 and the standard response with `status`
  `"ok"`, `code` `null`, `data` `null`, service `gateway`, environment `dev`,
  and the version ID, tag, and creation time from the version metadata.
- Another method on `/health` returns HTTP 405 with `Allow: GET` and the
  standard error response.
- Another path returns HTTP 404 with the standard error response.
- Two requests return different `meta.requestId` values.
- Terraform declares the `dd-dev-gateway` Worker with its `workers.dev`
  address enabled, and `fmt` and `validate` pass.
- The FR-00000 Terraform test applies only when `plan` reports no changes.
- No credentials or account details are present in tracked files.

Every check is kept as a test in `tests/FR-00001/`, named after the check it
proves. Tests of the Worker run locally in the Workers runtime through Vitest.
Tests that need Cloudflare access are recorded as blocked, not passed, when the
credential file is missing.

The exact commands are added to `AGENTS.md` during implementation.

## 15. Implementation report

`implementation_report.md` is required before this Feature Request moves to
`In Review`. It must not contain credentials, keys, account IDs, or email
addresses.

## 16. Verification

- All Section 14 checks pass.
- The onboarding script passes on the owner's machine.
- `terraform apply` creates the `dd-dev-gateway` Worker, and a second `plan`
  reports no changes.
- After `wrangler deploy`, `GET https://dd-dev-gateway.hj-d8e.workers.dev/health`
  returns the expected standard response, and its `meta.version` matches the
  deployed version in Cloudflare.
- Another method and another path on the deployed URL return 405 and 404 with
  the standard error response.
- The commands in `AGENTS.md` work from a clean checkout.

Acceptable evidence is command output and HTTP responses, with credentials
removed.

## 17. Acceptance criteria

- All verification checks in Section 16 have passed.
- `implementation_report.md` is complete.
- No unresolved decisions remain.
- No unapproved changes were made.

## 18. Unresolved decisions

None. Implementation details, such as the deployment tag format and how
Terraform receives the account ID, are settled in the implementation-decision
review before tests are written.
