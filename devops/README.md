# DevOps

Scripts for setting up and checking the machines that run Dungeon Destiny's
infrastructure tooling, and for deploying Workers that need values kept
outside the repository.

## Onboarding script

`onboarding.sh` checks that this machine has the packages and access needed to
run Terraform, build and test the Workers, and deploy Content Studio for
Dungeon Destiny. It was added by
[FR-00000](../delivery/FR/FR-00000-terraform-setup/README.md)
and extended for Node.js and pnpm by
[FR-00001](../delivery/FR/FR-00001-worker-dev-workflow/README.md)
for the GitHub CLI by
[FR-00002](../delivery/FR/FR-00002-github-cli-onboarding/README.md),
and for Content Studio by
[FR-00003](../delivery/FR/FR-00003-worker-access-policy/README.md).

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
- Playwright's Chromium missing: it offers
  `pnpm exec playwright install --with-deps chromium`, which asks for your
  `sudo` password for Chromium's system libraries;
- the GitHub CLI not signed in: it explains how to run `gh auth login` in
  another terminal, asks whether you have, and checks again. It never signs in
  for you;
- a missing or unsafe credential file: it offers to create it with safe
  permissions;
- a missing value: it explains where to find the value, then reads it at its
  prompt and stores it. Keys are not shown as they are typed. Press Enter to
  skip;
- a rejected Cloudflare or R2 check, or Cloudflare Zero Trust not turned on:
  it shows the dashboard step, asks whether it is done, and checks again.

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
- Playwright's Chromium is installed, once Playwright is in the workspace.
- The GitHub CLI, `gh`, is installed and signed in. Its account and token
  details are never shown.
- `~/.config/dungeon-destiny/cloudflare.env` exists, only its owner can read
  it, and it sets `CLOUDFLARE_EMAIL`, `CLOUDFLARE_API_KEY`,
  `CLOUDFLARE_ACCOUNT_ID`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and
  `STUDIO_SUPERADMIN_EMAIL`. The SuperAdmin email address must be a plain
  email address, without spaces or hidden characters.
- Cloudflare accepts the Global API Key and account email.
- The R2 access key pair can list the `dd-terraform-state` bucket.
- Cloudflare Zero Trust is turned on for the account.

The script exits with status 0 when every check passes and 1 when any check
still fails. It never prints credential values or the SuperAdmin email address
and never changes anything in Cloudflare.

### Tests

The script's tests are in `tests/FR-00000/`, `tests/FR-00001/`,
`tests/FR-00002/`, and `tests/FR-00003/`. They use stand-in programs and a temporary home folder, so
they need no network access, install nothing, and use no real credentials:

```bash
tests/FR-00000/onboarding_test.sh
tests/FR-00001/onboarding_node_test.sh
tests/FR-00002/onboarding_gh_test.sh
tests/FR-00003/onboarding_access_test.sh
```

## studio-api deploy script

`deploy-studio-api.sh` deploys the `studio-api` Worker to `dd-dev-studio-api`
with a `dev-YYYYMMDD-HHMMSS` tag. It passes the Content Studio SuperAdmin email
address from `STUDIO_SUPERADMIN_EMAIL` as the Worker's `SUPERADMIN_EMAIL`
variable, refuses to deploy when it is not set, and masks it in Wrangler's
output. It was added by
[FR-00003](../delivery/FR/FR-00003-worker-access-policy/README.md).

Run it through pnpm from the repository root, after loading the credential
file. A deploy changes the live Worker and needs explicit approval:

```bash
source ~/.config/dungeon-destiny/cloudflare.env
pnpm --filter @dungeon-destiny/studio-api run deploy:dev
```

Its tests use a stand-in Wrangler and need no network or credentials:

```bash
tests/FR-00003/deploy_script_test.sh
```
