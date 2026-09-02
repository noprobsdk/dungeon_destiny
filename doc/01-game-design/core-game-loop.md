# Core game loop

## Top-level play structures

Dungeon Destiny has two separate top-level play structures:

- **Solo Journey:** the permanent Hero's individual story and progression through Dungeon Arcs and Dungeon Levels.
- **Cooperative Quest:** a separate online activity attempted by a temporary Party. A Quest is not part of a Journey and does not inherit Journey progression rules automatically.

## Solo Journey loop hierarchy

The solo Journey is structured as a set of nested gameplay loops:

**Journey → Dungeon Arc → Dungeon Level → Stage → Encounter**

- A **Journey** connects multiple Dungeon Arcs into the Hero's larger adventure.
- A **Dungeon Arc** provides one coherent mission, story, destination, visual identity, enemy ecosystem, and tactical theme.
- A **Dungeon Level** is one major step toward completing the Dungeon Arc.
- A **Stage** is a sequence of combat and progression inside a Dungeon Level.
- An **Encounter** is the immediate combat challenge presented to the player.

The recommended default is for one Dungeon Arc to span approximately ten Dungeon Levels. The exact number and sequence are configured in Content Studio.

## Journey loop

1. Create a permanent Hero when starting a new Journey, or continue with the existing Hero.
2. Enter a Dungeon Arc with a clear mission and destination.
3. Complete the Dungeon Arc and resolve its story consequences.
4. Return to the wider Journey with new knowledge, equipment, abilities, or access.
5. Choose or unlock the next Dungeon Arc.
6. Continue until the Journey's central conflict is resolved.

The Journey provides long-term direction across multiple Dungeon Arcs while allowing each Arc to have its own identity and tactical focus.

## Dungeon Arc loop

1. Receive a mission with a clear long-term objective.
2. Enter the first Dungeon Level connected to the mission.
3. Descend through the Dungeon Arc while discovering story clues, locations, enemies, and tactical variations.
4. Complete each Dungeon Level and return to Camp to prepare for the next descent.
5. Reach the Dungeon Arc's final location and confront its climax or Arc Boss.
6. Secure the relic, rescue the target, defeat the threat, or complete the Arc's defined objective.
7. Resolve the Dungeon Arc's story consequences and unlock the next Dungeon Arc.

This loop gives individual Dungeon Levels a shared purpose. The player is not only completing isolated runs but progressing toward a visible story destination.

## Dungeon Level loop

1. Load the active Dungeon Level from the published release manifest.
2. Enter the Dungeon Level and begin an attempt.
3. Move, position, avoid threats, and allow the Hero to perform supported automatic attacks.
4. Use Tactical Pause when charged to assess the battlefield and perform available tactical actions.
5. Complete an eligible non-final Stage and select one of three generated Trait choices when Traits are enabled.
6. Continue through increasingly difficult ordered Stages.
7. Defeat the Dungeon Level's final Boss.
8. Enter the Exit Portal.
9. Commit permanent DL XP and other approved rewards; discard temporary Traits and run state.
10. Permanently close the completed Dungeon Level and unlock the next configured Dungeon Level.

Death or manual exit before the Exit Portal fails the attempt. Pending rewards and temporary Traits are lost; previously committed Hero state remains safe.

## Separate cooperative Quest loop

The cooperative Quest loop is outside the solo Journey hierarchy:

1. Create a new Party or choose a Saved or Recent Party as an invitation template.
2. Invite the intended players. Reusing a Party never adds previous members automatically; every player must accept a new invitation.
3. Each accepted player selects an eligible Hero.
4. Evaluate the complete Party composition and expose only the Quest Levels that this Party is permitted to attempt.
5. Select one available Quest and complete the Party ready check.
6. Create one authoritative online Quest Session and begin the cooperative activity.
7. Resolve the Quest as completed, failed, or abandoned and apply only server-approved outcomes.
8. Close the Quest Session and dissolve the active Party.
9. Optionally retain its proposed member list as a Saved or Recent Party so the owner can use **Invite Again** later.

An active Party exists for exactly one Quest attempt. Party composition determines which Quest Levels can be played. The exact eligibility calculation, Quest gameplay loop, reward relationship, and any interaction with permanent Hero progression require separate design decisions.
