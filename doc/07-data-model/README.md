# Data model

This chapter defines the persistent records used by Dungeon Destiny independently of the UI used to manage them and the code used to implement them.

Data-model documents define:

- record and table responsibilities;
- fields and stable identifiers;
- relationships and cardinality;
- constraints and derivation rules;
- lifecycle and compatibility boundaries;
- which system owns each value.

Content Studio provides the authoring UI for these records. Technical Architecture implements their schema, migrations, APIs, manifests, and runtime exchange. Neither layer may silently redefine the approved data model.

## Character model

- [Body Archetype, Base Body, and Rig Profile data model](character-model/body-archetypes-base-bodies-and-rig-profiles.md)
- [Equipment and hand-slot data model](character-model/equipment-and-hand-slots.md)

## Player state

- [Account Inventory data model](player-state/account-inventory.md)

## Asset records

- [Asset registries](assets/asset-registries.md)

## Journey and Dungeon Levels

- [Campaign and Dungeon Arc data model](journey/campaign-arc-data-model.md)
- [Dungeon Level data model](dungeon-levels/dungeon-level-data-model.md)

## Traits

- [Trait data model](traits/trait-data-model.md)
- [Trait offer configuration](traits/trait-offer-configuration.md)

## Workflow

- [Content lifecycle](workflow/content-lifecycle.md)
