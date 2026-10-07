# Operations

## Purpose

This document describes how Dungeon Destiny's services handle work in the
background and how they record what they do: when background jobs are used,
what they may and may not do, and what every service must log so that problems
can be found and support questions answered.

It is part of the [service architecture](../service-architecture.md). The
services that produce this work are described in
[application services](application-services.md).

## Asynchronous processing

A Cloudflare Queue holds background jobs: work that does not have to finish while a player or staff member waits, and that should be retried automatically if it fails.

Cloudflare Queue is introduced when publication, validation, or result processing requires asynchronous execution or retries.

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

Which observability provider is used in production is not yet decided.
