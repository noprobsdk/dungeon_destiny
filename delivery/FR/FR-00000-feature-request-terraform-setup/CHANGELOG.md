# FR-00000 changelog

Approved changes to this Feature Request, newest first.

## 2026-10-07: Moved to In Review

- **Change:** Recorded the clean-checkout verification of commit `d00934f` in
  `implementation_report.md`; every Section 16 check has passed. Corrected
  Section 10 and Section 14 of `README.md`: keys are read with hidden input,
  the email address is shown as it is typed, and no entered value appears in
  the script's output. Moved the status to `In Review`.
- **Reason:** Implementation, verification, and the implementation report are
  complete, and the README wording now matches approved decision 15.
- **Affected files:** `README.md`, `implementation_report.md`, `CHANGELOG.md`.
- **Verification:** All three files match their approved proposals.

## 2026-10-07: Implementation and implementation report

- **Change:** Implemented the onboarding script, its README, the Terraform dev
  project, the ignore rules, the `AGENTS.md` commands, and the setup-guide
  note on the guided script. Added `implementation_report.md`. 36 tests pass,
  including `init`, `plan`, `apply`, and state locking against R2.
- **Reason:** Steps 2 to 10 of the implementation sequence.
- **Affected files:** `implementation_report.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals. Clean-checkout
  verification from Section 16 is still to be done.

## 2026-10-07: Guided onboarding script

- **Change:** Changed the onboarding script from read-only to guided. In a
  terminal it walks through each failed check, explains where to find each
  value, and asks Yes or No before installing a package, creating the
  credential file, or storing a value with hidden input. After each fix it
  checks again. With `--check`, or without a terminal, it only reads. Added
  six Section 14 checks for the guided behaviour.
- **Reason:** The project owner asked for the script to walk through failed
  checks and offer the fixes.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.

## 2026-10-07: Tests folder and jq added

- **Change:** Added the Feature Request tests in `tests/FR-00000/` to scope,
  with every Section 14 check kept there as a named test. Added a check that
  the onboarding script exists in `devops/` and is executable. Added jq to the
  prerequisites.
- **Reason:** The project owner set the repository rule of one test folder per
  Feature Request, recorded in `doc/test-driven-development.md`, and chose jq
  to read Terraform's JSON version output.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.

## 2026-10-07: Moved to In Progress

- **Change:** Set the design baseline commit to `4e50cf6`, removed the last
  blocker, and moved the status through `Backlog` to `In Progress`. Reordered
  the implementation sequence so the onboarding script is written and run
  before the manual prerequisites are completed.
- **Reason:** The source documentation was committed. The project owner chose
  to build the onboarding script first so it reports the missing prerequisites.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.

## 2026-10-07: Decisions resolved and setup guide linked

- **Change:** Recorded the resolved decisions: the Cloudflare account ID is
  kept in the private credential file; if R2 state locking fails verification,
  Terraform runs without a lock under a one-run-at-a-time rule in `AGENTS.md`;
  sprints are not used. Linked `doc/howto-cloudflare-setup.md` as a source and
  as the procedure for the manual prerequisites, added `devops/README.md` to
  scope, and merged the locking fallback into the lock verification check.
  Section 18 now has no unresolved decisions.
- **Reason:** The project owner resolved the three open decisions, and the
  manual setup guide was created in `doc/`.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.

## 2026-10-07: Feature Request created

- **Change:** Created `README.md` with status `In Specification`. It sets up
  Terraform for the Cloudflare `dev` environment with state in R2, and adds a
  read-only onboarding script under `devops/`, written in Bash and checked with
  ShellCheck.
- **Reason:** DD-016 selects Terraform for Cloudflare infrastructure. FR-00001
  depends on this foundation.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals. Three decisions
  remain unresolved in `README.md` Section 18.
