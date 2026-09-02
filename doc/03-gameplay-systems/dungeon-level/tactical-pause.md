# Tactical Pause

## Core behavior

Tactical Pause is an on-demand time-stop activated through a dedicated HUD button. It unlocks when Dungeon Level 2 becomes the active Dungeon Level unless a release specification explicitly delays the feature.

Activating Tactical Pause freezes:

- Hero and enemy movement;
- attack and ability progression;
- enemy telegraphs and hazard timers;
- projectiles;
- animation-driven gameplay events;
- gameplay clocks covered by the pause contract.

UI animation and inspection controls may continue.

## In-pause actions

Only actions supported by the active release, Hero, equipment, and current resources are shown.

### Weapon swap

The player can toggle between configured Primary and Secondary loadouts. The active attack, Animation Set, Grip Profile, target eligibility, and range ring update before time resumes.

### Spellcasting and abilities

The player can spend available resources such as Spell Slots to queue supported spells or abilities. Examples include *Fireball*, *Cure Wounds*, and *Shield* only when the Hero and active release actually support them.

### Precision targeting

The player can position a supported AoE or directional template over the frozen battlefield. Target validity, range, line-of-sight, collision, and resource rules remain active.

### Battlefield assessment

The player can inspect enemy health, positions, current target, danger zones, telegraphs, projectiles, and available tactical actions without time pressure.

## Charge and Struggle Meter

Tactical Pause uses a Dynamic Timer / Struggle Meter.

- Initial balancing target: approximately 25–30 seconds of passive recharge.
- Taking damage can accelerate recharge.
- Being surrounded or under sustained pressure can accelerate recharge.
- Smooth, low-damage runs receive less acceleration.
- The meter cannot charge through fabricated events or repeated harmless contacts.

Exact recharge values, surrounding-enemy thresholds, damage weighting, maximum acceleration, stored charges, and carry-over rules are Content Studio configuration constrained by this GDD and validated through playtesting.

## Required safeguards

- Tactical Pause cannot duplicate resource spending.
- A queued action is validated again when play resumes.
- Invalid actions remain unavailable and explain why.
- Opening and closing Tactical Pause must be deterministic and save-safe.
- Pause state must not desynchronize animation events from gameplay resolution.
