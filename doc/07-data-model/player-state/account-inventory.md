# Account Inventory data model

## Why this data model is necessary

Ordinary Equipment belongs to the player's Account Layer, not to a Hero. A Hero's Equipment Configuration references Equipment instances held in the Account Inventory. See [DD-007](../../12-decisions/decision-log.md) and [Equipment ownership and Hero assignment](../../03-gameplay-systems/equipment-and-weapon-configurations.md#equipment-ownership-and-hero-assignment).

The model must make it impossible to use one Equipment instance twice. Without a separate instance and assignment model:

- each Hero would own a copy of the same item;
- one item could be equipped by two Heroes at the same time;
- one item could occupy two slots or both Weapon Configurations of the same Hero;
- moving an item between Heroes could duplicate or lose it;
- usage rules could be bypassed when an item changes Hero.

The Account Inventory model uses:

- `equipment_instances`;
- `hero_equipment_assignments`.

## Ownership relationship

```text
Account
└── Account Inventory
    └── Equipment instance
        ├── Equipment definition
        │   ├── Item Level, Rarity, and statistics
        │   └── usage rules
        └── at most one assignment
            └── one Hero + one Weapon Configuration + one Equipment Slot
```

## Ownership boundaries

- `equipment` is a published Content Studio definition. It owns Item Level, Rarity, statistics, binding, and usage rules. See [Equipment and hand-slot data model](../character-model/equipment-and-hand-slots.md).
- Equipment instances and Hero assignments are persistent player state owned by the Player and Hero service and stored in Player D1. See [Service architecture](../../08-technical/service-architecture.md).
- Clients cannot create, assign, or transfer Equipment instances. Only the authoritative service changes this state.
- Account and Hero records are referenced by `account_id` and `hero_id`. Their data model is not defined here.

## `equipment_instances`

### Responsibility

`equipment_instances` records each Equipment item owned by an Account in its Account Inventory.

### Fields

| Field | Type | Required | Responsibility |
|---|---|---:|---|
| `id` | Text, primary key | Yes | Stable Equipment instance identifier. |
| `account_id` | Text | Yes | Owning Account. |
| `equipment_id` | Text, foreign key | Yes | References `equipment.id`. |
| `bound_hero_id` | Text | No | Hero the instance is bound to. Set only for Hero-bound Equipment. |
| `acquired_at` | Text/timestamp | Yes | When the Account acquired the instance. |
| `updated_at` | Text/timestamp | Yes | Last record update. |

### Rules

- Each owned item is one instance. Two copies of the same Equipment are two instances.
- An instance does not store or override Item Level, Rarity, statistics, or usage rules. They are read from the Equipment definition.
- Ordinary Equipment is Account-bound: `bound_hero_id` is empty.
- `bound_hero_id` is set only when the Equipment definition is Hero-bound, and references a Hero of the owning Account.
- `account_id` does not change. Account-bound does not imply player-to-player trading.

## `hero_equipment_assignments`

### Responsibility

`hero_equipment_assignments` records the one place an Equipment instance currently occupies: one Equipment Slot in one Weapon Configuration of one Hero.

### Fields

| Field | Type | Required | Responsibility |
|---|---|---:|---|
| `equipment_instance_id` | Text, primary key, foreign key | Yes | References `equipment_instances.id`. |
| `hero_id` | Text | Yes | Hero the instance is assigned to. |
| `weapon_configuration` | Text | Yes | `primary` or `secondary`. |
| `slot_id` | Text, foreign key | Yes | References `equipment_slots.id`. |
| `assigned_at` | Text/timestamp | Yes | When the current assignment was made. |

The primary key is:

```text
(equipment_instance_id)
```

`(hero_id, weapon_configuration, slot_id)` is unique.

### Rules

- The primary key allows one assignment per instance. An instance therefore occupies no more than one slot, in one Weapon Configuration, of one Hero, and can never be used twice.
- The unique key allows no more than one instance in each slot of each Weapon Configuration of a Hero.
- An instance without an assignment is available.
- The Hero must belong to the Account that owns the instance.
- `slot_id` must be permitted for the Equipment by `equipment_allowed_slots`.
- When a Weapon Configuration's Main Hand instance requires two hands, that Weapon Configuration has no Off Hand assignment.
- A Hero may be assigned an instance only when the Hero meets all of the Equipment's usage rules, including required Hero Level.
- A Hero-bound instance may be assigned only to its `bound_hero_id`.

## Transfer and Unequip

Moving an assigned instance to another Hero requires an explicit Transfer and Unequip operation.

The authoritative service performs it as one atomic operation:

1. confirm that the target Hero belongs to the owning Account and meets all of the Equipment's usage rules;
2. reject the operation for a Hero-bound instance;
3. confirm that the target slot is permitted and free in the target Weapon Configuration;
4. delete the previous assignment, which removes the instance from the previous Hero's Equipment Configuration; and
5. create the new assignment.

If any step fails, the previous assignment remains unchanged.

The UI identifies the currently assigned Hero from `hero_id` before the operation is confirmed.

## Usage-rule changes

When a published content release changes an Equipment item's usage rules so that an assigned Hero no longer meets them, the existing assignment stays on that Hero.

Usage rules are checked only when an assignment is created, including by Transfer and Unequip. Once the instance is unassigned, it can be assigned again only to a Hero who meets the current usage rules.

## Out of scope

This model does not define:

- Account and Hero records;
- which Weapon Configuration is active and how it is switched;
- Equipment Slots outside Main Hand and Off Hand;
- item acquisition, removal, selling, or destruction;
- Account Inventory capacity or stacking;
- player-to-player trading.
