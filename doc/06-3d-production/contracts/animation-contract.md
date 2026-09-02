# Animation contract

An Animation Set binds semantic animation roles to clips for one exact compatibility combination:

```text
Rig Profile
+ Character Mode
+ Weapon Type
+ Off-hand Type
+ optional Variant
↓
Animation Set
```

Character Mode is either `peace` or `threat`.

Equipment does not reference Animation Sets directly. The active Weapon Configuration supplies Weapon Type and Off-hand Type, while the selected Base Body supplies the Rig Profile.

## Character Mode coverage

A Runtime Character may require separate Animation Sets for Peace and Threat because its posture, locomotion, weapon readiness, and available actions can differ between the two modes.

Typical Peace roles include:

- `Idle`;
- `Walk`;
- `Run`.

Typical Threat roles include:

- `Idle`;
- `Walk`;
- `Run`;
- `Attack_Primary`;
- `Hit`;
- `Death`.

The exact required roles are defined by the Gameplay System using the Animation Set. A role is not automatically required in every Character Mode.

Transitions between Peace and Threat may use dedicated transition clips or an explicitly validated blend.

## Weapon-specific roles

Weapon Types and Off-hand Types may require additional semantic roles, including:

- `Aim`;
- `Release`;
- `Projectile_Event`;
- `Shield_Block`;
- `Thrust`;
- `Attack_Secondary`;
- `Equip`;
- `Unequip`.

Semantic role names remain stable even when the underlying clips differ between weapons, Rig Profiles, or Character Modes.

## Combined weapon configurations

A combined configuration such as one-handed weapon plus Shield requires an Animation Set validated for:

```text
Weapon Type = one_hand_melee
Off-hand Type = shield
```

Animations from independent weapon and Shield sets must not be merged automatically.

Layered or additive composition is allowed only when the Animation Set explicitly defines:

- a supported composition mode;
- compatible source clips;
- validated bone masks;
- synchronization and event timing;
- tested hand, weapon, and Shield alignment.

Otherwise, the combined Weapon Configuration requires its own complete Animation Set.

## Validation requirements

The Animation Set contract defines:

- looping behavior;
- root-motion behavior;
- event timing;
- pose continuity;
- transition requirements;
- physical weapon-socket behavior;
- hand placement and Grip Profile compatibility;
- Off Hand interaction;
- supported playback and blend behavior.

Matching animation names do not prove compatibility. Every Animation Set must be validated against its declared Rig Profile, Character Mode, Weapon Type, and Off-hand Type.

## Related specifications

- [Equipment and Weapon Configurations](../../03-gameplay-systems/equipment-and-weapon-configurations.md)
- [Equipment and hand-slot data model](../../07-data-model/character-model/equipment-and-hand-slots.md)
- [Equipment contract](equipment-contract.md)
