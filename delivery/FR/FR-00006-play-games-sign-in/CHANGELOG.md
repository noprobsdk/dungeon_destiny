# FR-00006 changelog

Approved changes to this Feature Request, newest first.

## 2026-11-12: Moved to In Progress

- **Change:** Set the design baseline commit to `3c59f92` and moved the status
  through `Backlog` to `In Progress`. Corrected the refresh-token retry rule:
  a replaced token used within 30 seconds revokes the token issued for it and
  gets a new next token, because only token hashes are stored.
- **Reason:** The specification was committed; there are no unresolved
  decisions or blockers. The earlier wording, "gets the same next token",
  cannot be met when only hashes are stored. The project owner approved
  implementation decisions 1 to 10 on 2026-11-12.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.

## 2026-11-11: Feature Request created

- **Change:** Created the Feature Request with status `In Specification`. Its
  scope is automatic sign-up and sign-in on Android with Google Play Games:
  Player Identity in the `gateway` Worker with `POST /auth/sign-in`,
  `POST /auth/refresh`, and `GET /me`; Ed25519 access tokens and rotating
  refresh tokens; a new `player` Worker with Player D1 and the Account tables;
  and a Play Games plugin and sign-in step in the Godot client. All
  implementation decisions are recorded under Approved decisions. Game Center
  on iOS, Account linking, Account deletion, and Heroes are deferred to later
  Feature Requests. Tracked in GitHub Issue #7.
- **Reason:** Every later feature needs a stable UserID for each player. The
  project owner chose automatic sign-in with the platform's game service,
  ready for Game Center on iOS in a later Feature Request.
- **Affected files:** `README.md`, `CHANGELOG.md`; source decisions DD-011 and
  DD-024 in `doc/12-decisions/decision-log.md`, and the Account data model in
  `doc/07-data-model/player-state/account.md`.
- **Verification:** `README.md` matches its approved proposal. It follows the
  18 sections of the Feature Request how-to, and Section 18 lists no
  unresolved decisions.
