# Agent Instructions

Instructions for any AI assistant or coding agent working in this repository.

## Project

Dungeon Destiny is a mobile dungeon game. This repository holds its design
documentation, Feature Requests, delivery records, and, once approved, its
Content Studio, database, and Godot implementation.

## Commands

Setup, run, test, lint, and format commands are added here by the Feature
Request that introduces them. Run every command from the repository root.

### Onboarding (FR-00000, FR-00001, FR-00002, FR-00003)

Check that this machine can run Terraform, build and test the Workers, and
deploy Content Studio. In a terminal the script is guided and asks before
changing anything; `--check` only reads. Agents use `--check`.

```bash
devops/onboarding.sh
devops/onboarding.sh --check
```

The manual setup steps are in `doc/howto-cloudflare-setup.md`.

### Terraform (FR-00000, FR-00001, FR-00003)

Load the credentials, the R2 address, and the Terraform variables into the
current shell, then run Terraform for the `dev` environment. Never print the
credential values or the SuperAdmin email address, and do not set `TF_LOG`
when output is shared.

```bash
source ~/.config/dungeon-destiny/cloudflare.env
export AWS_ENDPOINT_URL_S3="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
export TF_VAR_cloudflare_account_id="$CLOUDFLARE_ACCOUNT_ID"
export TF_VAR_studio_superadmin_email="$STUDIO_SUPERADMIN_EMAIL"
terraform -chdir=infra/terraform/envs/dev init
terraform -chdir=infra/terraform/envs/dev plan
terraform -chdir=infra/terraform/envs/dev apply
terraform fmt -recursive infra/terraform
```

`apply` changes real Cloudflare infrastructure and needs explicit approval.

### Workers (FR-00001)

