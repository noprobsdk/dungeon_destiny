# FR-00005 implementation report

Implementation of [FR-00005: Godot Android client skeleton](README.md). This
report contains no credentials, keys, tokens, account IDs, email addresses,
device serial numbers, or the full `gateway` address.

## Created and changed

| Path | Result |
|---|---|
| `apps/gateway/src/index.ts`, `apps/gateway/src/api-gateway/` | `GET /app/version`, the build check before routing (HTTP 426 `APP_UPDATE_REQUIRED` on every other path), and one JSON request log line per request (`app-version.ts`, `request-log.ts`). `/app/version` also answers `updateUrl` (approved deviation 1). |
| `apps/gateway/wrangler.jsonc`, `apps/gateway/worker-configuration.d.ts` | `APP_MIN_BUILD_ANDROID` and `APP_RECOMMENDED_BUILD_ANDROID` at `1`, `APP_UPDATE_URL_ANDROID`, Workers Logs (`observability.enabled`), and the regenerated types. |
| `infra/terraform/envs/dev/workers.tf` | Workers Logs turned on for `dd-dev-gateway`, matching the Wrangler configuration. |
| `packages/contracts/src/index.ts` | The app headers, the `android` platform, `AppVersionData` (with `updateUrl`), the version check results, and the error codes `INVALID_APP_HEADERS`, `APP_UPDATE_REQUIRED`, and `SERVER_MISCONFIGURED`. |
| `apps/game-client/` | The Godot 4.6.3 project: `scenes/loading_screen.tscn`, the scripts `loading_screen.gd`, `api_client.gd`, `http_transport.gd`, `response_parser.gd`, `version_check.gd`, and `app_info.gd`, the project settings, the "Android (dev)" export preset, GUT 9.6.1 under `addons/gut/`, and the client tests in `tests/FR-00005/`. |
| `devops/game-client/build-apk.sh` | Runs the client tests and builds the debug APK; `--install` installs it with Windows `adb.exe` from WSL. |
| `devops/game-client/device-bridge.sh` | A request bridge for testing on a USB device from a shell that cannot reach USB (finding 1). |
| `devops/logs/tail.sh` | Prints the last `gateway` log lines kept in Workers Logs (`-n`, default 10), read-only, through Cloudflare's Workers Observability query API. |
| `devops/onboarding.sh`, `devops/README.md` | The game-client toolchain checks (Godot, export templates, JDK 17, Android SDK 36), and the how-to for the APK build, the device bridge, and reading the `gateway` logs. |
| `AGENTS.md` | The game-client, log, and threshold-deploy commands, and the FR-00005 tests. |
| `package.json`, `vitest.config.ts` | The `gateway-thresholds` and `gateway-misconfigured` test projects. |
| `tests/FR-00005/` | The FR-00005 Vitest, shell, deployed, and screen tests. |
| `tests/FR-00000/` to `tests/FR-00003/` | The onboarding harnesses use a stand-in client toolchain, with ShellCheck source directives (finding 4). |

Final deployed state: `dd-dev-gateway` version `4fc61d0d`, with
`APP_MIN_BUILD_ANDROID` and `APP_RECOMMENDED_BUILD_ANDROID` at `1` and the dev
update link; Workers Logs on; `terraform plan` reports no changes. The code is
committed and pushed to `main`.

## Implementation decisions

Decisions 1 to 13 were approved by the project owner on 2026-11-07, before
the tests were written (recorded in `doc/todo.md`):

| # | Decision |
|---|---|
| 1 | Godot 4.6 Linux binary in WSL for the headless GUT tests and the APK export, with the Android SDK and JDK 17 in WSL. |
| 2 | The onboarding script checks and, after Yes, installs Godot, GUT, and the Android SDK from official sources, pinned. |
| 3 | GUT committed under `apps/game-client/addons/gut/` with its licence. |
| 4 | `gateway` modules `src/api-gateway/app-version.ts` and `request-log.ts`. |
| 5 | Error codes `INVALID_APP_HEADERS`, `APP_UPDATE_REQUIRED`, and `SERVER_MISCONFIGURED`. |
| 6 | The build check runs before routing; `/app/version` accepts GET only. |
| 7 | The build header is digits only, at most 9. |
| 8 | The threshold tests read the Worker's dev `env`. |
| 9 | The Terraform `observability` attribute was confirmed with `terraform providers schema` and is mirrored in `wrangler.jsonc`. |
| 10 | One scene, `scenes/loading_screen.tscn`, with network-free logic scripts and a stubbable `api_client.gd`. |
| 11 | A 10-second timeout per call. |
| 12 | The `gateway` dev address is the project setting `dungeon_destiny/gateway_url`. |
| 13 | `tests/FR-00005/deployed_test.sh` is modelled on FR-00001's. |

