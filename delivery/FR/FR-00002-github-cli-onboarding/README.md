# FR-00002: GitHub CLI onboarding

- **Status:** Pending documentation
- **Sprint:** Not used. The project has one developer, so sprints are not used.
- **Type:** Implementation
- **Tracking:** [GitHub Issue #3](https://github.com/noprobsdk/dungeon_destiny/issues/3), milestone "Content Studio - Basic user management".

## 1. Purpose

Add the GitHub CLI, `gh`, to the onboarding script and the setup guide. `gh`
is used to read, comment on, create, and close the GitHub Issues that track
Feature Requests, as described in `delivery/README.md` and
`delivery/create-as-built.md`.

## 2. Implementation sequence

1. Move this Feature Request to `Backlog`, then to `In Progress`.
2. Write the onboarding checks for `gh` and confirm they fail.
3. Extend `devops/onboarding.sh` until they pass, and run it on the owner's
   machine.
4. Add the `gh` step to the setup guide and `devops/README.md`.
5. Complete `implementation_report.md` and move to `In Review`.
6. After acceptance, hand over to documentation and as-built.

## 3. Scope boundaries

This Feature Request creates or changes:

- `devops/onboarding.sh`, which checks that `gh` is installed and signed in,
  and in guided mode offers the official installation;
- `devops/README.md` and `doc/howto-cloudflare-setup.md`, with the `gh` step;
- the FR-00002 tests in `tests/FR-00002/`; and
- the `AGENTS.md` note on using `gh`.

This Feature Request does not:

- sign in to GitHub for the owner; `gh auth login` is interactive and is run by
  the owner;
- post, create, or close any GitHub Issue; or
- add GitHub Actions or any other automation.

## 4. Source

- [`delivery/README.md`](../../README.md): GitHub Issues track Feature
  Requests.
- [`delivery/create-as-built.md`](../../create-as-built.md): the GitHub Issue
  is read and closed when as-built documentation is published.
- [Technology and tooling](../../../doc/08-technical/service-architecture/technology.md):
  the onboarding script.
- [FR-00000](../FR-00000-terraform-setup/README.md) and
  [FR-00001](../FR-00001-worker-dev-workflow/README.md): the
  onboarding script this Feature Request extends.
- [`doc/test-driven-development.md`](../../../doc/test-driven-development.md).

Design baseline commit: `00a1340`.

Source-document readiness gate: passes for this scope. No open decision in the
sources concerns the GitHub CLI.

## 5. Target ownership

- **Online services, database, Content Studio, runtime manifest, Godot app,
  3D production:** N/A. This Feature Request changes only the developer
  machine setup.

## 6. Prerequisites and deployment blockers

- A GitHub account with access to `noprobsdk/dungeon_destiny`.

Blockers: none.

## 7. Approved decisions

- `gh` is installed from GitHub's official apt repository, using the commands
  in GitHub's `cli/cli` installation guide, after the owner answers Yes.
- The onboarding script checks that `gh` is installed and that `gh auth status`
  succeeds. It never signs in on the owner's behalf; when `gh` is not signed in,
  it tells the owner to run `gh auth login`.
- The `gh` login is stored by `gh` in the owner's home folder and never in the
  repository.
- Posting to GitHub is outward-facing: agents show every comment, issue, or
  status change to the owner before posting it.

## 8. Data model and Content Studio

N/A.

## 9. Runtime manifest and Godot runtime

N/A.

## 10. Online services and access

The onboarding script only reads: it runs `gh --version` and `gh auth status`.
It never prints the GitHub token.

## 11. Player experience and UX

N/A.

## 12. 3D assets and production contracts

N/A.

## 13. Logging, telemetry, and diagnostics

No logging is added. Token values are never printed.

## 14. Test-first implementation

Write these checks before the implementation and confirm they fail first:

- The onboarding script fails when `gh` is missing.
- The onboarding script fails when `gh` is installed but not signed in, and
  tells the owner to run `gh auth login`.
- The onboarding script passes when `gh` is installed and signed in.
- In guided mode, `gh` is installed only after Yes, and the script never runs
  `gh auth login` itself.
- The onboarding script output never contains a GitHub token.

Every check is kept as a test in `tests/FR-00002/`, using stand-in programs, so
the tests need no network and no GitHub account.

## 15. Implementation report

`implementation_report.md` is required before this Feature Request moves to
`In Review`. It must not contain tokens or credentials.

## 16. Verification

- All Section 14 checks pass.
- The FR-00000 and FR-00001 onboarding tests still pass.
- The onboarding script passes on the owner's machine.
- The `AGENTS.md` commands work from a clean checkout.

## 17. Acceptance criteria

- All verification checks in Section 16 have passed.
- `implementation_report.md` is complete.
- No unresolved decisions remain.
- No unapproved changes were made.

## 18. Unresolved decisions

None.