The Workers use Node.js 24 and pnpm, pinned in `.node-version` and
`package.json`. Install the dependencies, then test, type-check, and run the
`gateway` Worker locally at `http://127.0.0.1:8787`.

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm --filter @dungeon-destiny/gateway run dev
```

After changing `apps/gateway/wrangler.jsonc`, regenerate the Worker types:

```bash
pnpm --filter @dungeon-destiny/gateway run types
```

Deploy the `gateway` code to `dd-dev-gateway` with a `dev-YYYYMMDD-HHMMSS`
tag. The Worker itself is created by Terraform. A deploy changes the live
Worker and needs explicit approval.

```bash
source ~/.config/dungeon-destiny/cloudflare.env
pnpm --filter @dungeon-destiny/gateway run deploy:dev
```

### Content Studio (FR-00003)

Content Studio is the `studio-web` Worker (React pages and the Cloudflare
Access token check) and the `studio-api` Worker (no public address, typed RPC).
Terraform creates both Workers and the Access setup; after a change to the
Access application, copy `terraform output -raw studio_web_access_aud` into
`ACCESS_AUD` in `apps/studio-web/wrangler.jsonc`.

After changing a Wrangler configuration, regenerate the Worker types:

```bash
pnpm --filter @dungeon-destiny/studio-api run types
pnpm --filter @dungeon-destiny/studio-web run types
```

Deploy `studio-api` first, then `studio-web`. The `studio-api` deploy reads the
SuperAdmin email address from the credential file, refuses to run without it,
and masks it in the output. A deploy changes live Workers and needs explicit
approval.

```bash
source ~/.config/dungeon-destiny/cloudflare.env
pnpm --filter @dungeon-destiny/studio-api run deploy:dev
pnpm --filter @dungeon-destiny/studio-web run deploy:dev
```

Signing in uses a one-time PIN sent to the owner's email. Agents cannot sign
in; the owner checks sign-in by hand after a deploy that touches `studio-web`,
Cloudflare Access, or the SuperAdmin.

### Before and after a deploy (FR-00003)

Before every deploy, for any Feature Request, run the whole local test suite
below, including `pnpm run test:e2e`, and stop if anything fails. After every
deploy, run the deployed tests and check that `terraform plan` reports no
changes.

### GitHub CLI (FR-00002)

The GitHub CLI (`gh`) works with the issues and pull requests of
`noprobsdk/dungeon_destiny`. The owner signs in once with `gh auth login`;
agents never run it. Check the sign-in without printing the token:

```bash
gh auth status
```

Reading with `gh` needs no approval. Posting to GitHub is outward-facing and
the repository is public: show every comment, issue, pull request, or status
change to the owner and get approval before posting it.

### Tests and lint (FR-00000, FR-00001, FR-00002, FR-00003)

```bash
tests/FR-00000/onboarding_test.sh
tests/FR-00000/terraform_test.sh
tests/FR-00001/onboarding_node_test.sh
tests/FR-00001/workspace_test.sh
tests/FR-00001/typecheck_test.sh
tests/FR-00001/terraform_guard_test.sh
tests/FR-00001/terraform_worker_test.sh
tests/FR-00001/deployed_test.sh
tests/FR-00002/onboarding_gh_test.sh
tests/FR-00003/onboarding_access_test.sh
tests/FR-00003/terraform_access_test.sh
tests/FR-00003/deploy_script_test.sh
tests/FR-00003/deployed_test.sh
pnpm test
pnpm run typecheck
pnpm run test:e2e
shellcheck devops/*.sh tests/FR-0000*/*.sh
```

The onboarding, workspace, typecheck, guard, and Worker Terraform tests need no
credentials and change nothing. `tests/FR-00000/terraform_test.sh` runs `init`,
`plan`, and a lock test against the R2 state bucket, and runs `apply` only when
`plan` reports no changes, so it never creates resources. `deployed_test.sh`
calls the deployed `dd-dev-gateway` and changes nothing. `pnpm test` runs the
Worker tests in the Workers runtime and the Content Studio page tests in
jsdom. The FR-00003 onboarding, Terraform, and deploy-script tests need no
credentials and change nothing; `tests/FR-00003/deployed_test.sh` calls the
deployed Content Studio without signing in. `pnpm run test:e2e` runs both
Content Studio Workers locally and tests them in Chromium, with tokens from a
local stand-in for Access's key server; it needs no credentials.

## Conventions

- Code and database changes require an approved Feature Request.
- Pull requests link to their Feature Request.
- Legacy POC code, schemas, migrations, and assets are not copied into this
  repository without an approved Feature Request.
- `ou-oci-terraform-main` is the reference for repository process and
  governance. When its workflows differ, it takes precedence; only
  project-specific content is adapted.

## Documentation

Always read context from `doc/` when starting a new prompt, including
`doc/todo.md`.

## Repository tracking

Always look for new updates on the remote every minute.

Do not pull automatically; ask first.

## Documentation changes

Every change under `doc/` or `delivery/` follows
`doc/document-change-management.md`.

Show a full-file red/green diff and receive explicit approval before creating,
changing, moving, renaming, or deleting any file under `doc/` or `delivery/`.

## Fast execution

Use fast execution by default:

- change only what the user explicitly requested;
- batch relevant inspection and verification commands;
- do not re-read settled context unless the files or remote state changed;
- preserve and ignore unrelated working-tree changes;
- ask questions only when a decision blocks safe progress;
- keep progress reports and diffs limited to the requested change; and
- when edit, commit, and push are all explicitly authorized, perform them in
  one sequence without additional confirmation.

Fast execution does not bypass safety checks or the full-file proposal and
approval workflow for changes under `doc/` and `delivery/`.

## Notes

- `doc/` states intended design and is not evidence of implementation.
- `delivery/` records Feature Requests and verified delivery.

## TypeScript and Cloudflare Workers

Write production-grade edge services using modern ES modules, strict type
safety, request isolation, and native Cloudflare platform bindings. These rules
apply to every domain Worker of the backend, starting with `gateway` (deployed
as `dd-dev-gateway`), and do not select a Content Studio framework, ORM, or
validation library.

The backend is split into domain Workers (DD-017). Each Worker's code lives in
`apps/<worker>/src/<service>/`, with one module per application service, and
the types shared between Workers live in `packages/contracts/`. Workers call
each other only through service bindings with typed RPC.

### 1. Type declarations and bindings

- Generate `Env` and runtime types with `wrangler types` from the actual Worker
  configuration. Regenerate after binding or compatibility changes. Do not
  hand-write binding interfaces or edit generated types.
- Enable TypeScript strict mode. Do not use `any`; treat untrusted input as
  `unknown` and validate it at runtime using schemas or narrow type guards.
- Type module Worker entry points with `satisfies ExportedHandler<Env>` and
  explicit handler types where useful.

### 2. State and memory isolation

- Never store request-scoped mutable state, identities, tokens, or user data in
  global variables. Worker isolates can serve multiple requests.
- Pass a typed request-context object explicitly through execution flows. If
  Hono is separately selected, its per-request context variables may be used.
- Pass `ExecutionContext` for lifecycle operations such as `waitUntil`; do not
  treat it as an arbitrary mutable request-data container.
- Immutable schemas and constants may live at module scope.

### 3. Binding invocation over REST

- Use configured native bindings such as `env.PLAYER_D1`, `env.CONTENT_D1`, R2
  buckets, and Durable Object namespaces instead of public REST APIs for those
  resources. Bindings provide access without embedding REST API credentials.
- Do not assume binding calls are in-process or have zero network latency;
  storage and Durable Object operations may involve remote services.

### 4. Asynchronous execution and promises

- Never leave floating promises. Await required work, or register bounded
  background work with `ctx.waitUntil(promise)` and handle failures.
- Return responses promptly, but await work required for correctness before
  acknowledging success. Use `waitUntil` for optional work such as telemetry.
- `waitUntil` has runtime limits and is not durable execution. Work requiring
  guaranteed retries or durable delivery needs an approved Queue or other
  durable workflow; await its acceptance before reporting it as accepted.

### 5. Runtime and compatibility

- Use Module Worker syntax: `export default { fetch(request, env, ctx) }`.
  Do not use legacy `addEventListener("fetch", ...)` entry points.
- Pin a current, tested compatibility date in Wrangler configuration and
  generate types for it. Ensure Node.js compatibility is available when needed;
  enable `nodejs_compat` where the configured date requires it rather than
  assuming every project has identical flags.
- Prefer standard Web APIs such as `fetch`, `Request`, `Response`, Web Crypto,
  and `TransformStream`. Verify that any Node.js API used is supported by the
  configured Workers runtime rather than only available as a stub.

### 6. Security and cryptography

- Never use `Math.random()` for tokens, security-sensitive session identifiers,
  or other security decisions. Use cryptographically secure Web Crypto APIs
  such as `crypto.getRandomValues`, `crypto.randomUUID`, and `crypto.subtle`
  as appropriate.
- Authenticate and authorize operations before accessing protected player data.
  A valid payload is not proof of identity, ownership, or gameplay authority.
- Clients cannot submit authoritative scores, rewards, or progression changes.
  Permanent results must come through the trusted-server result contract.

### 7. Database and prepared statements

- Use D1 prepared statements with bound parameters for untrusted values; never
  interpolate them into SQL. Durable Object SQL uses its own parameter-binding
  API, not the D1 `prepare` API.
- Prefer `env.DB.batch([...])` for suitable D1 multi-query operations to reduce
  round-trips while preserving the required ordering and transaction semantics.
- Follow approved migrations and service ownership boundaries. Native bindings
  do not authorize bypassing owning services or permanent-data protections.
- Bind a store only in the Worker that owns it: Content D1, private R2, and
  the 3D asset store in `studio-api`; Player D1 in `player`; the
  live-coordination Durable Objects in `session`. Other Workers call the owner.
  The one exception is published R2, which `catalog` reads directly.

### Worker entry-point example

This illustrates the module and typing pattern only. Endpoint behavior belongs
in the approved Feature Request; this example is not implementation evidence.

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/health") {
      return new Response("Not Found", { status: 404 });
    }
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET" },
      });
    }
    return Response.json({ status: "ok" });
  },
} satisfies ExportedHandler<Env>;
```

References:

- [Worker type generation](https://developers.cloudflare.com/workers/wrangler/commands/workers/#types)
- [Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/)
- [Execution context](https://developers.cloudflare.com/workers/runtime-apis/context/)
- [Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/)
