# Application services

## Purpose

This document describes each application service: the area of the game it is
responsible for, what it provides, and what it must not do. Each service is a
module in one of the domain Workers; the Worker is named under each service.

It is part of the [service architecture](../service-architecture.md). How the
services are grouped into Workers is described in the
[initial deployment model](deployment-model.md#domain-workers), and the API
Gateway and Player Identity in [access and edge services](access-and-edge.md).

| Worker | Application services |
|---|---|
| `studio-api` | Content Administration, Customer Support, Validation and Workflow, Publication and Manifest |
| `catalog` | Runtime Content Catalog |
| `player` | Player and Hero, Friends and Social, Results and Progression |
| `session` | Party Coordination API, Quest Catalog and Eligibility, Session Orchestrator |

## Content Administration

Worker: `studio-api`.

Owns authoring operations for concrete database records managed through Content Studio.

It enforces Draft-only editing and delegates lifecycle decisions to Validation and Workflow.

## Customer Support

Worker: `studio-api`.

Owns the protected API used by the Content Studio customer-service page.

It provides:

- lookup of content and player data;
- approved player-data corrections;
- support-role authorization;
- an audit event for every lookup and correction.

It holds no player data of its own. It reads and changes data only through the owning services, such as Player and Hero, Friends and Social, and Results and Progression, and cannot bypass their rules. The allowed correction operations require separate approval before implementation.

## Validation and Workflow

Worker: `studio-api`.

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

## Publication and Manifest

Worker: `studio-api`.

Owns:

- release composition;
- compatibility validation;
- immutable manifest generation;
- checksums;
- publication identifiers;
- publication audit records;
- promotion of approved assets to published storage.

Published releases are never modified in place.

## Runtime Content Catalog

Worker: `catalog`.

Provides read-only access to:

- the current compatible release;
- immutable manifests;
- published configuration;
- content and asset version references;
- checksums and compatibility metadata.

The game client and authoritative server consume the same release version for an active session.

## Player and Hero

Worker: `player`.

Owns persistent player-controlled records, including:

- player profile;
- permanent Heroes;
- Hero Level and XP;
- permanent choices;
- inventory and equipment references;
- completed progression;
- committed rewards.

It does not own active combat or temporary attempt state.

## Friends and Social

Worker: `player`.

Owns:

- friend relationships;
- incoming and outgoing friend requests;
- blocking relationships;
- privacy rules;
- online-presence visibility;
- reusable social references.

Live connection presence may be coordinated through Durable Objects, while the permanent relationship is stored in Player D1.

## Party Coordination API

Worker: `session`.

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

## Quest Catalog and Eligibility

Worker: `session`.

Owns:

- access to published Quest definitions;
- server-side eligibility evaluation;
- allowed Quest Levels for the accepted group composition;
- access and progression prerequisites;
- a versioned eligibility result.

The exact eligibility formula is defined by Gameplay Systems and configuration rules, not by the client.

## Session Orchestrator

Worker: `session`.

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

It decides, for each game mode, where a run executes. Today every run, solo and co-op, executes on an authoritative game server. Clients find game servers only through the Session Orchestrator. See [DD-012](../../12-decisions/decision-log.md).

## Results and Progression

Worker: `player`.

Receives validated outcomes only from trusted authoritative servers.

It provides:

- result validation;
- idempotent result processing;
- permanent reward commitment;
- progression updates;
- audit records;
- rejection of duplicate or invalid submissions.

The game client cannot call privileged result-commit operations directly.

Every run, solo and co-op, ends with a result sent through this service. Rewards are never granted twice, also when a run resumes after a game-server crash. See [DD-012](../../12-decisions/decision-log.md) and [DD-014](../../12-decisions/decision-log.md).
