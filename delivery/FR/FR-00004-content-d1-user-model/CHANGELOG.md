# FR-00004 changelog

Approved changes to this Feature Request, newest first.

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
