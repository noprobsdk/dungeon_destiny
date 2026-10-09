# FR-00001 changelog

Approved changes to this Feature Request, newest first.

## 2026-10-09: Folder renamed

- **Change:** Renamed this Feature Request's folder from `FR-00001-feature-request-worker-dev-workflow/` to
  `FR-00001-worker-dev-workflow/`. Updated the links to other Feature Request folders in `README.md`.
- **Reason:** The project owner decided that every Feature Request folder is
  named `FR-<number>-<name>`, without `feature-request-`.
- **Affected files:** `README.md`, `CHANGELOG.md`, and the folder name.
- **Verification:** Both files match their approved proposals, and every link to
  the folder in the repository resolves.

## 2026-10-08: Accepted, moved to Pending documentation

- **Change:** The project owner accepted the implementation against the
  Section 17 acceptance criteria. Moved the status to `Pending documentation`.
- **Reason:** All Section 16 checks passed, `implementation_report.md` is
  complete, no decisions are unresolved, and no unapproved changes were made.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals. The as-built
  documentation is still to be published.

## 2026-10-08: Implemented, moved to In Review

- **Change:** Implemented FR-00001: the pnpm workspace, the contracts package,
  the `gateway` Worker with `/health`, the `dd-dev-gateway` Worker created by
  Terraform and deployed by Wrangler, the extended onboarding script, the
  `AGENTS.md` commands, and step 9 of the setup guide. Added
  `implementation_report.md` and moved the status to `In Review`.
- **Reason:** Steps 2 to 9 of the implementation sequence are complete. Every
  Section 16 check passed, also from a clean clone of `c0acb7b`.
- **Affected files:** `README.md`, `implementation_report.md`, `CHANGELOG.md`.
- **Verification:** All three files match their approved proposals. The
  implementation decisions and findings are recorded in
  `implementation_report.md`.

## 2026-10-07: Moved to In Progress

- **Change:** Set the design baseline commit to `831eba7`, removed the last
  blocker, and moved the status through `Backlog` to `In Progress`.
- **Reason:** DD-019 and the related architecture change were committed.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.

## 2026-10-07: Feature Request created

- **Change:** Created `README.md` with status `In Specification`. It delivers
  the first domain Worker, `gateway`, deployed as `dd-dev-gateway` with a public
  `/health` endpoint that returns the standard response format, and sets up the
  Worker development workflow: a pnpm workspace with Node.js 24, Vitest in the
  Workers runtime, the Worker created by Terraform and deployed by Wrangler, and
  the onboarding script extended for Node.js and pnpm.
- **Reason:** DD-017 makes `gateway` the first domain Worker, and DD-019 sets
  the standard response format. The project owner settled the five Feature
  Request decisions on 2026-10-07.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals. The design
  baseline is set once DD-019 is committed.
