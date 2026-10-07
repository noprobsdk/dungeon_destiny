# Service architecture

## Purpose

This document defines the logical services and initial deployment boundaries required to support Dungeon Destiny.

It describes technical capabilities rather than player journeys, gameplay loops, screen flows, or concrete content.

Dungeon Destiny is an online-only mobile and tablet game. The game client requires an authenticated network connection to start and participate in an active game session.

## Architecture principles

- Content Studio and the game client use separate authorization models.
- Cloudflare Access protects Content Studio administrators.
- Player Identity authenticates game players.
- The client is not authoritative for gameplay, rewards, eligibility, or permanent progression.
- Published game content is immutable and versioned.
- Active gameplay executes on an authoritative Godot server.
- Persistent content and player data are separated.
- Live coordination state is not stored as ordinary content records.
- Logical service boundaries do not require one deployment per service.
- Infrastructure products must remain replaceable behind stable service contracts.

## Parts

The service architecture is described in these documents:

| Document | Describes |
|---|---|
| [Initial deployment model](service-architecture/deployment-model.md) | The parts that make up the services, the domain Workers, and how the parts fit together. |
| [Technology and tooling](service-architecture/technology.md) | The languages and tools used to build and deploy the services. |
| [Frontends](service-architecture/frontends.md) | Content Studio and the Godot game client, and which backend each talks to. |
| [Delivery pipeline](service-architecture/delivery-pipeline.md) | How code, 3D assets, and game content reach the running game. |
| [Access and edge services](service-architecture/access-and-edge.md) | Cloudflare Access, Player Identity, and the API Gateway. |
| [Application services](service-architecture/application-services.md) | Each application service, its responsibilities, and its Worker. |
| [Game runtime](service-architecture/game-runtime.md) | The game servers, the realtime connection, and the result of a run. |
| [Data services](service-architecture/data-services.md) | The databases, Durable Objects, the 3D asset store, and R2 storage, with their owners. |
| [Operations](service-architecture/operations.md) | Background jobs and the logs every service must produce. |
| [Game-server platform](service-architecture/game-server-platform.md) | How the game servers are hosted, and why Kubernetes is not used at first. |

## Not required initially

The initial architecture does not require:

- Kubernetes;
- one deployment per logical service;
- a service mesh;
- public random matchmaking;
- voice chat;
- text chat;
- guilds or clans;
- independent regional player databases;
- a separate commercial API-gateway product.

These capabilities require separate approved requirements before implementation.

## Open technical decisions

The following decisions remain open. Each is tracked in
[`doc/todo.md`](../todo.md).

- regional allocation strategy;
- reconnect grace period;
- crash-recovery checkpoints: interval, contents, storage, and recovery ownership ([DD-014](../12-decisions/decision-log.md));
- game-server resilience: failover, a second host, and scaling;
- queue introduction threshold;
- D1 partitioning threshold;
- production observability provider;
- notification delivery requirements;
- Worker secret management for each environment;
- CI/CD tooling;
- deployment tooling for the AWS game-server host;
- runtime GLB export in the 3D pipeline;
- where the Godot import test and the mobile performance test run;
- which AI tools the 3D pipeline uses, and how they relate to Blender and the 3D contracts.
