# FR-00001 implementation report

Implementation of [FR-00001: Worker dev workflow](README.md). This report
contains no credentials, keys, account IDs, or email addresses.

## Created and changed

| Path | Result |
|---|---|
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.node-version` | pnpm workspace for `apps/*` and `packages/*`; Node.js `24.21.0`; `pnpm@12.10.1`; test tooling at the root: Vitest `4.1.11`, `@cloudflare/vitest-plugin` `1.3.7`, Wrangler `4.148.0`, TypeScript `7.0.2`. Only `esbuild` and `workerd` may run install scripts. |
| `tsconfig.base.json`, `vitest.config.ts` | Strict TypeScript; Vitest runs the tests in the Workers runtime with `apps/gateway/wrangler.jsonc` and its `dev` environment. |
| `packages/contracts/` | `@dungeon-destiny/contracts`: the standard response type (DD-019) and the error codes `NOT_FOUND` and `METHOD_NOT_ALLOWED`. |
| `apps/gateway/` | `@dungeon-destiny/gateway`: the Worker, its Wrangler configuration with `env.dev`, generated types, and the `deploy:dev` script. |
| `infra/terraform/envs/dev/variables.tf`, `workers.tf` | The `cloudflare_account_id` variable and the `dd-dev-gateway` Worker with its `workers.dev` address, previews disabled, and Wrangler's deploy tags. |
| `devops/onboarding.sh`, `devops/README.md` | Checks and guided installs for Node.js 24, pnpm, and the project dependencies. |
| `doc/howto-cloudflare-setup.md` | Step 9: Node.js 24, pnpm, and the project dependencies. |
| `tests/FR-00001/` | The FR-00001 tests. |
| `tests/FR-00000/onboarding_test.sh`, `terraform_test.sh` | Harness updated for FR-00001; the Terraform test applies only when `plan` reports no changes. |
| `.gitignore` | Ignores Wrangler's local state, `.wrangler/`. |
| `AGENTS.md` | Worker, Terraform, and test commands. |

Final deployed state:

- `dd-dev-gateway` exists in Cloudflare, created by Terraform, with its address
  at `https://dd-dev-gateway.hj-d8e.workers.dev`.
- Deployed version `91a813ee-b768-48bb-a9b0-963f17145c98`, tag
  `dev-20261008-100208`.
- `terraform plan` reports no changes.

## Implementation decisions

Approved by the project owner before the affected work.

| # | Decision |
|---|---|
| 1 | `apps/gateway/wrangler.jsonc` with an `env.dev` block named `dd-dev-gateway`; deploys use `--env dev`. |
| 2 | `workers.dev` enabled and preview URLs disabled in both Terraform and Wrangler, checked by a test. |
| 3 | Compatibility date `2026-10-07`; no `nodejs_compat`. |
| 4 | Only the `CF_VERSION_METADATA` binding and the `ENVIRONMENT` variable. |
| 5 | Terraform reads the account ID from `TF_VAR_cloudflare_account_id`, set from the credential file. |
| 6 | Wrangler signs in with the existing `CLOUDFLARE_API_KEY`, `CLOUDFLARE_EMAIL`, and `CLOUDFLARE_ACCOUNT_ID`. |
| 7 | Deployment tag `dev-YYYYMMDD-HHMMSS` in UTC, set by the `deploy:dev` script. |
| 8 | Exact pins: `.node-version` and `packageManager`; the onboarding script requires Node.js 24.x. |
| 9a | Node.js 24 from NodeSource with `setup_24.x`, because NodeSource's "current" instructions now install Node.js 26. |
| 9b | pnpm from its standalone installer at the pinned version, without `sudo`, because Corepack is no longer bundled from Node.js 25. |
| 10 | Package names `@dungeon-destiny/contracts` and `@dungeon-destiny/gateway`. |
| 11 | Vitest tests in `tests/FR-00001/*.test.ts`, run in the Workers runtime; shell tests as `tests/FR-00001/*_test.sh`. |
| 12 | Error codes `NOT_FOUND` and `METHOD_NOT_ALLOWED`; `requestId` from `crypto.randomUUID()`; ISO 8601 UTC timestamps. |
| 13 | The FR-00000 Terraform test applies only when `plan` reports no changes. |
| 14 | Terraform declares the tags Wrangler sets on deploy, `cf:environment=dev` and `cf:service=gateway`. |

## Findings during implementation

- **NodeSource's instructions are out of date:** they label `setup_current.x`
  as Node.js 24, but "current" is now Node.js 26. The script uses
  `setup_24.x`.
- **Corepack is leaving Node.js,** and pnpm's own installation page no longer
  mentions it. pnpm is installed with its standalone installer instead.
- **pnpm 12 installs into `~/.local/share/pnpm/bin/`,** not the folder itself.
  The script first reported pnpm as missing right after installing it; a test
  now uses the real location. Open terminals also need `source ~/.bashrc`; the
  script now says so.
- **Cloudflare's Vitest plugin does not support Vitest 5 yet,** so Vitest
  stays on 4.1.11.
- **`wrangler types` does not declare the Worker's main module for tests;** a
  small declaration in `tests/FR-00001/env.d.ts` does. It is not a binding.
- **Wrangler adds tags on deploy,** which Terraform then wanted to remove.
  Declaring them in Terraform removed the drift without re-applying.
- **Wrangler's local state, `.wrangler/`,** was nearly committed; it is now
  ignored, with a test.
- **The FR-00000 tests needed small changes:** a Node.js and pnpm stand-in, a
  fake repository for the onboarding tests, and the account ID variable for the
  Terraform tests.

## Test results

| Test | Result |
|---|---|
| `pnpm test` (Vitest, Workers runtime) | 8 passed |
| `tests/FR-00001/onboarding_node_test.sh` | 10 passed |
| `tests/FR-00001/workspace_test.sh` | 5 passed |
| `tests/FR-00001/typecheck_test.sh` | passed |
| `tests/FR-00001/terraform_guard_test.sh` | passed |
| `tests/FR-00001/terraform_worker_test.sh` | 6 passed |
| `tests/FR-00001/deployed_test.sh` | 4 passed |
| `tests/FR-00000/onboarding_test.sh` | 27 passed |
| `tests/FR-00000/terraform_test.sh` | 9 passed |
| ShellCheck | no findings |
| `devops/onboarding.sh --check` on the owner's machine | 16 passed |

Verified locally: the Worker in the Workers runtime through Vitest and
`wrangler dev`, the onboarding script with stand-in programs, and the
Terraform configuration.

Verified against Cloudflare: Terraform created `dd-dev-gateway` and a second
`plan` reports no changes; the deployed `/health`, 405, and 404 responses; and
that `meta.version` matches the version Wrangler reports as deployed.

Verified from a clean clone of commit `c0acb7b`: `pnpm install
--frozen-lockfile`, every test above, `pnpm run typecheck`, ShellCheck, the
`AGENTS.md` local run, and Terraform `init`, `plan` (no changes), and `fmt`. No
file in the clone changed.

## Limitations and follow-up work

- `/health` is public. It returns only status and version information.
- The provider lock file still records checksums for `linux_amd64` only.
- Deployments are manual; deployment automation is a later Feature Request.
- The setup guide runs NodeSource's setup script with `sudo -E`, as NodeSource
  documents; this showed a harmless `gpg` ownership warning.

## GitHub Issue completion recap

> FR-00001 Worker dev workflow is implemented. The `gateway` Worker is created
> by Terraform and deployed by Wrangler as `dd-dev-gateway`; its public
> `/health` returns the standard response format with the deployed version. The
> pnpm workspace, contracts package, Workers-runtime tests, and extended
> onboarding script are in place. All FR-00000 and FR-00001 tests pass, also
> from a clean clone.
