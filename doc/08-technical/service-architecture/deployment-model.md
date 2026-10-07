# Initial deployment model

## Purpose

This document lists the parts that Dungeon Destiny's services consist of when
they are first deployed: the Cloudflare Workers, the access and identity
services, the databases and storage, and the Godot game servers.

It is part of the [service architecture](../service-architecture.md). It names
each part, says how many exist at first, explains in one line what the part is,
and shows how the parts fit together. What each part does in detail is
described in the other service-architecture documents linked below.

## Parts

The initial architecture consists of:

1. domain Cloudflare Workers, each grouping related application services;
2. Cloudflare Access for Content Studio;
3. Player Identity, built into the `gateway` Worker, with Google and Apple
   sign-in;
4. one Content D1 database;
5. one Player D1 database;
6. Durable Objects for live coordination;
7. private and published R2 storage;
8. one session allocator;
9. authoritative Godot dedicated servers, packaged as container images and
   initially hosted on the owner's AWS server;
10. shared logging, metrics, and audit events.

## What each part is

| # | Part | What it is | Described in |
|---|---|---|---|
| 1 | Domain Workers | Backend code that runs on Cloudflare's network. Each Worker holds a group of related application services; see Domain Workers below. | [Application services](application-services.md) |
| 2 | Cloudflare Access | Cloudflare's sign-in gate in front of Content Studio and its administration routes. It is not used for players. | [Access and edge services](access-and-edge.md) |
| 3 | Player Identity | Our own sign-in service: it checks a player's Google or Apple sign-in, maps it to an Account, and issues the tokens that prove who the player is. No outside identity service is used. See [DD-011](../../12-decisions/decision-log.md). | [Access and edge services](access-and-edge.md) |
| 4 | Content D1 | Cloudflare's SQL database for game content, content versions, and workflow and approval state. Schema changes use forward-only migrations ([DD-006](../../12-decisions/decision-log.md), [database change management](../database-change-management.md)). | [Data services](data-services.md) |
| 5 | Player D1 | Cloudflare's SQL database for permanent player data: accounts, Heroes, friends, progression, and committed rewards. Schema changes use forward-only migrations ([DD-006](../../12-decisions/decision-log.md), [database change management](../database-change-management.md)). | [Data services](data-services.md) |
| 6 | Durable Objects | Small Cloudflare objects that each own one live unit, such as a party or a session, so its state has one consistent owner. | [Data services](data-services.md) |
| 7 | R2 storage | Cloudflare's file storage. Private R2 holds uploads and unpublished files; published R2 holds immutable runtime files such as manifests and 3D assets. | [Data services](data-services.md) |
| 8 | Session allocator | Assigns each approved game session to a game server and issues its connection ticket. Part of the Session Orchestrator. | [Application services](application-services.md) |
| 9 | Godot dedicated servers | The servers that run all active gameplay, packaged as containers. At first there is one host, the owner's AWS server; it can be replaced without changing the containers ([DD-010](../../12-decisions/decision-log.md)). A crashed run resumes from its latest checkpoint ([DD-014](../../12-decisions/decision-log.md)). Failover and scaling are not yet designed. | [Game runtime](game-runtime.md), [Game-server platform](game-server-platform.md) |
| 10 | Logging, metrics, and audit events | The shared record of what every service did, used for operations and support. | [Operations](operations.md) |

## Domain Workers

The backend is split into domain Workers. Each Worker holds related application
services as separate modules. See [DD-017](../../12-decisions/decision-log.md).

| Worker | Called by | Application services | Owns |
|---|---|---|---|
| `gateway` | player devices | API Gateway, Player Identity | access-token signing |
| `player` | other Workers | Player and Hero, Friends and Social, Results and Progression | Player D1 |
| `session` | other Workers | Party Coordination API, Quest Catalog and Eligibility, Session Orchestrator | live-coordination Durable Objects |
| `catalog` | other Workers | Runtime Content Catalog | read access to published R2 |
| `studio-api` | Content Studio, through Cloudflare Access | Content Administration, Validation and Workflow, Publication and Manifest, Customer Support | Content D1 and private R2 |

- `gateway` is the only Worker that player devices call. `studio-api` is
  reached only through Cloudflare Access.
- Workers call each other only through service bindings with typed RPC. The
  shared types live in `packages/contracts/`.
- A Worker is created when its first application service is built. A module
  may later move to its own Worker without changing its contract.
- Each deployment is named `dd-<environment>-<worker>`, such as
  `dd-dev-gateway`.
- Worker code lives in `apps/<worker>/src/<service>/`.

## How the parts fit together

- Players' devices call the `gateway` Worker over HTTPS. It checks who the
  player is and passes each request to the Worker that owns it.
- Parties and sessions are coordinated live in Durable Objects owned by the
  `session` Worker. When a session starts, the session allocator assigns it to
  a Godot dedicated server. The player connects to that server with WebSocket
  over TLS, through one stable Cloudflare endpoint that routes each session to
  its server ([DD-012](../../12-decisions/decision-log.md),
  [DD-013](../../12-decisions/decision-log.md)).
- The game client and the game server load the same published content from
  published R2.
- Staff use Content Studio behind Cloudflare Access. It calls the `studio-api`
  Worker, which stores changes in Content D1 and private R2 and publishes them
  to published R2.
- Every part writes to the shared logging, metrics, and audit events.
