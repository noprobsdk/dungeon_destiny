# Body Archetype, Base Body, and Rig Profile data model

## Why this data model is necessary

Content Studio must separate a character's broad anatomy, visible body mesh, and reusable skeleton contract.

Without that separation, race, gender, mesh, rig, animations, and equipment compatibility become mixed into one record. This makes it difficult to reuse animations and equipment, identify which models are compatible, and see which technical component requires testing or replacement.

The first layer of the 3D character model therefore uses three records:

- `body_archetypes` classifies broad anatomical families;
- `base_bodies` registers visible, skinned character bodies;
- `rig_profiles` registers reusable skeleton compatibility contracts.

These records describe source components. They do not by themselves create a playable Hero or Enemy. Runtime Characters, Animation Sets, Equipment, and gameplay definitions reference the approved components later in the composition process.

## Terminology

**Rig Profile** is the canonical design, production, and database term.

A Rig Profile defines one versioned rig compatibility contract, including hierarchy, bone names, rest pose, local axes, bind matrices, required finger chains, and sockets.

The word skeleton may still describe the actual bone hierarchy, a skeleton mesh, or a creature such as Human Skeleton. It is not the name of the compatibility record.

## Relationships

```text
Body Archetype
├── has many Base Bodies
└── has many Rig Profiles

Base Body
├── belongs to one Body Archetype
└── uses zero or one Rig Profile while in production

Rig Profile
├── belongs to one Body Archetype
└── can be used by many Base Bodies
```

The database relationships are:

```text
body_archetypes.id ← base_bodies.body_archetype_id
body_archetypes.id ← rig_profiles.body_archetype_id
rig_profiles.id    ← base_bodies.rig_profile_id
game_assets.id     ← base_bodies.model_asset_key
```

A Draft Base Body may temporarily have no model asset or Rig Profile. A Base Body cannot be approved for runtime composition until both references exist and their compatibility has passed validation.

## `body_archetypes`

### Responsibility

`body_archetypes` defines broad anatomical and movement families. It is not a race, gender, class, or individual model.

Examples include:

- `humanoid`;
- `quadruped`;
- `serpentine`;
- `avian`;
- `insectoid`.

### Fields

| Field | Type | Required | Responsibility |
|---|---|---:|---|
| `id` | Text, primary key | Yes | Stable machine identifier. |
| `name` | Text | Yes | Human-readable name. |
| `description` | Text | Yes | Anatomical and movement-family definition. |
| `is_active` | Integer/boolean | Yes | Whether the archetype is available for new configuration. |

### Rules

- IDs are stable and must not contain race, gender, class, or weapon information.
- A Body Archetype does not point to a model asset.
- Deactivating an archetype does not delete its existing Base Bodies or history.
- `is_active` is availability, not test or approval status.

## `base_bodies`

### Responsibility

`base_bodies` registers a visible character body mesh and its identity, proportions, asset reference, and Rig Profile compatibility.

A Base Body is not a complete Hero, Enemy, outfit, equipment configuration, or Animation Set.

### Fields

| Field | Type | Required | Responsibility |
|---|---|---:|---|
| `id` | Text, primary key | Yes | Stable Base Body identifier. |
| `name` | Text | Yes | Human-readable body name. |
| `body_archetype_id` | Text, foreign key | Yes | References `body_archetypes.id`. |
| `race_species` | Text | Yes | Visible race or species represented by the body. |
| `gender` | Text | Yes | Body presentation where applicable; use an approved neutral value when not applicable. |
| `model_asset_key` | Text, foreign key | No during production | References the source body asset in `game_assets.id`. |
| `rig_profile_id` | Text, foreign key | No during production | References `rig_profiles.id`. Required before approval. |
| `is_active` | Integer/boolean | Yes | Whether the Base Body is available for new configuration. |
| `notes` | Text | Yes | Production and compatibility notes. |

### Rules

