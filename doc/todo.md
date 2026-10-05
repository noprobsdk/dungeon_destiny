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
| Content Studio customer-service page | done | Completed 2026-10-05. DD-008 recorded; `09-content-studio/README.md` gains the customer-service page and support role; `08-technical/service-architecture.md` gains the Customer Support service, protected routes, and audit events. The allowed correction operations remain an open decision. |

## Open decisions

A decision is `open`, `proposed` (a pattern has been put forward, not yet accepted), or `decided`.
A decided decision moves to the list below.

| Decision | Blocks | Status | Discussed |
|---|---|---|---|
| Customer-service correction operations: which player-data corrections are allowed, who approves them, and whether live session and party state can be viewed | Customer-service page specification and implementation | open | 2026-10-05: DD-008 approved; corrections allowed through owning services, separate support role, every lookup audited. |

## Decided

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
