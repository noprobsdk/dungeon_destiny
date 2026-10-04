# How-to workflows

`howto` opens the repository's workflow menu. It does not start a workflow
until the owner selects one.

## Trigger

When the owner writes only `howto`:

1. show the complete numbered workflow menu below;
2. recommend one workflow when the current context makes that useful; and
3. wait for the owner to select a workflow.

When the owner writes `howto <workflow>`, select the matching workflow directly
and follow its source instructions. Ask one concise question only when the
workflow or subject cannot be inferred safely.

Writing `howto` or selecting a workflow does not authorize implementation,
deployment, commit, push, or changes in an external system.

## Workflow menu

| Choice | Command | Use | Source |
|---:|---|---|---|
| 1 | `howto documentation` | Create or change governed documentation or delivery files. | `doc/document-change-management.md` |
| 2 | `howto grill` | Find contradictions, missing ownership, and unresolved design decisions before editing. | `doc/grill-me.md` |
| 3 | `howto feature request` | Create or update a Feature Request from approved source documentation. | `doc/howto-feature-request.md` |
| 4 | `howto test driven` | Specify and implement a change using the repository's test-first workflow. | `doc/test-driven-development.md` |
| 5 | `howto create as-built` | Review an accepted Feature Request and publish the implemented result to as-built documentation. | `delivery/create-as-built.md` |
| 6 | `howto recap` | Prepare a consistent Feature Request or GitHub Issue recap. | `delivery/recap.md` |
| 7 | `howto operator guide` | Create a task-focused guide for an approved operation. | This document |

Load the selected source file completely before following the workflow. A
workflow source overrides the short menu description.

## Operator-guide workflow

An operator guide explains how to perform and verify an approved operation,
such as running the Content Studio, applying a database migration, or building
and exporting the Godot client. It does not replace game design, a Feature
Request, implementation evidence, or the documentation change-management
workflow.

1. Infer the subject from the current conversation.
2. Inspect the documentation and implementation that own the subject.
3. Identify the destination file.
4. Prepare the complete guide as a proposal.
5. Show the required review diff.
6. Wait for explicit approval before creating or changing governed
   documentation.

Store the guide with the material that owns the operation:

- an intended development or content-production procedure belongs under
  `doc/`;
- a Feature Request-specific procedure belongs in that Feature Request; and
- an implemented and verified operation belongs under `delivery/_as-built/`.

Do not duplicate a guide. Link to the owning guide where other documentation
needs the context.

## Required structure

Use only the sections needed by the operation, in this order:

1. **Purpose** — the result the procedure produces.
2. **When to use** — the valid situations and scope boundaries.
3. **Prerequisites** — required access, tools, configuration, and source
   state.
4. **Inputs** — values the operator must supply and where approved values come
   from.
5. **Procedure** — numbered steps with exact working directories, commands,
   and expected intermediate results.
6. **Verification** — objective checks proving the operation succeeded.
7. **Failure handling** — safe recovery, retry, cleanup, or escalation steps.
8. **Security** — secret handling, prohibited output, and access constraints.
9. **References** — links to the owning design, Feature Request, implementation,
   or vendor documentation.

## Content rules

- Write for an operator who did not participate in the implementation.
- Use exact repository paths, resource names, commands, and expected results
  only when verified from authoritative sources.
- State the required working directory before each command sequence.
- Separate commands the operator runs from example output.
- Never include passwords, tokens, private keys, signing keys, populated
  secret values, or other credentials.
- Do not record connection strings, deployed endpoints, or other environment
  values unless the owning documentation explicitly requires them.
- Do not invent missing steps or values. Record a blocking unknown as an
  unresolved decision or prerequisite.
- Do not describe an unimplemented design as an available operation.
- Keep the guide task-focused; link to background design instead of repeating
  it.

## Completion

A how-to guide is complete when an authorized operator can follow it without
conversation context, obtain the intended result, verify that result, and
recover safely from the documented failure cases.
