# FR-00005 changelog

Approved changes to this Feature Request, newest first.

## 2026-11-11: Documentation complete

- **Change:** Published FR-00005 in `delivery/_as-built/`: the game client in
  `08-technical/service-architecture/frontends.md`, the `gateway` version
  check, update link, and request log in `access-and-edge.md`, Workers Logs
  and the app version variables in `deployment-model.md`, the client build
  and tests in `delivery-pipeline.md`, and the toolchain checks in
  `08-technical/developer-onboarding.md`. Moved the status to `Complete`.
- **Reason:** Implementation, verification, and as-built documentation are
  complete, and no decision is unresolved.
- **Affected files:** `README.md`, `CHANGELOG.md`; the Feature Request list in
  `delivery/README.md`; the as-built pages above with
  `delivery/_as-built/README.md` and `CHANGELOG.md`.
- **Verification:** All files match their approved proposals.

## 2026-11-10: Accepted, moved to Pending documentation

- **Change:** The project owner accepted the implementation against the
  Section 17 acceptance criteria. Moved the status to `Pending documentation`.
- **Reason:** All Section 16 checks passed, on an Android tablet that the
  project owner accepted in place of a phone; the dev thresholds are back at
  `1`; `implementation_report.md` is complete; no decisions are unresolved;
  and the one deviation, the Update button, was approved by the owner.
- **Affected files:** `README.md`, `CHANGELOG.md`; the Feature Request list in
  `delivery/README.md`.
- **Verification:** All files match their approved proposals. The as-built
  documentation is still to be published.

## 2026-11-10: Implemented, moved to In Review

- **Change:** Implemented FR-00005: `GET /app/version`, the build check, and
  the request log in the `gateway` Worker; Workers Logs in Terraform and
  Wrangler; the Godot 4.6.3 Android client with the loading, update, and
  connection error screens and GUT tests; the game-client onboarding checks,
  the APK build script, the device bridge, and `devops/logs/tail.sh`; the
  how-to for the APK build and the `gateway` logs; the `AGENTS.md` commands;
  and the tests. Recorded GitHub Issue #6 under Tracking and moved the status
  to `In Review`.
- **Reason:** Steps 2 to 8 of the implementation sequence are complete. Every
  Section 16 check passed, on an Android tablet that the project owner
  accepted in place of a phone. The Update button is recorded as an approved
  deviation in `implementation_report.md`.
- **Affected files:** `README.md`, `implementation_report.md`, `CHANGELOG.md`;
  the Feature Request list in `delivery/README.md`.
- **Verification:** All files match their approved proposals, and the
  implementation report lists nothing open.

## 2026-11-10: Implementation report added, with the Update button

- **Change:** Created `implementation_report.md`. It records the work built
  so far, implementation decisions 1 to 13, and the test, deployment, and
  tablet results. It also records one approved deviation: an Update button on
  both update screens, with its link served by the `gateway` as `updateUrl`
  from the Wrangler variable `APP_UPDATE_URL_ANDROID`. Its "Open before In
  Review" section lists the phone check, the Workers Logs lookup, the
  `AGENTS.md` commands, and the log-reading how-to. `README.md` is unchanged.
- **Reason:** During the tablet test, the project owner asked for an upgrade
  button whose link comes from the backend, and chose to record it in the
  implementation report instead of changing the specification.
- **Affected files:** `implementation_report.md`, `CHANGELOG.md`.
- **Verification:** `implementation_report.md` matches its approved proposal.
  The status stays `In Progress`.

## 2026-11-08: Moved to In Progress

- **Change:** Set the design baseline commit to `bfee2a3` and moved the status
  through `Backlog` to `In Progress`.
- **Reason:** The specification was committed; there are no unresolved
  decisions or blockers. The project owner approved implementation decisions
  1 to 13 on 2026-11-07.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.

## 2026-11-07: Request logging added

- **Change:** Added `gateway` request logging: Workers Logs turned on for
  `dd-dev-gateway` in Terraform and the Wrangler configuration, one JSON log
  line per request with fixed fields and no IP addresses, other headers,
  query strings, tokens, or personal data, and the `requestId` shown on the
  client's connection error screen. Tests, verification, and the how-to were
  extended to match. Logpush and staging or production environments are out
  of scope.
- **Reason:** The project owner needs to see what the server does with each
  call from the phone. `operations.md` requires correlated request logs.
- **Affected files:** `README.md` (Sections 1 to 3, 4, 5, 6, 7, 11, 13, 14,
  and 16), `CHANGELOG.md`.
- **Verification:** `README.md` matches its approved proposal, and Section 18
  still lists no unresolved decisions.

## 2026-11-07: Feature Request created

- **Change:** Created the Feature Request with status `In Specification`. Its
  scope is a Godot Android app with one loading screen that checks the app's
  version, tests the connection to the cloud, and shows the `gateway` health
  response, together with `GET /app/version` and the build check in the
  `gateway` Worker. All implementation decisions are recorded under Approved
  decisions, including Godot 4.6, JDK 17, and Android 36; GUT for client
  tests; the package name `com.dungeondestiny.game`; and dev thresholds of
  `1`. Gameplay, a test scene with placeholder models, and iOS and iPad are
  deferred to later Feature Requests.
- **Reason:** Start the game client with the smallest useful step: prove the
  Android build and the connection to the services, and make sure every build
  from the first one can be told to update (DD-023).
- **Affected files:** `README.md`, `CHANGELOG.md`; source decisions DD-022 and
  DD-023 in `doc/12-decisions/decision-log.md`.
- **Verification:** `README.md` matches its approved proposal. It follows the
  18 sections of the Feature Request how-to, and Section 18 lists no
  unresolved decisions.
