# Gameplay system configuration rules

This area defines how the Gameplay Systems specified in `03-gameplay-systems` may be configured and combined into valid playable content.

Gameplay Systems define system behavior, states, events, transitions, invariants, and available configuration points. Gameplay System Configuration Rules define the permitted values, combinations, dependencies, limits, and pacing for those configuration points.

Content Studio stores the concrete configurations and validates them against the approved Gameplay Systems and Gameplay System Configuration Rules.

## Responsibility boundary

- **Gameplay Systems** define how mechanics behave and which configuration points they expose.
- **Gameplay System Configuration Rules** define valid values, combinations, dependencies, and limits for those configuration points.
- **Content Studio** stores, validates, versions, and publishes concrete configurations.
- **UX** defines how configured gameplay content and objectives are presented to the player.
- **Technical Architecture** defines how published configurations are loaded and executed.

## Configuration areas

Gameplay System Configuration Rules include:

- Journey and Dungeon Arc goals, ordering, themes, story progression, and tactical identity;
- Dungeon Level ordering, pacing, difficulty, layout references, and visual direction;
- Stage count, ordering, types, objectives, and progression;
- Encounter composition, enemy roles, spawn rules, and balance constraints;
- Hero creation options and starting conditions;
- Hero progression curves and permitted advancement choices;
- combat, Tactical Pause, Trait, equipment, ability, enemy, Boss, and reward parameters;
- permitted combinations of existing gameplay mechanics;
- narrative beats and environmental presentation requirements;
- reward placement and progression pacing within approved Gameplay System rules.

A configuration rule cannot redefine the fundamental behavior of a Gameplay System.

For example, a Dungeon Level configuration may select its Stages, enemies, objectives, layout, difficulty, and rewards. It cannot redefine how death, Stage completion, Traits, Boss completion, the Exit Portal, or permanent progression work.

## Configuration authority

This area does not contain live Journeys, Dungeon Arcs, Dungeon Levels, Stages, enemies, Traits, equipment, abilities, rewards, or asset records.

Concrete configurations are created and versioned in Content Studio. Examples in documentation are illustrative only and never become runtime content until approved, authored, validated, and published through Content Studio.

## Existing configuration specifications

- [Dungeon and Stage rules](dungeon-and-stage-design-rules.md)
- [Encounter and balance rules](encounter-and-balance-rules.md)
- [Journey and Dungeon Arc configuration rules](journey-and-dungeon-arc-configuration-rules.md)
- [The Fallen Castle example](campaign-arc-example-fallen-castle.md)

## Required configuration specifications

The following specifications must be migrated or created before the Gameplay System Configuration Rules section is complete:

- `hero-creation-configuration-rules.md` — permitted Races, Classes, appearances, starting equipment, starting Levels, and selection constraints.
- `hero-progression-configuration-rules.md` — XP curves, Level limits, Ability Score choices, health progression, and advancement constraints.
- `dungeon-level/character-mode-configuration-rules.md` — permitted Peace and Threat presentation, Animation Set mapping, transition configuration, and fixed mode constraints.
- `dungeon-level/hero-state-configuration-rules.md` — Hero-specific targeting, automatic attack, weapon presentation, and transition configuration.
- `dungeon-level/enemy-state-configuration-rules.md` — enemy perception, alerting, target selection, pursuit, search, disengagement, and animation configuration.
- `dungeon-level/threat-source-configuration-rules.md` — permitted Threat Source types, activation and resolution rules, detection limits, disengagement conditions, and protected-objective relationships.
- `dungeon-level/tactical-pause-configuration-rules.md` — Tactical Pause recharge, Struggle Meter tuning, and permitted pause actions.
- `trait-configuration-rules.md` — Trait eligibility, pools, tiers, offer counts, teaser rules, and progression constraints.
- `equipment-inventory-and-loadout-configuration-rules.md` — equipment slots, item rarity, weapon families, loadout limits, and compatibility rules.
- `ability-spell-and-feat-configuration-rules.md` — availability, unlock requirements, resource costs, targeting, and permitted combinations.
- `enemy-status-effect-and-hazard-configuration-rules.md` — enemy roles, AI profiles, scaling, Elite modifiers, status effects, and environmental hazards.
- `boss-and-phase-configuration-rules.md` — Boss phases, transitions, mechanics, vulnerability windows, and mastery requirements.
- `reward-loot-and-exit-configuration-rules.md` — reward tables, loot placement, permanent-reward eligibility, and exit conditions.
- `camp-and-system-unlock-configuration-rules.md` — Camp services, preparation options, feature activation, and unlock requirements.

The Journey, Dungeon Arc, Dungeon Level, Stage, and Encounter specifications already exist but require terminology and filename alignment.
