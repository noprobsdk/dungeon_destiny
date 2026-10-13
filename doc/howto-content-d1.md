# Content D1 how-to

## Purpose

View the data in Content D1, Content Studio's database, without changing it:
the users, roles, permissions, and audit records added by
[FR-00004](../delivery/FR/FR-00004-content-d1-user-model/README.md), and the
migrations still to apply.

Changes to the data are made in Content Studio, and changes to the structure
through numbered migrations, following
[database change management](08-technical/database-change-management.md).
Everything in this guide only reads.

## When to use

- To check what Content Studio has stored, for example after creating a user
  or a role.
- To check whether `dd-dev-content` has migrations waiting.
- To look at the local database used by the tests and by `wrangler dev`.

## Prerequisites

- The setup in [the Cloudflare and Terraform setup how-to](howto-cloudflare-setup.md)
  is complete, and `devops/onboarding.sh --check` passes.
- The dependencies are installed with `pnpm install --frozen-lockfile`.

## Procedure

Working directory: the repository root.

### 1. Load the credentials

Needed for Cloudflare, not for the local database.

```bash
source ~/.config/dungeon-destiny/cloudflare.env
```

### 2. Run a named query

```bash
devops/db/query.sh users
```

| Query | Shows |
|---|---|
| `tables` | The tables in the database. |
| `users` | Each user's display name, status, roles, and last change. |
| `roles` | Each role with its description and its number of users and permissions. |
| `permissions` | Each permission with its area, the Feature Request that added it, and its description. |
| `audit` | The 20 latest audit records: time, action, and the record changed. |
| `migrations` | The migrations not yet applied. "No migrations to apply" means the database is up to date. |

The named queries leave out email addresses. `devops/db/query.sh` without a
query prints this list.

### 3. Run your own SELECT

```bash
devops/db/query.sh sql "SELECT name, area FROM permissions WHERE area = 'Users'"
```

The script accepts one `SELECT` statement and refuses anything else. Quote the
whole statement, and do not use a semicolon inside it.

### 4. Use the local database

Add `--local` before the query. The local database needs no credentials, but
it is empty until its migrations are applied:

```bash
pnpm --filter @dungeon-destiny/studio-api exec wrangler d1 migrations apply dd-dev-content --local --env dev
devops/db/query.sh --local tables
```

### 5. Use the dashboard instead

In the Cloudflare dashboard, open **Storage & databases** > **D1 SQL
database** > `dd-dev-content`. The **Tables** tab shows the data. Use the
**Console** tab for `SELECT` statements only.

## Verification

- `devops/db/query.sh migrations` reports that there are no migrations to
  apply.
- `devops/db/query.sh tables` lists `audit_events`, `permissions`,
  `role_permissions`, `roles`, `user_roles`, and `users`, with Wrangler's own
  `d1_migrations` table.
- `devops/db/query.sh permissions` lists `roles.manage`, `roles.view`,
  `users.manage`, and `users.view`, each added by FR-00004.

## Failure handling

- **"The Cloudflare credentials are not loaded":** repeat step 1, or add
  `--local`.
- **"Only one SELECT statement is allowed":** the statement is empty, is not a
  `SELECT`, or contains a semicolon.
- **Authentication error from Wrangler:** check the credential file against
  the setup how-to.
- **Migrations are waiting in Cloudflare:** do not apply them from this guide.
  Applying a migration changes the live database and needs the project
  owner's approval (`AGENTS.md`).
- **The data looks wrong:** correct it in Content Studio. Never change the data
  by hand: such a change has no audit record and is not reflected in the
  Access group.

## Security

- The `users` and `audit_events` tables contain email addresses. Your own
  `SELECT` can show them; do not paste such output into chat, a GitHub Issue,
  a pull request, or any file in this repository, which is public.
- Do not print the credential file's values.

## References

- [FR-00004: Content D1 and user model](../delivery/FR/FR-00004-content-d1-user-model/README.md)
- [Database change management](08-technical/database-change-management.md)
- [DD-020](12-decisions/decision-log.md)
- [Cloudflare D1: Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
