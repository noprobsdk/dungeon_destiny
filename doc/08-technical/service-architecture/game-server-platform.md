# Game-server platform

## Purpose

This document describes how the Godot dedicated game servers are hosted and
operated: what the hosting platform must eventually support, where the servers
run today, and why Kubernetes is not used at first.

What the game servers do during a run is described in the
[game runtime](game-runtime.md). It is part of the
[service architecture](../service-architecture.md).

## Platform requirements

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

The Godot dedicated server is packaged as a host-independent container image. It is initially hosted on the owner's AWS server. Cloudflare Containers or another host may replace it later without changing the container or its contracts with the Workers. See [DD-010](../../12-decisions/decision-log.md).

## Kubernetes

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

## Not yet decided

Not yet decided: failover, a second host, and scaling beyond the owner's single
AWS server, and the deployment tooling for the AWS game-server host. Both are
tracked as open decisions in [`doc/todo.md`](../../todo.md).
