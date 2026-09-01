# Dungeon Destiny

Dungeon Destiny is developed from an explicit separation between intended design, active delivery work, and released behaviour.

## Repository model

| Location | Purpose |
|---|---|
| [`doc/`](doc/) | Intended game design, including accepted future design and unresolved ideas. Documentation here is not proof that a feature has been implemented. |
| GitHub Features | Work selected for planning, development, testing, and release. |
| [`delivery/`](delivery/) | Behaviour that has been deployed and verified. |
| External asset storage | Original, editable, and intermediate production assets. These do not become runtime dependencies. |

The legacy POC is kept in a separate repository and is used only as historical evidence. POC code, schemas, migrations, and assets are not copied into this repository without an approved Feature.

## Delivery workflow

1. Brainstorm and refine the intended design.
2. Update the relevant canonical document under `doc/`.
3. Select a bounded part of the design for implementation.
4. Create a GitHub Feature with scope and acceptance criteria.
5. Implement, review, and test through a pull request.
6. Deploy and verify the result.
7. Record the released capability under `delivery/`.

An approved design may remain unimplemented for any length of time. A capability enters `delivery/` only after deployment and verification.

## Change authority

- Game-design decisions require explicit approval.
- Code and database changes require an approved Feature.
- Pull requests must link to their Feature.
- Merge does not by itself mean released.
- Release documentation must identify the Feature, release, verification evidence, and affected delivery documents.
