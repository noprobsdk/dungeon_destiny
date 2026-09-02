# Hero creation UX

## Purpose

Hero Creation guides the player through creating the permanent Hero used for the Journey. It must make every required choice understandable, prevent invalid combinations, and clearly distinguish permanent decisions from choices that can be changed later.

This document defines the player-facing flow. It does not define Hero rules, available options, calculations, or concrete records.

## Source requirements

Hero Creation derives its behavior and available choices from:

- Game Design requirements for permanent Hero identity and the Journey;
- the Hero Creation Gameplay System;
- Hero Creation configuration rules;
- the active published Content Studio manifest;
- supported rules and calculation versions.

UX must not hardcode Classes, Races, appearances, Ability Score methods, equipment, descriptions, or availability.

## Entry conditions

Hero Creation opens only when:

- application bootstrap has completed;
- required published content has loaded and passed validation;
- no permanent Hero exists for the active player profile or Journey slot; and
- the active release contains at least one valid Hero configuration.

If a permanent Hero already exists, normal startup bypasses Hero Creation. Existing permanent Hero data must never be silently replaced. Deleting, resetting, or replacing a Hero requires a separate explicitly confirmed flow.

## Flow

```text
Start Hero Creation
→ Identity
→ Race and Appearance
→ Class
→ Ability Scores
→ Mandatory Level 1 Choices
→ Starting Equipment
→ Review
→ Confirm Permanent Hero
→ Save
→ Continue to the configured Journey destination
```

The active release may omit a visible selection step when only one valid option exists. The selected option must still be shown and explained before confirmation.

The player can move backward to revise earlier choices without losing unrelated valid selections. If an earlier change invalidates a later choice, the UI must identify and clear only the affected choice and explain why it must be selected again.

## Shared screen behavior

Every step must provide:

- a clear title and short purpose;
- visible progress through the complete creation flow;
- the current selection;
- descriptions of available options and their mechanical effects;
- a clear distinction between required and optional choices;
- inline validation and recovery guidance;
- Back and Continue actions where applicable;
- access to a persistent Hero summary;
- one visually dominant primary action.

Unavailable unpublished records must not appear. A published but currently locked option may appear only when the configuration explicitly allows discovery, and it must state the unlock condition without allowing selection.

## Identity

The Identity step must provide:

- Hero name input;
- the configured name length and character rules;
- immediate validation feedback;
- an explanation that the Hero represents the player's permanent identity for the Journey;
- a visible indication of whether the name can be changed later.

Placeholder text must not be submitted as the Hero name. Leading and trailing whitespace is ignored. The player cannot continue while the name is empty or invalid.

## Race and appearance

The Race and Appearance step must present only options compatible with the active Hero configuration.

For each available Race, show:

- name and concise identity;
- relevant gameplay traits;
- body or Rig Profile compatibility when it affects visible equipment or animation support;
- any permanent consequences of the selection.

Appearance selection may include configured body presentation, face, hair, skin tone, portrait, outfit preview, or other supported visual choices. Mechanical Race selection and cosmetic appearance must remain visually distinct.

When supported, a live Hero preview should update immediately. If a 3D preview cannot be loaded, the player must receive a stable fallback image and may continue when the underlying choice remains valid.

## Class

Class selection must show only Classes included in the active release and compatible with the selected Hero configuration.

Each Class presentation must include:

- Class name and role;
- concise playstyle guidance;
- core strengths and limitations;
- Hit Die and starting Hit Point basis;
- relevant weapon and armor proficiencies;
- saving throw and skill implications when supported;
- Level 1 features and resources;
- spellcasting or other limited-resource expectations when applicable;
- required Level 1 choices that will follow;
- clear descriptions of mechanical effects.

Playstyle guidance such as strengths, limitations, or complexity must be visually separated from official or supported rules text.

Changing Class must immediately re-evaluate Ability Score guidance, mandatory choices, starting equipment, derived statistics, and compatibility. Invalid downstream selections must be explained before they are cleared.

## Ability Scores

Ability Score allocation must use one approved method exposed by the active configuration, or allow the player to choose among multiple approved methods when explicitly supported.

The step must show:

- all six Ability Scores;
- current score and calculated modifier;
- remaining points, unused values, or other method-specific state;
- Class-relevant recommendations as guidance rather than forced choices;
- the effect of changes on visible derived statistics;
- validation against method limits and supported rules.

The player cannot continue while values are duplicated, unspent, overspent, outside permitted limits, or otherwise invalid for the selected method.

## Mandatory Level 1 choices

This step is generated from the selected Race, Class, rules version, and active configuration. It may include:

