# Trait offer configuration

Content Studio stores the configuration used by the runtime Trait Pool Manager:

- number of cards per offer;
- Class, weapon, and universal weighting targets;
- Stage-depth weighting;
- Elite Stage modifiers;
- Teaser eligibility and frequency limits;
- duplicate, prerequisite, exclusion, and incompatibility rules;
- deterministic randomization/version parameters.

The runtime owns the current Active Pool. After selection, the chosen Trait's next eligible Tier enters the resulting pool state while unselected Traits retain their current tiers. Content Studio stores no live player's current pool.
