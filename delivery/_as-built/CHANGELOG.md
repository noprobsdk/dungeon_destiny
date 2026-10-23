# As-built changelog

Published changes to the as-built documentation, newest first.

## 2026-10-20: FR-00004 published

- **Change:** Published FR-00004. Created
  `08-technical/service-architecture/data-services.md`, covering Content D1,
  its tables and migrations, and `devops/db/query.sh`. Added the Access group
  sync, the staff user model with roles and permissions, the Content Studio
  API routes, and the error codes `PERMISSION_DENIED`, `VALIDATION_FAILED`,
  `CONFLICT`, and `ACCESS_SYNC_FAILED` to `access-and-edge.md`; the Mantine
  layout and the Users, User, Roles, Role, and Permissions pages to
  `frontends.md`; `dd-dev-content`, the Access group, the new Access policy,
  and `studio-api`'s new bindings and secret to `deployment-model.md`; the new
  packages, the migration step, and the test changes to
  `delivery-pipeline.md`; and the ShellCheck note and the Access group token
  to `developer-onboarding.md`.
- **Source:** [FR-00004: Content D1 and user model](../FR/FR-00004-content-d1-user-model/README.md),
  its `CHANGELOG.md`, and its `implementation_report.md`.
- **Affected files:** `README.md`, `CHANGELOG.md`,
  `08-technical/service-architecture/data-services.md`,
  `08-technical/service-architecture/access-and-edge.md`,
  `08-technical/service-architecture/frontends.md`,
  `08-technical/service-architecture/deployment-model.md`,
  `08-technical/service-architecture/delivery-pipeline.md`,
  `08-technical/developer-onboarding.md`.

## 2026-10-20: FR-00003 published

- **Change:** Published FR-00003. Created
  `08-technical/service-architecture/frontends.md`, covering Content Studio
  and its pages. Added the Cloudflare Access sign-in, the `studio-web` token
  check, the SuperAdmin, the Content Studio API, and the error codes
  `UNAUTHENTICATED` and `NOT_STAFF` to `access-and-edge.md`; the
  `dd-dev-studio-api` and `dd-dev-studio-web` Workers and the Access setup to
  `deployment-model.md`; the Content Studio packages, tests, and deployment to
  `delivery-pipeline.md`; and the SuperAdmin email, Zero Trust, and Chromium
  checks to `developer-onboarding.md`.
- **Source:** [FR-00003: Worker access policy](../FR/FR-00003-worker-access-policy/README.md),
  its `CHANGELOG.md`, and its `implementation_report.md`.
- **Affected files:** `README.md`, `CHANGELOG.md`,
  `08-technical/service-architecture/frontends.md`,
  `08-technical/service-architecture/access-and-edge.md`,
  `08-technical/service-architecture/deployment-model.md`,
  `08-technical/service-architecture/delivery-pipeline.md`,
  `08-technical/developer-onboarding.md`.

## 2026-10-15: FR-00002 published

- **Change:** Published FR-00002. Added the GitHub CLI checks and guided
  installation to `08-technical/developer-onboarding.md`.
- **Source:** [FR-00002: GitHub CLI onboarding](../FR/FR-00002-github-cli-onboarding/README.md),
  its `CHANGELOG.md`, and its `implementation_report.md`.
- **Affected files:** `README.md`, `CHANGELOG.md`,
  `08-technical/developer-onboarding.md`.

## 2026-10-14: FR-00001 published

- **Change:** Published FR-00001. Created
  `08-technical/service-architecture/delivery-pipeline.md`, covering the
  workspace, tests, and Wrangler deployment, and
  `08-technical/service-architecture/access-and-edge.md`, covering the
  standard response format and the gateway `/health` endpoint. Added the
  `dd-dev-gateway` Worker to `deployment-model.md` and the Node.js, pnpm, and
  dependency checks to `developer-onboarding.md`.
- **Source:** [FR-00001: Worker dev workflow](../FR/FR-00001-worker-dev-workflow/README.md),
  its `CHANGELOG.md`, and its `implementation_report.md`.
- **Affected files:** `README.md`, `CHANGELOG.md`,
  `08-technical/service-architecture/deployment-model.md`,
  `08-technical/service-architecture/delivery-pipeline.md`,
  `08-technical/service-architecture/access-and-edge.md`,
  `08-technical/developer-onboarding.md`.

## 2026-10-14: FR-00000 published

- **Change:** Created `_as-built/` with this changelog and its `README.md`,
  and published FR-00000 in two pages:
  `08-technical/service-architecture/deployment-model.md`, covering Terraform
  and its R2 state, and `08-technical/developer-onboarding.md`, covering the
  onboarding script.
- **Source:** [FR-00000: Terraform setup](../FR/FR-00000-terraform-setup/README.md),
  its `CHANGELOG.md`, and its `implementation_report.md`.
- **Affected files:** `README.md`, `CHANGELOG.md`,
  `08-technical/service-architecture/deployment-model.md`,
  `08-technical/developer-onboarding.md`.
