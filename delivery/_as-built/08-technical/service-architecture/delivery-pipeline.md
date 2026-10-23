# Delivery pipeline

This page describes how Dungeon Destiny's Workers are built, tested, and
deployed.

Sources: [FR-00001: Worker dev workflow](../../../FR/FR-00001-worker-dev-workflow/README.md),
[FR-00003: Worker access policy](../../../FR/FR-00003-worker-access-policy/README.md),
[FR-00004: Content D1 and user model](../../../FR/FR-00004-content-d1-user-model/README.md).

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
| `@dungeon-destiny/contracts` | `packages/contracts/` | The standard response type, the shared error codes, the permission list, and the Content Studio types and Zod schemas, including `StudioApiRpc` |
| `@dungeon-destiny/gateway` | `apps/gateway/` | The `gateway` Worker, its Wrangler configuration, generated types, and the `deploy:dev` script |
| `@dungeon-destiny/studio-api` | `apps/studio-api/` | The `studio-api` Worker, its Wrangler and drizzle-kit configuration, the Content D1 schema and migrations, generated types, and the `deploy:dev` script |
| `@dungeon-destiny/studio-web` | `apps/studio-web/` | The `studio-web` Worker and the Content Studio pages, its Wrangler and Vite configuration, generated types, and the `build`, `dev`, and `deploy:dev` scripts |

FR-00003 added these exact pins: React and `react-dom` `19.3.0`, Vite
`8.3.4`, `@vitejs/plugin-react` `6.1.2`, `jose` `6.2.12`, React Testing Library
`16.3.3`, `@testing-library/user-event` `14.6.7`, `@testing-library/jest-dom`
`7.0.1`, jsdom `30.1.2`, and Playwright `1.64.0`. FR-00004 added Mantine
`9.7.1` (`@mantine/core`, `form`, `hooks`, `modals`, and `notifications`),
React Router `8.4.0`, TanStack Query `5.104.1`, Zod `4.6.5`, Drizzle ORM
`0.45.4`, and drizzle-kit `0.31.11`.

## Worker configuration

Each Worker has a `wrangler.jsonc` with an `env.dev` block that names the
deployed Worker, such as `dd-dev-gateway`. The `workers.dev` setting matches
the Terraform resource: enabled for `gateway` and `studio-web`, disabled for
`studio-api`. Preview URLs are disabled for every Worker. The compatibility
date is `2026-10-07`, without `nodejs_compat`. After changing a
`wrangler.jsonc`, the Worker types are regenerated with Wrangler, for the
Content Studio Workers with each package's `types` script.

`studio-web` builds the Content Studio pages with Vite into
`apps/studio-web/dist/`, which Wrangler serves as static assets.

## Tests

- Vitest `4.1.11` with `@cloudflare/vitest-plugin` `1.3.7` runs the Worker
  tests in the Workers runtime, configured in `vitest.config.ts` with each
  Worker's `dev` environment.
- `vitest.config.ts` has one Vitest project per Worker, `gateway`,
  `studio-api`, and `studio-web`, and one project, `studio-ui`, that runs the
  Content Studio page tests in jsdom with React Testing Library. Each Worker
  is tested on its own: `studio-api` with a test SuperAdmin email address and
  a local Content D1 with every migration applied, and `studio-web` with a
  stand-in `studio-api`. The Workers-runtime projects have a 30-second test
  timeout, because the first request starts the Worker, which is slow from
  the repository on a Windows drive.
- `pnpm run test:e2e` runs both Content Studio Workers locally as two
  `wrangler dev` processes, connected through Wrangler's local dev registry,
  and tests them in Chromium with Playwright. Tokens come from a local
  stand-in for Access's key server, `studio-api` gets a fresh local Content D1
  with every migration applied, and a local stand-in replaces Cloudflare's
  API, so the test needs no credentials. The run uses its own Wrangler dev
  registry.
- Vitest tests are named `tests/FR-<number>/*.test.ts`; FR-00003 and
  FR-00004 keep them in subfolders, `api/`, `web/`, `ui/`, and `e2e/`. Page tests end in
  `.test.tsx` and end-to-end tests in `.e2e.ts`. Shell tests are named
  `tests/FR-<number>/*_test.sh`.
