# FR-00005 changelog

Approved changes to this Feature Request, newest first.

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
