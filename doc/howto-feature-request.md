# Feature Request how-to

This guide defines the standard structure and content of Feature Requests in
this repository. Use it when creating a new Feature Request or restructuring an
existing Feature Request that has not yet been implemented.

All changes under `delivery/` follow
[`document-change-management.md`](document-change-management.md). A Feature
Request is derived from approved source documentation; GitHub Issues are used
for tracking and are not authoritative specification material.

## Header metadata

Every Feature Request starts with:

- the Feature Request title;
- `Status`;
- `Sprint`;
- `Type`; and
- `Tracking`, including the GitHub Issue link and any other approved external
  tracking reference.

The header identifies the requested result, lifecycle state, delivery window,
Feature Request type, and operational tracking record without requiring the
reader to search through the specification.

## Implementation Feature Request structure

Use the following sections in this order so every Feature Request remains
predictable to review and implement. A section may be brief or marked `N/A`
with a one-sentence reason when it genuinely does not apply. Do not omit a
numbered section. Purpose, Implementation sequence, Scope boundaries, Source,
Test-first implementation, Implementation report, Verification, Acceptance
criteria, and Unresolved decisions always contain an explicit statement;
Unresolved decisions may state `None`.

### 1. Purpose

State what the Feature Request delivers, why it is needed, and the expected
result. Briefly name a major exclusion when it is necessary to prevent a scope
misunderstanding. Keep implementation detail in the later sections.

Purpose: give the reader a concise executive summary of the requested change.

### 2. Implementation sequence

List only the high-level delivery phases required to complete the Feature
Request. Include dependencies between the database, Content Studio, the
runtime manifest, online services, the Godot app, 3D production, and manual
actions; required approval or handoff points; completion of
`implementation_report.md`; movement to `In Review`; and the later
documentation handoff. When delivery spans several targets, state the
dependency order and its gates explicitly, including which change must be
merged, deployed, and verified before dependent work may proceed.

Do not put command-by-command, file-by-file, migration-by-migration,
scene-by-scene, or individual verification steps here. Those details belong in
the applicable technical, test-first, and Verification sections.

Purpose: give the implementer an immediate execution checklist and make
cross-target dependencies visible before implementation starts.

### 3. Scope boundaries

State what the Feature Request creates or changes, what it explicitly does not
create or change, work deferred to later Feature Requests, and responsibilities
owned by another target, service, or team.

Purpose: prevent scope expansion and avoid implementing related but unapproved
work.

### 4. Source

List the authoritative `doc/` files, architecture decisions, standards,
contracts, and conventions that govern the Feature Request, together with the
design baseline commit. State whether the source-document readiness gate
passes. Do not use tracking information as source material.

Purpose: establish where every requirement comes from and confirm that the
design is ready for delivery.

### 5. Target ownership

Define what the database, Content Studio, the runtime manifest, online
services, the Godot app, and 3D production each own for this Feature Request.
Identify which target may create or change each record, behaviour, asset, or
configuration, and what is maintained as content in Content Studio rather than
in code.

Purpose: prevent duplicated ownership and changes in the wrong target.

### 6. Prerequisites and deployment blockers

List records, assets, contracts, services, environments, devices, accounts,
and approvals that must already exist; manual prerequisites; and every
condition that blocks implementation, deployment, or verification.

Purpose: separate dependencies from items delivered by the Feature Request and
expose blockers before implementation begins.

### 7. Approved decisions

Record decisions already made during specification, their exact approved
values, and the reasoning for important choices when it aids implementation or
future operation. Include decisions inherited from design and architecture
documentation. Do not duplicate unresolved decisions here.

Purpose: provide one clear inventory of the fixed choices the implementation
must follow.

### 8. Data model and Content Studio

Define the records, fields, relationships, constraints, and derivation rules
created or changed; the database migrations required; and the Content Studio
authoring, validation, approval, and publication behaviour. Reference
`07-data-model/` and `09-content-studio/` rather than redefining them. Concrete
content belongs in Content Studio; examples in the Feature Request are labelled
as examples and are never live content.

Split this section into subsections such as records, migrations, validation
rules, or authoring workflow when needed.

Purpose: define the complete expected data and authoring state.

### 9. Runtime manifest and Godot runtime

Define the manifest content consumed, how the Godot app executes it, runtime
state and persistence, and the gameplay-system behaviour, states, events, and
transitions implemented. Identify anything the runtime must not hardcode
because it belongs in Content Studio.

Purpose: define how the approved design and published content behave in the
running game.

### 10. Online services and access

Define authoritative service behaviour, accounts, sessions, player and author
permissions, atomic operations, and explicitly prohibited client authority or
access. Distinguish what the server decides from what the client may display or
predict.

Purpose: state who can perform each action and where each decision is
enforced.

### 11. Player experience and UX

