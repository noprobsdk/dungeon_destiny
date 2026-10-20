# Developer onboarding

This page describes the onboarding script that checks whether a machine can
run Dungeon Destiny's infrastructure tooling and build and test the Workers,
and helps fix what is missing.

Sources: [FR-00000: Terraform setup](../../FR/FR-00000-terraform-setup/README.md),
[FR-00001: Worker dev workflow](../../FR/FR-00001-worker-dev-workflow/README.md),
[FR-00002: GitHub CLI onboarding](../../FR/FR-00002-github-cli-onboarding/README.md),
[FR-00003: Worker access policy](../../FR/FR-00003-worker-access-policy/README.md).

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
- Playwright's Chromium, used by the end-to-end tests, is installed;
- the credential file exists and only its owner can read it;
- the credential file sets `CLOUDFLARE_EMAIL`, `CLOUDFLARE_API_KEY`,
  `CLOUDFLARE_ACCOUNT_ID`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and
  `STUDIO_SUPERADMIN_EMAIL`, the Content Studio SuperAdmin's email address,
  which must be a plain email address;
- Cloudflare accepts the Global API Key and account email;
- the R2 access key pair can list the `dd-terraform-state` bucket; and
- Cloudflare Zero Trust is turned on, which the script checks by asking
  Cloudflare's API for the account's Access organization.

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

  Playwright's Chromium is installed with
  `pnpm exec playwright install --with-deps chromium`, into the owner's home
  folder. Turning on Zero Trust is a manual step in the Cloudflare dashboard,
  on the free plan with a team name: the script explains it, asks whether it
  is done, checks again, and changes nothing in Cloudflare.
- **Check only**, with `--check` or without a terminal: the script only reads,
  never prompts, and changes nothing.

In both modes an empty answer is No. The script never changes anything in
Cloudflare, never overwrites a credential value without asking, never prints
credential values, the SuperAdmin email address, or the GitHub token, and
never passes them as command-line arguments: the Cloudflare, R2, and Zero
Trust checks use curl with the credentials on standard input.

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

FR-00003, accepted on 2026-10-10. On the owner's machine,
`devops/onboarding.sh --check` reported 21 passed. The 9 tests in
`tests/FR-00003/onboarding_access_test.sh` pass, also from a clean clone of
commit `2ca1885`. They cover a missing, set, and not plain SuperAdmin email
address, Zero Trust turned on and off, and Chromium installed and missing,
and that guided mode installs Chromium only after Yes and treats Zero Trust
as a manual step. The FR-00000, FR-00001, and FR-00002 onboarding tests use a
fake SuperAdmin email address and still pass. A SuperAdmin email address with
a hidden byte broke pnpm and Terraform during implementation; the plain-email
check was added for that reason.

The tests use stand-in programs and temporary credential files, so they need
no network, no real credentials, and no GitHub account.
