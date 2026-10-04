# Test-driven development

We use test-driven development (TDD) for implementation work:
write a test for the required behaviour, confirm it fails, then
implement the behaviour and confirm the test passes.

The goal is to describe each Feature Request clearly enough that a developer
or coding agent, such as Claude, can implement and verify it without
inventing requirements.

## Feature Request readiness

Before implementation, the Feature Request description must identify:

- Its purpose, scope, and exclusions.
- The relevant design documents in doc/.
- Inputs, expected results, and failure behaviour.
- Dependencies, prerequisites, and unresolved decisions.
- Observable acceptance criteria.
- How the implementation will be tested and verified.

Resolve decisions that affect the behaviour before implementing it.
An agent must raise missing or contradictory requirements rather
than silently choosing an interpretation.

Design remains in doc/. Implementation plans and verification
results belong to the relevant Feature Request in delivery/.

## Implementation-decision review

Before writing tests or implementation code, the developer or coding agent
must identify every non-trivial implementation decision that is not already
fixed by the approved design documentation or Feature Request.

For each decision, record:

- the available options and selected recommendation;
- the reason for the recommendation;
- the affected resources, repositories, interfaces, or operations;
- implementation and operational risks; and
- how the selected option will be tested and verified.

The technical owner must approve these decisions before implementation
continues. An approval applies only to the decisions that were presented.

If a new non-trivial decision is discovered during implementation, pause the
affected work, record and present the decision using the same information, and
obtain approval before continuing. Do not hide an implementation decision in
code, a database migration, Content Studio configuration, a test, or the
implementation report after the choice has already been made.

## Development cycle

Work through one behaviour at a time:

1. Write a test derived from an acceptance criterion.
2. Run it and confirm it fails because the behaviour is missing
   or incorrect. A missing dependency or credential is not evidence
   of the intended failure.
3. Implement the smallest change that satisfies the requirement.
4. Run the test and the relevant existing tests.
5. Refactor where useful, keeping the tests passing.

For a defect, first add a regression test that reproduces it.

Tests must check observable behaviour and meaningful failure cases.
Do not weaken tests merely to make the implementation pass.
If a requirement changes, agree the change before updating its tests.

## Test categories

Each Feature Request identifies the test categories it needs and explains
any exclusions. Not every Feature Request requires every category.

- Unit tests: verify individual rules or functions without network
  access or service credentials.
- Configuration and data checks: verify database migrations, Content
  Studio validation rules, published manifests, and 3D asset contracts
  before deployment.
- Integration tests: verify interactions with real dependencies,
  including the database, online services, authentication, and manifest
  publication.
- End-to-end tests: verify a complete workflow in the target
  environment, such as publishing content in Content Studio and
  confirming that the Godot app loads and plays it.

Regression tests protect previously working behaviour and may
belong to any of these categories.

For each required test, the Feature Request records:

- The acceptance criterion it verifies.
- Whether it runs locally, on a target device, or in a deployed
  environment.
- Required credentials, permissions, and existing resources.
- The command or procedure and expected result.
- Any resources created, expected costs, and cleanup steps.

Write deployed-environment and device test scenarios and assertions
before implementation, even when they cannot run until the environment
exists. Run them once their prerequisites are available.

A deployed-environment or device test blocked by missing access or
infrastructure is recorded as blocked, not passed. Local tests and
mocks do not replace required deployed verification.

## Deployed verification

Use local tests and configuration or data checks where they can
verify the requirement without a deployed environment or target device.

Live integration checks are also needed for behaviour that depends
on deployed services, target devices, or published content, including
authentication, persistence, manifest consumption, Godot runtime
behaviour on target mobile devices, and 3D asset validation.

Mocks and successful local checks do not prove that the deployed
game and services work. Record separately:

- What was verified locally.
- What was verified in a deployed environment or on a target device.
- What remains unverified and why.

Define the target environment, credentials, data impact, and
cleanup procedure before running tests that create or change
deployed services, data, or published content. Existing deployment
and approval rules still apply.

Documentation-only changes do not require artificial executable
tests. Review their accuracy, consistency, and links instead.

## Coding-agent handoff

Give the agent the Feature Request description, relevant design documents,
repository instructions, and setup and test commands.

The agent must follow the development cycle, stay within the
Feature Request's scope, and report the tests run and their actual results.
It must distinguish passing, failing, and unexecuted checks.

## Completion

A Feature Request is complete when its acceptance criteria are met,
the required tests and integration checks pass, and verification
results are recorded in delivery/.

Document remaining limitations explicitly. Do not mark a Feature Request
complete while required verification is still blocked.

This workflow does not replace
[documentation and delivery change management](document-change-management.md).
