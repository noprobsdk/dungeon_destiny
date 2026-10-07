# FR-00000 implementation report

Implementation of [FR-00000: Terraform setup](README.md). This report contains
no credentials, keys, account IDs, or email addresses.

## Created and changed

| Path | Result |
|---|---|
| `devops/onboarding.sh` | Guided onboarding script, with a check-only mode. |
| `devops/README.md` | How to run the script; links to the setup guide. |
| `tests/FR-00000/onboarding_test.sh` | 27 tests of the onboarding script. |
| `tests/FR-00000/terraform_test.sh` | 9 tests of the Terraform project, including R2. |
| `infra/terraform/envs/dev/versions.tf` | Terraform `>= 1.11, < 2.0`; Cloudflare provider `~> 5.0`; R2 state backend with `use_lockfile = true`. |
| `infra/terraform/envs/dev/providers.tf` | Empty `provider "cloudflare" {}`; credentials come from the environment. |
| `infra/terraform/envs/dev/.terraform.lock.hcl` | Provider lock file; Cloudflare provider `5.27.0`. |
| `.gitignore` | Ignores `.terraform/`, `*.tfstate`, and `*.tfstate.*`. Crash logs were already covered by `*.log`. |
| `AGENTS.md` | Onboarding, Terraform, test, and lint commands. |
| `doc/howto-cloudflare-setup.md` | jq added; the guided script and its check-only verification described. |
| `doc/test-driven-development.md` | Rule: one test folder per Feature Request, `tests/FR-<number>/`. |

Final deployed state:

- R2 bucket `dd-terraform-state` holds `dev/terraform.tfstate`: serial 1, no
  resources, no outputs.
- No Cloudflare resources were created by Terraform.
- Tool versions on the owner's machine: Terraform 1.16.5, curl 7.81.0, with
  jq, ShellCheck, and git installed.

## Implementation decisions

Approved by the project owner before the affected work, as required by
`doc/test-driven-development.md`.

| # | Decision |
|---|---|
| 1 | The script is `devops/onboarding.sh`. |
| 2 | Tests are plain Bash, in `tests/FR-<number>/`, each named after the check it proves. |
| 3 | Cloudflare and R2 access are checked with curl; credentials are passed on standard input, never as arguments. |
| 4 | The credential file has a fixed path, `~/.config/dungeon-destiny/cloudflare.env`. Tests use a temporary `HOME`. |
| 5 | The script reads the credential file with `source`. |
| 6 | The Terraform version is read from `terraform version -json` with jq, which became a required tool. |
| 7 | Required tools: Terraform 1.11 or later, curl 7.75 or later, ShellCheck, git, and jq. |
| 8 | Every check runs and is reported; the exit status is 1 when any check fails. |
| 9 | An empty answer to a question is No. |
| 10 | Guided mode in a terminal; check-only mode with `--check` or without a terminal; `--guided` forces guided mode for tests. |
| 11 | Values may be typed into the script, keys with hidden input, and are written straight to the `600` file. |
| 12 | The script never changes Cloudflare and never overwrites a value without asking. |
| 13 | Messages show the full path to the setup guide. |
| 14 | Before asking for a value, the script explains where to find it. |
| 15 | A value is typed straight at its prompt, without a Yes/No question first; Enter skips it. |
| 16 | Before asking for the R2 keys, the script shows the R2 dashboard steps. |
| 17 | Terraform `>= 1.11, < 2.0`; Cloudflare provider `~> 5.0`; lock file committed. |
| 18 | `infra/terraform/envs/dev/` holds `versions.tf` and `providers.tf` only. |
| 19 | The R2 address comes from `AWS_ENDPOINT_URL_S3`, set after loading the credential file. No wrapper script. |
| 20 | The provider reads `CLOUDFLARE_EMAIL` and `CLOUDFLARE_API_KEY` from the environment. |
| 21 | Terraform tests are in `tests/FR-00000/terraform_test.sh`. |
| 22 | Tests cover fmt, validate, ignore rules, a secret scan, init, plan, apply, and the state lock; R2 tests are blocked without credentials. |
| 23 | `.gitignore` adds the standard Terraform working and state files. |

## Approved deviations from the Feature Request

Each was approved and recorded in the Feature Request before the work:

- The implementation sequence was reordered so the onboarding script was built
  and run before the manual setup.
- The onboarding script changed from read-only to guided, with a check-only
  mode.
- The test folder `tests/FR-00000/` and jq were added to the scope.

## Findings during implementation

- **R2 and curl 7.81:** R2 rejects signed requests without the
  `x-amz-content-sha256` header ("400 Missing x-amz-content-sha256"), and curl
  before 8.x does not add it. The script sends the header for an empty body.
  A regression test was added first.
- **curl 7.81 and `/` in a signed query:** a listing with an unencoded `/` in
  its prefix is signed incorrectly. The Terraform tests encode it as `%2F`.
- **`terraform console` takes no state lock.** The lock test instead holds the
  lock with a temporary copy of the project whose `apply` waits at its
  confirmation prompt; the answer is No, and the state is unchanged.
- **R2 state locking works.** The no-lock fallback in Section 7 was not needed,
  and no one-run-at-a-time rule was added to `AGENTS.md`.
- **Prompt usability:** the first guided version asked "Enter X now? [y/N]"
  before each value, and the owner typed a value at that question. Decision 15
  removed the extra question.

## Test results

Run on the owner's machine with the owner's credentials.

| Test file | Result |
|---|---|
| `tests/FR-00000/onboarding_test.sh` | 27 passed, 0 failed, 0 blocked |
| `tests/FR-00000/terraform_test.sh` | 9 passed, 0 failed, 0 blocked |
| `shellcheck devops/onboarding.sh tests/FR-00000/*.sh` | No findings |
| `devops/onboarding.sh --check` | 13 passed, 0 failed, 0 skipped |

Verified locally: the onboarding script's behaviour, with stand-in programs.
Verified against Cloudflare: Global API Key access, R2 bucket access,
`terraform init`, `plan`, and `apply` against the R2 backend, and state locking.
Verified from a clean clone of commit `d00934f`: `devops/onboarding.sh --check`
(13 passed), ShellCheck (no findings), both test files (27 and 9 passed), and
the `AGENTS.md` Terraform commands: `init` connected to the R2 backend,
`plan` reported no changes, and `fmt -check` was clean. No file in the clone
changed, so the committed provider lock file matched.

## Limitations and follow-up work

- `terraform_test.sh` runs `terraform apply`. This is harmless while the
  configuration has no resources. Before FR-00001 adds resources, the test must
  apply only when `plan` reports no changes.
- The provider lock file records checksums for `linux_amd64` only. Other
  platforms need `terraform providers lock` before use.
- The guided Terraform installation adds `--batch --yes` to the `gpg` command
  from the setup guide, so it can run without a second prompt.

## Incidents

During implementation, an editing command run by the coding agent failed
partway and ran test code in the agent's shell with an empty folder variable.
Its file changes at the filesystem root were refused by the operating system.
No file was changed, and the test file was rewritten with the editor. The test
setup now stops if its temporary folder cannot be created.

## GitHub Issue completion recap

> FR-00000 Terraform setup is implemented. `devops/onboarding.sh` guides a new
> machine through the setup and checks Cloudflare and R2 access;
> `infra/terraform/envs/dev/` holds the Terraform project with its state in the
> R2 bucket `dd-terraform-state`, with working state locking. All 36 tests in
> `tests/FR-00000/` pass, also from a clean clone.
