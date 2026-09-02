# Coordinate, scale, and orientation contract

Every asset profile must define Blender units, real-world height, origin, forward axis, up axis, rest pose, hand orientation, ground plane, and export transform policy.

Transforms must be applied before final skinning/export according to the approved profile. Runtime scale correction is not a substitute for a valid source asset.

Standard validation uses front, side, and top views plus a Godot test scene with a known scale reference.
