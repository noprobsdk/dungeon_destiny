# FR-00000: Terraform setup

- **Status:** Pending documentation
- **Sprint:** Not used. The project has one developer, so sprints are not used.
- **Type:** Implementation
- **Tracking:** No GitHub Issue yet.

## 1. Purpose

Set up Terraform for Dungeon Destiny's Cloudflare infrastructure, starting with
the `dev` environment. Terraform state is kept in a Cloudflare R2 bucket.

This is the foundation for later Feature Requests, starting with FR-00001. It
proves that Terraform can connect to the Cloudflare account, store its state in
R2, and run `plan` and `apply`. It creates no Cloudflare resources.

It also adds a guided onboarding script that checks whether a machine has the
packages and access needed to run Terraform and, after the owner answers Yes,
helps fix what is missing.

## 2. Implementation sequence

1. Move this Feature Request to `Backlog`, then to `In Progress`.
2. Write the onboarding script checks in Section 14 and confirm they fail.
3. Create the onboarding script in `devops/` until its checks pass.
4. Run the onboarding script on the owner's machine and confirm that it
   reports the missing manual prerequisites.
5. Complete the manual prerequisites in Section 6 until the onboarding script
   passes.
6. Write the Terraform checks in Section 14 and confirm they fail.
7. Create the Terraform project in `infra/terraform/envs/dev/` until the checks
   pass.
8. Run `terraform init`, `plan`, and `apply` against the `dev` state in R2.
9. Verify state locking.
10. Add the onboarding, setup, and run commands to `AGENTS.md`.
11. Complete `implementation_report.md` and move to `In Review`.
12. After acceptance, hand over to documentation and as-built.

FR-00001 depends on this Feature Request reaching `Pending documentation`: its
implementation accepted, with only the as-built documentation outstanding.

## 3. Scope boundaries

This Feature Request creates:

- a guided onboarding script in `devops/`, described in Section 10;
- `devops/README.md`, which explains how to run the onboarding script and links
  to the setup guide;
- the Feature Request tests in `tests/FR-00000/`;
- the Terraform project in `infra/terraform/envs/dev/`;
- the pinned Terraform and Cloudflare provider versions and the committed
  provider lock file;
- the R2 state backend for `dev`;
- `.gitignore` rules for Terraform working files and state; and
- the onboarding and Terraform commands in `AGENTS.md`.

This Feature Request does not create or change:

- any Cloudflare resource, including Workers, D1, R2 buckets other than the
  manually created state bucket, Durable Objects, Access, or DNS;
- the `dd-dev` Worker, which belongs to FR-00001;
- shared modules in `infra/terraform/modules/`;
- environments other than `dev`;
- AWS or the game-server host;
- Terragrunt; or
- deployment automation, such as GitHub Actions.

## 4. Source

- [`doc/08-technical/service-architecture.md`](../../../doc/08-technical/service-architecture.md),
  section "Initial deployment model".
- [DD-010](../../../doc/12-decisions/decision-log.md): Cloudflare is the cloud
  platform.
- [DD-016](../../../doc/12-decisions/decision-log.md): Cloudflare
  infrastructure is managed with Terraform; state is kept in R2; one folder and
  one state per environment under `infra/terraform/envs/`, starting with `dev`.
- [`doc/howto-cloudflare-setup.md`](../../../doc/howto-cloudflare-setup.md):
  the manual setup steps this Feature Request implements and verifies.
- [`doc/test-driven-development.md`](../../../doc/test-driven-development.md).

Design baseline commit: `4e50cf6`.

Source-document readiness gate: passes for this scope. The only remaining
"Terraform setup (FR-00000)" item in `doc/todo.md` is this Feature Request.
The other outstanding items in `service-architecture.md` (alignment with
DD-011 to DD-014, and its open technical decisions) concern identity,
transport, sessions, recovery, queues, D1, observability, and notifications,
which this Feature Request does not use.

## 5. Target ownership

- **Online services:** Terraform owns the configuration of Cloudflare
  infrastructure. This Feature Request adds no resources to it.
