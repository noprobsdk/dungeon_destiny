# Technology and tooling

## Purpose

This document records the languages and tools used to build, configure, and
deploy Dungeon Destiny's Cloudflare services, and which decision chose each one.

It is part of the [service architecture](../service-architecture.md). The parts
being built are listed in the [initial deployment model](deployment-model.md).
Commands for running the tools are in `AGENTS.md`.

## Language

TypeScript is the language of the Cloudflare Worker backend. It is compiled to
JavaScript for execution on Cloudflare. See
[DD-015](../../12-decisions/decision-log.md).

Every domain Worker uses TypeScript, and the types shared between Workers live
in `packages/contracts/`. See [DD-017](../../12-decisions/decision-log.md).

## Infrastructure and deployment

Cloudflare infrastructure is managed with Terraform, and Worker code is
deployed with Wrangler. Terraform state is kept in a Cloudflare R2 bucket, with
one state per environment. See [DD-016](../../12-decisions/decision-log.md).

| Tool | Used for | Location |
|---|---|---|
| Terraform | Creating and configuring Cloudflare resources, such as Workers, databases, and storage | `infra/terraform/envs/<environment>/` |
| Wrangler | Uploading Worker code to the Workers that Terraform created | `apps/<worker>/` |
| Onboarding script | Checking that a machine can run the tools above | `devops/onboarding.sh` |

The Terraform setup, its state bucket, and the onboarding script were delivered
by [FR-00000](../../../delivery/FR/FR-00000-terraform-setup/README.md).

## Testing

Every Feature Request keeps its tests in `tests/FR-<number>/`. See
[test-driven development](../../test-driven-development.md).

## Not yet decided

- the CI/CD pipeline, including whether GitHub Actions runs checks and
  deployments;
- deployment tooling for the AWS game-server host;
- how Worker secrets are stored and set for each environment.

These are tracked as open decisions in [`doc/todo.md`](../../todo.md).