- skill proficiencies;
- Weapon Mastery choices;
- Fighting Style or comparable features;
- prepared spells or cantrips;
- language, tool, or proficiency choices;
- Class-specific options;
- other required supported Level 1 decisions.

Every option must explain its gameplay effect. The UI must show selection limits, prerequisites, incompatibilities, and the number of choices remaining.

This step is omitted only when no player choice is required. Automatically granted features remain visible in the Review step.

## Starting equipment

Starting Equipment presents only approved packages or individual choices valid for the selected Race, Class, Ability Scores, and supported equipment rules.

The player must be able to inspect:

- item name and category;
- equipped slot;
- weapon or armor statistics relevant to the starting Hero;
- required hands and loadout implications;
- restrictions or incompatibilities;
- resulting visible changes to key derived statistics;
- visual preview when an approved asset is available.

Illegal equipment combinations cannot be confirmed. If only one valid starting package exists, it may be automatically selected but must still appear in Review.

## Review

Review presents the complete Hero before permanent confirmation.

At minimum, show:

- Hero name;
- Race and appearance summary;
- Class and Hero Level;
- Ability Scores and modifiers;
- starting Maximum Hit Points;
- Armor Class when supported;
- proficiencies and mandatory Level 1 choices;
- attacks, spell statistics, or other primary derived values when applicable;
- starting equipment and loadouts;
- automatically granted features;
- unresolved warnings or unavailable optional previews;
- which choices are permanent and which can be changed later.

Every section provides an Edit action that returns to the relevant step without discarding the rest of the valid draft.

## Confirmation

The final action must communicate that a permanent Hero will be created. It must not be presented as a routine Continue action.

Before confirmation:

- all mandatory choices must be complete;
- all combinations must pass validation;
- calculated values must use the active rules version;
- all referenced records must be available in the active manifest;
- the player must explicitly acknowledge permanent choices when required.

The confirmation action is disabled until the draft is valid. Validation failures must identify the affected step and provide a direct route to correct it.

## Save and completion

During save:

- creation inputs are locked against duplicate submission;
- visible progress is shown;
- the permanent Hero is committed atomically;
- retrying after an uncertain response must not create duplicate Heroes.

On success, show a brief confirmation containing the Hero name and Class, then continue to the Journey destination defined by the approved flow configuration. The destination may be a Journey introduction, Camp, or the first Dungeon Level; UX does not choose this rule.

On failure, preserve the valid draft and provide a clear retry action. The UI must distinguish recoverable save failure, invalid or outdated content, unavailable storage, and unrecoverable profile conflict.

## Draft recovery

Hero Creation may preserve an incomplete local draft so mobile interruption does not force the player to restart. A draft is not permanent Hero state and grants no progression.

When a draft is restored:

- revalidate it against the active manifest and rules version;
- preserve choices that remain valid;
- explain and clear choices that are no longer valid;
- never convert the draft into a permanent Hero without explicit confirmation.

## Required states

The UX must define and display:

- loading required Hero content;
- no valid published Hero configuration;
- one automatically selected option;
- multiple selectable options;
- locked option with an approved unlock explanation;
- incomplete required choice;
- incompatible selection;
- outdated restored draft;
- preview unavailable;
- save in progress;
- recoverable save failure;
- successful Hero creation;
- existing permanent Hero conflict.

## Mobile and accessibility requirements

- The complete flow must work in the supported portrait viewport and safe area.
- Touch targets must remain usable without precision tapping.
- Long descriptions must support scrolling without hiding the primary navigation state.
- Text scaling must not overlap selections, statistics, or actions.
- Color cannot be the only indication of selection, validity, permanence, or warning state.
- Focus order and non-touch navigation must follow the visible step order.
- Images and previews require meaningful text labels.
- Motion-heavy previews must respect reduced-motion settings when supported.
- The player must be warned before leaving with unsaved changes when draft recovery is unavailable.

## Data and authority

Content Studio and the published manifest provide concrete:

- Race and appearance options;
- Classes and descriptions;
- Hero definitions and compatibility;
- Ability Score methods and limits;
- mandatory Level 1 choices;
- equipment options and assets;
- availability and unlock presentation;
- rules and calculation-version references.

Gameplay Systems own creation behavior, validation meaning, permanence, and state transitions. Rules specifications own calculations. UX presents these results and cannot replace them with independent client-side definitions.

## Open decisions

- Whether one player profile supports one permanent Hero or multiple Journey slots.
- Which identity, Race, appearance, Class, and equipment choices can be changed later.
- The approved Hero-name policy.
- Which Ability Score allocation methods are supported.
- Whether locked future options are shown or hidden.
- Whether incomplete drafts persist across app restarts and for how long.
- The configured destination after successful Hero creation.
