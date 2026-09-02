# Character Modes

## Purpose

Character Mode defines the persistent combat-readiness state of a runtime character during an active Dungeon Level.

The Character Mode contract applies to Heroes, allied characters, enemies, Bosses, and other runtime characters capable of changing between non-combat and combat-ready behavior.

Every applicable character has exactly one active Character Mode:

- `peace`
- `threat`

Attack, Hit, stagger, ability use, interaction, weapon swap, and Death are actions or temporary states. They do not introduce additional Character Modes.

## Peace Mode

Peace Mode represents a character that is not responding to an immediate or actively developing danger.

Depending on the character role, Peace presentation can include:

- exploration;
- patrol;
- guarding;
- waiting;
- resting;
- dormant behavior;
- relaxed Idle and locomotion;
- a stowed, lowered, or non-combat weapon presentation.

A character in Peace Mode does not perform combat attacks.

## Threat Mode

Threat Mode represents a character responding to an immediate or actively developing danger.

Threat presentation can include:

- combat-ready Idle and locomotion;
- target acquisition and tracking;
- pursuit or tactical repositioning;
- readying the active weapon;
- attack preparation, execution, and recovery;
- blocking, aiming, casting, or equivalent combat behavior.

Threat Mode permits combat actions but does not require the character to attack continuously.

A character can remain in Threat Mode temporarily without a valid attack target when danger remains unresolved or the character is still searching, pursuing, repositioning, or disengaging.

## Mode ownership

Each character evaluates its own Character Mode.

The Hero evaluates active Threat Sources that can endanger the Hero or a protected objective.

An enemy evaluates its own perception, AI events, assigned objectives, received alerts, damage, and valid hostile targets.

An enemy entering Threat Mode does not automatically force every other character into Threat Mode. Alert propagation and Threat Source activation are controlled by their owning gameplay systems.

## Animation presentation

Character Mode determines the required animation presentation.

The runtime resolves the compatible Animation Set from:

- Rig Profile;
- Character Mode;
- Weapon Type;
- Off-hand Type;
- animation variant.

Peace and Threat must not depend on hardcoded animation names.

Attack and other temporary actions use clips from, or compatible with, the active Threat Animation Set.

## Common transition rules

- Peace changes to Threat when the character's applicable danger or awareness rules become active.
- Threat remains active while the character's danger, hostile-target, search, pursuit, alert, or disengagement rules require combat readiness.
- Threat changes to Peace only after its exit conditions and configured grace or disengagement period have completed.
- Temporary actions do not replace the underlying Character Mode.
- Death or permanent removal ends Character Mode evaluation.
- Tactical Pause freezes Character Mode progression covered by the pause contract but does not itself change the mode.
