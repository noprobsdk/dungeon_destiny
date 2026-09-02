# Trait-system test plan

Required tests include:

- three unique eligible cards;
- selected Tier advances correctly;
- unselected Traits remain at their existing tiers;
- prerequisites and exclusions are enforced;
- at least one relevant choice is guaranteed;
- Teaser limits and labels are enforced;
- runtime hooks execute exactly once per event;
- unsupported effect handlers block publication;
- all Active Pool and selected Trait state resets after success, death, or manual exit;
- deterministic seeds reproduce the same offer sequence from the same inputs.
