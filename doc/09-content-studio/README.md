# Content Studio

Content Studio is the internal authoring application used to manage Dungeon Destiny's database records.

It provides the UI and authoring workflows for creating, viewing, editing, validating, testing, reviewing, approving, and publishing concrete configurations.

Content Studio does not define the records, gameplay behavior, or production contracts that it manages.

## Responsibility boundary

The authoritative responsibilities are:

- **Game Design** defines the intended player experience.
- **Gameplay Systems** define fixed runtime behavior.
- **Gameplay System Configuration Rules** define which values and combinations may vary.
- **3D Production** defines asset, Rig Profile, Equipment, Grip Profile, and Animation Set contracts.
- **Data Model** defines records, fields, relationships, constraints, and derivation rules.
- **Technical Architecture** implements schemas, migrations, APIs, manifests, persistence, and runtime exchange.
- **Content Studio** provides the UI used to manage and validate concrete database records.

Content Studio must not silently introduce new fields, compatibility rules, gameplay mechanics, or database relationships.

## UI responsibilities

Content Studio may provide screens and workflows for:

- listing, searching, filtering, and inspecting records;
- creating and editing Draft records;
- selecting valid referenced records;
- showing derived values and compatibility;
- previewing and testing 3D combinations;
- displaying validation errors and missing dependencies;
- recording workflow status and evidence;
- reviewing and approving eligible records;
- publishing approved configurations through the technical publication process.

The available inputs and actions must follow the approved Data Model and configuration rules.

## Data managed through the UI

Content Studio may manage concrete records for:

- Journeys, Dungeon Arcs, Dungeon Levels, Stages, mazes, and enemy assignments;
- Traits, Tier maps, eligibility, and offer configurations;
- Hero Classes, enemies, attacks, and rules-data references;
- Body Archetypes, Base Bodies, Appearances, and Rig Profiles;
- Equipment, Equipment Slots, Weapon Types, and Off-hand Types;
- Animation Sets, clips, Grip Profiles, and Runtime Character configurations;
- workflow, validation, approval, and publication.

These records belong to the Data Model and database. Content Studio is their management interface.

## Exclusions

Content Studio does not own:

- current player or run state;
- live combat state;
- runtime Trait Pool state;
- game-client screens or player-facing UX;
- the authoritative Data Model;
- database migration implementation;
- Godot runtime behavior.

Published records must not be modified in place. Corrections create a new revision or version according to the approved lifecycle rules.

## Current UI specifications

- [Dungeon Level editor](dungeon-levels/dungeon-editor.md)

## Related specifications

- [Data Model](../07-data-model/README.md)
- [Content lifecycle](../07-data-model/workflow/content-lifecycle.md)
- [Body Archetype, Base Body, and Rig Profile data model](../07-data-model/character-model/body-archetypes-base-bodies-and-rig-profiles.md)
- [Equipment and hand-slot data model](../07-data-model/character-model/equipment-and-hand-slots.md)
- [Campaign and Dungeon Arc data model](../07-data-model/journey/campaign-arc-data-model.md)
- [Dungeon Level data model](../07-data-model/dungeon-levels/dungeon-level-data-model.md)
- [Trait data model](../07-data-model/traits/trait-data-model.md)
- [Trait offer configuration](../07-data-model/traits/trait-offer-configuration.md)
- [Runtime manifest](../08-technical/runtime-manifest.md)
