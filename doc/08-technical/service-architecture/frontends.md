# Frontends

## Purpose

This document describes Dungeon Destiny's frontends: the programs that people
use. There are two: Content Studio, used by staff to administer the game's
metadata, and the Godot game client, used by players. For each, it states who
uses it, which backend it talks to, what it may do, and what it must never do.

It is part of the [service architecture](../service-architecture.md).

## Frontends and backend

A frontend shows screens and sends requests. It makes no binding decisions and
never reads or writes a database directly.

The backend does the work and holds the data:

- the domain Workers, described in the
  [initial deployment model](deployment-model.md) and
  [application services](application-services.md);
- the D1 databases, R2 storage, and Durable Objects, described in
  [data services](data-services.md); and
- the Godot dedicated game servers, which run all active gameplay, described in
  the [game runtime](game-runtime.md).

| Frontend | Used by | Talks to | Protocol |
|---|---|---|---|
| Content Studio | staff, such as content authors and support users | the `studio-api` Worker, through Cloudflare Access | HTTPS |
| Godot game client | players, on phones and tablets | the `gateway` Worker | HTTPS |
| | | its assigned Godot game server, for live gameplay | WebSocket over TLS |
| | | published R2, through Cloudflare's CDN, to download published files such as manifests and 3D assets | HTTPS, read only |

Apart from downloading published files, a frontend never talks to any other
Worker, database, or storage directly. Published files are immutable, use
versioned names, and are checked against their checksums after download.

Content Studio's own pages are also hosted on Cloudflare
([DD-009](../../12-decisions/decision-log.md)), but they remain a frontend that
calls `studio-api`.

## Content Studio

Content Studio is the internal administration tool for all of Dungeon Destiny's game metadata in the database. Its most important areas are the 3D model assets for Heroes, enemies, and Equipment, and Hero level management. See [Content Studio](../../09-content-studio/README.md).

It can:

- manage Draft content;
- execute validation workflows;
- record review and approval evidence;
- publish immutable releases;
- upload asset metadata and approved files;
- look up any content and player data and apply approved player-data corrections through its customer-service page.

Content Studio communicates through protected administration APIs. It must not connect directly to production databases or modify Published records in place.

Those APIs are served by the `studio-api` Worker, which is reached only through Cloudflare Access. See [DD-017](../../12-decisions/decision-log.md).

## Godot game client

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

The client calls the services only through the `gateway` Worker, over HTTPS. Its realtime connection to the game server uses WebSocket over TLS through one stable Cloudflare endpoint. See [DD-012](../../12-decisions/decision-log.md), [DD-013](../../12-decisions/decision-log.md), and [DD-017](../../12-decisions/decision-log.md).

How code, 3D assets, and other content reach these programs is described in
the [delivery pipeline](delivery-pipeline.md).
