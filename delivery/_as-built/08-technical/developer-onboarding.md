# Developer onboarding

This page describes the onboarding script that checks whether a machine can
run Dungeon Destiny's infrastructure tooling, and helps fix what is missing.

Sources: [FR-00000: Terraform setup](../../FR/FR-00000-terraform-setup/README.md).

## Script

| Item | Value |
|---|---|
| Script | `devops/onboarding.sh`, written in Bash and checked with ShellCheck |
| How to run it | `devops/README.md` |
| Manual setup steps | `doc/howto-cloudflare-setup.md` |
| Credential file | `~/.config/dungeon-destiny/cloudflare.env`, mode `600` in a mode `700` folder |

## Checks

Every check runs and is reported as passed, failed, or skipped:

- jq, Terraform 1.11 or later, curl 7.75 or later, ShellCheck, and git are
  installed;
- the credential file exists and only its owner can read it;
- the credential file sets `CLOUDFLARE_EMAIL`, `CLOUDFLARE_API_KEY`,
  `CLOUDFLARE_ACCOUNT_ID`, `AWS_ACCESS_KEY_ID`, and
  `AWS_SECRET_ACCESS_KEY`;
- Cloudflare accepts the Global API Key and account email; and
- the R2 access key pair can list the `dd-terraform-state` bucket.

The script exits with status 1 when any check fails and 0 when all pass. It
can be run again at any time.

## Modes

- **Guided**, in a terminal: for each failed check, the script explains the
  fix and asks Yes or No before running the install command from the setup
  guide, creating the credential folder and file, or reading a missing value.
  Before asking for a value it explains where to find it; keys are read with
  hidden input, and Enter skips the value. For a rejected Cloudflare or R2
  check it shows the dashboard step and asks whether it is done. After each
  fix or confirmation it checks the item again; a Yes is never accepted as
  proof on its own.
- **Check only**, with `--check` or without a terminal: the script only reads,
  never prompts, and changes nothing.

In both modes an empty answer is No. The script never changes anything in
Cloudflare, never overwrites a credential value without asking, never prints
credential values, and never passes them as command-line arguments: the
Cloudflare and R2 checks use curl with the credentials on standard input.

## Verification

Accepted on 2026-10-07. On the owner's machine, `devops/onboarding.sh --check`
reported 13 passed, 0 failed, 0 skipped, also from a clean clone of commit
`d00934f`. The 27 tests in `tests/FR-00000/onboarding_test.sh` pass. They use
stand-in programs and temporary credential files, so they need no network and
no real credentials.
