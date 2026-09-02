# Hands and grips

Required validation sequence:

1. rest-pose hand;
2. isolated joint-axis sweeps;
3. open hand;
4. fist;
5. Ø29 mm reference-cylinder grip;
6. actual one-handed weapon;
7. Idle, Walk, Run, and Attack stability;
8. Blender/Godot comparison.

The detailed historical investigation and its POC-specific candidates remain in the legacy repository. No historical candidate is automatically approved for the clean implementation.

Judging rule learned the hard way during that pass: never evaluate a grip or weapon alignment from a single (or auto-rotating) camera. A blade ~90° off the fist's true grip axis read as correct from the front and only failed from a top-down view. Fixed cameras at 0/90/180/270° plus a top-down hand close-up, across several loop frames, are the minimum; where possible measure against geometry (the knuckle row is the grip-cylinder axis) instead of judging by eye.
