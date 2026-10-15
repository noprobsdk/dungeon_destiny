# Delivery pipeline

This page describes how Dungeon Destiny's Workers are built, tested, and
deployed.

Sources: [FR-00001: Worker dev workflow](../../../FR/FR-00001-worker-dev-workflow/README.md).

## Workspace

| Item | Value |
|---|---|
| Package manager | pnpm `12.10.1`, pinned in `packageManager` in `package.json` |
| Node.js | `24.21.0`, pinned in `.node-version` |
| Workspace | `pnpm-workspace.yaml`, covering `apps/*` and `packages/*`; `pnpm-lock.yaml` committed |
| Install scripts | Only `esbuild` and `workerd` may run install scripts |
| Language | TypeScript `7.0.2` in strict mode, from `tsconfig.base.json` |

| Package | Location | Contents |
|---|---|---|
| `@dungeon-destiny/contracts` | `packages/contracts/` | The standard response type and the shared error codes |
| `@dungeon-destiny/gateway` | `apps/gateway/` | The `gateway` Worker, its Wrangler configuration, generated types, and the `deploy:dev` script |

## Worker configuration

Each Worker has a `wrangler.jsonc` with an `env.dev` block that names the
deployed Worker, such as `dd-dev-gateway`. The `workers.dev` address is enabled
and preview URLs are disabled, matching the Terraform resource. The
compatibility date is `2026-10-07`, without `nodejs_compat`. After changing a
`wrangler.jsonc`, the Worker types are regenerated with Wrangler.

## Tests

- Vitest `4.1.11` with `@cloudflare/vitest-plugin` `1.3.7` runs the Worker
  tests in the Workers runtime, configured in `vitest.config.ts` with each
  Worker's `dev` environment.
- Vitest tests are named `tests/FR-<number>/*.test.ts`; shell tests are named
  `tests/FR-<number>/*_test.sh`.
- `pnpm test` runs the Vitest tests and `pnpm run typecheck` checks the types.
- Tests that need Cloudflare access are recorded as blocked when the credential
  file is missing.

Vitest stays on version 4, because Cloudflare's Vitest plugin does not support
Vitest 5 yet. Wrangler's local state, `.wrangler/`, is ignored by Git.

## Deployment

Terraform creates each Worker; Wrangler `4.148.0` uploads its code with
`--env dev`. The `deploy:dev` script tags each deployment
`dev-YYYYMMDD-HHMMSS` in UTC. Wrangler signs in with `CLOUDFLARE_API_KEY`,
`CLOUDFLARE_EMAIL`, and `CLOUDFLARE_ACCOUNT_ID` from the owner's credential
file. A deploy changes the live Worker and needs the owner's approval.

Deployments are manual. There is no deployment automation, such as GitHub
Actions. The commands are in `AGENTS.md`.

## Verification

FR-00001, accepted on 2026-10-08. `pnpm test` passed 8 tests in the Workers
runtime, and the workspace, type-check, and deployed tests in
`tests/FR-00001/` pass. After deployment, the deployed version reported by the
Worker matched the version Wrangler reported. Verified from a clean clone of
commit `c0acb7b`: `pnpm install --frozen-lockfile`, every test,
`pnpm run typecheck`, and the `AGENTS.md` local run.
