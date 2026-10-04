# Equipment and weapon configurations

This Gameplay System defines how active Equipment and Weapon Configurations behave at runtime.

Persistent Equipment records, slots, and relationships are defined by the Data Model. Physical attachment, Rig Profile, Grip Profile, and asset requirements are defined by 3D Production.

Equipment does not own Animation Sets directly.

## Terminology

**Equipment Configuration** describes the complete set of Equipment assigned to a Character.

**Weapon Configuration** describes the active Main Hand and Off Hand combination.

A Character may have two switchable Weapon Configurations:

- **Primary Weapon Configuration:** the default active weapon and hand configuration.
- **Secondary Weapon Configuration:** an optional alternate weapon and hand configuration available through Tactical Pause.
- **Unarmed Configuration:** a valid fallback only when supported by the Character and a compatible Animation Set.

## Weapon configuration contents

Each Weapon Configuration contains or derives:

- Main Hand Equipment;
- Off Hand Equipment;
- Weapon Type;
- Off-hand Type;
- gameplay statistics;
- attack definition;
- range and target eligibility;
- attachment requirements;
- Grip Profile requirements;
- animation compatibility inputs.

A weapon swap replaces the complete active Weapon Configuration atomically.

Gameplay statistics, attacks, range, targeting, visible Equipment, attachment state, and animation resolution must change as one operation.

## Hand equipment

Main Hand and Off Hand are logical Equipment Slots.

The same one-handed Equipment item may be permitted in either slot without creating duplicate Equipment records.

A two-handed weapon is selected in Main Hand and reserves Off Hand automatically. Off Hand contains no second Equipment item while reserved.

The active Weapon Configuration derives:

- Weapon Type from Main Hand Equipment;
- Off-hand Type from Off Hand Equipment or the Main Hand weapon's hand requirement.

| Main Hand | Off Hand | Weapon Type | Off-hand Type |
|---|---|---|---|
| None | None | `unarmed` | `empty` |
| One-handed weapon | None | `one_hand_melee` | `empty` |
| One-handed weapon | Shield | `one_hand_melee` | `shield` |
| One-handed weapon | One-handed weapon | `one_hand_melee` | `dual_weapon` |
| Bow | Reserved | `bow` | `support_weapon` |
| Two-handed melee weapon | Reserved | `two_hand_melee` | `support_weapon` |

## Equipment ownership and Hero assignment

Ordinary Equipment belongs to the player's Account Layer and is stored in a Shared Inventory. A Hero does not own a separate copy of an Equipment item. Instead, the Hero's Equipment Configuration references Equipment instances from the Shared Inventory.

One Equipment instance may be assigned to no more than one Hero at a time.

A compatible Hero may equip an available item when all applicable requirements are satisfied, including:

- required Hero Level;
- permitted Equipment Slot;
- weapon, armor, or shield proficiency;
- Base Body and Rig Profile compatibility where required by the visual asset;
- any explicit gameplay restriction defined by the item.

Equipment has fixed statistics, Item Level, and requirements. Its statistics do not automatically scale to the Hero using it. Rarity expresses quality within an Item Level: an Epic Level 1 item is not equivalent in power to an Epic Level 10 item.

If an item is already assigned to another Hero, the UI must identify that Hero. Moving the item requires an explicit **Transfer and Unequip** operation. The authoritative service must atomically remove the previous assignment before assigning the same Equipment instance to the new Hero.

Hero-bound Equipment is an explicit exception reserved for special Journey or story requirements. Ordinary Equipment is Account-bound by default.

Account-bound does not imply player-to-player trading. Trading between different Accounts requires a separately approved gameplay system.

## Character Mode and animation resolution

The active Weapon Configuration supplies Weapon Type and Off-hand Type to the animation system.

```text
Rig Profile
+ active Character Mode
+ Weapon Type
+ Off-hand Type
↓
Compatible Animation Set
```

Peace and Threat may resolve to different Animation Sets for the same Weapon Configuration.

When a Character enters Threat:

- the Primary Weapon Configuration becomes active unless another configuration is already selected;
- its visible Equipment uses the configured attachment state;
- locomotion and actions use the compatible Threat Animation Set.

When the Character returns to Peace, the active Equipment may use a relaxed carrying state and the compatible Peace Animation Set.

## Logical slots and physical attachment

Logical Equipment Slots do not determine the physical hand bone.

Physical placement is controlled by the validated attachment socket. For example, a Bow may be logical Main Hand Equipment while its 3D asset is attached to a socket on the Character's left hand.

Rigid weapons attach to named sockets. Clothing and deformable armor require a compatible Rig Profile, Base Body, bind pose, and skinning contract.

## Related specifications

- [Equipment and hand-slot data model](../07-data-model/character-model/equipment-and-hand-slots.md)
- [Equipment contract](../06-3d-production/contracts/equipment-contract.md)
- [Animation contract](../06-3d-production/contracts/animation-contract.md)
