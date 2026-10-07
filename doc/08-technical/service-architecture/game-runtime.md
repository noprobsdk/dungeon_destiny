# Game runtime

## Purpose

This document describes the authoritative game runtime: the Godot dedicated
game servers that run every active run, the realtime connection between a
player's game client and its game server, and the result a server sends when a
run ends.

The game server decides everything that happens during a run. The game client
sends the player's intentions and shows the state the server sends back; it
never decides an outcome itself.

It is part of the [service architecture](../service-architecture.md). How
sessions are created and assigned to servers is described under the Session
Orchestrator in [application services](application-services.md), and how the
servers are hosted in the [game-server platform](game-server-platform.md).

## Realtime connection

The realtime transport carries:

- player intentions;
- authoritative state snapshots;
- gameplay events;
- connection health;
- reconnect coordination.

The transport is WebSocket over TLS, carried through one stable Cloudflare-proxied endpoint that routes each session to the server named in its signed connection ticket. The client and the server keep the transport behind one network layer, so a later change to UDP or WebRTC does not affect gameplay code. Early tests on real mobile networks must confirm acceptable latency. See [DD-012](../../12-decisions/decision-log.md) and [DD-013](../../12-decisions/decision-log.md).

## Godot dedicated-server pool

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

If a game server crashes, the run resumes from its latest durable checkpoint, stored outside the game server. A small amount of progress since that checkpoint may be lost, permanent player data stays safe, and rewards are never granted twice. The checkpoint interval, contents, storage, and recovery ownership are not yet decided. See [DD-014](../../12-decisions/decision-log.md).

## Validated session result

At session termination, the authoritative server creates one signed or otherwise trusted result containing:

- session identity;
- player and Hero identities;
- content-release version;
- completion status;
- approved rewards;
- progression effects;
- idempotency identifier.

The Results and Progression service, in the `player` Worker, validates and commits this result.
