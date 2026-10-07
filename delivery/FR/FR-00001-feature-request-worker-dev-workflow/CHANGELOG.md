# FR-00001 changelog

Approved changes to this Feature Request, newest first.

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
