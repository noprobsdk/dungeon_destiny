# Equipment contract

## Rigid equipment

Weapons, shields, and rigid accessories attach to named sockets with approved pivots, scale, orientation, collision, and Grip Profiles.

The implemented socket convention: sockets are named empties (`weapon_socket_r`, `weapon_socket_l`), bone-parented to the hand bone at a calibrated transform and baked into the Body Base's own GLB. Equipment maps to a socket via `equipment_allowed_slots.attachment_socket`. The weapon GLB carries its own half of the calibration — grip pivot at the origin, blade along local +Z, socket-relative orientation and scale baked into its root anchor node — so the runtime mounts weapons at pure identity. Per-weapon rotation or scale constants in runtime code are not permitted; a weapon that needs one has an invalid pivot and must be fixed at the asset level.

## Skinned equipment

Clothing, armor, gloves, and boots require an explicit Body Base and Rig Profile compatibility declaration. They must use compatible bind pose, vertex order requirements where applicable, skin weights, deformation topology, and hide regions.

An item compatible with Human Male is not automatically compatible with Human Female, Human Skeleton, Dwarf, Minotaur, or Giant. Content Studio exposes only validated variants or declared fallbacks.
