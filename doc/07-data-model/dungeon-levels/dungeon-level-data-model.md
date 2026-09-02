# Dungeon Level data model

Concrete Dungeon Levels are Content Studio records, not Markdown documents.

## Core records

| Record | Responsibility |
|---|---|
| `dungeons` | Stable identity and sequential DL number. |
| `dungeon_versions` | Name, difficulty, DL XP Budget, maze reference, lifecycle, and version. |
| `arc_dungeon_levels` | Ordered relationship to the owning Dungeon Arc version. |
| `dungeon_stages` | Ordered Stage definitions belonging to a Dungeon version. |
| `stage_enemies` | Approved enemy versions and counts assigned to a Stage. |
| `maze_layouts` | Versioned layout, collision, spawn, Boss, and Exit references. |
| `release_entries` | Exact Dungeon versions included in a release. |

Validation must enforce the GDD's Stage ordering, minimum content, Boss, Exit Portal, XP Budget, difficulty progression, and publication rules.

The Dungeon Level record contains its own playable configuration while inheriting narrative purpose, visual direction, enemy vocabulary, and tactical progression from its approved Dungeon Arc relationship.
