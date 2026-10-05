# Equipment and hand-slot data model

## Why this data model is necessary

Equipment, logical Equipment Slots, physical attachment sockets, and animation compatibility are separate concepts.

Without this separation:

- a Shortsword must be duplicated to support both hands;
- Main Hand and Off Hand may incorrectly be treated as rig-bone names;
- weapon assets become directly coupled to Animation Sets;
- two-handed weapon behavior becomes ambiguous;
- Content Studio cannot reliably test valid character combinations.

The hand-equipment model uses:

- `equipment`;
- `equipment_slots`;
- `equipment_allowed_slots`;
- `weapon_types`;
- `off_hand_types`;
- `equipment_usage_rules`.

## Character composition relationship

```text
Base Body
└── Rig Profile
    └── available physical attachment sockets

Equipment
├── visual asset
├── Weapon Type
└── permitted Equipment Slots
    ├── slot-specific attachment socket
    └── optional Off-hand Type
```

The active hand configuration provides animation compatibility inputs:

```text
Rig Profile
+ active Character Mode
+ Weapon Type
+ Off-hand Type
↓
Compatible Animation Set
```

Equipment does not store direct Peace or Threat Animation Set references.

## Terminology

**Equipment** is a concrete gameplay item such as Rusty Shortsword, Longbow, Greataxe, or Shield.

**Equipment Slot** is a logical gameplay position such as Main Hand or Off Hand.

**Weapon Type** classifies how the active Main Hand weapon is used.

**Off-hand Type** classifies the contribution of Off Hand to the complete hand configuration.

**Attachment socket** is a physical location defined by a Rig Profile.

Equipment Slot IDs must never be treated as bone or attachment-socket names.

## Relationships

```text
weapon_types.id
    ← equipment.weapon_type_id

equipment.id
    ← equipment_allowed_slots.equipment_id

equipment.id
    ← equipment_usage_rules.equipment_id

equipment_slots.id
    ← equipment_allowed_slots.slot_id

off_hand_types.id
    ← equipment_allowed_slots.off_hand_type_id

game_assets.id
    ← equipment.asset_id
      logical asset reference
```

One Equipment item may have several permitted Equipment Slot relationships.

## `weapon_types`

### Responsibility

`weapon_types` classifies broad weapon families used by gameplay and Animation Set compatibility.

Initial records are:

- `unarmed`;
- `one_hand_melee`;
- `two_hand_melee`;
- `bow`.

### Fields

| Field | Type | Required | Responsibility |
|---|---|---:|---|
| `id` | Text, primary key | Yes | Stable machine identifier. |
| `name` | Text | Yes | Human-readable name. |
| `description` | Text | Yes | Definition of the weapon family. |
| `hands_required` | Integer | Yes | Number of hands reserved by the weapon family. |
| `attack_delivery` | Text | Yes | Broad delivery type such as `melee` or `ranged`. |
| `is_active` | Integer/boolean | Yes | Availability for new configurations. |
| `notes` | Text | Yes | Design and compatibility notes. |

### Rules

- Weapon Type is a classification, not a concrete weapon.
- It does not reference an Animation Set.
- `hands_required = 2` reserves Off Hand.
- Deactivation does not delete existing Equipment or historical configurations.

## `off_hand_types`

### Responsibility

`off_hand_types` classifies how Off Hand participates in the active hand configuration.

Initial records are:

- `empty`;
- `shield`;
- `support_weapon`;
- `dual_weapon`.

### Fields

| Field | Type | Required | Responsibility |
|---|---|---:|---|
| `id` | Text, primary key | Yes | Stable machine identifier. |
| `name` | Text | Yes | Human-readable name. |
| `description` | Text | Yes | Definition of the Off Hand configuration. |
| `is_active` | Integer/boolean | Yes | Availability for new configurations. |
| `notes` | Text | Yes | Design and compatibility notes. |

### Rules

- Off-hand Type describes a configuration, not necessarily a separate item.
- `shield` is derived from Shield Equipment selected in Off Hand.
- `dual_weapon` is derived from a compatible weapon selected in Off Hand.
- `support_weapon` is derived when Main Hand requires two hands.
- `empty` is used when Off Hand has no item or support role.
- Off-hand Type does not reference an Animation Set.

## `equipment`

### Responsibility

`equipment` registers each concrete gameplay item once.

A Shortsword remains one record even if it can be equipped in either hand.

### Hand-configuration fields

| Field | Type | Required | Responsibility |
|---|---|---:|---|
| `id` | Text, primary key | Yes | Stable Equipment identifier. |
| `display_name` | Text | Yes | Human-readable item name. |
| `asset_id` | Text | No during production | Logical reference to the visual asset in `game_assets`. |
| `weapon_type_id` | Text, foreign key | No | References `weapon_types.id` when the item acts as a weapon. |
| `item_level` | Integer | Yes | Fixed Item Level of the item. |
| `binding` | Text | Yes | `account` for ordinary Account-bound Equipment or `hero` for Hero-bound Equipment. |
| `is_active` | Integer/boolean | Yes | Availability for new configurations. |
| `status` | Text | Yes | Current item status. |
| `notes` | Text | Yes | Gameplay and production notes. |
| `updated_at` | Text/timestamp | Yes | Last record update. |

The table also contains the existing Equipment gameplay fields for rarity, Gear Score, combat bonuses, armor values, health, speed, power, and tags.

The existing `slot` and `visual_slot` fields are legacy compatibility fields. New hand configuration uses `equipment_allowed_slots`.

### Rules

