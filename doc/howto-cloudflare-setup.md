# Cloudflare and Terraform setup how-to

## Purpose

Prepare a WSL machine and the Cloudflare account so that Terraform can manage
Dungeon Destiny's Cloudflare infrastructure with its state in R2, and so that
the Workers can be built, tested, and deployed, the GitHub Issues that track
Feature Requests can be managed with the GitHub CLI, and Content Studio can be
protected by Cloudflare Access.

This guide is the main source for these steps. [FR-00000](../delivery/FR/FR-00000-terraform-setup/README.md)
implements and verifies it, and `devops/README.md` links here.

## When to use

- Before FR-00000 is implemented, by the project owner.
- When setting up another WSL machine to run Terraform.

It covers only the manual steps. It creates no Terraform configuration and no
Cloudflare resources other than the state bucket.

## Prerequisites

- Ubuntu in WSL 2 with `sudo` rights.
- A Cloudflare account whose email address is verified. The Global API Key is
  available only after the email address is verified.
- Permission to add an R2 subscription to the account.

## Inputs

| Input | Where it comes from |
|---|---|
| State bucket name | `dd-terraform-state`, approved in FR-00000. |
| Account email | The email address used to sign in to Cloudflare. |
| Global API Key | Cloudflare dashboard, step 6. |
| Account ID | Cloudflare dashboard, step 7. |
| R2 Access Key ID and Secret Access Key | Cloudflare dashboard, step 5. |
| SuperAdmin email address | The email address of the Content Studio SuperAdmin, chosen by the project owner (FR-00003). |
| Zero Trust team name | Chosen by the project owner in step 11. |

## Procedure

Cloudflare dashboard labels below are taken from Cloudflare's documentation
and may change.

The guided onboarding script can do steps 1, 2, 8, 9, 10, and 12 for you,
explains where to find each value, and checks every step. Run it from the repository root, and
see [`devops/README.md`](../devops/README.md):

```bash
devops/onboarding.sh
```

The dashboard steps 3 to 7 and 11 are always done by hand.

### 1. Install Terraform

Working directory: any. Commands from HashiCorp's installation page:

```bash
wget -O - https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(grep -oP '(?<=UBUNTU_CODENAME=).*' /etc/os-release || lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

### 2. Install ShellCheck and jq

Working directory: any.

```bash
sudo apt install shellcheck jq
```

### 3. Add R2 to the account

1. In the Cloudflare dashboard, go to **Storage & databases** > **R2** >
   **Overview**.
2. If R2 is not yet added, complete the checkout flow to add an R2
   subscription.

### 4. Create the state bucket

1. Go to the **R2 object storage** page.
2. Select **Create bucket**.
3. Enter the name `dd-terraform-state`.
4. Under **Location**, leave **None** selected for automatic selection.
5. Select **Create bucket**.

### 5. Create the R2 access key pair

1. On the **R2 object storage** page, under **Account Details**, select
   **Manage** next to **API Tokens**.
2. Select **Create Account API token**.
3. Under **Permissions**, select **Object Read & Write**.
4. Scope the token to the `dd-terraform-state` bucket only.
5. Select **Create Account API token**.
6. Copy the **Access Key ID** and **Secret Access Key** directly into the
   credential file in step 8. The Secret Access Key cannot be viewed again.

### 6. View the Global API Key

1. In the Cloudflare dashboard, select **User Profile** > **API Tokens**.
2. In the **API Keys** section, select **View** next to **Global API Key**.
3. Copy it directly into the credential file in step 8.

### 7. Copy the account ID

1. Go to **Account home**.
2. Select **Search**, or press `CTRL + K`.
3. Enter `Copy account ID` and select the result.

The account ID is also shown under **Account Details** in **Workers & Pages**.

### 8. Create the credential file

Working directory: any. Create the file so that only you can read it, then open
it in an editor:

```bash
mkdir -p ~/.config/dungeon-destiny
chmod 700 ~/.config/dungeon-destiny
install -m 600 /dev/null ~/.config/dungeon-destiny/cloudflare.env
nano ~/.config/dungeon-destiny/cloudflare.env
```

Enter the values in the editor, not on the command line, so they do not appear
in shell history:

```bash
export CLOUDFLARE_EMAIL="<account email>"
export CLOUDFLARE_API_KEY="<Global API Key>"
export CLOUDFLARE_ACCOUNT_ID="<account ID>"
export AWS_ACCESS_KEY_ID="<R2 Access Key ID>"
export AWS_SECRET_ACCESS_KEY="<R2 Secret Access Key>"
export STUDIO_SUPERADMIN_EMAIL="<SuperAdmin email address>"
```

The Cloudflare Terraform provider reads `CLOUDFLARE_EMAIL` and
`CLOUDFLARE_API_KEY`. Terraform's S3 backend reads `AWS_ACCESS_KEY_ID` and
`AWS_SECRET_ACCESS_KEY`; here they hold the R2 keys, not AWS keys.
`CLOUDFLARE_ACCOUNT_ID` supplies the R2 endpoint
`https://<account ID>.r2.cloudflarestorage.com`. `STUDIO_SUPERADMIN_EMAIL` is
the Content Studio SuperAdmin, who can always sign in; it is kept here, never in
the repository, because the repository is public.

