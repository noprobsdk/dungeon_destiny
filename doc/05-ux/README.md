# Player-app UX

This area defines every player-facing screen, flow, interaction, overlay, and visible state in the game app.

UX specifications translate approved Game Design, Gameplay System, and Gameplay System Configuration requirements into mobile interactions without changing their rules.

## Responsibility boundary

- **Game Design** defines the intended player experience.
- **Gameplay Systems** define what the game does.
- **Gameplay System Configuration Rules** define which values and combinations may vary.
- **Player-app UX** defines how the player sees, understands, and controls the game.
- **Technical Architecture** defines how the UX is implemented and connected to runtime state.
- **Content Studio** defines the separate authoring interface used by developers and designers.

Player-app UX must not invent gameplay behavior, configuration values, rewards, or progression rules.

## UX specification requirements

Every screen or flow specification must define:

- purpose and source requirement;
- entry and exit conditions;
- displayed information;
- available inputs and actions;
- loading, empty, locked, unavailable, and error states;
- confirmation and cancellation behavior;
- transitions to other screens or overlays;
- portrait-mobile layout requirements;
- accessibility and readability requirements.

## Existing UX specifications

- [Dungeon gameplay and Tactical Pause](dungeon-gameplay-and-tactical-pause.md)
- [Trait selection](trait-selection.md)

## Required UX specifications

The following specifications must be migrated or created before the Player-app UX section is complete:

- `screen-inventory-and-navigation.md` — authoritative inventory of screens, overlays, entry points, and transitions.
- `app-startup-loading-and-errors.md` — startup, required connectivity, authentication, manifest update, loading, reconnect behavior, and fatal errors.
- `friends-parties-and-quest-selection.md` — friends, new/Saved/Recent Parties, invitations, Hero selection, Party-based Quest eligibility, ready checks, Invite Again, and Party dissolution.
- `main-menu-and-journey-navigation.md` — Continue, new Journey, Hero selection, Journey progress, and Dungeon Arc selection.
- `hero-creation.md` — Race, appearance, Class, Ability Scores, starting equipment, validation, and confirmation.
- `hero-management-and-progression.md` — Hero overview, Level progression, statistics, permanent choices, and equipment access.
- `camp.md` — preparation, conversations, services, loadouts, and entering the next Dungeon Level.
- `inventory-equipment-and-loadouts.md` — inventory, equipment slots, comparison, Primary and Secondary loadouts, and weapon swapping.
- `abilities-spells-and-targeting.md` — ability selection, Spell Slots, target validation, AoE templates, and unavailable states.
- `rewards-death-exit-and-results.md` — death, manual exit, Boss victory, Exit Portal, committed rewards, and lost rewards.
- `story-dialogue-and-objectives.md` — mission briefing, dialogue, story beats, objective tracking, and Dungeon Arc progress.
- `onboarding-and-context-help.md` — tutorials, first-use explanations, locked features, and contextual help.
- `settings-accessibility-and-localization.md` — audio, controls, readability, accessibility, language, and safe-area behavior.

Content Studio screens do not belong in this area. Content Studio authoring UX remains under `09-content-studio`.
