# FR-00003 implementation report

Implementation of [FR-00003: Worker access policy](README.md). This report
contains no credentials, keys, tokens, account IDs, or email addresses.

## Created and changed

| Path | Result |
|---|---|
| `apps/studio-api/` | `@dungeon-destiny/studio-api`: the Worker as a `WorkerEntrypoint` with the RPC methods `health()` and `me(identity)`, the SuperAdmin check in `src/access.ts`, its Wrangler configuration with `env.dev` and no `workers.dev` address, and generated types. |
| `apps/studio-web/` | `@dungeon-destiny/studio-web`: the Worker in `src/worker/`, with the Access token check, `/api/me`, `/api/health`, and the static assets; the React pages in `src/app/`, `src/features/session/`, `src/features/status/`, and `src/shared/`; its Wrangler configuration with the assets, the `STUDIO_API` service binding, the team domain, and the AUD tag. |
| `packages/contracts/` | The error codes `UNAUTHENTICATED` and `NOT_STAFF`, and the types `StaffIdentity`, `StaffRole`, `StaffMember`, and `StudioApiRpc`. |
| `infra/terraform/envs/dev/studio.tf`, `variables.tf` | The `dd-dev-studio-api` and `dd-dev-studio-web` Workers, the one-time PIN sign-in method, the Access application with its SuperAdmin-only policy, the AUD output, and the `studio_superadmin_email` variable. |
| `devops/deploy-studio-api.sh` | Deploys `studio-api` with the SuperAdmin email address as a variable, refuses to run without it, and masks it in Wrangler's output. |
| `devops/onboarding.sh`, `devops/README.md` | Checks for `STUDIO_SUPERADMIN_EMAIL` as a plain email address, Cloudflare Zero Trust, and Playwright's Chromium. |
| `doc/howto-cloudflare-setup.md` | Step 11, Zero Trust; step 12, Chromium; the SuperAdmin email address in the credential file; the emergency route. |
| `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `.gitignore` | Pinned React 19.3.0, Vite 8.3.4, `@vitejs/plugin-react` 6.1.2, `jose` 6.2.12, React Testing Library 16.3.3, `user-event` 14.6.7, `jest-dom` 7.0.1, jsdom 30.1.2, and Playwright 1.64.0; one Vitest project per Worker plus one for the pages; the `test:e2e` and extended `typecheck` scripts; Playwright's output ignored. |
| `tests/FR-00003/` | The FR-00003 tests. |
| `tests/FR-00000/`, `tests/FR-00001/`, `tests/FR-00002/` | Harness updates for FR-00003, listed under findings. |
| `AGENTS.md` | Content Studio commands, the deploy order, and the before- and after-deploy test rules. |

Final deployed state:

- `dd-dev-studio-api` is deployed as version `87698735` and has no public
  address.
- `dd-dev-studio-web` is deployed as version `2f61048c` at
  `https://dd-dev-studio-web.hj-d8e.workers.dev`, behind the Access
  application.
- `terraform plan` reports no changes.

## Implementation decisions

Approved by the project owner before the affected work.

| # | Decision |
|---|---|
| 1 | Folders and packages `apps/studio-api/` (`@dungeon-destiny/studio-api`) and `apps/studio-web/` (`@dungeon-destiny/studio-web`). |
| 2 | Terraform creates `dd-dev-studio-api` without and `dd-dev-studio-web` with a `workers.dev` address; preview URLs are off for both, and Wrangler matches. |
| 3 | Compatibility date `2026-10-07`; no `nodejs_compat`. |
| 4 | Vite builds the pages into `apps/studio-web/dist/`; Wrangler serves them as static assets with `single-page-application` handling and `run_worker_first`. |
| 5 | `studio-web` calls `studio-api` through typed RPC on the service binding and passes the identity as a typed argument. |
| 6 | Cloudflare Zero Trust is turned on by hand; Terraform does not manage the Zero Trust organization. |
| 7 | Terraform creates the one-time PIN sign-in method; the application allows only it and redirects to it. |
| 8 | A self-hosted Access application for `dd-dev-studio-web.hj-d8e.workers.dev` with a 24-hour session and a policy that allows only the SuperAdmin. |
| 9 | The SuperAdmin email address is kept in the private credential file; the team domain and the AUD tag, which are not secrets, are in `apps/studio-web/wrangler.jsonc`. |
| 10 | The `studio-api` deploy passes the SuperAdmin email address with `--var` and refuses to run without it; `studio-api` compares addresses without regard to case. |
| 11 | Exact pins for React 19.3.0, Vite 8.3.4, and `@vitejs/plugin-react` 6.1.2; no router yet. |
| 12 | Plain CSS. |
| 13 | `jose` 6.2.12 checks the token's signature, issuer, audience, and expiry, with RS256 only. |
| 14 | Error codes `UNAUTHENTICATED` (401) and `NOT_STAFF` (403). |
| 15 | Vitest projects for the Workers runtime and jsdom; token tests use keys the tests generate. |
| 16 | Playwright 1.64.0 with Chromium only, against both Workers run locally and a local stand-in for Access's key server. |
| 17 | The Access policy is defined inside the Access application instead of as a separate reusable policy (option B, approved during implementation). |

