# Hero states

## Real-time behavior

The Hero moves in real time, automatically selects a valid target, and automatically attempts supported attacks. The HUD shows the active target, attack range, danger telegraphs, Hero health, and Tactical Pause state.

## Hero use of Character Modes

The Hero follows the shared [Character Modes](character-modes.md) contract.

This specification defines the Hero-specific targeting, automatic attack, weapon presentation, Threat Source consumption, and transition behavior layered on top of that common contract.

Threat Source activation and resolution are defined by the separate [Threat Sources](threat-sources.md) system. Hero state evaluation consumes the set of active Threat Sources but does not define their individual behavior.

### Peace Mode

Peace Mode is active when no unresolved Threat Source presents an immediate or actively developing danger to the Hero or a protected objective.

- The Hero uses exploration Idle and locomotion.
- The active weapon is stowed, lowered, or carried in its configured non-combat presentation.
- The Hero does not maintain an attack-ready pose.
- A detected but inactive danger, such as a discovered trap that has not been triggered, can display a warning without ending Peace Mode.
- The absence of an `active_target` alone is not sufficient to enter Peace Mode while another active Threat Source remains unresolved.

### Threat Mode

Threat Mode is active while one or more unresolved Threat Sources present an immediate or actively developing danger.

- The Hero uses combat-ready Idle and locomotion.
- The active weapon is presented according to its Animation Set, weapon socket, and Grip Profile.
- A bow is held ready but is not continuously drawn; drawing, aiming, releasing, and recovering belong to the attack action.
- The Hero can select or change `active_target` and automatically attempt supported attacks when target validity, range, line-of-sight, timing, and resource rules permit.
- Threat Mode can remain active without an `active_target` when the danger is not a targetable creature or object.

`active_target` identifies the Hero's currently selected attack target. Threat Mode represents the broader danger state and can remain active during a brief loss of target visibility, a target change, or an active non-targetable danger.

## Weapon configuration and animation presentation

Every equippable Weapon Configuration must reference a compatible Animation Set.

The Animation Set defines the weapon-specific presentation required by the Hero, including:

- the transition from exploration presentation to combat-ready presentation;
- Threat Idle;
- Threat locomotion;
- attack preparation;
- attack execution;
- attack recovery;
- weapon swapping;
- the transition back to the exploration presentation.

When the Hero changes from Peace Mode to Threat Mode:

1. The equipped Primary Weapon Configuration becomes active.
2. The corresponding weapon is attached to, or retained on, its configured active weapon socket.
3. The Hero performs the weapon configuration's ready, draw, equip, or equivalent transition.
4. The runtime activates the Animation Set referenced by the active Weapon Configuration.
5. Threat Idle, Threat locomotion, and Attack actions use animations from that Animation Set.

The active Weapon Configuration determines the required weapon socket, Grip Profile, Animation Set, attack timing, execution point, and recovery behavior.

Weapon behavior must not depend on hardcoded animation names or assumptions about a specific weapon type.

Multiple Weapon Configurations may reference the same Animation Set when their grip, locomotion, and attack behavior are compatible. A Weapon Configuration that requires different handling must reference a different Animation Set.

If the active weapon changes during Threat Mode, the Hero performs the configured weapon-swap transition. Once the swap reaches its configured transition point:

- the new weapon becomes the active Weapon Configuration;
- the weapon attachment and Grip Profile are updated;
- the runtime activates the new weapon's referenced Animation Set;
- subsequent Threat and Attack animations use the new Animation Set.

When Threat Mode ends, the active Weapon Configuration determines the lower, sheathe, stow, or equivalent transition. The Hero then returns to the configured exploration Animation Set.

## Attack behavior during Threat Mode

Threat Mode permits the Hero to attack, but it does not guarantee that an attack is continuously performed.

The Hero attempts an attack only when all required attack conditions are satisfied:

- an attack-capable weapon, ability, or spell is available;
- a valid `active_target` exists;
- the target is within the permitted attack range;
- required line-of-sight or path conditions are satisfied;
- the attack is not blocked by cooldown, recovery, ammunition, resource, or status-effect rules;
- the Hero is not performing another action that prevents the attack.

An automatic attack follows this sequence:

1. **Target validation:** Confirm that `active_target` remains alive, targetable, reachable, and otherwise valid.
2. **Attack preparation:** Enter the weapon's configured ready, draw, wind-up, aim, or casting presentation.
3. **Attack execution:** Perform the configured attack animation and create the corresponding hit, projectile, spell, or area effect at its defined execution point.
4. **Recovery:** Complete the weapon's configured recovery period before another attack can begin.
5. **Threat reevaluation:** Validate the current target and all active Threat Sources before selecting the next action.

Threat Mode does not force the Hero to attack a non-targetable Threat Source. If danger remains but no valid target exists, the Hero stays combat-ready without performing an attack.

When `active_target` becomes invalid or is defeated, the Hero attempts to select another valid target according to the targeting rules. The Hero remains in Threat Mode while any unresolved Threat Source exists.

After an attack or recovery completes:

- the Hero returns to Threat Idle or Threat locomotion when danger remains;
- the Hero can begin another attack when its conditions are satisfied;
- the Hero returns to Peace Mode only when all Threat Sources are resolved and the configured grace period has completed.

Attack animations must match the active Weapon Configuration's Animation Set, weapon socket, and Grip Profile. The Animation Set defines the semantic preparation, execution, impact or release, and recovery phases required by that weapon configuration.

## Temporary actions and reactions

Attack, ability, Hit, stagger, interaction, and similar animations temporarily override the active Peace or Threat presentation. When the temporary action resolves, the Hero returns to the correct mode based on the latest threat evaluation.

## Defeated state

When the Hero is defeated, movement, targeting, and attacks stop. The configured defeat or Death animation must resolve before the final results presentation obscures the Hero, unless an explicit gameplay rule requires an immediate transition.

## State transitions

- Peace Mode changes immediately to Threat Mode when at least one Threat Source becomes active.
- The Hero remains in Threat Mode while an unresolved Threat Source exists.
- Attack, Hit, ability, and recovery actions must finish or be safely interrupted before the Hero returns to the Peace presentation.
- Threat Mode changes to Peace Mode only after all Threat Sources are resolved and a short grace period has completed.
- The grace period prevents rapid visual switching when line-of-sight, target selection, or short-lived hazards fluctuate.
- Changing or losing `active_target` does not end Threat Mode while another Threat Source remains active.
- Tactical Pause freezes the current state and its animation-driven gameplay progression; it does not itself change Peace Mode or Threat Mode.
- Threat detection, source duration, disengagement conditions, and grace-period values may be configured through Content Studio within the constraints of this state model.
