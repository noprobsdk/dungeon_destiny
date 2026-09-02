# Source of truth

## Authority order

1. **Game Design Documentation (GDD)** defines the intended player experience, mechanics, constraints, and design rules.
2. **Approved rules documentation** defines supported D&D rules and explicit Dungeon Destiny real-time translations.
3. **Content Studio** executes the GDD by creating, validating, versioning, and publishing concrete content records.
4. **Published release manifests** are immutable runtime snapshots of approved Content Studio data for a specific release.
5. **Godot** executes the published manifest and player state. It must not invent or hardcode content that belongs in Content Studio.

When implementation or Content Studio data conflicts with the GDD, the implementation or data must be corrected unless an approved design decision first changes the GDD.

## Data ownership

| Information | Authority |
|---|---|
| Core loop and mechanic behavior | GDD |
| Tactical Pause rules | GDD |
| Trait selection and tier progression rules | GDD |
| Concrete Trait definitions and tier values | Content Studio database |
| Concrete Journeys, Dungeon Arcs, Dungeon Levels, Stages, mazes, story beats, and enemy assignments | Content Studio database |
| Runtime Trait selections during an attempt | Player/run state in Godot |
| Concrete Hero and enemy visual references | Content Studio database |
| Rig, mesh, animation, equipment, and export compatibility | 3D production contracts |
| Released client content | Immutable published manifest |

## Prohibited duplication

Concrete Dungeon Level records, enemy statistics, Trait records, and asset registry records must not be maintained independently in Markdown and the database. Documentation can contain clearly labelled examples, but examples are never live content.
