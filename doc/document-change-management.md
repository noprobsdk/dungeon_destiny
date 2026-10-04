# Documentation and delivery change management

This document defines the mandatory workflow for every change under `doc/` and
`delivery/`.

The purpose is to keep design decisions and the delivery record visible,
reviewable, and under explicit owner control. These rules apply to humans, AI
assistants, coding agents, and automated tools.

## Scope

- `doc/` states what the platform is meant to be.
- `delivery/` records specifications, implementation, verification, and
  platform documentation.
- Changes outside these directories are not governed by this document unless
  another repository rule says otherwise.

## Core rule

No file under `doc/` or `delivery/` may be created, changed, moved, renamed, or
deleted before the proposed change has been shown and explicitly approved.

The one exception is `doc/todo.md`, the tracker defined under Tracking. It is
updated without approval so that it is never behind.

Ignored proposal and diff files created only for the review workflow are also
exempt. They are temporary review artifacts, not governed documentation, and
must never be committed.

Brainstorming, analysis, review, and discussion are not approval to edit files.

## Required workflow

```text
Discuss
→ Propose
→ Create the ignored review artifacts
→ Show the normal full-context red/green diff
→ Recap the proposed change
→ Receive explicit approval
→ Apply only the approved change
→ Show and verify the resulting change
→ Remove the review artifacts
→ Commit only when explicitly requested
```

## 1. Discuss

Ideas may be explored without changing governed files.

During this phase:

- identify the design or delivery problem;
- inspect relevant documentation, configuration, and code;
- identify conflicts and dependencies;
- determine which file owns the subject; and
- do not edit any governed file.

## 2. Propose

Before editing, identify:

- the exact file path;
- why the file must change;
- whether it is an addition, edit, move, rename, or deletion; and
- any other files that will require separate changes.

Related cleanup must not be included automatically.

### Proposal review files

For a Markdown edit, create these temporary files beside the governed file:

- `<name>.proposed.md`, containing the complete proposed file; and
- `<name>.full.diff`, containing the normal unified diff between the governed
  file and the proposal with enough context to show the complete file.

The repository `.gitignore` must ignore `*.proposed.md` and `*.full.diff`.
These files:

- support review only and do not count as additional governed-file changes;
- must not be staged, committed, or pushed;
- must not replace or modify the governed file before approval; and
- must be regenerated whenever the proposal changes.

For a non-Markdown file, keep the proposed copy outside `doc/` and `delivery/`
unless an equivalent ignored sibling-file pattern has been approved.

A comparison helper may be kept in the tool's own workspace. It must not be
added to the repository without a separate approved change.

## 3. Show the full-file diff

Every proposed change must be displayed before implementation as a normal
unified diff with enough context to show the complete affected file.

The diff is the reviewable FROM and TO:

- show every line in the file, including unchanged lines;
- prefix removed lines with `-`;
- prefix added lines with `+`;
- prefix unchanged lines with one space;
- show only actual removals and additions as red and green;
- do not show the whole current file as removed followed by the whole proposed
  file as added for an ordinary edit;
- use a fenced `diff` block so removals and additions render red and green;
- use four or more backticks for the outer fence when the file contains a
  triple-backtick Markdown code block; and
- show the old and new file paths in the diff header.

### Existing text file

Show the entire file in one normal full-context diff. Unchanged lines remain
neutral context, and only actual changes use `-` or `+`.

### New text file

Show the complete proposed file as additions from `/dev/null`.

### Deleted text file

Show the complete existing file as removals to `/dev/null`.

### Moved or renamed file

Show the current and proposed paths. If content changes, show the complete
full-file diff. If content does not change, state that explicitly.

### Binary file

A binary file cannot be reviewed as a text diff. Show:

- the exact source and destination paths;
- file type and size;
- SHA-256 hash;
- whether the file is copied unchanged; and
- a visual preview when the format supports one.

Creating a required parent directory is part of an approved new-file addition.
It does not authorize creation of any other file.

### Recap

After the diff or binary-file description, recap every proposed change in plain
language before asking for approval.

## 4. Explicit approval

A change may proceed only after the owner explicitly approves the displayed
proposal.

Valid approval examples:

- `change`;
- `approved`;
- `approve this diff`; or
- another unambiguous instruction referring to the displayed proposal.

The following are not approval:

