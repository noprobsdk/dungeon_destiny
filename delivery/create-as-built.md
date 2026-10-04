# Create as-built

This workflow publishes an implemented and accepted Feature Request in the
as-built documentation and completes its delivery record.

It does not implement code, apply database migrations, rebuild the game, or
repeat tests. It uses the accepted implementation and verification record
while checking the repository for factual consistency.

Every governed file change follows
[Documentation and delivery change management](../doc/document-change-management.md).

## Inputs

The workflow starts with:

- a GitHub Issue that identifies the Feature Request;
- an implemented and accepted Feature Request with no unresolved decisions;
- the corresponding Content Studio, database, Godot, or other implementation
  files; and
- the existing as-built documentation under `delivery/_as-built/`.

The GitHub Issue provides tracking information and implementation evidence. It
is never the source of Feature Request or as-built documentation content.

## Prepare the review files

1. Read the GitHub Issue without changing it. Confirm the issue number,
   Feature Request, tracking status, implementation recap, and accepted
   verification result.
2. Confirm the Git working tree and preserve unrelated changes.
3. Read the Feature Request `README.md` and `CHANGELOG.md`.
4. Inspect the implementation read-only to confirm what exists and detect
   drift from the Feature Request.
5. Inspect the as-built index, as-built changelog, existing related pages, and
   the Feature Request list in `delivery/README.md`.
6. If implementation and Feature Request conflict, do not hide the conflict:
   - when the implementation has been accepted and the Feature Request contains
     stale facts, prepare a factual Feature Request correction and changelog
     entry; or
   - when the accepted outcome is unclear, stop and report the blocker.
7. Determine the smallest complete proposal set. It normally contains:
   - the Feature Request `README.md`, changing its status to `Complete`;
   - the Feature Request `CHANGELOG.md`, recording documentation completion and
     any factual correction;
   - `delivery/README.md`, updating the Feature Request list status;
   - one new or updated page under `delivery/_as-built/`;
   - `delivery/_as-built/README.md`, linking the page; and
   - `delivery/_as-built/CHANGELOG.md`, recording the published change.

   When the first Feature Request is published, `delivery/_as-built/`,
   its `README.md`, and its `CHANGELOG.md` are created as part of this
   proposal set.
8. Create ignored sibling `<name>.proposed.md` and `<name>.full.diff` review
   files. When requested, all review files may be prepared before review, but
   governed changes are still reviewed and applied in the sequence required by
   the change-management policy.
9. Report the proposal paths and disclose every correction or unresolved
   issue. Do not change governed files, commit, push, or change the GitHub
   Issue during this phase.

## As-built documentation content

Published content is sourced from the Feature Request and its changelog, not
from `doc/` or the GitHub Issue. Implementation files verify the facts but do
not expand the approved scope.

Write for readers who did not take part in the implementation. Do not describe
a page as “as-built” in its prose merely because it is stored under
`delivery/_as-built/`.

Include the applicable:

- implemented features, content, data structures, or decisions;
- names and configuration;
- implementation location, such as the Content Studio, database schema and
  migrations, or Godot project, and important outputs;
- access and operational boundaries;
- accepted verification status; and
- replacement, removal, or delivery boundaries.

Do not publish secret values, credential material, private keys, signing keys,
tokens, or unnecessary environment values such as connection strings or
deployed endpoints.

The Feature Request may move to `Complete` only when implementation,
verification, and as-built documentation are complete and no unresolved
decision remains.

## Apply and publish

After explicit approval of a proposal:

1. apply only the approved content;
2. verify the governed file matches its proposal exactly;
3. run `git diff --check` and inspect the scoped diff;
4. remove only the temporary `.proposed.md` and `.full.diff` files after all
   approved changes have been applied and verified;
5. stage only the approved governed files;
6. commit only when explicitly requested, using a message such as
   `docs: publish FR-<number> <subject>`; and
7. push only when explicitly requested, then confirm that `origin/main`
   contains the commit and the working tree is clean.

Approval to change documentation is not approval to commit. Approval to commit
is not approval to push.

## Close the GitHub Issue

Perform this step only when explicitly requested and after the documentation
commit has been pushed.

1. Build the permanent GitHub URL for the published documentation page.
2. Verify that the correct GitHub Issue is open.
3. Post:

   ```text
   This has been added to Documentation: https://github.com/<owner>/<repository>/blob/main/<documentation-path>
   ```

4. Close the issue as completed.
5. Verify that the issue shows as closed as completed.

When an automation tool requires action-time confirmation for posting or
closing the issue, obtain that confirmation immediately before performing these
external actions.

Never post when the owner only asks for suggested comment text.

## Completion report

Report:

- the commit hash and push result;
- the published GitHub documentation link;
- the GitHub Issue comment and closing result;
- whether the working tree is clean; and
- any remaining unresolved issue.