- One Base Body belongs to exactly one Body Archetype.
- One Base Body uses at most one active Rig Profile version at a time.
- Multiple Base Bodies may share the same Rig Profile.
- Race and gender describe the body; they do not determine the Rig Profile automatically.
- Rig compatibility must not be inferred from filenames, similar bone names, or visual proportions.
- A combined Runtime Character or equipped character must not be registered as a Base Body.
- `model_asset_key` must resolve to the stable Asset Library record, not directly to an arbitrary file path.
- `is_active` does not mean tested or approved.

## `rig_profiles`

### Responsibility

`rig_profiles` stores the database identity and summary metadata for one versioned Rig Profile contract.

The complete technical requirements remain authoritative in the 3D production [Rig Profile contract](../../06-3d-production/contracts/rig-profile-contract.md).

### Fields

| Field | Type | Required | Responsibility |
|---|---|---:|---|
| `id` | Text, primary key | Yes | Stable profile and compatibility identifier. |
| `name` | Text | Yes | Human-readable profile name. |
| `body_archetype_id` | Text, foreign key | Yes | References `body_archetypes.id`. |
| `version` | Text | No while unverified | Version of the Rig Profile contract. |
| `bone_count` | Integer | No while unverified | Verified number of bones. |
| `fingers_per_hand` | Integer | No when not applicable or unverified | Required finger chains per hand. |
| `bones_per_finger` | Integer | No when not applicable or unverified | Required deform bones in each finger chain. |
| `rest_pose` | Text | No while unverified | Required rest pose, such as T-pose or A-pose. |
| `status` | Text | Yes | Technical profile state such as `pending`, `validated`, or `legacy`. |
| `is_active` | Integer/boolean | Yes | Whether the profile may be selected for new configuration. |
| `notes` | Text | Yes | Technical limitations and validation notes. |

### Rules

- A Rig Profile represents an exact rig compatibility boundary.
- Bone hierarchy, bone names, rest-pose transforms, local axes, bind matrices, or required sockets cannot change inside an approved profile version.
- A breaking skeleton change requires a new version or profile record.
- Unknown technical values remain `NULL` or explicitly unverified; they must not be guessed.
- Ordinary humanoid Base Bodies should share the approved standard humanoid profile when they satisfy the same contract.
- Anatomically incompatible models require a dedicated profile.
- Sharing a Rig Profile enables animation and socket reuse, but does not guarantee universal skinned-equipment compatibility.
- `status='validated'` must only be assigned after the required 3D validation gates pass.
- `is_active` does not replace technical validation or workflow approval.

## Example configuration

| Body Archetype | Base Body | Rig Profile | Current intent |
|---|---|---|---|
| Humanoid | Human Male Medium | Humanoid Medium 65 | Shared standard humanoid profile. |
| Humanoid | Human Female Medium | Humanoid Medium 65 | Shared standard humanoid profile. |
| Humanoid | Elf Male Medium | Humanoid Medium 65 | Allowed after explicit compatibility validation. |
| Humanoid | Human Skeleton | Humanoid Medium 65 | Target after rerig and validation; legacy rig remains separate until then. |
| Humanoid | Dwarf Male | Humanoid Short | Planned unless the standard humanoid contract validates without compromise. |
| Humanoid | Minotaur Skeleton | Minotaur Skeleton 75 | Dedicated anatomy and rig. |
| Quadruped | Wolf | Unassigned | Requires a future quadruped profile. |

Examples describe intended structure and are not live Content Studio records.

## Validation and workflow

The three records participate in the shared Content Studio workflow when workflow tracking is implemented.

- `is_active` controls availability.
- Rig Profile `status` records technical profile classification.
- Workflow state records whether the exact entity revision is Draft, under test, approved, published, or retired.

Changing an approved Base Body's model asset or Rig Profile invalidates its previous approval and requires retesting. Changing an approved Rig Profile contract requires a new profile version rather than silently changing compatibility for every connected Base Body.

## Out of scope

This data model does not yet define:

- Animation Sets;
- Equipment compatibility;
- Grip Profiles;
- Runtime Characters;
- Hero or Enemy gameplay definitions;
- detailed workflow event tables.

Those records build on the approved Body Archetype, Base Body, and Rig Profile foundation.