Final versions: Godot 4.6.3 with its Android export templates, GUT 9.6.1,
JDK 17, Android SDK platform and build tools 36 (36.0.0), Wrangler 4.148.0,
Vitest 4.1.11, pnpm 12.10.1. Windows platform-tools (adb 37.0.1) for USB.

## Approved deviations

1. **Update button and link** (approved by the project owner on 2026-11-10,
   during the tablet test). The Feature Request leaves store links on the
   update screens out of scope. Both update screens now have an Update button,
   and the link comes from the `gateway`, so it changes with a deploy and no
   app update (DD-012, DD-023):
   - the Wrangler variable `APP_UPDATE_URL_ANDROID`; in dev the Google Play
     address for `com.dungeondestiny.game.dev`, which shows Play's "Item not
     found" until a store page exists;
   - `GET /app/version` answers it as `updateUrl`, or `null` when it is
     missing, empty, or not `https`; a bad link never stops the version check;
   - the client opens only `https` addresses, hides the button without a link,
     and after HTTP 426 uses the link from its version check;
   - "Update required" still has no way to continue.

   The owner decided to record this here and leave `README.md` unchanged.

## Findings during implementation

1. **WSL cannot reach USB devices.** The tablet was tested with Windows
   `adb.exe` directly. `devops/game-client/device-bridge.sh` was added for
   shells without USB access; it is not in the Feature Request's scope list.
2. **Windows and WSL adb use different keys**, so the tablet asked to allow
   USB debugging again for Windows adb.
3. **The tablet dropped off USB twice** during the session and reconnected
   after replugging; its screen also locked during a test. Neither was an app
   problem.
4. **ShellCheck failed on info-level findings** (SC1091 four times, SC2016
   once) in the onboarding harnesses and `tests/FR-00005/device_bridge_test.sh`.
   Fixed with `source-path=SCRIPTDIR` directives and one documented disable;
   ShellCheck now reports nothing.
5. **`pnpm run deploy:dev -- --var …` ignores the `--var`.** pnpm passes a
   literal `--` to Wrangler. The first threshold deploy (`03c39221`) therefore
   redeployed `1`/`1` unchanged. Threshold deploys use
   `pnpm --filter @dungeon-destiny/gateway exec wrangler deploy --env dev --tag … --var NAME:VALUE`.
6. **A deploy takes a few seconds to reach every Cloudflare location.** Right
   after the deploy back to `1`/`1`, the tablet's `/app/version` reached the
   new version and its `/health` call, a fraction of a second later, still
   reached the old one and got HTTP 426. The app correctly showed "Update
   required" with the Update button; a relaunch about 30 seconds later reached
   Ready. Players can see mixed answers for a few seconds after any threshold
   change.
7. **Workers Logs leaves out fields that are `null`.** The `gateway` writes
   `"code": null` on success, but the stored line has no `code`; lines with an
   error code keep it.
8. **The Workers Observability query counts every event towards its limit**,
   including Cloudflare's own invocation events, so `devops/logs/tail.sh` asks
   for four times as many events as lines.

## Test results

| Test | Result |
|---|---|
| `pnpm test` (all projects) | 171 passed |
| FR-00005 Vitest (`gateway`, thresholds, misconfigured) | 43 passed |
| `pnpm run typecheck` | passed |
| `pnpm run test:e2e` | 4 passed |
| Client GUT tests, headless (`tests/FR-00005/client_test.sh`) | 51 passed, 132 asserts |
| `tests/FR-00005/screens_test.sh` | 6 states at phone, tall phone, and tablet sizes, 0 layout problems |
| `tests/FR-00005/build_apk_test.sh` | 17 passed |
| `tests/FR-00005/client_scope_test.sh` | 4 passed |
| `tests/FR-00005/config_test.sh` | 3 passed |
| `tests/FR-00005/device_bridge_test.sh` | 6 passed |
| `tests/FR-00005/logs_tail_test.sh` | 8 passed |
| `tests/FR-00005/onboarding_client_test.sh` | passed |
| FR-00000 to FR-00004 shell tests | all passed, including `tests/FR-00000/terraform_test.sh` |
| ShellCheck | no findings |
| `tests/FR-00005/deployed_test.sh` | 6 passed |
| FR-00001 and FR-00003 deployed tests | 4 and 3 passed |

