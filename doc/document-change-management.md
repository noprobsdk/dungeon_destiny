# Documentation change management

This document defines the mandatory workflow for every change under `doc/`.

The purpose is to keep design decisions visible, reviewable, and under explicit owner control. These rules apply to humans, AI assistants, coding agents, and automated tools.

## Core rule

No file under `doc/` may be created, changed, moved, renamed, or deleted before the proposed change has been shown and explicitly approved.

Brainstorming, analysis, review, and discussion are not approval to edit files.

## Required workflow

```text
Discuss
→ Propose
→ Show FROM and TO
→ Receive explicit approval
→ Apply only the approved change
→ Show the resulting change
→ Commit only when explicitly requested
```

## 1. Discuss

Ideas may be explored without changing files.

During this phase:

- identify the design problem;
- inspect relevant documentation;
- identify conflicts and dependencies;
- determine which file owns the subject;
- do not edit any file.

## 2. Propose

Before editing, identify:

- the exact file path;
- why the file must change;
- whether it is an addition, replacement, move, rename, or deletion;
- any other files requiring separate changes.

Related cleanup must not be included automatically.

## 3. Show FROM and TO

Every proposed change must be displayed before implementation.

### Existing text

Show the current text verbatim under `FROM` and the complete replacement text under `TO`.

### New file

```text
FROM: File does not exist.
TO: Complete proposed file content.
```

### Deleted file

```text
FROM: Existing file and its purpose.
TO: File deleted.
```

### Moved or renamed file

Show both the current and proposed paths and state whether the content changes.

Large changes must be divided into small, independently reviewable steps.

## 4. Explicit approval

A change may proceed only after the owner explicitly approves the displayed proposal.

Valid approval examples:

- `change`;
- `approved`;
- `approve Step 3`;
- another unambiguous instruction referring to the displayed FROM/TO proposal.

The following are not approval:

- asking a question;
- brainstorming;
- requesting an explanation;
- saying that an idea sounds good;
- asking what should change;
- requesting a review.

If proposed text changes after approval, the revised FROM/TO must be shown and approved again.

## 5. Apply the approved change

After approval:

- edit only the approved files;
- apply only the approved text;
- do not add related improvements;
- do not reformat unrelated sections;
- do not change application code, database files, assets, or delivery files unless separately approved.

If an unexpected dependency is discovered, stop and propose a new change.

## 6. Report the result

After applying the change, report:

- every changed file;
- what was added, replaced, moved, renamed, or deleted;
- whether the result differs from the approved proposal;
- whether unresolved decisions remain;
- whether the change is committed.

The actual resulting diff must be available for review.

## 7. Commit control

Documentation changes must not be committed or pushed unless explicitly requested.

Approval to edit is not approval to commit.

Approval to commit is not automatically approval to push.

## One change approval at a time

Only one documentation change may be proposed for approval at a time.

A change is one create, edit, move, rename, or delete operation affecting one file.

The workflow must be completed before proposing the next change:

```text
Show one FROM and TO
→ Receive approval
→ Apply the approved change
→ Report the result
→ Propose the next change
```

Rules:

- Do not group multiple file changes into one approval.
- Do not ask for approval of several numbered changes at once.
- Approval applies only to the currently displayed FROM and TO.
- Approval of one change never authorizes a related or subsequent change.
- If another file must also change, complete the current change before proposing it.
- If the approved text must be altered, stop and show a new FROM and TO.

## Corrections

A correction to an applied documentation change is a new change and requires its own FROM/TO proposal and approval.

If an unapproved change was made accidentally:

1. stop making changes;
2. disclose the affected files;
3. show what changed;
4. ask whether to keep, correct, or revert it;
5. do not commit the unapproved change.
