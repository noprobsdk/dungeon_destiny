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

## Initial deployment model

The initial architecture consists of:

1. one modular Cloudflare Worker;
2. Cloudflare Access for Content Studio;
3. one external Player Identity integration;
4. one Content D1 database;
5. one Player D1 database;
6. Durable Objects for live coordination;
7. private and published R2 storage;
8. one session allocator;
9. one pool of authoritative Godot dedicated servers;
10. shared logging, metrics, and audit events.

Cloudflare Queue is introduced when publication, validation, or result processing requires asynchronous execution or retries.

The logical services inside the modular Worker may later become independent deployments without changing their public contracts.

## Clients and tools

### Content Studio

Content Studio is the internal authoring client.

It can:

- manage Draft content;
- execute validation workflows;
- record review and approval evidence;
- publish immutable releases;
- upload asset metadata and approved files;
- look up any content and player data and apply approved player-data corrections through its customer-service page.

Content Studio communicates through protected administration APIs. It must not connect directly to production databases or modify Published records in place.

### Godot game client

The Godot client:

- authenticates the player;
- synchronizes the compatible runtime manifest;
- downloads and validates published assets;
- maintains the realtime connection;
- sends player intentions;
- renders replicated authoritative state.

The client cannot:

- calculate permanent rewards authoritatively;
- approve session results;
- create unsupported content relationships;
- write directly to D1;
- access private R2 objects;
- become the source of truth for active gameplay.

### CI/CD

The delivery pipeline:

- validates code and migrations;
- deploys the Worker and Content Studio;
- applies approved forward-only migrations;
- builds the Godot client and dedicated server;
- deploys compatible server versions;
- verifies environment configuration.

## Access and edge services

### Cloudflare Access

Cloudflare Access protects:

- Content Studio;
- administration routes;
- upload routes;
- validation and publication operations;
- customer-service lookup and correction routes.

Cloudflare Access is not the player-login system.

### Player Identity

Player Identity provides:

- player registration or account linking;
- login;
- secure tokens;
- account recovery;
- identity-provider integration;
- token validation information for the API Gateway.

The concrete identity provider remains an implementation decision.

### API Gateway

The API Gateway is the single public API entry point.

It provides:

- route dispatch;
- token validation;
- authorization;
- request validation;
- rate limiting;
- correlation identifiers;
- consistent error responses;
- API-version enforcement.

The gateway routes requests to logical application-service modules. It must not contain gameplay rules itself.

## Application services

The initial application services are logical modules within one Cloudflare Worker.

### Content Administration

Owns authoring operations for concrete database records managed through Content Studio.

It enforces Draft-only editing and delegates lifecycle decisions to Validation and Workflow.

### Customer Support

Owns the protected API used by the Content Studio customer-service page.

It provides:

- lookup of content and player data;
- approved player-data corrections;
- support-role authorization;
- an audit event for every lookup and correction.

It holds no player data of its own. It reads and changes data only through the owning services, such as Player and Hero, Friends and Social, and Results and Progression, and cannot bypass their rules. The allowed correction operations require separate approval before implementation.

### Validation and Workflow

Owns:

- lifecycle transitions;
- validation results;
- required evidence;
- review state;
- approval eligibility;
- locking;
- retirement.

It enforces:

```text
Draft → Review → Locked → Published → Retired
```

It cannot bypass approved gameplay, data-model, or 3D-production contracts.

### Publication and Manifest

Owns:

- release composition;
- compatibility validation;
- immutable manifest generation;
- checksums;
- publication identifiers;
- publication audit records;
- promotion of approved assets to published storage.

Published releases are never modified in place.

### Runtime Content Catalog

Provides read-only access to:

- the current compatible release;
- immutable manifests;
- published configuration;
- content and asset version references;
- checksums and compatibility metadata.

The game client and authoritative server consume the same release version for an active session.

### Player and Hero

Owns persistent player-controlled records, including:

- player profile;
- permanent Heroes;
- Hero Level and XP;
- permanent choices;
- inventory and equipment references;
- completed progression;
- committed rewards.

It does not own active combat or temporary attempt state.

### Friends and Social

Owns:

- friend relationships;
- incoming and outgoing friend requests;
- blocking relationships;
- privacy rules;
- online-presence visibility;
- reusable social references.

Live connection presence may be coordinated through Durable Objects, while the permanent relationship is stored in Player D1.

### Party Coordination API

Owns the API contract for temporary group coordination.

It delegates live mutable state to Durable Objects and provides:

- creation;
- invitations;
- acceptance and decline;
- member removal;
- selected-character references;
- readiness;
- cancellation;
- dissolution;
- reusable invitation-list references.

It does not execute gameplay simulation.

### Quest Catalog and Eligibility

Owns:

- access to published Quest definitions;
- server-side eligibility evaluation;
- allowed Quest Levels for the accepted group composition;
- access and progression prerequisites;
- a versioned eligibility result.

The exact eligibility formula is defined by Gameplay Systems and configuration rules, not by the client.

