# 3D strategy

## Composition model

A Runtime Character is assembled from independent, compatible components.

```text
Runtime Character
├── Base Body
│   ├── Body Archetype
│   ├── visible body model
│   ├── Appearance
│   └── Rig Profile reference
├── Rig Profile
│   ├── bone hierarchy and rest pose
│   ├── hand and finger chains
│   └── named attachment sockets
├── Equipment Configuration
│   ├── Weapon Configuration
│   │   ├── Main Hand Equipment
│   │   ├── Off Hand Equipment
│   │   ├── Weapon Type
│   │   └── Off-hand Type
│   ├── worn Equipment
│   ├── physical attachment requirements
│   └── Grip Profile requirements
└── Animation Resolution
    ├── Rig Profile
    ├── active Character Mode
    ├── Weapon Type
    └── Off-hand Type
        ↓
        Compatible Animation Set
```

The compact composition formula is:

```text
Runtime Character
= Base Body
+ Rig Profile
+ Appearance
+ Equipment Configuration
+ resolved Animation Set
```

Main Hand and Off Hand are logical Equipment Slots. They are not bone or socket names.

A two-handed weapon is selected in Main Hand, reserves Off Hand, and derives `support_weapon` as its Off-hand Type.

Physical placement is controlled separately by validated attachment sockets. A logical Main Hand item may therefore attach to either physical hand when required by the weapon and Animation Set.

## Reuse rule

Compatible humanoids share:

- hierarchy and exact bone names;
- rest pose, joint axes, and coordinate system;
- three deform bones per finger when the profile supports visible weapon handling;
- socket names and orientations;
- animation-role contract;
- export scale and forward/up axes.

They do not need to share:

- visible mesh;
- topology;
- skin weights;
- materials or Appearance;
- body proportions;
- Equipment variants.

Sharing a Rig Profile enables compatible Animation Sets and attachment-socket conventions to be reused.

It does not automatically make every Equipment asset compatible with every Base Body.

## Animation reuse

Animation Sets are resolved for one compatibility combination:

```text
Rig Profile
+ Character Mode
+ Weapon Type
+ Off-hand Type
+ optional Variant
```

Base Bodies that share a validated Rig Profile may reuse compatible Animation Sets.

Different Rig Profiles, such as Medium Humanoid and Dwarf Humanoid, require separate Animation Sets unless an explicit retargeting and validation process approves reuse.

## Initial target family

`humanoid-medium-65` is the target reusable family for Medium Human Heroes and compatible humanoid enemies such as Human Skeleton.

Minotaur and Giant assets use dedicated Rig Profiles when their anatomy, proportions, sockets, or animation requirements are incompatible.
