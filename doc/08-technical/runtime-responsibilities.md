# Runtime responsibilities

Godot is responsible for:

- loading and validating the published release manifest;
- maintaining player and active-attempt state;
- running combat, Tactical Pause, Trait hooks, targeting, collisions, navigation, and animation state;
- resolving asset and compatibility references supplied by Content Studio;
- rejecting incomplete runtime compositions rather than inventing fallbacks that alter game rules.

Content Studio is not contacted during active dungeon gameplay. The game uses a validated local cache.
