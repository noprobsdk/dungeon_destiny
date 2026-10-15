# Deployment model

This page describes the Cloudflare infrastructure and Workers that have been
built for Dungeon Destiny and how they are managed.

Sources: [FR-00000: Terraform setup](../../../FR/FR-00000-terraform-setup/README.md),
[FR-00001: Worker dev workflow](../../../FR/FR-00001-worker-dev-workflow/README.md).

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

Terraform owns each Worker resource, its `workers.dev` settings, and the tags
Wrangler sets on deploy (`cf:environment=dev`, `cf:service=gateway`), so the
two tools do not undo each other. Wrangler uploads the code versions, as
described in the [delivery pipeline](delivery-pipeline.md).

`dd-dev-gateway` has only the `CF_VERSION_METADATA` binding and the
`ENVIRONMENT` variable. It has no D1, R2, Durable Object, Queue, or service
bindings, and no custom domain. Its endpoint is described in
[Access and edge services](access-and-edge.md).

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

The tests are in `tests/FR-00000/terraform_test.sh`, which applies only when
`plan` reports no changes, and `tests/FR-00001/terraform_worker_test.sh`.
