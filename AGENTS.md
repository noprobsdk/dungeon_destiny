# Agent Instructions

Instructions for any AI assistant or coding agent working in this repository.

## Project

Dungeon Destiny is a mobile dungeon game. This repository holds its design
documentation, Feature Requests, delivery records, and, once approved, its
Content Studio, database, and Godot implementation.

## Commands

No application code exists yet. Setup, run, test, lint, and format commands
are added here by the Feature Request that introduces them.

## Conventions

- Code and database changes require an approved Feature Request.
- Pull requests link to their Feature Request.
- Legacy POC code, schemas, migrations, and assets are not copied into this
  repository without an approved Feature Request.
- `ou-oci-terraform-main` is the reference for repository process and
  governance. When its workflows differ, it takes precedence; only
  project-specific content is adapted.

## Documentation

Always read context from `doc/` when starting a new prompt, including
`doc/todo.md`.

## Repository tracking

Always look for new updates on the remote every minute.

Do not pull automatically; ask first.

## Documentation changes

Every change under `doc/` or `delivery/` follows
`doc/document-change-management.md`.

Show a full-file red/green diff and receive explicit approval before creating,
changing, moving, renaming, or deleting any file under `doc/` or `delivery/`.

## Fast execution

Use fast execution by default:

- change only what the user explicitly requested;
- batch relevant inspection and verification commands;
- do not re-read settled context unless the files or remote state changed;
- preserve and ignore unrelated working-tree changes;
- ask questions only when a decision blocks safe progress;
- keep progress reports and diffs limited to the requested change; and
- when edit, commit, and push are all explicitly authorized, perform them in
  one sequence without additional confirmation.

Fast execution does not bypass safety checks or the full-file proposal and
approval workflow for changes under `doc/` and `delivery/`.

## Notes

- `doc/` states intended design and is not evidence of implementation.
- `delivery/` records Feature Requests and verified delivery.
