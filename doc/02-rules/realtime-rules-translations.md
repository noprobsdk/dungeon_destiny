# Real-time rules translations

Dungeon Destiny uses supported D&D rules for statistics and resolution, while timing, movement, automatic attacks, cooldown presentation, Tactical Pause, and temporary Traits are explicit game-specific translations.

Every translation must define:

- supported source rule;
- real-time trigger and timing;
- resource cost;
- target selection;
- interruption behavior;
- interaction with Tactical Pause;
- stacking and exclusion rules;
- deterministic runtime representation;
- rules-data version.

Tactical Pause must not bypass Spell Slot costs, target validity, line-of-sight, range, concentration, or other supported restrictions. Pausing changes decision time, not the underlying resolution rules.
