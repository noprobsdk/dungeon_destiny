# Dungeon Destiny design documentation

`doc/` is the canonical home of Dungeon Destiny's intended design. It includes accepted current and future design as well as explicitly identified unresolved ideas.

Game Design defines the intended player experience. Gameplay Systems define how the game behaves. Gameplay System Configuration Rules define how those systems may be configured. Player-app UX defines how the player interacts with them. Content Studio stores and publishes concrete configurations. Godot executes published configuration and player state.

A statement in `doc/` is not evidence that the corresponding capability has been implemented or released. Feature Requests, from specification to verified delivery, and as-built documentation of the implemented game and services are kept under [`delivery/`](../delivery/). GitHub Issues track Feature Requests but are never their source.

See [Source of truth](source-of-truth.md) for authority and conflict resolution, [Documentation and delivery change management](document-change-management.md) for the mandatory proposal and approval workflow, [Todo](todo.md) for documentation work in progress, [Document structure](document-structure.md) for the current file map, and [Glossary](glossary.md) for approved domain terminology.

## Documentation flow

```text
Game Design and Rules
→ Gameplay Systems
→ Gameplay System Configuration Rules
→ Player-app UX
→ Data Model
→ Technical Architecture
→ Content Studio authoring UI
→ Published Manifest
→ Godot Runtime
→ Testing and Delivery Approval
```

## Areas and responsibilities

| Area | Responsibility |
|---|---|
| `01-game-design/` | Defines the game vision, design pillars, intended player experience, Journey, Dungeon Arc structure, and core gameplay loops. |
| `02-rules/` | Defines the supported external rules baseline, Dungeon Destiny translations, calculation rules, and unresolved rules decisions. |
| `03-gameplay-systems/` | Defines fixed gameplay mechanics, runtime behaviour, states, events, transitions, invariants, and available configuration points. |
| `04-content-design/` | Defines valid values, combinations, dependencies, limits, and pacing for configuring Gameplay Systems. It does not contain live configurations. |
| `05-ux/` | Defines player-facing screens, flows, interactions, overlays, visible states, and mobile usability requirements. |
| `06-3d-production/` | Defines 3D production contracts, rig and equipment compatibility, validation gates, runtime-asset requirements, risks, and fallback strategies. |
| `07-data-model/` | Defines database records, fields, relationships, constraints, derivation rules, and ownership boundaries independently of management UI. |
| `08-technical/` | Defines runtime responsibilities, implementation boundaries, state, persistence, manifest consumption, migrations, APIs, and data exchange. |
| `09-content-studio/` | Defines authoring UI and workflows used to manage, validate, approve, and publish database records. It does not define the records themselves. |
| `11-testing/` | Defines cross-discipline test plans, validation procedures, acceptance gates, and required evidence. |
| `12-decisions/` | Records approved decisions, unresolved decisions, ownership, status, and design or architecture changes. |
| `13-references/` | Records external references, sources, licences, terminology sources, and non-authoritative research. |

Feature Requests and as-built documentation belong under [`delivery/`](../delivery/), not in the design hierarchy.

## From design to implementation

When part of the design is selected for development, a Feature Request is created under `delivery/`, following the [Feature Request how-to](howto-feature-request.md). It must identify:

- the relevant design sources and baseline commit;
- the selected scope and explicit exclusions;
- affected targets;
- observable acceptance criteria;
- dependencies and risks;
- the verification plan.

## Important boundaries

- Concrete Journeys, Dungeon Arcs, Dungeon Levels, Stages, enemies, Traits, equipment, and assets are maintained in Content Studio.
- Their records, relationships, and constraints are defined under `07-data-model/`.
- Player-app screens belong under `05-ux/`.
- Content Studio authoring screens belong under `09-content-studio/`.
- Runtime implementation and persistence belong under `08-technical/`.
- Binary 3D authoring files do not belong in this directory.
- Development order does not redefine the fundamental game design.

## POC knowledge

The legacy POC remains in its original repository. Historical findings may later be added under `doc/00-project-history/`, but they remain evidence and lessons rather than approved architecture or released functionality.
