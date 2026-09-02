# Character Mode configuration rules

## Purpose

These rules define how the fixed Peace and Threat Character Modes may be configured for concrete runtime characters.

Content configuration can tune and connect the modes but cannot add, remove, rename, or redefine them.

## Fixed rules

- The permitted Character Modes are `peace` and `threat`.
- Attack is an action within Threat Mode.
- Temporary actions do not become additional Character Modes.
- Every configured Animation Set declares the Character Mode it supports.
- Character Mode is evaluated independently for each runtime character.

## Permitted configuration

Content Studio can configure:

- Peace and Threat Animation Set references;
- Weapon Type and Off-hand Type compatibility;
- transition Animation Clips;
- transition grace periods;
- equipment ready, lower, stow, draw, or sheathe presentation;
- initial Character Mode where the gameplay system permits it;
- fallback behavior when an exact Animation Set is unavailable;
- role-specific presentation variants.

Configuration cannot:

- create a third Character Mode;
- classify Attack, Hit, Death, stagger, or ability use as Character Modes;
- allow combat attacks during Peace Mode;
- bypass Rig Profile or weapon-animation compatibility;
- redefine the fundamental Peace-to-Threat or Threat-to-Peace contract.
