# Tactical Pause test plan

Required tests include:

- complete world freeze for actors, telegraphs, projectiles, hazards, and gameplay clocks;
- UI remains responsive;
- recharge and Struggle Meter modifiers are deterministic;
- weapon swap updates range, attack, animation, and Grip Profile atomically;
- queued actions validate resource cost, range, line-of-sight, and target state;
- cancel spends no resource and restores exact state;
- confirm commits resources exactly once;
- pause/resume does not duplicate animation events or damage;
- save interruption cannot preserve an invalid partial transaction.
