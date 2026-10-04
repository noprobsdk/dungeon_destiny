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
| Equipment ownership and Hero assignment | in progress | 2026-10-04: The section in `03-gameplay-systems/equipment-and-weapon-configurations.md`, created outside the approval workflow, is kept as written. Follow-up governed changes: add Account Layer, Shared Inventory, Item Level, Account-bound, Hero-bound, and Transfer and Unequip to `glossary.md`; record the design decision in `12-decisions/decision-log.md`; and define inventory ownership in the data model, which `07-data-model/character-model/equipment-and-hand-slots.md` currently leaves out of scope. |
| Agent instructions | done | Completed 2026-10-04. Root `AGENTS.md` adapted from `ou-oci-terraform-main` directs agents to read `doc/` context, follow `document-change-management.md`, and use fast execution. Its WSL section was omitted as Terraform-specific. |
| Workflow guides | done | Completed 2026-10-04. `grill-me.md` copied unchanged from `ou-oci-terraform-main`; `test-driven-development.md` and `howto.md` adapted with OCI, Terraform, and Asana terms replaced by Dungeon Destiny targets and GitHub Issues. The Asana menu entry was omitted. |
| Document structure | planned | `document-structure.md` omits `todo.md`, `document-change-management.md`, `03-gameplay-systems/parties-and-quest-sessions.md`, and `08-technical/service-architecture.md`. |
| In-repository Feature Request adoption | done | Completed 2026-10-04. `howto-feature-request.md`, `delivery/create-as-built.md`, and `delivery/recap.md` adapted from `ou-oci-terraform-main` with GitHub Issues in place of Asana; `delivery/README.md` rewritten to the Feature Request model; `delivery/00-features/` removed; `README.md`, `doc/README.md`, and the `.github` Feature Request issue and pull-request templates aligned. |

## Open decisions

A decision is `open`, `proposed` (a pattern has been put forward, not yet accepted), or `decided`.
A decided decision moves to the list below.

| Decision | Blocks | Status | Discussed |
|---|---|---|---|

## Decided

- 2026-10-04: Feature Requests are kept in this repository under
  `delivery/<number>-feature-request-<name>/`, each with `README.md` and `CHANGELOG.md` from the
  start of specification. GitHub Issues are used for tracking only and are never the Feature
  Request source.
- 2026-10-04: For repository process and governance, `ou-oci-terraform-main` is the reference and
  takes precedence. Its workflows are adopted and only project-specific content is adapted.
- 2026-10-04: The Equipment ownership and Hero assignment section in
  `03-gameplay-systems/equipment-and-weapon-configurations.md`, made outside the approval
  workflow, is kept as written.
