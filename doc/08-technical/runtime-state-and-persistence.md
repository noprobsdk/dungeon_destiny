# Runtime state and persistence

## Permanent state

Hero identity, Hero XP, Hero Level, completed Dungeon Levels, committed rewards, and approved permanent choices survive application restarts.

## Attempt state

The active Trait Pool, selected Traits, current Stage, Tactical Pause charge, pending rewards, temporary effects, and queued actions belong to the current attempt.

Attempt state must never overwrite permanent Hero data. Completion is committed atomically after the Exit Portal. Death, manual exit, or interrupted-attempt failure restores the protected pre-run state.

## Party and Quest Session state

Active Parties, invitations, accepted members, selected Heroes, ready state, calculated Quest eligibility, and the active Quest Session are online authoritative state.

An active Party is temporary and is dissolved after its Quest completes, fails, is abandoned, or is cancelled. A Saved or Recent Party may retain an owner and proposed invitation list, but it must not retain live membership, acceptance, ready state, or Quest Session authority. Reusing it creates a new Party and requires new invitations.

Quest Session state is pinned to the selected Quest, Quest Level, accepted Party composition, selected Heroes, and published content version for that attempt. Clients may cache replicated state for presentation and recovery, but cached client data cannot authorize membership, determine eligibility, or commit results.

## Tactical Pause state

Pause entry captures the deterministic world state. Queued actions and resource reservations are transaction-like: cancel releases reservations; confirmation revalidates and commits each action exactly once.
