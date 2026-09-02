# Threat Sources

## Purpose

The Threat Source system defines which runtime dangers can activate or maintain a Hero's Threat Mode during an active Dungeon Level.

A Threat Source is independent of `active_target`. A Threat Source can represent a targetable enemy, a non-targetable hazard, a triggered trap, or another actively developing danger.

## Optional assignment to Dungeon Level elements

Threat Source configuration is optional.

A Dungeon Level element can reference one or more Threat Source Definitions when the element is capable of creating an immediate or actively developing danger. The element is not required to have a Threat Source Definition merely because it exists in the Dungeon Level.

Elements that can be configured with a Threat Source Definition include:

- hostile creatures;
- mechanical or magical traps;
- damaging environmental hazards;
- projectiles and hostile spell effects;
- alarms and reinforcement triggers;
- Boss mechanics and scripted encounter events;
- threats against allied characters or protected objectives.

Decorative, inert, or non-dangerous interactive elements do not require Threat Source configuration.

Assigning a Threat Source Definition means that the element is capable of becoming a Threat Source. It does not mean that the source is continuously active. Activation and resolution are controlled by the definition's configured conditions.

For example, a fire used only as visual decoration does not require a Threat Source Definition. A fire that can damage the Hero can reference one. That source becomes active only while the fire presents an immediate or actively developing danger.

## Threat Source lifecycle

A Threat Source uses the following lifecycle:

- **Inactive:** The source exists or is known but does not present an immediate or actively developing danger.
- **Active:** The source presents an immediate or actively developing danger to the Hero or a protected objective.
- **Resolved:** The danger has been avoided, disabled, expired, defeated, or otherwise completed.

A resolved source cannot maintain Threat Mode. A source may become active again only when its owning gameplay system explicitly reactivates it.

## Threat Source categories

Threat Sources can include:

- hostile creatures that detect, pursue, target, or attack the Hero;
- ambushes, summoned creatures, animated objects, or awakening enemies;
- triggered mechanical or magical traps;
- incoming projectiles, hostile spells, telegraphs, and area-of-effect attacks;
- active environmental hazards such as fire, poison gas, acid, flooding, falling debris, or collapsing floors;
- Boss phase effects, Lair Actions, and encounter-driven hazards;
- alarms, reinforcements, chases, and scripted encounter escalations;
- direct attacks against allied characters or protected objectives.

## Activation rules

A known risk does not automatically become an active Threat Source.

The owning gameplay system activates the source only when it presents an immediate or actively developing danger. Detection of an inactive trap, environmental object, or distant enemy can provide player-facing information without activating Threat Mode.

Multiple Threat Sources can be active at the same time.

## Resolution rules

The gameplay system that activated a Threat Source is responsible for resolving it.

A source must resolve when its danger has been:

- defeated;
- disabled;
- avoided;
- expired;
- interrupted;
- moved outside its valid engagement conditions;
- or otherwise completed by its owning gameplay system.

Losing `active_target` does not resolve unrelated Threat Sources.

## Hero-state integration

- Peace Mode changes to Threat Mode when the first Threat Source becomes active.
- Threat Mode remains active while at least one unresolved Threat Source exists.
- Threat Mode can remain active without an `active_target`.
- The Hero can return to Peace Mode only after every Threat Source has resolved and the configured grace period has completed.

## Tactical Pause integration

Tactical Pause freezes Threat Source timers and animation-driven progression when those elements are covered by the pause contract. Tactical Pause does not activate, resolve, or otherwise change a Threat Source by itself.

## Configuration boundary

Permitted Threat Source types, detection limits, activation conditions, disengagement conditions, protected-objective relationships, and other configurable values are constrained by the Gameplay System Configuration Rules.

Concrete Threat Source configurations are authored, validated, versioned, and published through Content Studio.
