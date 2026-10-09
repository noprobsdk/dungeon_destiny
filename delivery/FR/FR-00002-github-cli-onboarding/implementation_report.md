# FR-00002 implementation report

Implementation of [FR-00002: GitHub CLI onboarding](README.md). This report
contains no tokens, credentials, account IDs, or email addresses.

## Created and changed

| Path | Result |
|---|---|
| `devops/onboarding.sh` | Checks that the GitHub CLI (`gh`) is installed and that `gh auth status` succeeds. In guided mode it installs `gh` from GitHub's official apt repository after Yes, and asks the owner to run `gh auth login`, then checks again. |
| `devops/README.md` | The `gh` checks, the guided install, and the FR-00002 test. |
| `doc/howto-cloudflare-setup.md` | Step 10: install the GitHub CLI and sign in with `gh auth login`; `gh auth status` in Verification. |
| `tests/FR-00002/onboarding_gh_test.sh` | The FR-00002 tests. |
| `tests/FR-00000/onboarding_test.sh`, `tests/FR-00001/onboarding_node_test.sh` | A signed-in stand-in `gh`, so the earlier onboarding tests keep passing. |
| `AGENTS.md` | The GitHub CLI section and the FR-00002 test command. |

No GitHub Issue was posted, created, or closed, and no automation was added.

## Implementation decisions

Approved by the project owner before the affected work.

| # | Decision |
|---|---|
| 1 | The `gh` checks run right after the `git` check, before Node.js. |
| 2 | No minimum `gh` version: any installed `gh` passes the installed check. |
| 3 | The signed-in check runs `gh auth status` with its output hidden and uses only its exit status. |
| 4 | Installation uses GitHub's official apt commands after Yes; `sudo` asks for the owner's password. |
| 5 | When `gh` is not signed in, guided mode explains that `gh auth login` is interactive, asks whether the owner has run it, and after Yes checks again for real. |
| 6 | Tests in `tests/FR-00002/onboarding_gh_test.sh`, using a fake repository and a stand-in `gh` that can be missing, signed out, or signed in; the FR-00000 and FR-00001 test sandboxes get a signed-in stand-in `gh`. |

## Findings during implementation

- **The test-first run failed as expected:** five of the six checks failed
  before the script was changed. The token check passed from the start,
  because the script did not yet call `gh`; it now guards against regressions.
- **The earlier onboarding tests needed a stand-in `gh`,** because the new
  checks would otherwise fail inside their sandboxes.

## Test results

| Test | Result |
|---|---|
| `tests/FR-00002/onboarding_gh_test.sh` | 6 passed |
| `tests/FR-00000/onboarding_test.sh` | 27 passed |
| `tests/FR-00001/onboarding_node_test.sh` | 10 passed |
| ShellCheck | no findings |
| `devops/onboarding.sh --check` on the owner's machine | 18 passed |

Verified from a clean clone of commit `dc60ef1`: the three onboarding tests,
ShellCheck, and `gh auth status`. `devops/onboarding.sh --check` passed 18 of
18 after `pnpm install --frozen-lockfile`; before it, only the project
dependencies check failed, as expected in a fresh clone. No file in the clone
changed.

## Limitations and follow-up work

- The guided install supports Ubuntu and Debian only, like the other
  installs in the script.
- No minimum `gh` version is enforced.

## GitHub Issue completion recap

> FR-00002 GitHub CLI onboarding is implemented. The onboarding script checks
> that `gh` is installed and signed in, offers GitHub's official installation
> after Yes, and never signs in for the owner or prints the token. The setup
> guide, `devops/README.md`, and `AGENTS.md` describe the `gh` step. All
> FR-00000, FR-00001, and FR-00002 onboarding tests pass, also from a clean
> clone.
