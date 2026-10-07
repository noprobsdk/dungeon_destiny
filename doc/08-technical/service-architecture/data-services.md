# Data services

## Purpose

This document describes where Dungeon Destiny keeps its data: the two D1
databases, the Durable Objects for live coordination, the 3D asset store, and
the private and published R2 storage. For each, it states what is stored there, what is never
stored there, and which Worker owns it.

Each store has exactly one owning Worker, and only the owner writes to it. Other
Workers read or change the data only by calling the owner, never by using the
store directly. The one exception is published R2: its files never change after
publication, so the `catalog` Worker reads it directly, and the game client and
the game server download from it through Cloudflare's CDN. See
[DD-017](../../12-decisions/decision-log.md).

It is part of the [service architecture](../service-architecture.md).

| Store | Kind | Owner |
|---|---|---|
| Content D1 | SQL database | `studio-api` |
| Player D1 | SQL database | `player` |
| Durable Objects | live coordination objects | `session` |
| 3D asset store | file storage (R2) | `studio-api` |
| Private R2 | file storage | `studio-api` |
| Published R2 | file storage, served through Cloudflare's CDN | written by `studio-api`, read by `catalog` and downloaded by clients |

Schema changes to both D1 databases use forward-only numbered migrations; see
[DD-006](../../12-decisions/decision-log.md) and
[database change management](../database-change-management.md).

## Content D1

Owned by the `studio-api` Worker.

Content D1 stores:

- concrete game content;
- content versions;
- configuration relationships;
- workflow and approval state;
- publication membership;
- manifest metadata;
- asset references.

It does not store active player sessions or frame-by-frame gameplay state.

## Player D1

Owned by the `player` Worker. Other Workers read or change player data only by calling it.

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

## Durable Objects

The live-coordination Durable Objects for parties and sessions are owned by the `session` Worker.

Durable Objects coordinate live state requiring one consistent owner, including:

- active membership;
- invitations;
- selected Heroes;
- readiness;
- presence;
- session coordination;
- reconnect information.

One Durable Object should represent one active coordination unit. Durable Objects do not replace authoritative Godot combat simulation.

## 3D asset store

Owned by the `studio-api` Worker. One R2 bucket per environment. See
[DD-018](../../12-decisions/decision-log.md).

The 3D asset store holds every stage of the internal 3D pipeline for Heroes,
enemies, and Equipment:

- source files;
- validation candidates;
- approved sources;
- runtime GLBs;
- test evidence.

The 3D pipeline is AI-based: AI tools produce or process the files, and every
file they produce is saved here. Every file has a version and a checksum, so
each published asset can be traced back to the files that produced it.

Files in the 3D asset store are never used by the game directly. Only an asset
that passes the pipeline is copied to published R2. The steps are described in
the [delivery pipeline](delivery-pipeline.md#3d-assets).

## Private R2

Owned by the `studio-api` Worker.

Private R2 stores:

- source uploads;
- review assets;
- validation previews;
- unpublished files;
- intermediate publication artifacts.

The game client cannot access this storage directly.

3D model files are kept in the 3D asset store, not in private R2.

## Published R2 and CDN

Written only by Publication and Manifest in the `studio-api` Worker. Read by the `catalog` Worker, and downloaded by the game client and the game server through Cloudflare's CDN.

Published R2 stores immutable runtime files, including:

- release manifests;
- GLB models;
- textures;
- animation files;
- other approved binary assets.

Clients retrieve published assets through versioned keys and validate their checksums.
