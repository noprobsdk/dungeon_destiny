# Deployment model

This page describes the Cloudflare infrastructure and Workers that have been
built for Dungeon Destiny and how they are managed.

Sources: [FR-00000: Terraform setup](../../../FR/FR-00000-terraform-setup/README.md),
[FR-00001: Worker dev workflow](../../../FR/FR-00001-worker-dev-workflow/README.md),
[FR-00003: Worker access policy](../../../FR/FR-00003-worker-access-policy/README.md),
[FR-00004: Content D1 and user model](../../../FR/FR-00004-content-d1-user-model/README.md),
[FR-00005: Godot Android client skeleton](../../../FR/FR-00005-godot-android-client/README.md).

## Infrastructure management

Cloudflare infrastructure is managed with Terraform. Wrangler deploys Worker
code; Terraform does not.

| Item | Value |
|---|---|
| Terraform project | `infra/terraform/envs/dev/`, one folder and one state per environment |
| Environments | `dev` only |
| Terraform version | `>= 1.11, < 2.0` |
| Cloudflare provider | `cloudflare/cloudflare` `~> 5.0`, locked at `5.27.0` in the committed `.terraform.lock.hcl` |
| Shared modules | None. Plain Terraform, without Terragrunt |

The provider lock file records checksums for `linux_amd64` only. Another
platform needs `terraform providers lock` before use.

## Terraform state

| Item | Value |
|---|---|
| Backend | S3 backend pointed at Cloudflare R2 |
| Bucket | `dd-terraform-state`, created by hand, automatic location |
| `dev` state | `dev/terraform.tfstate` |
| Locking | S3 backend lock file (`use_lockfile = true`), verified to refuse a second run while the first holds the lock |

State is never stored in the repository. `.gitignore` excludes
`.terraform/`, `*.tfstate`, and `*.tfstate.*`, and keeps
`.terraform.lock.hcl` tracked.

## Workers

| Worker | Code | Terraform resource | Address |
|---|---|---|---|
| `dd-dev-gateway` | `apps/gateway/` | `cloudflare_worker.gateway` in `workers.tf` | `workers.dev` address enabled; preview URLs disabled |
| `dd-dev-studio-api` | `apps/studio-api/` | `cloudflare_worker.studio_api` in `studio.tf` | No `workers.dev` address; preview URLs disabled |
| `dd-dev-studio-web` | `apps/studio-web/` | `cloudflare_worker.studio_web` in `studio.tf` | `workers.dev` address enabled, behind Cloudflare Access; preview URLs disabled |

