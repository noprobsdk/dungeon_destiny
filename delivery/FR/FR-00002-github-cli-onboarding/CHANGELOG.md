# FR-00002 changelog

Approved changes to this Feature Request, newest first.

## 2026-10-09: Folder renamed

- **Change:** Renamed this Feature Request's folder from `FR-00002-feature-request-github-cli-onboarding/` to
  `FR-00002-github-cli-onboarding/`. Updated the links to other Feature Request folders in `README.md`.
- **Reason:** The project owner decided that every Feature Request folder is
  named `FR-<number>-<name>`, without `feature-request-`.
- **Affected files:** `README.md`, `CHANGELOG.md`, and the folder name.
- **Verification:** Both files match their approved proposals, and every link to
  the folder in the repository resolves.

## 2026-10-09: Accepted, moved to Pending documentation

- **Change:** The project owner accepted the implementation against the
  Section 17 acceptance criteria. Moved the status to `Pending documentation`.
- **Reason:** All Section 16 checks passed, `implementation_report.md` is
  complete, no decisions are unresolved, and no unapproved changes were made.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals. The as-built
  documentation is still to be published.

## 2026-10-09: Implemented, moved to In Review

- **Change:** Implemented FR-00002: the onboarding script checks that `gh` is
  installed and signed in and offers GitHub's official installation after Yes;
  the FR-00002 tests, step 10 of the setup guide, and the `gh` notes in
  `devops/README.md` and `AGENTS.md`. Added `implementation_report.md` and
  moved the status to `In Review`.
- **Reason:** Steps 2 to 5 of the implementation sequence are complete. Every
  Section 16 check passed, also from a clean clone of `dc60ef1`.
- **Affected files:** `README.md`, `implementation_report.md`, `CHANGELOG.md`.
- **Verification:** All three files match their approved proposals. The
  implementation decisions and findings are recorded in
  `implementation_report.md`.

## 2026-10-08: Moved to In Progress

- **Change:** Set the design baseline commit to `00a1340` and moved the status
  through `Backlog` to `In Progress`.
- **Reason:** The specification was committed and pushed; there are no
  unresolved decisions or blockers.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.

## 2026-10-08: Feature Request created

- **Change:** Created `README.md` with status `In Specification`. It adds the
  GitHub CLI, `gh`, to the onboarding script and the setup guide: the script
  checks that `gh` is installed and signed in, offers the official
  installation after Yes, and never signs in, posts, or prints the token.
- **Reason:** The project owner asked for `gh` in the onboarding after
  installing it to manage the GitHub Issues that track Feature Requests.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.
