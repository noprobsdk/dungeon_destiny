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
- For the Godot game client (FR-00005): Godot 4.6.3 is installed (linked as
  `~/.local/bin/godot`), Godot's Android export templates for 4.6.3 are
  installed, JDK 17 is installed, and the Android SDK in `~/Android/Sdk` (or
  `$ANDROID_HOME`) has platform-tools, `android-36`, and build tools 36.0.0.
  Godot and its templates are downloaded from Godot's GitHub releases and
  checked against their SHA-512 checksums; the templates are about 1.26 GB.
  The Android SDK is installed with Google's `sdkmanager`, from Ubuntu's
  `google-android-cmdline-tools-13.0-installer` package; it shows Google's
  licence for you to accept.

The script exits with status 0 when every check passes and 1 when any check
still fails. It never prints credential values or the SuperAdmin email address
and never changes anything in Cloudflare.

### Tests

The script's tests are in `tests/FR-00000/`, `tests/FR-00001/`,
`tests/FR-00002/`, `tests/FR-00003/`, and `tests/FR-00005/`. They use stand-in programs and a temporary home folder, so
they need no network access, install nothing, and use no real credentials:

```bash
tests/FR-00000/onboarding_test.sh
tests/FR-00001/onboarding_node_test.sh
tests/FR-00002/onboarding_gh_test.sh
tests/FR-00003/onboarding_access_test.sh
tests/FR-00005/onboarding_client_test.sh
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

## Game-client APK build

`game-client/build-apk.sh` builds the Godot game client's Android debug APK,
`apps/game-client/build/dungeon-destiny-dev.apk`, and can install it on a
phone. It was added by
[FR-00005](../delivery/FR/FR-00005-godot-android-client/README.md).

It checks the toolchain that the onboarding script installs, creates Godot's
debug keystore in `~/.local/share/godot/keystores/` if it is missing, points
Godot's editor settings at the Android SDK, the JDK, and the keystore, runs the
client tests, and exports the "Android (dev)" preset. The keystore and the APK
are never committed.

```bash
devops/game-client/build-apk.sh             # test and build
devops/game-client/build-apk.sh --install   # also install on the connected phone
```

`--install` needs exactly one device that `adb devices` lists. WSL does not
see USB devices, so in WSL the script uses Windows' `adb.exe` when Windows has
one, and passes it the APK's Windows path. Install it once in PowerShell
(the winget package's download link was broken on 2026-11-09):

```powershell
Invoke-WebRequest https://dl.google.com/android/repository/platform-tools-latest-windows.zip -OutFile "$env:TEMP\platform-tools.zip"
Expand-Archive "$env:TEMP\platform-tools.zip" -DestinationPath "$env:LOCALAPPDATA\Android" -Force
```

The script finds `adb.exe` on the Windows `PATH` or in
`%LOCALAPPDATA%\Android\platform-tools`. `ADB` overrides the choice, for
example for a device connected over Wi-Fi with `adb pair` and `adb connect`.

Its tests use stand-ins for Godot, keytool, javac, and adb:

```bash
tests/FR-00005/build_apk_test.sh
```

## Device bridge

`game-client/device-bridge.sh` lets Claude test the game client on a connected
Android device. Claude's shell cannot reach USB devices, so the project owner
starts the bridge in WSL and leaves it running; Claude writes one-line requests
into `apps/game-client/build/device-bridge/requests/` and reads the answers,
including screenshots, from `responses/`. It was added by
[FR-00005](../delivery/FR/FR-00005-godot-android-client/README.md).

It runs only these requests: `devices`, `build`, `install`, `start`, `stop`,
`screenshot`, `tap X Y`, `back`, `logcat`, `logcat-clear`, and `size`. It
never passes a request to a shell, and never uninstalls, deletes, or changes
settings on the device. Stop it with Ctrl+C.

```bash
devops/game-client/device-bridge.sh
tests/FR-00005/device_bridge_test.sh   # its tests, with a stand-in adb
```

## Reading the gateway logs

The `gateway` Worker (`dd-dev-gateway`) writes one JSON line for every
request, kept in Cloudflare's Workers Logs for 3 days on the Free plan and
7 days on the Paid plan. It was added by
[FR-00005](../delivery/FR/FR-00005-godot-android-client/README.md).

Each line has these fields:

| Field | Meaning |
|---|---|
| `event` | Always `request`. |
| `requestId` | The ID also sent in the response's `meta.requestId` and shown in the app's log and connection error screen. |
| `method`, `path`, `status` | The HTTP method, the path without the query string, and the HTTP status answered. |
| `code` | The error code, such as `APP_UPDATE_REQUIRED`, or `null`. |
| `durationMs` | Time spent; often `0`, because a Worker's clock only moves during I/O. |
| `environment`, `versionId` | `dev` and the deployed Worker version. |
| `platform`, `build`, `versionCheck` | Only when the app headers were sent: `android`, the build number, and `upToDate`, `updateAvailable`, `updateRequired`, or `invalidHeaders`. |

The lines never contain IP addresses, other request headers, query strings,
tokens, or personal data.

### Live

Watch requests as they arrive, for example while the app starts on a device.
`--format json` prints the whole event instead.

```bash
source ~/.config/dungeon-destiny/cloudflare.env
pnpm --filter @dungeon-destiny/gateway exec wrangler tail --env dev --format pretty
```

`wrangler tail` also prints what Cloudflare adds to each event, such as the
caller's IP address and location. Do not share its raw output; copy only the
JSON log lines.

### Afterwards

`logs/tail.sh` prints the last lines kept in Workers Logs, oldest first, as
tab-separated columns with the time in UTC. It reads the last 3 days through
Cloudflare's Workers Observability query API, never changes anything, and
prints only the `gateway`'s own log fields. `-n` sets the number of lines,
1 to 100; the default is 10.

```bash
source ~/.config/dungeon-destiny/cloudflare.env
devops/logs/tail.sh        # the last 10 lines
devops/logs/tail.sh -n 50  # the last 50 lines
tests/FR-00005/logs_tail_test.sh   # its tests, with a stand-in curl
```

The same lines are in the Cloudflare dashboard: open **Workers & Pages**, then
`dd-dev-gateway`, then its **Logs** (Observability) view, where they can be
filtered by `requestId`, `path`, `status`, or `versionCheck`.

### Following one request

1. Find the `requestId`: in the app's log (`adb logcat -s godot:V` shows
   `[gateway] /health -> HTTP 200, requestId …`), on the app's connection
   error screen, or in `meta.requestId` of any response.
2. Find the same `requestId` live with `wrangler tail`, or afterwards with
   `logs/tail.sh` or in the dashboard.