- **Database, Content Studio, runtime manifest, Godot app, 3D production:**
  N/A. This Feature Request does not touch them.

## 6. Prerequisites and deployment blockers

Manual prerequisites, completed by the project owner by following
[`doc/howto-cloudflare-setup.md`](../../../doc/howto-cloudflare-setup.md):

- The Cloudflare account exists.
- Terraform 1.11 or later is installed in WSL. S3 backend lock files were
  introduced in 1.10 and became generally available in 1.11.
- ShellCheck and jq are installed in WSL.
- An R2 bucket named `dd-terraform-state` is created by hand.
- An R2 access key pair is created with read and write access to that bucket
  only.
- A private credential file, for example
  `~/.config/dungeon-destiny/cloudflare.env`, readable only by the owner,
  holds the Cloudflare Global API Key, the account email, the account ID, and
  the R2 access key pair.

The onboarding script checks these prerequisites.

Blockers: none.

## 7. Approved decisions

- Terraform manages Cloudflare infrastructure, and Wrangler deploys Worker code
  (DD-016).
- Terraform state is kept in a Cloudflare R2 bucket and never in the
  repository (DD-016).
- Terraform code lives in `infra/terraform/`, with one folder and one state per
  environment under `infra/terraform/envs/`, starting with `dev` (DD-016).
- The state bucket is `dd-terraform-state`, created by hand. The `dev` state is
  stored at `dev/terraform.tfstate`. The bucket location is automatic.
- State locking uses the S3 backend lock file (`use_lockfile = true`).
- Terraform authenticates to Cloudflare with the Global API Key, chosen by the
  project owner over a scoped API token. The R2 backend uses an R2 access key
  pair.
- Credentials are kept in a private, owner-only file in the WSL home directory
  and loaded into the shell before Terraform runs.
- The Terraform version and the Cloudflare provider (v5) are pinned, and
  `.terraform.lock.hcl` is committed.
- Plain Terraform is used. Terragrunt is reconsidered when a second
  environment is added.
- An onboarding script under `devops/` checks the packages and access needed
  to run Terraform. Run in a terminal, it is guided: for each failed check it
  asks Yes or No before running an install command, creating the credential
  file, or asking for a value. With `--check`, or without a terminal, it only
  reads and never prompts.
- The onboarding script is written in Bash and checked with ShellCheck. Its
  failure cases are tested with scripted tests.
- The Cloudflare account ID is kept in the private credential file and passed
  to `terraform init`, so the repository holds no account details.
- If R2 state locking fails verification, Terraform runs without a lock. The
  rule that only the project owner runs Terraform, one run at a time, is
  recorded in `AGENTS.md`. This is revisited when GitHub Actions or a second
  person runs Terraform.
- Sprints are not used, because the project has one developer.
- FR-00000 creates no Cloudflare resources.

## 8. Data model and Content Studio

N/A. This Feature Request creates no records, migrations, or Content Studio
behaviour.

## 9. Runtime manifest and Godot runtime

N/A. The Godot runtime is not affected.

## 10. Online services and access

The Global API Key has full control of the Cloudflare account. It must never
appear in tracked files, Terraform files, state, command output kept as
evidence, logs, or the implementation report. The same applies to the R2
access key pair.

Terraform is run only by the project owner from WSL.

### Onboarding script

The onboarding script in `devops/` checks, and reports each result as passed,
failed, or skipped:

- required packages are installed: Terraform at the pinned minimum version,
  and the other tools the script and Terraform use;
- the credential file exists, is readable only by its owner, and sets every
  required value;
- the Global API Key and account email are accepted by the Cloudflare API; and
- the R2 access key pair can list the `dd-terraform-state` bucket.

In guided mode, the script walks through each failed check:

- a missing package: it offers the install command from the setup guide, such
  as `sudo apt install shellcheck`, and runs it only after Yes;
- a missing or unsafe credential file: it offers to create the folder with
  mode `700` and the file with mode `600`;