### Session Orchestrator

Owns the transition from an approved ready group to an authoritative game session.

It provides:

- session creation;
- release-version pinning;
- server-build compatibility validation;
- regional allocation;
- signed connection tickets;
- session identifiers;
- reconnect routing;
- session termination coordination.

It does not run frame-by-frame gameplay.

### Results and Progression

Receives validated outcomes only from trusted authoritative servers.

It provides:

- result validation;
- idempotent result processing;
- permanent reward commitment;
- progression updates;
- audit records;
- rejection of duplicate or invalid submissions.

The game client cannot call privileged result-commit operations directly.

## Authoritative game runtime

### Realtime connection

The realtime transport carries:

- player intentions;
- authoritative state snapshots;
- gameplay events;
- connection health;
- reconnect coordination.

The final transport protocol must be selected through latency, mobile-network, and gameplay testing.

### Godot dedicated-server pool

The dedicated-server pool runs exported headless Godot server builds.

Each allocated server instance owns the active simulation for its assigned sessions, including:

- movement;
- navigation;
- targeting;
- enemy behavior;
- combat resolution;
- collisions;
- Tactical Pause;
- active Traits;
- temporary effects;
- pending rewards;
- attempt completion and failure.

The server consumes the same immutable content release used by connected clients.

### Validated session result

At session termination, the authoritative server creates one signed or otherwise trusted result containing:

- session identity;
- player and Hero identities;
- content-release version;
- completion status;
- approved rewards;
- progression effects;
- idempotency identifier.

The Results and Progression service validates and commits this result.

## Data services

### Content D1

Content D1 stores:

- concrete game content;
- content versions;
- configuration relationships;
- workflow and approval state;
- publication membership;
- manifest metadata;
- asset references.

It does not store active player sessions or frame-by-frame gameplay state.

### Player D1

Player D1 stores:

- player accounts;
- identity mappings;
- Heroes;
- friend relationships;
- reusable invitation lists;
- permanent progression;
- committed rewards;
- session-result records.

It does not store high-frequency realtime simulation state.

### Durable Objects

Durable Objects coordinate live state requiring one consistent owner, including:

- active membership;
- invitations;
- selected Heroes;
- readiness;
- presence;
- session coordination;
- reconnect information.

One Durable Object should represent one active coordination unit. Durable Objects do not replace authoritative Godot combat simulation.

### Private R2

Private R2 stores:

- source uploads;
- review assets;
- validation previews;
- unpublished files;
- intermediate publication artifacts.

The game client cannot access this storage directly.

### Published R2 and CDN

Published R2 stores immutable runtime files, including:

- release manifests;
- GLB models;
- textures;
- animation files;
- other approved binary assets.

Clients retrieve published assets through versioned keys and validate their checksums.

## Asynchronous processing

Cloudflare Queue may be used for:

- publication jobs;
- asset-validation jobs;
- manifest generation;
- retryable result processing;
- audit-event delivery;
- notification jobs.

Queues must not be used for realtime movement, combat, or state replication.

## Observability

Every service must produce structured operational evidence.

Required observability includes:

- correlated request logs;
- authorization failures;
- customer-service lookups and corrections;
- publication events;
- manifest identifiers;
- allocation failures;
- session start and termination events;
- disconnect and reconnect events;
- result-processing failures;
- migration versions;
- service and server-build versions.

Sensitive tokens and private player data must not be written to logs.

## Game-server platform

The architecture requires a Game Server Platform capability, not a specific orchestration product.

The platform must eventually support:

- starting and stopping Godot dedicated-server instances;
- session allocation;
- server-build versioning;
- health checks;
- failed-instance replacement;
- capacity limits;
- regional placement;
- horizontal scaling.

The initial implementation may use a simple managed container or game-server provider.

## Kubernetes decision

Kubernetes is not required for the initial implementation.

Cloudflare Workers, D1, R2, Queues, Access, and Durable Objects are managed services and do not need to run in a project-owned Kubernetes cluster.

Introducing Kubernetes initially would add:

- cluster administration;
- network configuration;
- security maintenance;
- deployment-controller maintenance;
- capacity planning;
- monitoring infrastructure;
- additional operational cost.

Kubernetes may be introduced later when operating a sufficiently large dedicated-server fleet requires:

- multiple regional server pools;
- automated warm capacity;
- advanced allocation policies;
- large-scale failed-server replacement;
- controlled rolling server deployments;
- infrastructure-level cost optimization.

If Kubernetes is selected later, a dedicated game-server controller such as Agones may implement the Game Server Platform contract.

The service architecture must not expose Kubernetes-specific concepts to the game client or application-service contracts.

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

The following decisions remain open:

- player identity provider;
- realtime transport protocol;
- initial game-server hosting provider;
- regional allocation strategy;
- reconnect grace period;
- active-session recovery policy;
- queue introduction threshold;
- D1 partitioning threshold;
- production observability provider;
- notification delivery requirements.
