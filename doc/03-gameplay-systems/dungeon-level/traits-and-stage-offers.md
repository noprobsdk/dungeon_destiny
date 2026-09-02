# Traits and Stage offers

Traits are temporary run-only modifiers. They are not permanent Feats, Class features, equipment, or Hero Level rewards.

## Stage selection loop

1. Completing an eligible non-final Stage generates three unique Trait options: A, B, and C.
2. The player selects exactly one option.
3. The selected Trait becomes active for the current attempt.
4. Its next eligible tier replaces or extends its lower-tier offer state according to the Trait definition.
5. Unselected options remain in the Active Pool at their existing tiers and can appear again later.
6. The final Boss Stage does not generate a post-Stage Trait offer.
7. All selected Traits and pool progression reset when the attempt ends.

### Example

If Option A is selected at Tier 1, its next eligible offer becomes Tier 2. Unselected Options B and C remain eligible at Tier 1. The next Stage offer is generated from the complete resulting Active Pool, not only from A, B, and C.

## Eligibility

Trait eligibility can depend on:

- Hero Class or subclass;
- active weapon family or Fighting Style;
- minimum Hero Level;
- selected prerequisites;
- exclusions and incompatible Traits;
- Stage depth and completed Elite Stages;
- active release capabilities.

Every three-card offer must contain at least one option relevant to the Hero's Class, active weapon, or supported combat style.

## Teaser Traits

Teaser Traits preview powerful future build directions associated with later Hero Levels, equipment, or advanced systems. They must:

- be explicitly marked `is_teaser`;
- explain that the effect is temporary;
- not permanently grant the previewed Class feature, spell, or equipment;
- not misrepresent a locked permanent ability as already owned;
- obey normal eligibility and balance validation.

## Trait definition contract

Each Trait contains:

1. **Metadata and requirements:** stable `id`, display data, Class, weapon, minimum Hero Level, `max_tier`, and `is_teaser`.
2. **Tier map:** structured values per Tier, such as 20%, 40%, and 50% split chance.
3. **Runtime hooks:** approved event bindings such as `OnAttack`, `OnHit`, or `OnStatRecalculate`.

Runtime hooks reference a closed registry of implemented effect handlers. Content Studio data must never contain arbitrary executable code.

## Active Pool authority

Content Studio stores definitions and offer configuration. Godot owns the Active Pool and selected Trait state for the current singleplayer attempt. If multiplayer is approved later, an authoritative service may own generation and selections to prevent cheating; this is not a current runtime dependency.
