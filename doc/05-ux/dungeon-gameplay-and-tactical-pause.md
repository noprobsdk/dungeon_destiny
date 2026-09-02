# Dungeon gameplay and Tactical Pause UX

The gameplay HUD must show Hero health, Stage progress, target, attack range, danger telegraphs, and Tactical Pause state.

## Tactical Pause button

- Hidden or visibly locked before its DL 2 unlock condition.
- Shows recharge progress and readiness.
- Provides accessible feedback when accelerated by the Struggle Meter.
- Cannot be activated when the game is already in a modal or invalid transition state.

## Pause overlay

When active, the overlay must clearly communicate that world time is frozen. It exposes only available actions and explains unavailable actions. Weapon changes update the range preview immediately. Targeting templates display validity before confirmation.

Resuming play shows queued actions in their deterministic execution order. Cancel must return to the exact pre-pause gameplay state without spending resources.
