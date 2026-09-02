# Gameplay systems

This area defines the authoritative mechanics and runtime behavior of the game.

Gameplay Systems answer what happens during play, when it happens, and which rules remain true regardless of the configured content. These specifications define system states, triggers, transitions, interactions, constraints, completion conditions, and failure conditions.

## Responsibility boundary

- **Gameplay Systems** define how a mechanic behaves.
- **Content Design** defines the permitted ways mechanics can be configured and combined.
- **Content Studio** stores, validates, versions, and publishes concrete content records.
- **UX** defines how the player sees and interacts with the mechanic.
- **Technical Architecture** defines runtime implementation, persistence, and data exchange.

For example, the Hero Creation system defines required choices, validation, confirmation, and permanence. Content Studio provides the concrete Races, Classes, appearances, and starting equipment. UX defines the Create Hero screens.

The Dungeon progression system defines entry, Stage progression, failure, Boss completion, Exit Portal behavior, and unlocking. Content Design defines permitted Dungeon and Stage structures. Content Studio stores the concrete Dungeon Level and Stage records.

## Existing system specifications

- [Parties and Quest sessions](parties-and-quest-sessions.md)
- [Dungeon Level gameplay systems](dungeon-level/README.md)
- [Equipment and weapon configurations](equipment-and-weapon-configurations.md)

## Required system specifications

The following specifications must be migrated or created before the Gameplay Systems section is complete:

- `hero-creation.md` — permanent Hero creation, required choices, validation, confirmation, and permanence.
- `hero-identity-and-progression.md` — Hero Level, XP, Ability Scores, derived statistics, health progression, and permanent state.
- `journey-and-dungeon-progression.md` — Journey, Dungeon Arc, Dungeon Level, Stage, Boss, Exit Portal, unlocking, and completion.
- `abilities-spells-and-feats.md` — abilities, Spell Slots, spellcasting, feats, and activation requirements.
- `enemies-status-effects-and-hazards.md` — enemy runtime behavior, AI rules, status effects, hazards, and Elite modifiers.
- `bosses-and-phase-mechanics.md` — Boss runtime rules, phases, transitions, completion, and failure.
- `rewards-loot-death-and-exit.md` — pending rewards, permanent rewards, death loss, manual exit, successful exit, and loot commitment.
- `camp-and-system-unlocks.md` — Camp behavior, preparation between Dungeon Levels, feature unlocks, and access conditions.

The existing Equipment specification must later be expanded to cover inventory behavior, equipment slots, item rarity, and loadout management.
