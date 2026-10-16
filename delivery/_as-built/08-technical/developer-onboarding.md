# Developer onboarding

This page describes the onboarding script that checks whether a machine can
run Dungeon Destiny's infrastructure tooling and build and test the Workers,
and helps fix what is missing.

Sources: [FR-00000: Terraform setup](../../FR/FR-00000-terraform-setup/README.md),
[FR-00001: Worker dev workflow](../../FR/FR-00001-worker-dev-workflow/README.md),
[FR-00002: GitHub CLI onboarding](../../FR/FR-00002-github-cli-onboarding/README.md).

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
- the GitHub CLI, `gh`, is installed, in any version, and `gh auth status`
  succeeds; only its exit status is used, and its output is hidden;
- Node.js 24.x and the pnpm version pinned in `package.json` are installed,
  and the project dependencies are installed;
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

  Node.js 24 is installed from NodeSource with `setup_24.x`, because
  NodeSource's "current" script now installs Node.js 26. pnpm is installed
  with its standalone installer at the pinned version, without `sudo`, into
  `~/.local/share/pnpm/bin/`; open terminals then need `source ~/.bashrc`.
  The project dependencies are installed with
  `pnpm install --frozen-lockfile`.

  `gh` is installed from GitHub's official apt repository, using the commands
  in GitHub's installation guide. The script never runs `gh auth login`: when
  `gh` is not signed in, it explains that the owner signs in with
  `gh auth login` in another terminal, asks whether that is done, and checks
  again. `gh` stores its login in the owner's home folder, never in the
  repository. The guided installs support Ubuntu and Debian only.
- **Check only**, with `--check` or without a terminal: the script only reads,
  never prompts, and changes nothing.

In both modes an empty answer is No. The script never changes anything in
Cloudflare, never overwrites a credential value without asking, never prints
credential values or the GitHub token, and never passes them as command-line
arguments: the Cloudflare and R2 checks use curl with the credentials on
standard input.

## Verification

FR-00000, accepted on 2026-10-07. On the owner's machine,
`devops/onboarding.sh --check` reported 13 passed, 0 failed, 0 skipped, also
from a clean clone of commit `d00934f`. The 27 tests in
`tests/FR-00000/onboarding_test.sh` pass.

FR-00001, accepted on 2026-10-08. On the owner's machine,
`devops/onboarding.sh --check` reported 16 passed. The 10 tests in
`tests/FR-00001/onboarding_node_test.sh` pass, also from a clean clone of
commit `c0acb7b`.

FR-00002, accepted on 2026-10-09. On the owner's machine,
`devops/onboarding.sh --check` reported 18 passed. The 6 tests in
`tests/FR-00002/onboarding_gh_test.sh` pass, also from a clean clone of
commit `dc60ef1`, together with the FR-00000 and FR-00001 onboarding tests.

The tests use stand-in programs and temporary credential files, so they need
no network, no real credentials, and no GitHub account.
