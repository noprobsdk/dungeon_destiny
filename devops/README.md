# DevOps

Scripts for setting up and checking the machines that run Dungeon Destiny's
infrastructure tooling.

## Onboarding script

`onboarding.sh` checks that this machine has the packages and access needed to
run Terraform and build the Workers for Dungeon Destiny. It was added by
[FR-00000](../delivery/FR/FR-00000-terraform-setup/README.md)
and extended for Node.js and pnpm by
[FR-00001](../delivery/FR/FR-00001-worker-dev-workflow/README.md)
and for the GitHub CLI by
[FR-00002](../delivery/FR/FR-00002-github-cli-onboarding/README.md).

The manual setup steps, such as creating the R2 bucket and finding each
credential value, are in
[`doc/howto-cloudflare-setup.md`](../doc/howto-cloudflare-setup.md). This file
does not repeat them.

### Run it

From the repository root:

```bash
devops/onboarding.sh
```

In a terminal the script is guided. For each failed check it explains the fix
and asks before doing anything:

- a missing package: it offers the install command and runs it after `y`.
  Node.js 24 comes from NodeSource's apt repository, and pnpm from its
  standalone installer in your home folder, without `sudo`. After installing
  pnpm, open a new terminal or run `source ~/.bashrc`;
- missing project dependencies: it offers `pnpm install --frozen-lockfile`;
- the GitHub CLI not signed in: it explains how to run `gh auth login` in
  another terminal, asks whether you have, and checks again. It never signs in
  for you;
- a missing or unsafe credential file: it offers to create it with safe
  permissions;
- a missing value: it explains where to find the value, then reads it at its
  prompt and stores it. Keys are not shown as they are typed. Press Enter to
  skip;
- a rejected Cloudflare or R2 check: it shows the dashboard step, asks whether
  it is done, and checks again.

Pressing Enter at a `[y/N]` question answers No.

To only check, without questions or changes:

```bash
devops/onboarding.sh --check
```

Without a terminal, for example in automation, the script also only checks.

### What it checks

- jq, Terraform 1.11 or later, curl 7.75 or later, ShellCheck, and git are
  installed.
- Node.js 24 and the pnpm version pinned in `package.json` are installed, and
  the project dependencies are installed.
- The GitHub CLI, `gh`, is installed and signed in. Its account and token
  details are never shown.
- `~/.config/dungeon-destiny/cloudflare.env` exists, only its owner can read
  it, and it sets `CLOUDFLARE_EMAIL`, `CLOUDFLARE_API_KEY`,
  `CLOUDFLARE_ACCOUNT_ID`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`.
- Cloudflare accepts the Global API Key and account email.
- The R2 access key pair can list the `dd-terraform-state` bucket.

The script exits with status 0 when every check passes and 1 when any check
still fails. It never prints credential values and never changes anything in
Cloudflare.

### Tests

The script's tests are in `tests/FR-00000/`, `tests/FR-00001/`, and
`tests/FR-00002/`. They use stand-in programs and a temporary home folder, so
they need no network access, install nothing, and use no real credentials:

```bash
tests/FR-00000/onboarding_test.sh
tests/FR-00001/onboarding_node_test.sh
tests/FR-00002/onboarding_gh_test.sh
```
