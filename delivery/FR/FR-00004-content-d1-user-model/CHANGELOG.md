# FR-00004 changelog

Approved changes to this Feature Request, newest first.

## 2026-10-14: Implemented, moved to In Review

- **Change:** Implemented FR-00004: Content D1 (`dd-dev-content`, EU) with the
  user, role, permission, and audit tables and migrations; the `studio-api`
  services with a permission check on every method and the Access group sync;
  the Mantine layout and the Users, User, Roles, Role, and Permissions pages;
  the Terraform for the database, the Access group, and the Access policy;
  setup-guide step 13; `devops/db/query.sh`; the Content D1 how-to; the
  `AGENTS.md` commands; and the tests, including a browser end-to-end test.
  Added `implementation_report.md` and moved the status to `In Review`.
- **Reason:** Steps 2 to 8 of the implementation sequence are complete. Every
  Section 16 check passed, the credential-free checks also from a clean clone
  of `5d33b5f`. The implementation decisions were made during implementation
  and confirmed by the project owner on 2026-10-13.
- **Affected files:** `README.md`, `implementation_report.md`, `CHANGELOG.md`.
- **Verification:** All three files match their approved proposals. The
  implementation decisions and findings are recorded in
  `implementation_report.md`.

## 2026-10-13: Query script added to scope

- **Change:** Added `devops/db/query.sh` to the scope, the approved decisions,
  the implementation sequence (step 7), and the Section 14 checks: a read-only
  script that runs named Content D1 queries (`tables`, `users`, `roles`,
  `permissions`, `audit`, and `migrations`) and, with `sql`, one `SELECT`
  statement, reading Cloudflare by default and the local database with
  `--local`, with no email addresses in the named queries.
- **Reason:** The project owner asked for an easy way to query Content D1 and
  chose to extend FR-00004 rather than open a new Feature Request.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** `README.md` matches its approved proposal.

## 2026-10-10: Tracking issue recorded

- **Change:** Set the Tracking line to GitHub Issue #5, in the milestone
  "Content Studio - Basic user management".
- **Reason:** The project owner created the milestone for Feature Requests
  FR-00000 to FR-00004, and the issue was created for it.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.

## 2026-10-10: Moved to In Progress

- **Change:** Set the design baseline commit to `d6a2a71` and moved the status
  through `Backlog` to `In Progress`.
- **Reason:** The specification was committed and pushed; there are no
  unresolved decisions or blockers.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.

## 2026-10-10: Feature Request created

- **Change:** Created `README.md` with status `In Specification`. It adds
  Content D1 and Content Studio's user model: users, roles, and permissions in
  the style of spatie/laravel-permission, with each permission's description
  and purpose defined in code; audit records; the Users, User, Roles, Role,
  and Permissions pages in a Mantine layout themed with the POC's colours;
  and every active user added to the Access policy through an Access group
  that `studio-api` keeps in step, using a Cloudflare API token stored only as
  a Worker secret (DD-021).
- **Reason:** The project owner chose the database and user model as the next
  step after FR-00003, and approved the pages, the model, the database
  decisions, Mantine, and security by default for the Access policy in
  discussion.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.