- `pnpm test` runs the Vitest tests and `pnpm run typecheck` checks the types,
  including the Content Studio pages and the FR-00003 and FR-00004 tests.
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

Content Studio is deployed in this order: any new Content D1 migrations are
applied to Cloudflare first, then `studio-api`, then `studio-web`. Applying a
migration to Cloudflare needs the owner's approval, as described in
[Data services](data-services.md).

- `studio-api`'s `deploy:dev` runs `devops/deploy-studio-api.sh`, which passes
  `STUDIO_SUPERADMIN_EMAIL` and `CLOUDFLARE_ACCOUNT_ID` from the credential
  file to Wrangler as the `SUPERADMIN_EMAIL` and `CF_ACCOUNT_ID` variables. It
  refuses to run when the address is not set, masks both values in Wrangler's
  output, and returns Wrangler's exit status. Because `CF_ACCESS_GROUP_TOKEN`
  is declared as a required secret, the deploy fails when the secret has not
  been stored.
- `studio-web`'s `deploy:dev` builds the pages with Vite, then deploys.

Before every deploy, the whole local test suite runs, including
`pnpm run test:e2e`, and the deploy stops if anything fails. After every
deploy, the deployed tests run and `terraform plan` must report no changes.
The owner checks the one-time PIN sign-in by hand after a deploy that touches
`studio-web`, Cloudflare Access, or the SuperAdmin.

Deployments are manual. There is no deployment automation, such as GitHub
Actions. The commands are in `AGENTS.md`.

## Verification

FR-00001, accepted on 2026-10-08. `pnpm test` passed 8 tests in the Workers
runtime, and the workspace, type-check, and deployed tests in
`tests/FR-00001/` pass. After deployment, the deployed version reported by the
Worker matched the version Wrangler reported. Verified from a clean clone of
commit `c0acb7b`: `pnpm install --frozen-lockfile`, every test,
`pnpm run typecheck`, and the `AGENTS.md` local run.

FR-00003, accepted on 2026-10-10. `pnpm test` passed 36 tests in the Workers
runtime and jsdom, `pnpm run typecheck` passed, and `pnpm run test:e2e` passed
3 tests in Chromium. The 4 tests in `tests/FR-00003/deploy_script_test.sh`
pass: the script runs `wrangler deploy --env dev` with a dev tag and the
SuperAdmin variable, refuses to run without the address, never prints it, and
fails when Wrangler fails. The 3 tests in `tests/FR-00003/deployed_test.sh`
pass against the deployed Workers, and ShellCheck reports no findings. The
FR-00000, FR-00001, and FR-00002 tests still pass. Verified from a clean clone
of commit `2ca1885`: `pnpm install --frozen-lockfile`, `pnpm run typecheck`,
and every test, including the end-to-end and Terraform tests.

FR-00004, accepted on 2026-10-14. `pnpm test` passed 128 tests in the Workers
runtime and jsdom, `pnpm run typecheck` passed, and `pnpm run test:e2e` passed
4 tests in Chromium. `tests/FR-00004/terraform_test.sh` passed 8 tests and
`tests/FR-00004/db_query_test.sh` 18. All FR-00000 to FR-00003 shell tests
still pass, including `tests/FR-00003/deployed_test.sh`, and ShellCheck
reports no findings. On the owner's machine, `pnpm test` first passed 127 of
128, the one failure being the gateway timeout that led to the 30-second
timeout. Verified from a clean clone of commit `5d33b5f` in a separate Linux
environment: `pnpm install --frozen-lockfile`, `pnpm run typecheck`,
`pnpm test` (128 passed), every shell test that needs no credentials or
network, and ShellCheck. The end-to-end, Terraform, and deployed tests were
run on the owner's machine against the same files. The clean clone also found
that `devops/db/query.sh` and its test had been committed without the
executable bit, because `core.filemode` is off on the Windows drive; commit
`5d33b5f` fixes that.
