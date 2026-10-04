# Dungeon Destiny

Dungeon Destiny is developed from an explicit separation between intended design, specified and active delivery work, and verified delivery.

## Repository model

| Location | Purpose |
|---|---|
| [`doc/`](doc/) | Intended game design, including accepted future design and unresolved ideas. Documentation here is not proof that a feature has been implemented. |
| [`delivery/`](delivery/) | Feature Requests, from specification to verified delivery, and as-built documentation of the implemented game and services. |
| GitHub Issues | Tracking of Feature Requests. An issue is never the Feature Request source. |
| External asset storage | Original, editable, and intermediate production assets. These do not become runtime dependencies. |

The legacy POC is kept in a separate repository and is used only as historical evidence. POC code, schemas, migrations, and assets are not copied into this repository without an approved Feature Request.

## Delivery workflow

1. Brainstorm and refine the intended design.
2. Update the relevant canonical document under `doc/`.
3. Select a bounded part of the design for implementation.
4. Create a Feature Request under `delivery/` with scope and acceptance criteria, following the [Feature Request how-to](doc/howto-feature-request.md), and track it with a GitHub Issue.
5. Implement, review, and test through a pull request.
6. Verify the result against the Feature Request.
7. Publish the verified result under `delivery/_as-built/` and mark the Feature Request `Complete`.

An approved design may remain unimplemented for any length of time. A result enters `delivery/_as-built/` only after implementation and verification. Feature Request statuses are defined in [`delivery/README.md`](delivery/README.md).

## Change authority

- Game-design decisions require explicit approval.
- Code and database changes require an approved Feature Request.
- Pull requests must link to their Feature Request.
- Merge does not by itself mean released.
- As-built documentation must identify the Feature Request, verification evidence, and affected delivery documents.

## Documentation

Every change under `doc/` and `delivery/` follows
[Documentation and delivery change management](doc/document-change-management.md).

## Agents

AI assistants and coding agents: see [AGENTS.md](AGENTS.md).
