# Trait-selection UX

After an eligible Stage, gameplay enters a safe paused transition and displays three unique Trait cards.

Every card shows:

- name, icon, branch, and current offered Tier;
- mechanical effect and exact Tier value;
- prerequisites and incompatibilities;
- whether selection unlocks the next Tier;
- a clear Teaser label and explanation when `is_teaser` is true.

The player must select exactly one valid card. The UI must not imply that unselected cards are removed permanently; they remain eligible at their current tiers unless excluded by another choice.
