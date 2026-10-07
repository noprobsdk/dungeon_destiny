# FR-00000 changelog

Approved changes to this Feature Request, newest first.

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
