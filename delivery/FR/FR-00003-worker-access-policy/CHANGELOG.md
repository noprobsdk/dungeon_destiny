# FR-00003 changelog

Approved changes to this Feature Request, newest first.

## 2026-10-10: Tracking issue recorded

- **Change:** Set the Tracking line to GitHub Issue #4, in the milestone
  "Content Studio - Basic user management".
- **Reason:** The project owner created the milestone for Feature Requests
  FR-00000 to FR-00004, and the issue was created for it.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.

## 2026-10-10: Accepted, moved to Pending documentation

- **Change:** The project owner accepted the implementation against the
  Section 17 acceptance criteria. Moved the status to `Pending documentation`.
- **Reason:** All Section 16 checks passed, `implementation_report.md` is
  complete, no decisions are unresolved, and no unapproved changes were made.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals. The as-built
  documentation is still to be published.

## 2026-10-10: Implemented, moved to In Review

- **Change:** Implemented FR-00003: the `studio-api` and `studio-web` Workers
  deployed behind Cloudflare Access with one-time PIN sign-in and a
  SuperAdmin-only policy, the React pages, the deploy script, the onboarding
  checks, setup-guide steps 11 and 12, the `AGENTS.md` commands, and the
  tests, including a browser end-to-end test. Added
  `implementation_report.md` and moved the status to `In Review`.
- **Reason:** Steps 2 to 8 of the implementation sequence are complete. Every
  Section 16 check passed, also from a clean clone of `2ca1885`. The Access
  policy is defined inside the Access application (implementation decision
  17), as approved by the project owner during implementation.
- **Affected files:** `README.md`, `implementation_report.md`, `CHANGELOG.md`.
- **Verification:** All three files match their approved proposals. The
  implementation decisions and findings are recorded in
  `implementation_report.md`.

## 2026-10-09: Moved to In Progress

- **Change:** Set the design baseline commit to `d03ad86` and moved the status
  through `Backlog` to `In Progress`.
- **Reason:** The specification was committed and pushed; there are no
  unresolved decisions or blockers.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.

## 2026-10-09: Unresolved decisions resolved

- **Change:** Moved the two Section 18 decisions to Section 7: the SuperAdmin
  email address is kept in the owner's private credential file as
  `STUDIO_SUPERADMIN_EMAIL`, and the Access policy lets in only the
  SuperAdmin. Removed the matching prerequisite blocker.
- **Reason:** The project owner approved both recommendations. The repository
  is public, so the email address must not be stored in it.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.

## 2026-10-09: Feature Request created

- **Change:** Created `README.md` with status `In Specification`. It delivers
  the first, empty Content Studio: the `studio-web` and `studio-api` Workers
  behind Cloudflare Access, with one SuperAdmin who can sign in with a
  one-time PIN and see a signed-in page. It uses no database.
- **Reason:** The project owner chose a basic Content Studio as the next step
  after DD-020, split so that Content D1 and the Staff users screen follow in
  a later Feature Request.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.
