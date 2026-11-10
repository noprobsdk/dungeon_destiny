# FR-00005: Godot Android client skeleton

- **Status:** Pending documentation
- **Sprint:** Not used. The project has one developer, so sprints are not used.
- **Type:** Implementation
- **Tracking:** [GitHub Issue #6](https://github.com/noprobsdk/dungeon_destiny/issues/6).

## 1. Purpose

Start the Dungeon Destiny game client with the smallest useful app: a Godot
Android app with one loading screen that checks the app's version against the
services, tests the connection to the cloud, and shows the `gateway` Worker's
health response.

It also adds the version check to the `gateway` Worker (DD-023), so that from
the very first build the services can tell an old app to update, and gives
the `gateway` request logs, so the project owner can see what the server does
with each call from the phone.

After this Feature Request, the Android build, the client's connection to the
services, and the version check are proven, and later Feature Requests can
build gameplay on top of them. It contains no gameplay, sign-in, or game
server connection.

## 2. Implementation sequence

1. Move this Feature Request to `Backlog`, then to `In Progress`.
2. Review the implementation decisions with the project owner.
3. **`gateway` first.** Write the `gateway` tests and confirm they fail, then
   add `GET /app/version`, the build check, and the request log until they
   pass.
4. Turn on Workers Logs for `dd-dev-gateway` with Terraform, then deploy
   `gateway` to dev, each with the project owner's approval, and run the
   deployed tests. The client work depends on this deploy.
5. **Godot client.** Add GUT, write the client tests and confirm they fail,
   then build the loading screen until they pass.
6. Build the debug APK, install it on the project owner's phone, and verify it
   with the project owner, including the update screens (Section 16).
7. Write the Android build how-to and add the commands to `AGENTS.md`.
8. Complete `implementation_report.md` and move to `In Review`.
9. After acceptance, hand over to documentation and as-built.

## 3. Scope boundaries

This Feature Request creates or changes:

- in the `gateway` Worker: `GET /app/version`, the build check on every call
  that carries the app headers, and the two thresholds for Android in its
  Wrangler configuration;
- one structured log line for every `gateway` request;
- Workers Logs turned on for `dd-dev-gateway`, in Terraform
  (`infra/terraform/envs/dev/workers.tf`) and in its Wrangler configuration;
- the response types for `/app/version` in `packages/contracts/`;
- the `gateway` tests and the deployed tests in `tests/FR-00005/`;
- the Godot project in `apps/game-client/`, with its project settings and the
  Android export preset;
- the loading screen, the "new version available" message, the
  "Update required" screen, and the connection error screen;
- the GUT test add-on in `apps/game-client/addons/gut/` and the client tests
  in `apps/game-client/tests/FR-00005/`;
- a how-to for building and installing the debug APK, and for reading the
  `gateway` logs; and
- the commands in `AGENTS.md`.

This Feature Request does not create or change:

- gameplay of any kind: no scene, hero, joystick, enemies, or game rules;
- player sign-in, accounts, or tokens (DD-011);
- the runtime manifest, published R2, or downloaded assets;
- the realtime connection or any game server code;
- any other Worker, database, or Content Studio code, or any Terraform
  resource other than the `gateway` Worker's log setting;
- log storage beyond Workers Logs, such as Logpush, which waits for the open
  decision on the production observability provider;
- staging or production environments, which wait for the open decision on
  environments;
- store pages, store links, or Google Play's In-App Updates;
- iOS and iPad builds, which a later Feature Request adds once a Mac with
  Xcode and an Apple Developer account are available;
- release builds, Play Store signing, or CI/CD.

Deferred to later Feature Requests: a test scene with placeholder models
(DD-022), the iOS and iPad build, store links on the update screens, and a
maintenance switch.

## 4. Source

- [DD-011, DD-012, DD-017, DD-019, DD-022, and DD-023](../../../doc/12-decisions/decision-log.md).
- [Frontends](../../../doc/08-technical/service-architecture/frontends.md),
  section "Godot game client".
- [Access and edge services](../../../doc/08-technical/service-architecture/access-and-edge.md).
- [Operations](../../../doc/08-technical/service-architecture/operations.md),
  section "Observability".
- [FR-00001](../FR-00001-worker-dev-workflow/README.md): the `gateway`
  Worker, its public `GET /health`, and its tests.
- [`doc/test-driven-development.md`](../../../doc/test-driven-development.md).
- Design reference, not copied: the POC Godot project's portrait layout and
  Mobile renderer.

Design baseline commit: `bfee2a3`.

Source-document readiness gate: passes for this scope. DD-023 defines the
version check. The open decisions on CI/CD and game-server deployment do not
affect it.

## 5. Target ownership

- **Online services:** the `gateway` Worker owns `GET /app/version`, the build
  check, the thresholds, and its request log. Wrangler deploys them.
  Terraform owns the Worker's log setting, which the Wrangler configuration
  repeats so that neither undoes the other.
- **Godot app:** owns the loading screen, the update and error screens, the
  build number, and the headers it sends.
- **Database, Content Studio, runtime manifest, 3D production:** N/A.

## 6. Prerequisites and deployment blockers

- FR-00001 is `Complete`, and `dd-dev-gateway` answers `GET /health`.
- The project owner's computer has the Godot 4.6 editor and its matching
  Android export templates, JDK 17, and the Android SDK with platform and
  build tools 36.
- The project owner has an Android phone with developer options and USB
  debugging enabled.
- Every deploy of `gateway` and every `terraform apply` needs the project
  owner's approval.

Blockers: none.

## 7. Approved decisions

**Version check (DD-023)**

- The platform header values are `android`, and later `ios`.
- The headers are `X-App-Platform` and `X-App-Build`. The build is a whole
  number of 0 or more.
- The thresholds are the Wrangler variables `APP_MIN_BUILD_ANDROID` and
  `APP_RECOMMENDED_BUILD_ANDROID`. In dev both start at `1`.
- `GET /app/version` reads the headers and answers HTTP 200 with `data`
  containing `platform`, `build`, `minimumBuild`, `recommendedBuild`,
  `supported` (build ≥ minimum), and `upToDate` (build ≥ recommended).
- Missing or invalid headers, or an unknown platform, are answered with
  HTTP 400 and the code `INVALID_APP_HEADERS`.
- Any other `gateway` call that carries a build below the minimum is answered
  with HTTP 426 and the code `APP_UPDATE_REQUIRED`, before the call is
  handled. Calls without the headers, such as `GET /health` from a monitor,
  are not checked.
- Raising `APP_MIN_BUILD_ANDROID` needs the project owner's approval.

**Logging**

- Workers Logs is turned on for `dd-dev-gateway`. It keeps logs for 3 days on
  Cloudflare's Free plan and 7 days on the Paid plan.
- The setting is declared in Terraform and in the Wrangler configuration,
  the same way as the Worker's tags (FR-00001), so `terraform plan` reports
  no changes after a deploy. The exact Terraform attribute is confirmed in
  the implementation-decision review.
- The `gateway` writes one JSON log line per request with: `event`
  (`request`), `requestId`, `method`, `path`, HTTP `status`, `code`,
  `durationMs`, `environment`, and the deployed version ID. When the app
  headers are present it also writes `platform`, `build`, and the version
  check result: `upToDate`, `updateAvailable`, `updateRequired`, or
  `invalidHeaders`.
- The log never contains IP addresses, other request headers, query strings,
  tokens, or personal data.
- The client shows the `requestId` of a failed response on its connection
  error screen, so the same request can be found in the `gateway` log.

**Godot client**

- The client lives in `apps/game-client/` (DD-022).
- The latest Godot 4.6 patch with its matching export templates, JDK 17, and
  Android SDK platform and build tools 36. The exact Godot patch is recorded
  in the implementation report.
- Mobile renderer, portrait, and a 720 × 1280 base viewport that stretches to
  fit phones and tablets.
- Android only, `arm64-v8a` only, debug builds only.
- The Android package name is `com.dungeondestiny.game`; development builds
  use `com.dungeondestiny.game.dev`. The later iOS bundle ID uses the same
  name. It must not change once the app is in a store.
- The first build is version name `0.1.0`, build `1`. The build number is
  defined once in the project and used for both the export preset and the
  `X-App-Build` header.
- The `gateway` dev address is a committed project setting.
- Tests use GUT, pinned to one exact version and run headless.
- Debug builds are signed with Godot's default Android debug keystore on the
  project owner's computer, never committed.
- No POC code or asset is copied (DD-020).

## 8. Data model and Content Studio

N/A. Nothing is stored. The thresholds are Worker configuration.

## 9. Runtime manifest and Godot runtime

No manifest is used. The Godot project has one scene, the loading screen.
When it opens, it runs these steps in order:

1. Show the game title and the app version, for example `0.1.0 (build 1)`.
2. Call `GET /app/version`.
   - Not supported: show the "Update required" screen and stop.
   - Supported but not up to date: show the "new version available" message;
     the player dismisses it and the app continues.
   - Supported and up to date: continue.
3. Call `GET /health` and show `status`, `environment`, and the deployed
   server version.
4. Show that the app is ready.

If a call fails, times out, or gets a response that is not in the standard
format, the app shows a connection error with a retry button, which starts
again at step 2. If any call gets HTTP 426 `APP_UPDATE_REQUIRED`, the app
shows the "Update required" screen.

## 10. Online services and access

- `GET /app/version` and `GET /health` are public and need no sign-in.
- The client sends only the two app headers. It sends no token and no
  personal data.
- The `gateway` decides whether a build is supported. The client only shows
  the result.
- The client must not call any other Worker, database, or storage.

## 11. Player experience and UX

- The app opens in portrait and stays in portrait.
- The UI stays inside the screen's safe area.
- Text is readable on a phone, and buttons are at least 48 dp high.
- Each step shows what the app is doing, for example "Checking version…" and
  "Connecting…".
- The connection error screen shows the `requestId` in small text when the
  server answered, so a problem can be traced in the `gateway` log.
- The "Update required" screen explains that a newer version is needed and
  has no way to continue.
- The layout works on phone and tablet screens.

Deferred: store links on the update screens, a real main menu, and settings.

## 12. 3D assets and production contracts

N/A. The app shows no 3D content.

## 13. Logging, telemetry, and diagnostics

- The `gateway` writes one JSON log line per request (Section 7), kept in
  Workers Logs.
- The project owner can watch requests live with
  `wrangler tail --env dev --format pretty`, or search them afterwards in the
  Cloudflare dashboard under the `dd-dev-gateway` Worker's logs, for example
  by `requestId`. Both are described in the how-to.
- The client prints each step and any error to the Godot log, readable with
  `adb logcat`, including the `requestId` of each response.
- No telemetry is sent. Logs contain no IP addresses, tokens, account data,
  or email addresses.

## 14. Test-first implementation

**`gateway`, with Vitest in the Workers runtime (`pnpm test`):**

- `/app/version` with a current build answers `supported` and `upToDate`;
- a build below the recommended build answers `supported` but not
  `upToDate`;
- a build below the minimum answers not `supported`;
- missing headers, a build that is not a whole number, and an unknown
  platform answer HTTP 400 `INVALID_APP_HEADERS`;
- another call that carries a build below the minimum answers HTTP 426
  `APP_UPDATE_REQUIRED`;
- `/health` without the headers still answers as before;
- the configured thresholds are whole numbers of at least 1, and the minimum
  is not above the recommended build;
- the responses match the types in `packages/contracts/` and DD-019;
- each request writes exactly one JSON log line with the fields in
  Section 7, with the right version check result;
- the log line contains no IP address, no other request header, and no
  query string, even when the request carries them;
- Workers Logs is turned on in both Terraform and the Wrangler
  configuration.

**Godot client, with GUT headless, using stubbed HTTP responses:**

- each response leads to the right outcome: continue, "new version
  available", "Update required", or connection error;
- every request carries `X-App-Platform: android` and the build number;
- HTTP 426 on any call shows the "Update required" screen;
- each screen state shows the right text and buttons;
- the build number in the code matches the export preset's version code;
- the connection error screen shows the `requestId` when the server
  answered;
- the project settings and the export preset: Mobile renderer, portrait,
  `arm64-v8a` only, and `com.dungeondestiny.game.dev`.

**Scope and secrets:** no file under `apps/game-client/` is copied from the
POC, and no keystore, password, or token is in the repository.

The commands to run the tests are added to `AGENTS.md`.

## 15. Implementation report

`implementation_report.md` is required before this Feature Request moves to
`In Review`. It records what was created, the final versions, settings, and
threshold values, the implementation decisions, approved deviations, test and
deployment results, the phone used, defects, limitations, follow-up work, and
a ready-to-post GitHub Issue completion recap. It must not contain signing
keys, passwords, tokens, or personal data.

## 16. Verification

- All FR-00005 `gateway` and client tests pass.
- The deployed tests pass against `dd-dev-gateway`: a current build, a build
  of `0` (below the minimum of `1`), missing headers, and `/health` without
  headers.
- `terraform plan` reports no changes after the deploy.
- A request from the deployed tests can be found in Workers Logs by its
  `requestId`, with the fields in Section 7 and none of the forbidden values.
- The debug APK builds with the documented command, installs with
  `adb install`, and opens in portrait.
- On the phone, the loading screen shows `0.1.0 (build 1)`, then the health
  result with `status` `"ok"`, environment `dev`, and a deployed version.
- With the phone offline, the app shows the connection error; after going
  back online, retry continues.
- While the phone starts the app, `wrangler tail --env dev --format pretty`
  shows its `/app/version` and `/health` requests with `platform` `android`
  and `build` `1`.
- With the project owner's approval, dev is deployed with
  `APP_RECOMMENDED_BUILD_ANDROID` set to `2`: the phone shows "new version
  available", and dismissing it continues. Then dev is deployed with
  `APP_MIN_BUILD_ANDROID` set to `2`: the phone shows "Update required". Both
  are then set back to `1` and deployed again.
- On a tablet-sized screen, checked on an Android tablet or emulator, the
  screens are laid out correctly.

Acceptable evidence: test output, the deploy output, and screenshots from the
phone. Evidence must not show signing keys, passwords, tokens, or the full
`gateway` address.

## 17. Acceptance criteria

- All checks in Section 16 have passed.
- The dev thresholds are back at `1`.
- `implementation_report.md` is complete.
- No decisions are unresolved.
- No unapproved changes were made.

## 18. Unresolved decisions

None.