Terraform owns each Worker resource, its `workers.dev` settings, and the tags
Wrangler sets on deploy (`cf:environment=dev` and `cf:service=` followed by the
Worker's service name, such as `gateway`), so the two tools do not undo each
other. Wrangler uploads the code versions, as described in the [delivery
pipeline](delivery-pipeline.md).

`dd-dev-gateway` has only the `CF_VERSION_METADATA` binding. Its variables
are `ENVIRONMENT` and the app version settings `APP_MIN_BUILD_ANDROID`,
`APP_RECOMMENDED_BUILD_ANDROID`, and `APP_UPDATE_URL_ANDROID`, set in
`apps/gateway/wrangler.jsonc`; Terraform does not manage them. It has no D1,
R2, Durable Object, Queue, or service bindings, and no custom domain. Its
endpoints are described in [Access and edge services](access-and-edge.md).

Workers Logs is turned on for `dd-dev-gateway`, so its request log is kept and
can be searched. The setting is declared in Terraform, as `observability` on
`cloudflare_worker.gateway` in `workers.tf`, and in `wrangler.jsonc`, so
neither tool undoes the other. The other Workers do not have it.

The Content Studio Workers have these bindings, variables, and secrets.
Neither has an R2, Durable Object, or Queue binding, or a custom domain.

| Worker | Bindings | Variables and secrets |
|---|---|---|
| `dd-dev-studio-api` | `CF_VERSION_METADATA`; `CONTENT_D1`, the Content D1 database `dd-dev-content` | `ENVIRONMENT`; `SUPERADMIN_EMAIL` and `CF_ACCOUNT_ID`, empty in the repository and set at deploy time; `CF_API_BASE`, Cloudflare's API address; `ACCESS_GROUP_ID`, the Access group's ID from Terraform, which is not a secret; and the required secret `CF_ACCESS_GROUP_TOKEN` |
| `dd-dev-studio-web` | `CF_VERSION_METADATA`; `ASSETS`, the static assets; `STUDIO_API`, the service binding to `dd-dev-studio-api` | `ENVIRONMENT`; `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD`, which are not secrets |

The Content Studio pages are described in [Frontends](frontends.md).

## Cloudflare Access

Terraform manages the Access setup in front of `dd-dev-studio-web`, in
`studio.tf`:

| Resource | Purpose |
|---|---|
| `cloudflare_zero_trust_access_identity_provider.one_time_pin` | The one-time PIN sign-in method |
| `cloudflare_zero_trust_access_group.studio_users` | The Access group "Content Studio users", created with the SuperAdmin as its first member; Terraform ignores later changes to its members, which `studio-api` keeps in step with the active users |
| `cloudflare_zero_trust_access_application.studio_web` | The self-hosted application "Content Studio (dev)", with a 24-hour session, the one-time PIN as the only sign-in method, and its policy defined inside the application |
| Output `studio_web_access_aud` | The application's AUD tag, copied into `ACCESS_AUD` in `apps/studio-web/wrangler.jsonc` after a change to the application |
| Output `studio_users_group_id` | The Access group's ID, copied into `ACCESS_GROUP_ID` in `apps/studio-api/wrangler.jsonc` |

The policy, "Content Studio users", allows the SuperAdmin's email address and
the members of the Access group. The SuperAdmin's address is read from the
`studio_superadmin_email` variable, which is marked sensitive and has no
default. Cloudflare Zero Trust itself was turned on by hand in the
dashboard; Terraform does not manage the Zero Trust organization. The sign-in
and token check are described in [Access and edge services](access-and-edge.md).

## Content D1

Terraform creates the Content D1 database in `studio.tf`:

| Resource | Purpose |
|---|---|
| `cloudflare_d1_database.content` | `dd-dev-content`, with `jurisdiction = "eu"` and read replication disabled |
| Output `content_d1_id` | The database ID, copied into the `CONTENT_D1` binding in `apps/studio-api/wrangler.jsonc` |

Wrangler applies the migrations. The tables, migrations, and query script are
described in [Data services](data-services.md).

## Access and credentials

Terraform is run only by the project owner, from WSL.

- The Cloudflare provider authenticates with the account's Global API Key and
  email, read from the environment (`CLOUDFLARE_API_KEY`,
  `CLOUDFLARE_EMAIL`).
- The R2 backend uses an R2 access key pair with read and write access to
  `dd-terraform-state` only (`AWS_ACCESS_KEY_ID`,
  `AWS_SECRET_ACCESS_KEY`).
- The R2 address contains the account ID, so it is not stored in the
  repository. It is set in `AWS_ENDPOINT_URL_S3` from
  `CLOUDFLARE_ACCOUNT_ID` after the credentials are loaded.
- The account ID is passed to Terraform in `TF_VAR_cloudflare_account_id`,
  set from `CLOUDFLARE_ACCOUNT_ID`, so the repository holds no account
  details.
- The Content Studio SuperAdmin's email address is passed to Terraform in
  `TF_VAR_studio_superadmin_email`, set from `STUDIO_SUPERADMIN_EMAIL`, so no
  email address is written in the Terraform or Wrangler files.
- The `studio-api` deploy passes the SuperAdmin's email address and the
  account ID to the Worker as variables and masks both in Wrangler's output.
- The Cloudflare API token for the Access group is not in the credential
  file. It is stored only as the `CF_ACCESS_GROUP_TOKEN` Worker secret, as
  described in [Access and edge services](access-and-edge.md).
- The values are kept in `~/.config/dungeon-destiny/cloudflare.env`, readable
  only by its owner, and loaded into the shell before Terraform runs.

Credential values never appear in tracked files, Terraform files, state, or
evidence. `TF_LOG` is not used for evidence, because it can expose
credentials. The setup and run commands are in `AGENTS.md`; the manual setup
steps are in `doc/howto-cloudflare-setup.md`.

## Verification

FR-00000, accepted on 2026-10-07. Verified on the owner's machine and from a
clean clone of commit `d00934f`:

- `terraform fmt -check` and `terraform validate` pass;
- `terraform init` connects to the R2 backend, and `plan` and `apply` report
  no changes;
- the state object exists at `dev/terraform.tfstate`;
- a second Terraform run is refused while the lock is held, and the lock file
  is removed when the first run ends;
- no state, credential, or `.terraform/` files are tracked.

FR-00001, accepted on 2026-10-08. Terraform created `dd-dev-gateway`, and a
second `plan` reports no changes. Verified from a clean clone of commit
`c0acb7b`: Terraform `init`, `plan` with no changes, and `fmt`.

FR-00003, accepted on 2026-10-10. Terraform created both Content Studio
Workers and the Access setup, and a second `plan` reports no changes. Moving
the Access policy from a separate reusable policy into the application was
applied in two steps, because Cloudflare refuses to delete a reusable policy
that an application still uses. Verified from a clean clone of commit
`2ca1885`, including the FR-00000 Terraform test.

FR-00004, accepted on 2026-10-14. Terraform created `dd-dev-content` and the
Access group and changed the Access policy, and a second `plan` reports no
changes. Both migrations are applied to `dd-dev-content`.

FR-00005, accepted on 2026-11-10. Terraform turned on Workers Logs for
`dd-dev-gateway`, changing one resource. After each later `gateway` deploy,
including the deploys that raised and restored the app version thresholds,
`plan` reported no changes.

The tests are in `tests/FR-00000/terraform_test.sh`, which applies only when
`plan` reports no changes, `tests/FR-00001/terraform_worker_test.sh`,
`tests/FR-00003/terraform_access_test.sh`, and
`tests/FR-00004/terraform_test.sh`. The FR-00003 test checks that
Terraform and Wrangler agree on each Worker's address and tags, the Access
application and policy, the AUD output, that no email address is written in
the Terraform or Wrangler files, and that `fmt` and `validate` pass.
`tests/FR-00005/config_test.sh` checks that Workers Logs is turned on in both
Terraform and `wrangler.jsonc`. The 8
FR-00004 tests check `dd-dev-content` with EU jurisdiction, the `CONTENT_D1`
binding on `studio-api` only and the ID output, the Access group, a policy
that allows only the SuperAdmin and the group, `CF_ACCESS_GROUP_TOKEN` as a
required secret, that no email address, token, or account ID is written in
the Terraform or Wrangler files, and that `fmt` and `validate` pass.
