# Developer onboarding

This page describes the onboarding script that checks whether a machine can
run Dungeon Destiny's infrastructure tooling, build and test the Workers, and
build the Godot game client, and helps fix what is missing.

Sources: [FR-00000: Terraform setup](../../FR/FR-00000-terraform-setup/README.md),
[FR-00001: Worker dev workflow](../../FR/FR-00001-worker-dev-workflow/README.md),
[FR-00002: GitHub CLI onboarding](../../FR/FR-00002-github-cli-onboarding/README.md),
[FR-00003: Worker access policy](../../FR/FR-00003-worker-access-policy/README.md),
[FR-00004: Content D1 and user model](../../FR/FR-00004-content-d1-user-model/README.md),
[FR-00005: Godot Android client skeleton](../../FR/FR-00005-godot-android-client/README.md).

## Script

| Item | Value |
|---|---|
| Script | `devops/onboarding.sh`, written in Bash and checked with ShellCheck; a file-wide disable of SC2317 and SC2329, with its reason, covers the `check_*` and `fix_*` functions, which are called by name and which ShellCheck reports as unreachable |
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
- for the game client: Godot `4.6.3`, linked as `~/.local/bin/godot` (or
  given by `$GODOT`), Godot's Android export templates for `4.6.3`, JDK 17,
  and the Android SDK in `~/Android/Sdk` (or `$ANDROID_HOME`) with
  platform-tools, `android-36`, and build tools `36.0.0` are installed;
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

The Cloudflare API token for the Content Studio Access group is not checked:
it is not in the credential file but stored only as a Worker secret. Creating,
storing, and rotating it is step 13 of `doc/howto-cloudflare-setup.md`.

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

  Godot, about 72 MB, and its export templates, about 1.26 GB, are
  downloaded from Godot's GitHub releases and checked against the release's
  SHA-512 checksums, then installed in the owner's home folder without
  `sudo`; only the Android templates are kept. JDK 17 is installed with the
  `openjdk-17-jdk-headless` package. The Android SDK is installed with
  Google's `sdkmanager`, from Ubuntu's
  `google-android-cmdline-tools-13.0-installer` package, which shows Google's
  licence for the owner to accept; Ubuntu 24.04 has no `sdkmanager` package
  of its own.
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

FR-00004, accepted on 2026-10-14. The owner's WSL was rebuilt before
verification, and the credential file and the R2 token were recreated; then
`devops/onboarding.sh` reported 21 passed. The onboarding tests now clear any
real credential variables before they run, and they still pass, also from a
clean clone of commit `5d33b5f`.

FR-00005, accepted on 2026-11-10. On the owner's machine,
`devops/onboarding.sh` installed the game-client toolchain and reported 25
passed. The 6 tests in `tests/FR-00005/onboarding_client_test.sh` pass. The
FR-00000 to FR-00003 onboarding tests give the script a stand-in game-client
toolchain and still pass.

The tests use stand-in programs and temporary credential files, so they need
no network, no real credentials, and no GitHub account.
