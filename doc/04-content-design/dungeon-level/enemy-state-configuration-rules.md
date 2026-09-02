# Enemy State configuration rules

## Purpose

These rules define the permitted configuration of enemy awareness, target acquisition, alerting, pursuit, combat readiness, and disengagement within the fixed Character Mode contract.

## Permitted configuration

Content Studio can configure:

- initial Peace presentation;
- Idle, patrol, guard, dormant, or scripted Peace behavior;
- detection range and field of view;
- hearing or event-based detection;
- reaction delay;
- target-selection priorities;
- allied alert propagation;
- guarded areas and protected objectives;
- pursuit distance;
- leash limits;
- last-known-position search duration;
- disengagement delay;
- return-to-post behavior;
- compatible Peace and Threat Animation Sets;
- Weapon Type and Off-hand Type;
- attack selection and action availability;
- Threat Source activation and resolution relationships.

## Constraints

- An enemy cannot perform an attack while in Peace Mode.
- Detection and alert configuration cannot bypass target validity.
- Losing the current target does not automatically cause Peace Mode.
- Search, pursuit, leash, and disengagement rules must produce a deterministic exit from Threat Mode.
- Animation Sets must be compatible with the enemy's Rig Profile and weapon configuration.
- Defeated enemies cannot reenter Peace or Threat Mode unless explicitly restored by another approved gameplay system.