- Do not duplicate an item merely because it supports multiple slots.
- `weapon_type_id` is nullable because Shields and non-weapon Equipment are not Main Hand weapon families.
- `asset_id` does not determine the attachment socket.
- Equipment does not own Character Mode or Animation Set references.
- `is_active` does not mean tested or approved.
- Item Level, Rarity, and statistics are fixed on the Equipment definition. They do not scale to the Hero using the item, and every instance of the item is identical.
- Rarity expresses quality within an Item Level.
- `binding` defaults to `account`. `hero` is reserved for special Journey or story requirements.
- Ownership of Equipment instances and their assignment to Heroes are defined in the [Account Inventory data model](../player-state/account-inventory.md).

## `equipment_usage_rules`

### Responsibility

`equipment_usage_rules` defines the rules a Hero must meet to equip an Equipment item.

An item contains its own usage rules. They are not derived from Item Level.

### Fields

| Field | Type | Required | Responsibility |
|---|---|---:|---|
| `equipment_id` | Text, foreign key | Yes | References `equipment.id`. |
| `rule_type` | Text | Yes | Kind of rule, such as `required_hero_level` or `proficiency`. |
| `rule_value` | Text | Yes | Value the Hero must meet, such as a minimum Hero Level or a proficiency identifier. |
| `notes` | Text | Yes | Design notes for the rule. |

The composite primary key is:

```text
(equipment_id, rule_type, rule_value)
```

### Rules

- A Hero may equip an item only when the Hero meets every usage rule of that item.
- `required_hero_level` sets the minimum Hero Level. A Hero below it cannot equip the item.
- An item without usage rules has no requirements beyond slot and compatibility validation.
- Adding a rule type does not require a schema change, but the authoritative service must know how to evaluate it before the rule is published.
- Usage rules do not replace Equipment Slot, Rig Profile, or other compatibility validation.

## `equipment_slots`

### Responsibility

`equipment_slots` registers logical gameplay slots.

Initial records are:

- `main_hand`;
- `off_hand`.

### Fields

| Field | Type | Required | Responsibility |
|---|---|---:|---|
| `id` | Text, primary key | Yes | Stable logical slot identifier. |
| `display_name` | Text | Yes | Human-readable slot name. |
| `sort_order` | Integer | Yes | Display order. |
| `is_active` | Integer/boolean | Yes | Availability for new configurations. |
| `notes` | Text | Yes | Slot rules and notes. |

### Rules

- Equipment Slots are gameplay concepts.
- They do not identify physical hands, bones, or sockets.
- Additional armor or accessory slots may be added later.
- Deactivating a slot does not remove historical configurations.

## `equipment_allowed_slots`

### Responsibility

`equipment_allowed_slots` defines which logical slots an Equipment item may use.

It stores slot-specific behavior without duplicating the Equipment item.

### Fields

| Field | Type | Required | Responsibility |
|---|---|---:|---|
| `equipment_id` | Text, foreign key | Yes | References `equipment.id`. |
| `slot_id` | Text, foreign key | Yes | References `equipment_slots.id`. |
| `is_default` | Integer/boolean | Yes | Whether this is the item's default slot. |
| `off_hand_type_id` | Text, foreign key | No | Off-hand Type produced by an Off Hand relationship. |
| `attachment_socket` | Text | No during production | Physical Rig Profile socket used by this relationship. |
| `notes` | Text | Yes | Slot-specific compatibility notes. |

The composite primary key is:

```text
(equipment_id, slot_id)
```

### Rules

- Main Hand relationships normally leave `off_hand_type_id` empty.
- Off Hand relationships declare the resulting Off-hand Type when applicable.
- One-handed weapons may have both Main Hand and Off Hand relationships.
- Two-handed weapons normally have only a Main Hand relationship.
- Selecting a two-handed item reserves Off Hand automatically.
- Reserving Off Hand does not create a second Equipment item.
- `attachment_socket` must be supported by the selected Rig Profile.
- An empty socket means attachment is not yet configured or validated.
- Slot permission does not prove rig, grip, animation, or 3D compatibility.

## Hand-configuration derivation

| Main Hand | Off Hand | Weapon Type | Off-hand Type |
|---|---|---|---|
| None | None | `unarmed` | `empty` |
| One-handed weapon | None | `one_hand_melee` | `empty` |
| One-handed weapon | Shield | `one_hand_melee` | `shield` |
| One-handed weapon | One-handed weapon | `one_hand_melee` | `dual_weapon` |
| Bow | Reserved | `bow` | `support_weapon` |
| Two-handed melee weapon | Reserved | `two_hand_melee` | `support_weapon` |

Main Hand and Off Hand remain logical slots.

For example, a Bow may be logical Main Hand Equipment while its 3D asset is physically attached to a left-hand socket.

## Validation

A publishable hand-equipment combination requires validation of:

- Equipment record and visual asset;
- permitted Equipment Slot;
- Base Body and Rig Profile;
- physical attachment socket;
- scale, pivot, and orientation;
- Grip Profile when applicable;
- Weapon Type;
- Off-hand Type;
- required Character Mode coverage;
- compatible Animation Set;
- visual clipping and hand placement.

Changing an approved asset, slot relationship, socket, Weapon Type, or Off-hand Type invalidates affected compatibility evidence.

## Out of scope

This model does not define:

- Content Studio screen layout;
- saved Hero or Enemy loadouts;
- item acquisition or progression;
- additional armor and clothing slots;
- Animation Set clip contents;
- automatic creation of missing Animation Sets.
