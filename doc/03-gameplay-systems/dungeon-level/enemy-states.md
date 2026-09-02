# Enemy States

## Purpose

Enemy States define how an enemy applies the shared [Character Modes](character-modes.md) contract during an active Dungeon Level.

This specification covers enemy awareness, target acquisition, combat readiness, attack eligibility, disengagement, animation presentation, and the relationship between an enemy and the Threat Source system.

## Peace Mode

An enemy in Peace Mode can:

- remain Idle;
- patrol;
- guard a position or objective;
- follow a scripted non-combat route;
- sleep or remain dormant;
- perform an ambient action;
- carry its weapon in the configured Peace presentation.

Peace Mode does not mean that the enemy is friendly. It means that the enemy is not currently responding to an immediate or actively developing hostile situation.

An enemy in Peace Mode does not perform attacks.

## Entering Threat Mode

An enemy can enter Threat Mode when an approved trigger occurs, including:

- detecting the Hero or another hostile character;
- receiving damage;
- receiving an alert from an allied enemy;
- observing an allied enemy enter combat;
- detecting intrusion into a guarded area;
- protecting an objective under attack;
- activation by a trap, encounter, Stage, Boss phase, or scripted event.

Exact detection, alert, and activation values are configuration. The supported trigger behavior is defined by this gameplay system.

## Threat Mode

An enemy in Threat Mode can:

- acquire or change a hostile target;
- face or track the target;
- ready its configured weapon;
- pursue or reposition;
- move into attack range;
- perform supported attacks or abilities;
- defend, block, evade, or take cover;
- communicate alerts to permitted allied enemies;
- protect an assigned objective;
- search for a recently lost target.

Threat Mode does not guarantee continuous attacks. An attack is attempted only when the enemy has a valid action, valid target, permitted range, required line-of-sight or path, and no blocking cooldown, recovery, resource, or status condition.

## Attack behavior

Enemy attacks are actions within Threat Mode.

An enemy attack follows the semantic sequence:

1. target validation;
2. attack selection;
3. preparation or wind-up;
4. execution;
5. impact, projectile release, spell creation, or equivalent gameplay event;
6. recovery;
7. Threat reevaluation.

Attack timing must come from the configured action and compatible Animation Set rather than from hardcoded animation names.

## Losing the target

Losing the current target does not immediately return the enemy to Peace Mode.

Depending on its configured behavior, the enemy can:

- select another valid target;
- pursue the last known position;
- search for a limited duration;
- return to a guarded objective;
- remain alerted during a disengagement period.

The enemy returns to Peace Mode only after no applicable hostile condition remains and its search, pursuit, leash, and disengagement rules have completed.

## Animation and equipment presentation

Every combat-capable enemy uses Animation Sets compatible with its:

- Rig Profile;
- Character Mode;
- Weapon Type;
- Off-hand Type;
- animation variant.

Entering Threat Mode activates the configured combat-ready weapon and animation presentation.

Returning to Peace Mode activates the configured lower, stow, sheathe, carry, patrol, dormant, or equivalent presentation.

## Relationship to Threat Sources

Enemy Character Mode and Hero Threat Mode are related but are not the same state.

An enemy can own or activate a Threat Source that affects the Hero. The Threat Source system determines whether that enemy currently contributes to the Hero's Threat Mode.

An enemy can remain in Threat Mode briefly while searching for the Hero even when it no longer provides an immediate active Threat Source to the Hero.

Defeating, disabling, neutralizing, or validly disengaging the enemy resolves its associated Threat Source according to the owning configuration.

## Defeated state

When defeated:

- movement and target selection stop;
- new attacks cannot begin;
- active actions are cancelled or resolved according to their interruption rules;
- the configured Hit, defeat, or Death animation is performed;
- the enemy's associated Threat Source is resolved when the gameplay execution point requires it;
- Character Mode evaluation ends.