### 9. Install Node.js 24, pnpm, and the project dependencies

Working directory: the repository root. Node.js 24 comes from NodeSource's apt
repository; pnpm comes from its standalone installer in your home folder, at
the version pinned in `package.json`, and needs no `sudo`.

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh
sudo apt-get install -y nodejs
rm nodesource_setup.sh
curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION="$(jq -r '.packageManager' package.json | sed 's/^pnpm@//')" sh -
```

Open a new terminal, or run `source ~/.bashrc`, so that the terminal finds
pnpm. Then install the project dependencies from the repository root:

```bash
pnpm install --frozen-lockfile
```

### 10. Install the GitHub CLI and sign in

Working directory: any. These commands are from GitHub's `cli/cli` installation
guide:

```bash
(type -p wget >/dev/null || (sudo apt update && sudo apt install wget -y)) && sudo mkdir -p -m 755 /etc/apt/keyrings && out=$(mktemp) && wget -nv -O$out https://cli.github.com/packages/githubcli-archive-keyring.gpg && cat $out | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg && sudo mkdir -p -m 755 /etc/apt/sources.list.d && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null && sudo apt update && sudo apt install gh -y
```

Then sign in. Signing in is interactive, so the onboarding script cannot do it
for you:

```bash
gh auth login
```

Choose **GitHub.com**, then **SSH**, then **Login with a web browser**, and
enter the one-time code it shows on github.com. `gh` stores the sign-in in your
home folder, never in this repository.

### 11. Turn on Cloudflare Zero Trust

Cloudflare Access, which protects Content Studio, is part of Cloudflare Zero
Trust. Turn it on once for the account. Two-factor authentication on the
Cloudflare account is recommended first.

1. In the Cloudflare dashboard, select **Zero Trust**.
2. Choose a team name. It becomes your sign-in address,
   `<team name>.cloudflareaccess.com`, and can be found later under
   **Zero Trust** > **Settings**. It is not a secret.
3. Choose the **Zero Trust Free** plan. Cloudflare asks for payment details
   even for the free plan, but does not charge for it. The free plan covers up
   to 50 users.

Terraform creates the Access application, its policy, and the one-time PIN
sign-in method. Do not create them in the dashboard.

### 12. Install Playwright's Chromium

Working directory: the repository root. The end-to-end tests run in Chromium.
This downloads it into your home folder and installs the system libraries it
needs with `sudo`:

```bash
pnpm exec playwright install --with-deps chromium
```

## Verification

Working directory: any.

```bash
terraform version
shellcheck --version
jq --version
node --version
pnpm --version
gh auth status
ls -l ~/.config/dungeon-destiny/cloudflare.env
```

Expected results:

- Terraform is version 1.11 or later.
- ShellCheck prints its version.
- jq prints its version.
- Node.js prints a version starting with `v24.`.
- pnpm prints the version pinned in `package.json`.
- `gh auth status` reports that you are logged in to github.com. Do not share
  its output; it describes your account.
- In the dashboard, **Zero Trust** > **Settings** shows your team name.
- The credential file line starts with `-rw-------`.

Check that every value is set, without printing any value:

```bash
bash -c 'source ~/.config/dungeon-destiny/cloudflare.env; for v in CLOUDFLARE_EMAIL CLOUDFLARE_API_KEY CLOUDFLARE_ACCOUNT_ID AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY STUDIO_SUPERADMIN_EMAIL; do if [ -n "${!v}" ]; then echo "$v set"; else echo "$v MISSING"; fi; done'
```

Expected result: six lines ending in `set`.

In the dashboard, `dd-terraform-state` is listed on the **R2 object storage**
page, and the R2 API token is scoped to that bucket only.

The onboarding script also checks that Cloudflare accepts the Global API Key,
that the R2 access key pair can list the `dd-terraform-state` bucket, and that
Zero Trust is turned on. Working
directory: the repository root.

```bash
devops/onboarding.sh --check
```

Expected result: the last line reads `0 failed`.

## Failure handling

- **Global API Key not shown:** verify the account email address, then retry
  step 6.
- **Secret Access Key not copied:** delete the R2 API token and repeat step 5.
- **A value is missing:** reopen the credential file with `nano` and add it.
- **Wrong file permissions:** run `chmod 600 ~/.config/dungeon-destiny/cloudflare.env`.
- **A key may have been exposed:** stop, treat it as compromised, and replace
  it in the Cloudflare dashboard before continuing.
- **Zero Trust not turned on:** repeat step 11; the onboarding script reports
  HTTP 403 until it is done.
- **The SuperAdmin cannot receive the one-time PIN:** this is the emergency
  route. Sign in to the Cloudflare dashboard with your own Cloudflare account,
  which does not use Access. Change `STUDIO_SUPERADMIN_EMAIL` in the credential
  file to an address you can reach, then run `terraform apply` and redeploy
  `studio-api`, as described in `AGENTS.md`. Do not change the Access policy in
  the dashboard; Terraform would undo it.

## Security

- The Global API Key has full access to every resource in the Cloudflare
  account. Keep it only in the credential file.
- Never paste a key or secret into chat, a GitHub Issue, a pull request, a
  commit, a log, or any file in this repository.
- Enter secrets in an editor, never as command-line arguments.
- Keep the credential directory at `700` and the file at `600`.
- Do not enable Terraform debug logging (`TF_LOG`) when sharing output; it can
  expose credentials.
- Keep the SuperAdmin email address only in the credential file; the
  repository is public.

## References

- [FR-00000: Terraform setup](../delivery/FR/FR-00000-terraform-setup/README.md)
- [DD-016](12-decisions/decision-log.md)
- [Install Terraform](https://developer.hashicorp.com/terraform/install)
- [Terraform S3 backend](https://developer.hashicorp.com/terraform/language/backend/s3)
- [Cloudflare Terraform provider](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs)
- [Cloudflare R2: get started](https://developers.cloudflare.com/r2/get-started/)
- [Cloudflare R2: data location](https://developers.cloudflare.com/r2/reference/data-location/)
- [Cloudflare R2: API tokens](https://developers.cloudflare.com/r2/api/tokens/)
- [Cloudflare API keys](https://developers.cloudflare.com/fundamentals/api/get-started/keys/)
- [Find account IDs](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/)
- [Terraform remote backend on R2](https://developers.cloudflare.com/terraform/advanced-topics/remote-backend/)
- [FR-00003: Worker access policy](../delivery/FR/FR-00003-worker-access-policy/README.md)
- [Cloudflare Zero Trust: get started](https://developers.cloudflare.com/cloudflare-one/setup/)
- [Cloudflare Zero Trust plans](https://www.cloudflare.com/plans/zero-trust-services/)
- [Playwright: install browsers](https://playwright.dev/docs/browsers)
- [NodeSource Node.js installation](https://github.com/nodesource/distributions/blob/master/DEV_README.md)
- [pnpm installation](https://pnpm.io/installation)
- [GitHub CLI installation on Linux](https://github.com/cli/cli/blob/trunk/docs/install_linux.md)
