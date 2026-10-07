# Agent Instructions

Instructions for any AI assistant or coding agent working in this repository.

## Project

Dungeon Destiny is a mobile dungeon game. This repository holds its design
documentation, Feature Requests, delivery records, and, once approved, its
Content Studio, database, and Godot implementation.

## Commands

Setup, run, test, lint, and format commands are added here by the Feature
Request that introduces them. Run every command from the repository root.

### Onboarding (FR-00000)

Check that this machine can run Terraform. In a terminal the script is guided
and asks before changing anything; `--check` only reads. Agents use `--check`.

```bash
devops/onboarding.sh
devops/onboarding.sh --check
```

The manual setup steps are in `doc/howto-cloudflare-setup.md`.

### Terraform (FR-00000)

Load the credentials and the R2 address into the current shell, then run
Terraform for the `dev` environment. Never print the credential values, and do
not set `TF_LOG` when output is shared.

```bash
source ~/.config/dungeon-destiny/cloudflare.env
export AWS_ENDPOINT_URL_S3="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
terraform -chdir=infra/terraform/envs/dev init
terraform -chdir=infra/terraform/envs/dev plan
terraform -chdir=infra/terraform/envs/dev apply
terraform fmt -recursive infra/terraform
```

`apply` changes real Cloudflare infrastructure and needs explicit approval.

### Tests and lint (FR-00000)

```bash
tests/FR-00000/onboarding_test.sh
tests/FR-00000/terraform_test.sh
shellcheck devops/onboarding.sh tests/FR-00000/*.sh
```

`onboarding_test.sh` needs no network or credentials. `terraform_test.sh` runs
`init`, `plan`, `apply`, and a lock test against the R2 state bucket; it
creates no Cloudflare resources.

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
