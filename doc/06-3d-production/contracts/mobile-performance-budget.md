# Mobile performance budget

Every release must approve measured budgets for:

- triangles and vertices per visible character;
- deform bones and weighted influences per vertex;
- materials and draw calls;
- texture dimensions, formats, and memory;
- animation memory and clip count;
- simultaneous characters;
- CPU skinning/animation cost where applicable;
- GPU frame time and total memory on target Android devices.

No fixed budget is approved merely by assumption. Candidate limits must be measured in the actual Godot gameplay scene and recorded per target device tier.
