# 3D production

3D production is a project-blocking workstream, not a subsection of general visual design.

The objective is a validated asset family in which compatible humanoids share a Rig Profile, animation roles, sockets, and weapon contracts while retaining separate Body Base meshes and skin weights.

## Start here

- [Project-blocking risks](00-project-blocking-risks.md)
- [3D strategy](01-3d-strategy.md)
- [Go/no-go plan](02-go-no-go-plan.md)
- [Fallback strategies](04-fallback-strategies.md)
- [Validation gates](validation/README.md)

All 3D files, from source files to runtime GLBs and test evidence, are saved in the 3D asset store, with a version and a checksum for every file. The 3D pipeline is AI-based: AI tools produce or process the files, and every file they produce is saved there. Which AI tools are used, for which steps, and how they relate to Blender and the 3D contracts are not yet decided. See [DD-018](../12-decisions/decision-log.md) and the [delivery pipeline](../08-technical/service-architecture/delivery-pipeline.md#3d-assets).

Documentation records contracts, status, evidence, and decisions; Content Studio records approved runtime asset metadata.
