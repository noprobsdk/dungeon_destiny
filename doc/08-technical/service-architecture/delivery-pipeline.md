# Delivery pipeline

## Purpose

This document describes how things reach the running game: program code, 3D
model assets, and other game content. For each, it shows the steps in order,
which part of the system performs each step, and which steps are not yet
decided.

It is part of the [service architecture](../service-architecture.md). The
detailed rules for each kind of delivery are owned by the documents linked in
each section; this document shows how they map onto the services.

There are three pipelines:

| Pipeline | What it delivers | Ends in |
|---|---|---|
| Code | Worker code, Content Studio, and Godot client and server builds | Deployed Workers, Content Studio, game servers, and app-store builds |
| 3D assets | 3D models for Heroes, enemies, and Equipment, with rigs and animations | Published R2, listed in a release manifest |
| Game content | Game metadata, such as Hero level rules, Dungeon Levels, Traits, and Quests | Published R2, listed in a release manifest |

## Code

The delivery pipeline:

- validates code and migrations;
- deploys the Workers and Content Studio;
- applies approved forward-only migrations;
- builds the Godot client and dedicated server;
- deploys compatible server versions;
- verifies environment configuration.

Cloudflare infrastructure is created with Terraform, and Worker code is
uploaded with Wrangler ([DD-016](../../12-decisions/decision-log.md)). Database
changes use forward-only numbered migrations
([DD-006](../../12-decisions/decision-log.md)). Game-server builds are deployed
independently of the client, and a server change never requires an app-store
update ([DD-012](../../12-decisions/decision-log.md)). The tools are listed in
[technology and tooling](technology.md).

Not yet decided: the pipeline itself, including whether GitHub Actions runs the
checks and deployments, and the deployment tooling for the AWS game-server host.

## 3D assets

3D model assets are the largest delivery. The pipeline and its rules are owned
by [3D production](../../06-3d-production/README.md). The pipeline is AI-based:
AI tools produce or process the files, and every file at every step is saved in
the 3D asset store with a version and a checksum
([DD-018](../../12-decisions/decision-log.md)):

`Authoring source → Validation candidate → Approved source → Runtime GLB → Godot import test → Content Studio asset record → Published manifest`

Where each step takes place:

| Step | What happens | Where |
|---|---|---|
| Authoring source | Models, rigs, skinning, and source animations are produced. The 3D production documents name Blender as authoritative for them; how the AI tools relate to Blender is not yet decided. | The 3D asset store. Source files are not stored in this repository. |
| Validation candidate | A candidate is checked against the [3D validation gates](../../06-3d-production/validation/README.md): source and license, base mesh, rest pose and rig, hands and grips, animation deformation, and Equipment compatibility. | Saved in the 3D asset store and reviewed through Content Studio. |
| Approved source | Every gate is passed and recorded with asset version, test version, reviewer, date, and evidence. | The approved source is saved in the 3D asset store; the approval is recorded through Content Studio in Content D1. |
| Runtime GLB | The approved source is exported as a runtime file that follows the [runtime GLB contract](../../06-3d-production/contracts/runtime-glb-contract.md). | Saved in the 3D asset store. |
| Godot import test | Godot imports the runtime GLB and must match the approved source (gate 7). Godot is authoritative for runtime import behaviour. Mobile performance is checked against its budget (gate 9). | Not yet decided. The test evidence is saved in the 3D asset store. |
| Content Studio asset record | The approved metadata, compatibility relations, and version are recorded and validated (gate 8). Content Studio is authoritative for them. | Content D1, through the `studio-api` Worker. |
| Published manifest | The asset is included in an immutable release. The runtime GLB is copied from the 3D asset store to published R2 with a checksum and listed in the release manifest. | Publication and Manifest, in the `studio-api` Worker. |

After publication, the game client and the game server download the same
release from published R2 through Cloudflare's CDN, using versioned names, and
check each file against its checksum.

Not yet decided: who or what exports the runtime GLB, and where the Godot import
test and the mobile performance test run.

## Game content

Game metadata follows the content lifecycle owned by the
[data model](../../07-data-model/workflow/content-lifecycle.md):

`Draft → Review → Locked → Published → Retired`

1. Staff create and edit Draft records in Content Studio. They are stored in
   Content D1 through the `studio-api` Worker.
2. Validation and Workflow checks the records and records review and approval.
3. Approved records are locked.
4. Publication and Manifest composes an immutable release, writes its manifest
   to published R2, and records it in Content D1.
5. The game client and the game server use the same release version for each
   session.

A published record is never changed in place. A correction creates a new
version and a new release.

3D asset records and game content are published together in the same release
manifest.
