# Grip Profile contract

A Grip Profile connects one Rig Profile to one weapon family.

It defines:

- hand and weapon socket;
- reference handle dimensions;
- weapon pivot and orientation;
- finger pose/action;
- thumb opposition;
- allowed clearance and penetration tolerance;
- compatible Animation Sets;
- standardized validation renders.

Initial required profile: `1h_29mm` for a 29 mm diameter reference handle. Contact alone is insufficient; finger lanes, continuous curl, self-collision, palm contact, and motion stability must pass.

The required division of responsibility is: socket and grip axis live in the Body Base GLB, weapon pivot/orientation/scale live in the weapon GLB, the finger pose/action lives in the animation asset, and the runtime composes them at identity with no per-weapon constants. Historical POC evidence for the first attempted instance remains in the legacy repository and is not approval evidence for this implementation.
