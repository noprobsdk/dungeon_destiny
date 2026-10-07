# Content Studio

Content Studio is the internal administration tool for all of Dungeon Destiny's game metadata in the database: the configuration and content records the game runs on, not player data.

Its most important areas are:

- the 3D model assets for Heroes, enemies, and Equipment; and
- Hero level management: the level rules for all Heroes, such as the XP each Hero Level needs, what each level unlocks, and the Hero Level that Equipment requires.

It also manages the other game metadata, such as Dungeon Levels, Traits, Quests, and Campaign Arcs.

It provides the UI and authoring workflows for creating, viewing, editing, validating, testing, reviewing, approving, and publishing concrete configurations.

It also provides a customer-service page for looking up any content and player data and applying approved corrections to player data.

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

## Customer service

The customer-service page lets users with the support role:

- look up any content and player data, including Accounts, Heroes, Account Inventory, progression, and session results; and
- apply approved corrections to player data.

Rules:

- The support role is separate from content authoring. Content authors do not see player data, and support users cannot edit content.
- Lookups and corrections go through the owning services' protected APIs, never directly to a database.
- A correction follows the same rules as any other change made by the owning service. For example, a corrected Account Inventory must still never use one Equipment instance twice.
- Every lookup and correction is audited with who performed it, which Account it concerned, and when. Tokens and private player data are not written to logs.
- The allowed correction operations and their approval are not yet defined. No correction may be implemented until it is.

See [DD-008](../12-decisions/decision-log.md).

## Exclusions

Content Studio does not own:

- player data, which the customer-service page only looks up and corrects through the owning services;
- run state;
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