The tests were written before the code they check. For the Update button, the
new tests failed first (9 `gateway` failures and the client tests) and passed
after the code was added.

## Deployment and device results

Deploys of `dd-dev-gateway`, each approved by the project owner:

| Version | Settings | Purpose |
|---|---|---|
| `f898b71e` | `1`/`1` | First deploy with Workers Logs (2026-11-09). |
| `03c39221` | `1`/`1` | Intended recommended `2`; ignored the `--var` (finding 5). |
| `a4b8c688` | recommended `2` | "New version available". |
| `a4b1e9d1` | minimum and recommended `2` | "Update required". |
| `fa6179ed` | `1`/`1` | Back to `1`. |
| `460cfdbc` | `1`/`1` | The update link (deviation 1). |
| `1a0addd3` | recommended `2` | "New version available" with Update. |
| `b0ee60bd` | minimum and recommended `2` | "Update required" with Update. |
| `4fc61d0d` | `1`/`1` | Back to `1`; final state. |

After the last deploy, the deployed tests passed and `terraform plan` reported
no changes.

Checked on a Samsung Android tablet (Adreno 650 GPU) over USB, with the debug
APK `0.1.0 (build 1)`:

- the app opens in portrait and shows `0.1.0 (build 1)`, then
  `Server: ok · dev`, the server version, and Ready;
- the layout fits the tablet, with nothing under the system bars; the device
  reports no display cutout;
- offline, the app shows the connection error with Retry and no request ID;
  Retry while offline stays on the error; back online, Retry reaches Ready;
- `adb logcat` shows `/app/version` and `/health` with HTTP 200 and their
  request IDs;
- `wrangler tail` shows the same two requests, with the same request IDs,
  `platform` `android`, `build` `1`, and `versionCheck` `upToDate`;
- with recommended build `2`: "A new version is available" with Update and
  Continue; Update opens Google Play; Continue reaches Ready;
- with minimum build `2`: "Update required" with Update only; Update opens
  Google Play; back in the app it stays on "Update required";
- back at `1`/`1`: Ready.

Workers Logs: `devops/logs/tail.sh` showed the requests of the deployed tests
after the last deploy, including the HTTP 426 `APP_UPDATE_REQUIRED` and
HTTP 400 `INVALID_APP_HEADERS` lines, and the tablet's two Ready requests,
found again by their `requestId`. The lines hold only the fields in Section 7:
no IP addresses, other headers, query strings, or tokens.

Section 16 asks for these checks on a phone. On 2026-11-10 the project owner
accepted the tablet in place of a phone; no phone was tested.

Screenshots and logs are in `apps/game-client/build/device-screens/`, which is
not committed.

## Open before In Review

None. The Feature Request is tracked in GitHub Issue #6.

## Limitations and follow-up work

- The dev update link points to a Play page that does not exist yet; the real
  store link waits for a store page.
- Landscape is not supported; the app stays in portrait.
- A short black screen shows while Godot starts.
- Threshold changes need a deploy, and for a few seconds after it players can
  get mixed answers (finding 6).
- iOS, release builds, Play signing, and CI/CD are later Feature Requests.

## GitHub Issue completion recap

> FR-00005 Godot Android client skeleton is implemented. The Godot 4.6.3
> Android app opens a loading screen that checks its build with the `gateway`
> (`GET /app/version`, DD-023), calls `/health`, and shows the server's
> status, environment, and version. Old builds see "new version available" or
> "Update required", both with an Update button whose link comes from the
> `gateway`. Every `gateway` request writes one JSON log line to Workers Logs.
> Verified on an Android tablet, including both update screens; dev thresholds
> are back at 1. All FR-00000 to FR-00005 tests pass.
