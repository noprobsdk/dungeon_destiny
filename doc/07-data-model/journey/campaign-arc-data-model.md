# Campaign and Dungeon Arc data model

Content Studio executes the GDD's Campaign and Arc structure as concrete, versioned records.

## Logical records

| Record | Responsibility |
|---|---|
| `campaigns` | Stable Campaign identity, title, status, and ordering. |
| `campaign_versions` | Versioned Campaign premise, goal, presentation, and release availability. |
| `dungeon_arcs` | Stable Arc identity and Campaign relationship. |
| `dungeon_arc_versions` | Story premise, goal, visual identity, enemy ecosystem, signature tactic, climax, and payoff. |
| `arc_dungeon_levels` | Ordered relationship between one Arc version and concrete Dungeon Level versions. |
| `arc_story_beats` | Ordered hook, clues, revelations, midpoint, climax, and transition beats. |
| `arc_enemy_roles` | Approved primary, supporting, Elite, and Boss enemy-version relationships. |
| `arc_tactical_mechanics` | References to approved mechanics and the levels where they are introduced, combined, twisted, and examined. |

Final table names require technical schema review, but these logical responsibilities are required.

## Required Arc fields

- stable ID and version;
- Campaign reference and order;
- configured DL range or ordered DL relationships;
- story premise and player goal;
- visual-identity profile;
- primary enemy family and supporting roles;
- signature tactical mechanic;
- midpoint revelation;
- final Boss and mastery-examination requirement;
- relic or equivalent payoff;
- connection to the next Arc;
- lifecycle, validation, and release status.

## Validation

Publication rejects an Arc when:

- its Dungeon Level ordering has gaps or duplicates;
- a referenced Dungeon Level version is inactive or incompatible;
- story beats do not cover hook, escalation, midpoint, and climax;
- its signature tactical mechanic lacks a valid introduction and final examination;
- enemy or visual-profile references are missing;
- the final objective, payoff, or next-Arc transition is unresolved;
- its records conflict with the approved GDD Arc contract.
