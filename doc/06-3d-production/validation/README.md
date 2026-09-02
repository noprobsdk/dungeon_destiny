# 3D validation gates

| Gate | Requirement |
|---|---|
| 1. Source and license | Traceable source, license, authoring file, and checksum. |
| 2. Base mesh | Approved topology, scale, silhouette, materials, and performance candidate. |
| 3. Rest pose and rig | Correct Rig Profile, rest pose, axes, weights, and sockets. |
| 4. Hands and grips | Open, fist, isolated joints, and required weapon grips. |
| 5. Animation deformation | Required clips pass joints, hands, shoulders, feet, and equipment review. |
| 6. Equipment compatibility | Every included combination passes clipping and deformation tests. |
| 7. Godot runtime | Runtime GLB matches approved source behavior. |
| 8. Content Studio | Metadata and compatibility validation prevent invalid publication. |
| 9. Mobile performance | Target Android device budgets and scene FPS pass. |

A failed gate blocks `READY` status. Every pass records asset version, test version, reviewer, date, and evidence paths.