- asking a question;
- brainstorming;
- requesting an explanation;
- saying that an idea sounds good;
- asking what should change; or
- requesting a review.

If the proposed content changes after approval, the complete revised diff must
be shown and approved again.

## 5. Apply the approved change

After approval:

- edit only the approved file;
- replace its content with the approved proposal exactly;
- verify the governed file matches the approved proposal;
- do not add related improvements;
- do not reformat unrelated sections; and
- do not change another file, asset, configuration, or code unless separately
  approved or explicitly exempted by this document.

If an unexpected dependency is discovered, stop and propose a separate change.

## 6. Report and verify the result

After applying the change:

- show the resulting diff;
- verify that it matches the approved proposal;
- report every changed file;
- state what was added, edited, moved, renamed, or deleted;
- state whether the result differs from the approved proposal;
- state whether unresolved decisions remain; and
- state whether the change is committed.

After the result is reported and verified, remove the sibling
`*.proposed.md` and `*.full.diff` review artifacts unless the owner explicitly
asks to retain them. The displayed review and verification remain part of the
conversation record.

## 7. Commit control

Changes under `doc/` and `delivery/` must not be committed or pushed unless
explicitly requested.

Approval to edit is not approval to commit.

Approval to commit is not automatically approval to push.

## One change approval at a time

Only one governed file change may be proposed for approval at a time.

A change is one create, edit, move, rename, or delete operation affecting one
file. One approved edit may contain multiple disclosed changes within that file
when all are shown in the full-file diff.

The workflow must be completed before proposing the next file change:

```text
Show one full-file diff
→ Receive approval
→ Apply the approved change
→ Report and verify the result
→ Propose the next file change
```

Rules:

- do not group multiple file changes into one approval;
- temporary ignored proposal and diff artifacts do not require separate
  approval;
- do not ask for approval of several numbered file changes at once;
- approval applies only to the currently displayed proposal;
- approval of one change never authorizes a related or subsequent change;
- complete the current file before proposing another file; and
- if approved content must be altered, stop and show a revised full-file diff.

## Tracking for `doc/`

`doc/todo.md` records every item of work in progress under `doc/` and every
decision that documentation work waits on. It exists so that the state of the
work survives outside a chat context.

Rules:

- record a required decision in `doc/todo.md` when it is raised, before the
  dependent documentation change is proposed;
- update the decision immediately when it is taken;
- move decided decisions from the open table to the decided list;
- update an item's status immediately when it changes;
- update `doc/todo.md` without a pre-approval diff; and
- show its resulting diff in the report for the step that caused the update.

Nothing else under `doc/` is exempt.

## Feature Request changelog for `delivery/`

Every Feature Request directory must contain a `CHANGELOG.md`.

The changelog records approved changes throughout the Feature Request
lifecycle, including changes made during implementation. Each entry must
include:

- date;
- change;
- reason;
- affected files; and
- verification result.

A Feature Request change and its changelog entry are separate file changes.
Each must follow this workflow and receive separate approval.

New entries are added at the top, below the changelog introduction. Existing
entries must not be rewritten unless they are factually incorrect.

## Feature Request status gates

### Source-document readiness gate

A Feature Request must not be created or changed from a `doc/` design while
the documentation that owns or supplies that design has:

- an outstanding work item in `doc/todo.md`;
- an `open` or `proposed` decision in `doc/todo.md`; or
- an unresolved decision stated in the owning or source document.

If such an issue is discovered while working on a Feature Request, stop the
Feature Request change and resolve or record the documentation issue before
continuing. An outstanding issue in unrelated documentation does not block the
Feature Request.

- Unresolved decisions must be recorded in the Feature Request README.
- A Feature Request with unresolved decisions cannot leave
  `In Specification` or be published to the platform documentation.
- An implementation Feature Request cannot move to `Pending documentation`
  until its implementation and required verification are complete and
  accepted.
- A decision-only Feature Request may move to `Pending documentation` when its
  decisions are accepted, no unresolved decisions remain, and implementation
  is explicitly assigned outside its scope.
- A Feature Request cannot move to `Complete` until its required documentation
  is complete.

## Corrections

A correction to an applied change is a new change and requires its own
full-file diff and approval.

If an unapproved change is made accidentally:

1. Stop making changes.
2. Disclose the affected file.
3. Show the complete resulting diff.
4. Ask whether to keep, correct, or revert it.
5. Do not commit the unapproved change.
