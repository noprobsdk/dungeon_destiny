# Delivery

`delivery/` records the delivery of the design in `doc/`, Feature Request by Feature Request.

`doc/` states what the game is meant to be. It is not evidence that anything has been built.
A Feature Request is kept here from the start of specification and records what is to be built,
how it was built, and how it was verified. `_as-built/` documents only what has been implemented
and verified.

Every change under `delivery/` follows the workflow in
[Documentation and delivery change management](../doc/document-change-management.md).

## Feature Requests

Each Feature Request has one folder under `FR/`, named `FR-<number>-feature-request-<name>`:

```text
delivery/
├── README.md
├── FR/
│   └── FR-<number>-feature-request-<name>/
└── _as-built/
```

The number is five digits, assigned in order, and never reused. It is this repository's own
numbering. It does not correspond to an identifier in any other system.

A Feature Request folder contains a `README.md` and `CHANGELOG.md`. It may contain more where the work
needs it, such as a test plan or `implementation_report.md`. The README follows
[Feature Request how-to](../doc/howto-feature-request.md).

`_as-built/` documents the implemented and verified game and services. Each page is sourced from
its originating Feature Request, not copied from `doc/`. The directory is created when the first
Feature Request is published to it.

## Feature Request workflow

An approved design under `doc/` is the authoritative source for a Feature Request. GitHub Issues
may track the work and may be referenced for traceability, but they are never the Feature Request
source. When specification starts, create the Feature Request folder and its `README.md` and
`CHANGELOG.md`.

```text
New
→ In Specification
→ Backlog
→ In Progress
→ In Review
→ Pending documentation
→ Complete
```

| Feature Request status | Meaning |
|---|---|
| `In Specification` | The design, scope, acceptance criteria, Feature Request document, and sprint assignment are being prepared. |
| `Backlog` | The Feature Request is specified and approved but not currently scheduled for implementation. |
| `In Progress` | Implementation is active. |
| `In Review` | The implementation is being checked against its specification and acceptance criteria. |
| `Pending documentation` | Implementation is complete and accepted; supporting and as-built documentation is being finalized. |
| `Complete` | Implementation, verification, and documentation are complete. |

## Feature Request list

| Feature Request | Status | Created |
|---|---|---|
| [FR-00000: Terraform setup](FR/FR-00000-feature-request-terraform-setup/README.md) | Pending documentation | 2026-10-07 |
| [FR-00001: Worker dev workflow](FR/FR-00001-feature-request-worker-dev-workflow/README.md) | Pending documentation | 2026-10-07 |
| [FR-00002: GitHub CLI onboarding](FR/FR-00002-feature-request-github-cli-onboarding/README.md) | Pending documentation | 2026-10-08 |

A Feature Request README uses one of the Feature Request statuses defined above. The Feature Request list
is updated whenever a Feature Request folder is added or its status changes.
