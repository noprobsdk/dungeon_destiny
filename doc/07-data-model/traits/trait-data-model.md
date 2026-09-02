# Trait data model

Each versioned Trait definition contains:

| Group | Required data |
|---|---|
| Identity | `id`, display name, description, icon, lifecycle, version. |
| Eligibility | Class, subclass, weapon family, Fighting Style, minimum Hero Level, release requirements. |
| Structure | Branch, prerequisites, exclusions, `max_tier`, and `is_teaser`. |
| Tier map | Structured values and effect parameters for every supported Tier. |
| Runtime behavior | One or more approved effect-handler IDs and event hooks. |
| Presentation | Tier text, Teaser explanation, and localized display keys. |

Effect handlers such as `OnAttack`, `OnHit`, and `OnStatRecalculate` are references to implemented, tested runtime handlers. Arbitrary code cannot be entered through Content Studio.

Validation rejects missing tiers, invalid prerequisites, graph cycles, unsupported handlers, impossible eligibility, duplicated IDs, and Teaser Traits without explicit disclosure.