## Findings during implementation

- **A hidden byte in the SuperAdmin email address** broke pnpm, which refused
  to start, and made Terraform report a change on every `plan`, although its
  plan file showed identical values. While the cause was unknown, the policy
  was moved into the Access application and a check that accepted only that
  phantom change was added. Once the owner retyped the value, `plan` reported
  no changes, and that check was removed. The onboarding script now refuses
  a SuperAdmin email address that is not a plain address.
- **Deleting a reusable Access policy still used by an application** is
  refused by Cloudflare with HTTP 409, so the move into the application was
  applied in two steps: the application first, then the old policy.
- **Wrangler's typed service binding** makes `studio-web`'s compiler check
  `studio-api`'s source with `studio-web`'s bindings. `studio-web` instead
  types the binding with the shared `StudioApiRpc` contract, which
  `studio-api` implements, as DD-017 describes.
- **Cloudflare's Vitest integration** runs a second Worker only when it is
  prebuilt JavaScript. Each Worker is tested on its own, `studio-web` with a
  stand-in `studio-api`, and the Playwright test covers both together.
- **`wrangler dev` with two configurations** passes `--var` only to the first
  Worker, so the end-to-end test runs the Workers as two processes, connected
  through Wrangler's local dev registry.
- **Wrangler prints Worker variables when deploying.** The deploy script masks
  the SuperAdmin email address; Wrangler itself shows a `--var` value as
  hidden.
- **The FR-00001 contracts test** required the error codes to be exactly
  `NOT_FOUND` and `METHOD_NOT_ALLOWED`; it now checks that both are included.
  The FR-00000, FR-00001, and FR-00002 onboarding sandboxes gained a fake
  SuperAdmin email address, and the FR-00000 Terraform test passes the
  SuperAdmin email address to Terraform and masks it.
- **The Workers' `workers.dev` address returns 404 until code is deployed,**
  before Access applies. After the deploy, Access redirects every request.

## Test results

| Test | Result |
|---|---|
| `pnpm test` (Workers runtime and jsdom) | 36 passed |
| `pnpm run typecheck` | passed |
| `pnpm run test:e2e` (Chromium) | 3 passed |
| `tests/FR-00003/onboarding_access_test.sh` | 9 passed |
| `tests/FR-00003/terraform_access_test.sh` | 9 passed |
| `tests/FR-00003/deploy_script_test.sh` | 4 passed |
| `tests/FR-00003/deployed_test.sh` | 3 passed |
| FR-00000, FR-00001, and FR-00002 tests | all passed, including `tests/FR-00000/terraform_test.sh` with 9 passed |
| ShellCheck | no findings |
| `devops/onboarding.sh --check` on the owner's machine | 21 passed |

Written before the code they check, and failed first: the onboarding tests
(8 of 8, and the plain-email test added later), the Worker and page tests
(27 of 27), the Terraform tests (6 of 9; the other 3 checked what was already
in place), and the deploy-script tests (3 of 4; the fourth, that a Wrangler
failure is reported, passed trivially while the script was missing). The
end-to-end browser tests failed first only because Chromium was not yet
installed. Two tests were written after the code they check: the contracts
error-code test, and `tests/FR-00003/deployed_test.sh`, written after the
deploy to repeat the deployed checks after every later deploy.

Verified against Cloudflare: Terraform created both Workers and the Access
setup, and `plan` reports no changes; without signing in, the deployed
`studio-web` address redirects pages and `/api/me` to
`dd-main-team.cloudflareaccess.com`; `studio-api` has no address. The owner
signed in with a one-time PIN and saw the signed-in page with the
`studio-api` status.

Verified from a clean clone of commit `2ca1885`: `pnpm install
--frozen-lockfile`, `pnpm run typecheck`, every test above including the
end-to-end and Terraform tests, ShellCheck, and the onboarding script. No file
in the clone changed.

## Limitations and follow-up work

- Only the SuperAdmin can sign in. Content D1, the staff table, the Staff
  users screen, and opening the Access policy follow in the staff-users
  Feature Request.
- Keeping an Access group in step with the staff table waits for the Worker
  secret management decision.
- The deployed site cannot be tested past Access automatically; an Access
  service token for automation belongs with the CI/CD decision.
- Deployments are manual.
- The provider lock file records checksums for `linux_amd64` only.

## GitHub Issue completion recap

> FR-00003 Worker access policy is implemented. Content Studio's `studio-web`
> and `studio-api` Workers are deployed behind Cloudflare Access with
> one-time PIN sign-in, and only the SuperAdmin, whose email address is kept
> outside the repository, is let in. `studio-web` checks the Access token on
> every request and calls `studio-api` through typed RPC. All FR-00000 to
> FR-00003 tests pass, including a browser end-to-end test, also from a clean
> clone.