- a missing value: it explains where to find the value, then reads it at its
  prompt and writes it to the credential file. Keys are read with hidden input;
  the email address is shown as it is typed. Enter skips the value;
- a rejected Cloudflare or R2 check: it shows the dashboard step from the setup
  guide and asks whether the step is done.

After each fix or confirmation, the script checks that item again. A Yes is
never accepted as proof on its own.

In both modes, the script:

- treats an empty answer as No;
- never changes anything in Cloudflare;
- never overwrites an existing credential value without asking;
- never prints credential values or passes them in command-line arguments
  visible to other users;
- exits with a non-zero status when any check still fails; and
- can be run again at any time.

`devops/README.md` explains how to run the script and links to
[`doc/howto-cloudflare-setup.md`](../../../doc/howto-cloudflare-setup.md) for
the manual steps. It does not repeat them.

## 11. Player experience and UX

N/A. There is no player-facing change.

## 12. 3D assets and production contracts

N/A. No assets are used.

## 13. Logging, telemetry, and diagnostics

No logging is added. Terraform debug logging (`TF_LOG`) is not used for
evidence, because it can expose credentials.

## 14. Test-first implementation

Write these checks before the implementation and confirm they fail first:

- `terraform fmt -check` passes.
- `terraform validate` passes.
- `terraform init` connects to the R2 backend.
- `terraform plan` reports no changes.
- No credentials, keys, or state files are present in tracked files.
- `.gitignore` excludes `.terraform/` and `*.tfstate*`, and does not exclude
  `.terraform.lock.hcl`.
- The onboarding script exists in `devops/` and is executable.
- The onboarding script passes ShellCheck.
- The onboarding script fails, with a clear message and a non-zero exit
  status, when Terraform is missing or too old, the credential file is
  missing or readable by others, a required value is missing, or the
  Cloudflare or R2 credentials are rejected.
- The onboarding script output never contains credential values.
- With `--check`, or without a terminal, the onboarding script never prompts
  and changes nothing.
- In guided mode, an empty answer or No runs no command and changes no file.
- In guided mode, an install command runs only after Yes.
- In guided mode, a value entered for a missing credential is written to the
  credential file, no entered value appears in the script's output, and the
  file stays at mode `600`.
- In guided mode, the script explains where to find each value before asking
  for it.
- In guided mode, after Yes to a dashboard step, the script checks that item
  again rather than accepting the answer.

Every check above is kept as a test in `tests/FR-00000/`, named after the
check it proves. Tests of the onboarding script's failure cases use stand-in
programs and temporary credential files, so they need no network access and no
real credentials. Tests that need Cloudflare or R2 access are recorded as
blocked, not passed, until the manual prerequisites are complete.

The exact commands are added to `AGENTS.md` during implementation.

## 15. Implementation report

`implementation_report.md` is required before this Feature Request moves to
`In Review`. It follows the how-to and must not contain credentials, keys,
account email addresses, or other sensitive values.

## 16. Verification

- All Section 14 checks pass.
- The setup guide's Verification section passes on the owner's machine.
- The onboarding script passes on the owner's machine.
- `terraform apply` completes with no changes, and the state object exists in
  R2 at `dev/terraform.tfstate`.
- While one Terraform run holds the lock, a second run is refused with a lock
  error, and the lock file is removed when the first run ends. If this check
  fails, the one-run-at-a-time rule from Section 7 is recorded in `AGENTS.md`
  instead.
- A fresh `terraform init` from a clean checkout uses the remote state.
- `git status` and `git ls-files` show no state, credential, or `.terraform/`
  files.
- The commands in `AGENTS.md` work from a clean checkout.

Acceptable evidence is command output with credentials removed. Evidence must
not contain the Global API Key, R2 keys, or the account email address.

## 17. Acceptance criteria

- All verification checks in Section 16 have passed.
- `implementation_report.md` is complete.
- No unresolved decisions remain.
- No unapproved changes were made.

## 18. Unresolved decisions

None.