Define the player-facing screens, flows, interactions, overlays, visible
states, feedback, and mobile usability requirements affected, referencing
`05-ux/`. Identify UX work deferred to another Feature Request.

Purpose: define what the player sees and does, and prevent unapproved UX.

### 12. 3D assets and production contracts

Define the Rig Profiles, Body Bases, Animation Sets, Grip Profiles, equipment,
and runtime assets required; the applicable `06-3d-production/` contracts and
validation gates; mobile performance budgets; and the compatibility evidence
required. Original and editable production assets remain in external asset
storage.

Purpose: make asset compatibility and performance part of the delivery design.

### 13. Logging, telemetry, and diagnostics

Define logs, errors, telemetry, and diagnostics produced or relied on;
retention; and handling of sensitive or personal information.

Purpose: make the delivered behaviour observable and supportable.

### 14. Test-first implementation

Define the local tests written before implementation, expected failure
conditions, data and configuration checks, scope-boundary tests, secret-leakage
checks, device and deployed-environment tests, negative access tests, and the
commands used to run the Feature Request tests. Follow
[`test-driven-development.md`](test-driven-development.md).

Purpose: turn the specification into executable checks before implementation.

### 15. Implementation report

Require an `implementation_report.md` before the Feature Request moves to
`In Review`. The report records:

- what was actually created or changed and the final deployed values;
- non-trivial implementation decisions, including rationale, risk, approval,
  and verification;
- approved deviations from the Feature Request;
- test, migration, deployment, device, and live-verification results;
- defects, limitations, and follow-up work; and
- a ready-to-post GitHub Issue completion recap.

The report must not contain credentials, access tokens, private keys,
personal player data, or other sensitive values.

Purpose: preserve what was actually implemented and what was learned or
decided during implementation.

### 16. Verification

Define objective deployed-state checks for records, content, behaviour, access,
UX, assets, performance, and diagnostics. Require relevant local, device, and
deployed tests, and state acceptable evidence. State what evidence must not
contain.

This section contains the technical execution: the commands, queries, tests,
observations, expected results, and evidence used to prove the deployed state.

Purpose: define how the implementer executes and records proof that the Feature
Request was delivered correctly.

### 17. Acceptance criteria

List concise binary completion gates. Refer to Verification rather than
repeating its technical checklist; for example, require that all verification
checks in Section 16 have passed. Also require the completed
`implementation_report.md`, absence of unresolved decisions, and absence of
unapproved changes.

This section answers whether the Feature Request can be accepted; it does not
restate how individual checks are executed.

Purpose: provide the binary gate used to accept the implementation and move it
into documentation and as-built.

### 18. Unresolved decisions

List only decisions that still require approval. For each decision, state the
available options, recommended option when known, impact, required owner or
approver, and whether it affects design documentation, one target, or several
targets.

Purpose: make open questions visible and prevent a Feature Request from moving
to `Backlog` before it is implementable.

When a decision is resolved, incorporate the approved result into the owning
specification section, optionally summarize it under Approved decisions, and
remove it from Unresolved decisions.

## Decision-only Feature Request structure

A decision-only Feature Request uses the same header metadata and this shorter
order:

1. Purpose.
2. Scope boundaries.
3. Source.
4. Decision-only boundary.
5. Approved decisions.
6. Required documentation and implementation handoff.
7. Verification.
8. Acceptance criteria.
9. Unresolved decisions.

The Decision-only boundary states explicitly that the Feature Request records
and publishes decisions but does not change code, data, content, or assets.
The handoff identifies the target and future Feature Request responsible for
implementation.

## Changelog

Every Feature Request directory contains `CHANGELOG.md`. Add the newest entry
at the top below its introduction. Each entry records:

- date;
- change;
- reason;
- affected files; and
- verification result.

Purpose: preserve a readable history of the specification, resolved decisions,
implementation changes, and documentation transition. The README change and
its changelog entry are separate governed changes and require separate review
and approval.

## Section distinctions

- Approved decisions state what must be implemented.
- Implementation sequence states the high-level order and delivery gates.
- Test-first implementation states what is checked before implementation.
- Verification states how the completed implementation is proved.
- Acceptance criteria determine whether the Feature Request is finished.
- Implementation report records what was actually implemented and learned.

## Completion rules

- A Feature Request with unresolved decisions remains `In Specification`.
- An implementation Feature Request moves to `Backlog` only when its source
  documentation and implementation decisions are complete.
- It cannot move to `In Review` until implementation, required verification,
  and `implementation_report.md` are complete.
- It cannot move to `Pending documentation` until the implementation has been
  reviewed and accepted.
- A decision-only Feature Request may move to `Pending documentation` when its
  decisions are accepted, no unresolved decisions remain, and implementation
  is explicitly assigned outside its scope.
- No Feature Request moves to `Complete` before its required documentation is
  complete.
