# Deployment model

This page describes the Cloudflare infrastructure that has been built for
Dungeon Destiny and how it is managed.

Sources: [FR-00000: Terraform setup](../../../FR/FR-00000-terraform-setup/README.md).

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
- The values are kept in `~/.config/dungeon-destiny/cloudflare.env`, readable
  only by its owner, and loaded into the shell before Terraform runs.

Credential values never appear in tracked files, Terraform files, state, or
evidence. `TF_LOG` is not used for evidence, because it can expose
credentials. The setup and run commands are in `AGENTS.md`; the manual setup
steps are in `doc/howto-cloudflare-setup.md`.

## Verification

Accepted on 2026-10-07. Verified on the owner's machine and from a clean clone
of commit `d00934f`:

- `terraform fmt -check` and `terraform validate` pass;
- `terraform init` connects to the R2 backend, and `plan` and `apply` report
  no changes;
- the state object exists at `dev/terraform.tfstate`;
- a second Terraform run is refused while the lock is held, and the lock file
  is removed when the first run ends;
- no state, credential, or `.terraform/` files are tracked.

The tests are in `tests/FR-00000/terraform_test.sh`.
