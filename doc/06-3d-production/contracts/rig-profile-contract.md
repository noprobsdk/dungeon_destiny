# Rig Profile contract

A Rig Profile is a versioned compatibility boundary containing:

- exact hierarchy and bone names;
- deform/non-deform status;
- rest-pose transforms;
- joint locations, local axes, and bone roll;
- required hand and finger chains;
- socket names and orientations;
- supported Animation Sets and retargeting policy;
- compatible Body Bases and Equipment variants;
- export profile and version.

Two meshes sharing similar names are not compatible unless they pass the same profile validation. Changing rest pose, hierarchy, joint axes, or bind matrices requires a new Rig Profile version.
