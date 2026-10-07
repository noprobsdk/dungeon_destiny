# Todo

Work in progress under `doc/`, and the decisions it waits on. One line per item. Updated whenever
an item changes state or a decision is taken.

An item is `planned`, `in progress`, `deferred`, or `done`. Every change follows
`document-change-management.md`. A decision listed as open is settled before the change that
depends on it is proposed.

This file tracks documentation work and the decisions that work waits on. Game-design, rules,
and architecture decisions are owned by [`12-decisions/`](12-decisions/README.md).

## Items

| Item | Status | Note |
|---|---|---|
| Documentation and delivery change management | done | Completed 2026-10-04. `document-change-management.md` replaced with the version from `ou-oci-terraform-main`; `.gitignore` ignores `*.proposed.md` and `*.full.diff`; `README.md`, `doc/README.md`, and `delivery/README.md` no longer describe `delivery/` as released behaviour only. |
| Equipment ownership and Hero assignment | done | Completed 2026-10-05. Section in `03-gameplay-systems/equipment-and-weapon-configurations.md` kept and amended (Account Inventory; an instance can never be used twice). Glossary terms added, DD-007 recorded, `07-data-model/player-state/account-inventory.md` created, and `equipment-and-hand-slots.md` given Item Level, binding, and `equipment_usage_rules`. |
| Agent instructions | done | Completed 2026-10-04. Root `AGENTS.md` adapted from `ou-oci-terraform-main` directs agents to read `doc/` context, follow `document-change-management.md`, and use fast execution. Its WSL section was omitted as Terraform-specific. |
| Workflow guides | done | Completed 2026-10-04. `grill-me.md` copied unchanged from `ou-oci-terraform-main`; `test-driven-development.md` and `howto.md` adapted with OCI, Terraform, and Asana terms replaced by Dungeon Destiny targets and GitHub Issues. The Asana menu entry was omitted. |
| Document structure | done | Completed 2026-10-05. `document-structure.md` now lists `todo.md`, `document-change-management.md`, the workflow guides, `parties-and-quest-sessions.md`, `07-data-model/player-state/`, and `service-architecture.md`, and no longer describes `delivery/` as released behaviour only. |
| In-repository Feature Request adoption | done | Completed 2026-10-04. `howto-feature-request.md`, `delivery/create-as-built.md`, and `delivery/recap.md` adapted from `ou-oci-terraform-main` with GitHub Issues in place of Asana; `delivery/README.md` rewritten to the Feature Request model; `delivery/00-features/` removed; `README.md`, `doc/README.md`, and the `.github` Feature Request issue and pull-request templates aligned. |
| Architecture decisions DD-011 to DD-013 | in progress | 2026-10-06: Recorded player identity in the Worker (DD-011), all runs on the game server with server changes never requiring an app update and a Cloudflare gateway and load balancer (DD-012), and WebSocket transport (DD-013). Remaining: align `08-technical/service-architecture.md`. |
| Game-server crash recovery | in progress | 2026-10-06: DD-014 records recovery from durable checkpoints for solo and co-op runs from the initial version, with small rollback allowed, permanent data protected, and no duplicate rewards. Remaining: decide checkpoint interval, contents, storage, and recovery ownership; align service architecture and runtime state documentation. |
| Worker development foundation | in progress | 2026-10-06: DD-015 selects TypeScript for the Cloudflare Worker backend and `dd-dev` as the development Worker name; recorded in `08-technical/service-architecture.md`. FR-00001 scope agreed as a minimal `dd-dev` Worker with a `/health` endpoint, run locally in WSL and deployed to Cloudflare. Remaining: specify FR-00001 before implementation. The DD-011 to DD-014 alignment of `service-architecture.md` is tracked separately and does not affect FR-00001. |
| Terraform setup (FR-00000) | in progress | 2026-10-07: FR-00000 sets up Terraform before FR-00001. DD-016 recorded. Agreed in discussion: Terraform manages Cloudflare infrastructure only; Wrangler deploys Worker code. Terraform state is kept in a Cloudflare R2 bucket created once by hand; R2 support for state locking must be verified. FR-00000 creates only the Terraform foundation (project, Cloudflare provider, R2 state) and no Cloudflare resources; FR-00001 adds `dd-dev` through Terraform. The Cloudflare account already exists. Terraform authenticates to Cloudflare with the Global API Key (owner's choice over a scoped token), plus an R2 access key pair for the state bucket; neither is ever stored in the repository. Terraform code lives in `infra/terraform/`. Credentials are kept in a private, owner-only file in the WSL home directory (for example `~/.config/dungeon-destiny/cloudflare.env`) and loaded into the shell before running Terraform. Terraform version and Cloudflare provider (v5) are pinned and the lock file is committed. One folder per environment, starting with `infra/terraform/envs/dev/`, each with its own state in R2; shared code later in `infra/terraform/modules/`. State bucket `dd-terraform-state`, created by hand, one path per environment. DD-016 recorded in `08-technical/service-architecture.md`. Plain Terraform for now; Terragrunt is reconsidered when a second environment is added. FR-00000 also includes a read-only onboarding script under `devops/` that checks the packages and access needed to run Terraform. FR-00000 `README.md` and `CHANGELOG.md` created (In Specification). Manual-setup guide `doc/howto-cloudflare-setup.md` created and listed in `document-structure.md`; FR-00000 implements it and `devops/README.md` links to it. Decision: account ID kept in the private credential file. FR-00000 added to the `delivery/README.md` list. FR-00000 README and CHANGELOG updated: all decisions resolved (account ID in the credential file; no-lock fallback with a one-run-at-a-time rule; sprints not used), guide linked, `devops/README.md` in scope. Remaining: commit the source changes to set the design baseline, then move FR-00000 to `Backlog`. FR-00001 README proposal is on hold until FR-00000 is complete. |
| Content Studio re-evaluation | in progress | 2026-10-05: Decided that Content Studio is cloud-hosted on Cloudflare and the POC stack is not a baseline. Governed changes: DD-009, then remove the POC-specific Drizzle and `content-studio/` paths from `08-technical/database-change-management.md`. |
| Content Studio customer-service page | done | Completed 2026-10-05. DD-008 recorded; `09-content-studio/README.md` gains the customer-service page and support role; `08-technical/service-architecture.md` gains the Customer Support service, protected routes, and audit events. The allowed correction operations remain an open decision. |

## Open decisions

A decision is `open`, `proposed` (a pattern has been put forward, not yet accepted), or `decided`.
A decided decision moves to the list below.

| Decision | Blocks | Status | Discussed |
|---|---|---|---|
| Solo-run authority: whether solo Journey runs later move from the game server to the client, with server-side result validation | Game-server capacity and cost planning | open | 2026-10-06: DD-012 keeps all runs on the server for now and requires the design to allow this change later. |
| Player account lifecycle: linking both Google and Apple to one Account, in-app Account deletion required by the app stores, and data retention after deletion | Account data model; Player Identity implementation | open | 2026-10-06: raised while deciding DD-011. |
| Content Studio application stack: framework, ORM, repository layout, and schema location, re-evaluated rather than taken from the POC | First Content Studio Feature Request; `08-technical/database-change-management.md` | open | 2026-10-05: The POC stack (React, Vinext, Drizzle, `content-studio/` layout) was a test. Cloudflare stays the platform. |
| Customer-service correction operations: which player-data corrections are allowed, who approves them, and whether live session and party state can be viewed | Customer-service page specification and implementation | open | 2026-10-05: DD-008 approved; corrections allowed through owning services, separate support role, every lookup audited. |

## Decided

- 2026-10-07: DD-016 decided: Cloudflare infrastructure is managed with Terraform and Worker code is deployed with Wrangler; state in an R2 bucket; Terraform code in `infra/terraform/` with one folder and state per environment, starting with `dev`.
- 2026-10-06: Feature Requests are kept in `delivery/FR/FR-<number>-feature-request-<name>/`, replacing `delivery/<number>-feature-request-<name>/`. Recorded in `delivery/README.md` and the GitHub issue and pull-request templates.
- 2026-10-06: Feature Request numbers are five digits, starting with `00001`. Recorded in `delivery/README.md` and the GitHub Feature Request issue template.
- 2026-10-06: DD-015 decided: the Cloudflare Worker backend is written in TypeScript, starting with the development Worker named `dd-dev`.
- 2026-10-06: DD-014 decided: game-server crash recovery is required from the initial version; runs resume from their latest durable checkpoint, with small rollback allowed, permanent player data safe, and rewards never granted twice.
- 2026-10-06: DD-011 to DD-013 decided: Google and Apple sign-in built in the Worker; every run on
  the authoritative game server, reachable through one Cloudflare-proxied, load-balanced endpoint,
  with server changes never requiring an app-store update; WebSocket over TLS as the realtime
  transport.
- 2026-10-05: Content Studio is cloud-hosted on Cloudflare and the POC Content Studio is not a
  baseline (DD-009).
- 2026-10-05: Cloudflare is the cloud platform for all services (DD-010). The Godot dedicated game
  server is a host-independent container image, initially hosted on the owner's AWS server.
  Recorded in `08-technical/service-architecture.md`. Still open there: player identity, CI/CD,
  and observability.
- 2026-10-05: When a content release changes an Equipment item's usage rules so that the assigned
  Hero no longer meets them, the existing assignment stays on that Hero. Usage rules are checked only
  when an assignment is created. Recorded in `account-inventory.md`, DD-007, and
  `equipment-and-weapon-configurations.md`.
- 2026-10-05: Ordinary Equipment is held in an Account Inventory, renamed from Shared Inventory. One
  Equipment instance can never be used twice: one assignment per instance records one Hero, one
  Weapon Configuration, and one Equipment Slot. Usage rules are kept per item in
  `equipment_usage_rules`. Item Level, Rarity, and statistics are fixed on the Equipment definition.
- 2026-10-04: Feature Requests are kept in this repository under
  `delivery/<number>-feature-request-<name>/`, each with `README.md` and `CHANGELOG.md` from the
  start of specification. GitHub Issues are used for tracking only and are never the Feature
  Request source.
- 2026-10-04: For repository process and governance, `ou-oci-terraform-main` is the reference and
  takes precedence. Its workflows are adopted and only project-specific content is adapted.
- 2026-10-04: The Equipment ownership and Hero assignment section in
  `03-gameplay-systems/equipment-and-weapon-configurations.md`, made outside the approval
  workflow, is kept as written.
