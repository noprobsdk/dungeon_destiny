# Parties and Quest sessions

## Purpose

The Party and Quest system defines how multiple players assemble for a cooperative activity, how the game determines which Quest Levels the assembled group may attempt, and how one authoritative online Quest Session begins and ends.

Dungeon Destiny is online-only. A Quest cannot be started from local state alone, and the client is never authoritative for Party membership, Quest eligibility, Quest results, rewards, or progression.

## Concepts and boundaries

- A **Party** is a temporary group of players assembled for exactly one cooperative Quest attempt.
- A **Saved Party** or **Recent Party** is only a reusable invitation template.
- A **Quest** is a selectable cooperative activity that exists outside the solo Journey.
- **Quest Level** expresses the Quest's configured challenge and eligibility level. It is not Hero Level and is not the sequential Dungeon Level number.
- A **Quest Session** is the authoritative online runtime instance for one Party's attempt.

The Journey, Dungeon Arc, Dungeon Level, Stage, and Encounter hierarchy defines solo play. The Party and Quest system is a separate cooperative structure. A Quest does not belong to a Journey and must not inherit Journey completion, unlocking, failure, reward, or persistence rules unless a later specification explicitly defines such a relationship.

## Party lifecycle

```text
Draft
→ Inviting
→ Ready
→ In Quest
→ Completed, Failed, or Abandoned
→ Dissolved
```

### Draft

Before creating a Party, the owner must select the permanent Hero they intend to use. The new Party membership records both the owner's Account identity and selected Hero.

The owner then creates a new Party or starts from a Saved or Recent Party. Starting from an earlier Party copies only the proposed Account invitation list. It never reuses the Heroes selected for an earlier Quest attempt.

### Inviting

The owner sends invitations to players at the Account Layer. Previous participation never grants automatic membership in a later Party.

Before accepting and joining the Party, each invited player must select the permanent Hero they intend to use. Party membership therefore identifies both the participating Account and Hero:

`account_id + hero_id`

A player may leave or decline before the ready check, and the owner may invite a replacement. If a participating player changes Hero while the Party is assembling, the authoritative service must revalidate the Party composition and recalculate Quest eligibility before the Party can become Ready.

### Eligibility and Quest selection

The authoritative service evaluates the full accepted Party composition and determines which Quest Levels the Party is allowed to play. The UI must not infer or override this result locally.

The detailed calculation is deliberately deferred. It may later consider factors including:

- participating Hero Levels;
- Party size;
- Hero roles or capabilities;
- differences between the lowest- and highest-level Heroes;
- Quest-specific access requirements;
- progression or story prerequisites.

Until that design is approved, implementations must expose eligibility as a replaceable server-owned rule rather than embedding one permanent formula in the client.

After eligibility has been evaluated, the Party selects one available Quest and every accepted member completes a ready check.

### In Quest

The server creates exactly one Quest Session from the approved Party, selected Heroes, selected Quest, Quest Level, and published content release. Membership and content version are pinned for that attempt unless an explicit reconnect or replacement rule allows otherwise.

The Quest Session owns the authoritative gameplay state and outcome. Clients send player intentions and render replicated state; they do not decide damage, enemy state, objectives, rewards, or completion.

### Resolution and dissolution

The Quest Session ends as completed, failed, or abandoned. The server resolves the approved Quest outcome and closes the session. The active Party is then dissolved regardless of the result.

The Party owner may retain the proposed member list as a Saved or Recent Party. Selecting **Invite Again** creates a new active Party and sends fresh invitations; it does not reopen the previous Party or Quest Session.

## Required invariants

- A valid Party must exist before a Quest Session can be created.
- A Hero must be selected before a player can create or join an active Party.
- One active Party can start no more than one Quest Session.
- One Quest Session executes exactly one Quest attempt.
- Only accepted Party members who pass Hero and Quest eligibility validation may enter the session.
- Quest eligibility is calculated from authoritative Party and Hero data.
- Reusing a Party always requires new invitations and acceptance.
- An active Party is dissolved after completion, failure, abandonment, or cancellation.
- Saved Party data cannot contain live ready state, active invitations, session authority, or uncommitted rewards.
- All permanent progression and rewards are committed by the authoritative service, never by a client.

## Design decisions still open

The following are intentionally not fixed by this specification:

- the maximum Party size;
- the minimum Party size;
- the exact Party-composition-to-Quest-Level calculation;
- whether Quest eligibility uses minimum, average, highest, or another Hero Level measure;
- level scaling, mentoring, or handicap rules;
- reconnect grace periods and disconnected-player behavior;
- Party leadership transfer;
- cooperative Tactical Pause behavior;
- the Quest's internal gameplay structure;
- whether Quest systems reuse selected Stage or Encounter mechanics without becoming part of the Journey hierarchy;
- how Quest outcomes relate to permanent Hero progression and rewards.
