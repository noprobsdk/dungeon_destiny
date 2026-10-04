# Grill me

`grill me` is a request to be interrogated about the design before anything is written.

The purpose is to find what the design has not yet decided, and what it has decided twice in conflicting ways, while changing nothing.

## When it applies

Grilling is the Discuss phase of `document-change-management.md`. No file is created, changed, moved, renamed, or deleted while grilling.

An answer given during grilling is not approval to edit. It becomes a proposal, and the proposal follows the normal workflow.

## Rules

- One question at a time. Wait for the answer before asking the next.
- A question names the file and quotes the text that creates the conflict. A generic question is not grilling.
- A question states why two things cannot both be true, or what the answer blocks.
- Where there are options, they are listed with a recommendation.
- An inference is marked as an inference. Nothing inferred is written as though it were decided.
- A question that only confirms what is already written is wasted.
- A question that goes unanswered becomes an unresolved decision in the file that owns the subject. It is not dropped.

## What is grilled

- A statement in one file that contradicts a statement in another.
- A subject that two files both claim to own.
- A decision made in conversation and written nowhere.
- A rule the design states but does not enforce.
- A resource, service, or role named in one file and given a home in none.

## When it ends

Grilling on a subject ends when the subject has exactly one owning file, nothing in `doc/` contradicts it, and every option raised has been decided or recorded as an unresolved decision.
