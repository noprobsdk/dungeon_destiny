# FR-00004: Content D1 and user model

- **Status:** In Specification
- **Sprint:** Not used. The project has one developer, so sprints are not used.
- **Type:** Implementation
- **Tracking:** No GitHub Issue yet.

## 1. Purpose

Give Content Studio its database and its user model: Content D1, the users,
roles, and permissions that decide who may sign in and what they may do, and
the first real screens to manage them. It also gives Content Studio its
layout, built with Mantine in the POC's colours.

After this Feature Request, the project owner can add people to Content
Studio, give them roles, and see what every permission allows and why. Later
Feature Requests add their own permissions as they build their screens.

Security by default: every active user is added to the Cloudflare Access
policy. The policy lets in the SuperAdmin and the members of an Access group,
"Content Studio users", which `studio-api` keeps in step with the active users
through Cloudflare's API whenever a user is created, deactivated, reactivated,
or changes email address. People who are not users cannot even request a
one-time PIN. `studio-api` still checks every request against the `users`
table, so a deactivated user is refused at once, even while their Access
session lasts. A user added in Content Studio can sign in at once, with no
Terraform change.

## 2. Implementation sequence

1. Move this Feature Request to `Backlog`, then to `In Progress`.
2. Review the implementation decisions with the project owner.
3. Write the database, `studio-api`, `studio-web`, page, and Terraform tests,
   and confirm they fail.
4. Add Content D1 and the migrations, then the `studio-api` methods, then the
   pages, until the tests pass.
5. Apply Terraform, apply the migrations to Content D1, and deploy both
   Workers.
6. Verify the deployed Content Studio with the project owner.
7. Add the commands to `AGENTS.md` and the database how-to.
8. Complete `implementation_report.md` and move to `In Review`.
9. After acceptance, hand over to documentation and as-built.

## 3. Scope boundaries

This Feature Request creates or changes:

- the `dd-dev-content` Content D1 database in `infra/terraform/envs/dev/`,
  bound only to `studio-api`;
- the Drizzle schema in `apps/studio-api/src/db/schema.ts` and the numbered
  migrations in `apps/studio-api/migrations/`;
- the `studio-api` methods for the signed-in person, users, roles,
  permissions, and audit records;
- the `studio-web` routes that pass them on;
- the Content Studio layout and pages, built with Mantine and themed with the
  POC's colours;
- the permission list in `packages/contracts/`;
- the Access group "Content Studio users", the Access policy that allows the
  SuperAdmin and that group, and the `studio-api` code that keeps the group in
  step with the active users;
- the `CF_ACCESS_GROUP_TOKEN` Worker secret, declared as required, and a
  setup-guide step for creating, storing, and rotating its Cloudflare API
  token;
- DD-021, recording how Worker secrets are managed;
- a how-to for viewing Content D1;
- the FR-00004 tests in `tests/FR-00004/`; and
- the commands in `AGENTS.md`.

This Feature Request does not create or change:

- content screens, such as Heroes, Equipment, or Hero levels;
- a page for viewing audit records, or a "My account" page;
- inviting users by email;
- machine accounts or Access service tokens;
- private R2 or the 3D asset store;
- Player D1 or any player data; or
- deployment automation.

## 4. Source

- [DD-006, DD-008, DD-017, and DD-020](../../../doc/12-decisions/decision-log.md),
  and DD-021, added by this Feature Request.
- [Access and edge services](../../../doc/08-technical/service-architecture/access-and-edge.md),
  sections "Cloudflare Access" and "Staff users".
- [Frontends](../../../doc/08-technical/service-architecture/frontends.md),
  section "Content Studio".
- [Data services](../../../doc/08-technical/service-architecture/data-services.md).
- [Database change management](../../../doc/08-technical/database-change-management.md).
- [Content Studio](../../../doc/09-content-studio/README.md).
- [FR-00003](../FR-00003-worker-access-policy/README.md): the Workers, Access
  setup, and SuperAdmin this Feature Request builds on.
- [`doc/test-driven-development.md`](../../../doc/test-driven-development.md).
- Design reference, not copied: the POC Content Studio's colours and dark side
  menu, and the role and permission model of the spatie/laravel-permission
  package.

Design baseline commit: not yet set; it is the commit that contains this
Feature Request.

Source-document readiness gate: passes for this scope. This Feature Request
closes the open decision on Worker secret management for its own secret, in
DD-021. The open decisions on CI/CD and the customer-service corrections do
not affect it.

## 5. Target ownership

- **Database:** Content D1 is owned by `studio-api`; no other Worker binds it.
- **Online services:** `studio-api` owns users, roles, permissions, and audit
  records; `studio-web` owns the pages and the Access token check. Terraform
  owns the database and the Access setup; Wrangler owns the code versions and
  applies the migrations.
- **Content Studio:** the layout and the user, role, and permission pages.
- **Runtime manifest, Godot app, 3D production:** N/A.

## 6. Prerequisites and deployment blockers

- FR-00003 is `Pending documentation` or later.
- The project owner has created the Cloudflare API token for Access groups and
  stored it as the `CF_ACCESS_GROUP_TOKEN` secret, following the new
  setup-guide step.
- The project owner can receive one-time PINs at a second email address, to
  check a user other than the SuperAdmin.

Blockers: none.

## 7. Approved decisions

- Users are human only. A user is anyone who signs in to Content Studio, not
  only employees; what they may do comes from their roles. Players are never
  users and are never stored in Content D1.
- The role and permission model follows spatie/laravel-permission, adapted:
  `users`, `roles`, `permissions`, `role_permissions`, and `user_roles`, with
  no direct user permissions, no guards, and no teams.
- Permissions are defined in code in `packages/contracts/`, each with a name,
  an area, a description of what it allows, and a purpose saying why it
  exists and who should have it. A migration copies them into the
  `permissions` table. Roles, and which permissions each role has, are managed
  in Content Studio. Each later Feature Request adds the permissions its
  screens need.
- The SuperAdmin from FR-00003 stays defined in configuration, passes every
  permission check, and cannot be changed or deactivated in Content Studio.
- Users are deactivated, never deleted. A deactivated user, or a user with no
  role, is refused.
- Every change to a user or a role is recorded in `audit_events`.
- Every active user is added to the Access group "Content Studio users", and
  the Access policy allows only the SuperAdmin and that group. Terraform
  creates the group and leaves its members to `studio-api`. `studio-api`
  updates the group first and saves a user change only when that succeeded;
  a "check sync" action, for users with `users.manage`, compares the group
  with the active users and reports any difference. `studio-api` still decides
  who is let in from the `users` table.
- `studio-api` calls Cloudflare's API with a Cloudflare account API token that
  has only the permission `Access: Organizations, Identity Providers, and
  Groups Write`. The project owner creates it by hand and stores it only as
  the `CF_ACCESS_GROUP_TOKEN` Worker secret with `wrangler secret put`, never
  in the repository, Terraform state, credential file, or a log. The secret is
  declared as required, so a deploy fails without it. Rotation: create a new
  token, store it, then delete the old one (DD-021).
- Content D1 is `dd-dev-content`, created by Terraform with
  `jurisdiction = "eu"`, and bound to `studio-api` as `CONTENT_D1`.
- IDs are text UUIDs from `crypto.randomUUID()`; times are ISO 8601 UTC text.
- Drizzle ORM 0.45.4 and drizzle-kit 0.31.11; drizzle-kit generates the
  numbered migrations, and Wrangler applies them. Applying a migration to
  Cloudflare needs the project owner's approval.
- Content Studio uses Mantine 9.7.1, with a theme in the POC's colours: gold
  as the primary colour, parchment backgrounds, and a dark side menu. Text
  and background colour pairs meet WCAG AA contrast for normal text.
- Responses use the standard response format (DD-019).

## 8. Data model and Content Studio

**Tables in Content D1:**

| Table | Columns |
|---|---|
| `users` | `id`, `email` (unique, stored in lower case), `display_name`, `status` (`active` or `deactivated`), `created_at`, `updated_at` |
| `roles` | `id`, `name` (unique), `description`, `created_at`, `updated_at` |
| `permissions` | `name` (primary key, such as `users.manage`), `area`, `description`, `purpose`, `added_by` (the Feature Request) |
| `role_permissions` | `role_id`, `permission_name`; primary key on both |
| `user_roles` | `user_id`, `role_id`; primary key on both |
| `audit_events` | `id`, `occurred_at`, `actor_email`, `action`, `target_type`, `target_id`, `before`, `after` (JSON text), `request_id` |

**Permissions added by this Feature Request:** `users.view`, `users.manage`,
`roles.view`, and `roles.manage`, each with a description and a purpose.

**Pages:**

| Page | What it shows and does | Needs |
|---|---|---|
| Layout | Side menu, the signed-in person, and Sign out. The menu shows only the pages the person may use. | a signed-in user |
| Users | All users with email, name, roles, and status; search; filter by status. The SuperAdmin is shown as a fixed row. | `users.view` |
| User | Create and edit: email, display name, roles, status; deactivate and reactivate | `users.manage` |
| Roles | All roles with their number of users and permissions | `roles.view` |
| Role | Create and edit: name, description, and the permissions as a checklist grouped by area, with each permission's description and purpose; delete only while no user has the role | `roles.manage` |
| Permissions | Read-only: name, area, description, purpose, the roles that have it, and the Feature Request that added it | `roles.view` |

Nobody can change their own roles or status, so nobody can lock themselves
out or give themselves more permissions.

## 9. Runtime manifest and Godot runtime

N/A.

## 10. Online services and access

- `GET /api/me` returns the signed-in person's email address, display name,
  roles, and permissions, and whether they are the SuperAdmin.
- The user, role, and permission routes under `/api/` call `studio-api`
  through its typed RPC binding. Every `studio-api` method checks the
  permission it needs before reading or changing data, and refuses with HTTP
  403 and a stable `code` otherwise. Hiding a page or button is never the
  only protection.
- Invalid input is refused with HTTP 400 and a stable `code`; a duplicate email
  address or role name, or deleting a role still in use, with HTTP 409.
- Changes and their audit records are written in one D1 batch, so a change
  is never stored without its audit record.
- A change that affects who may sign in updates the Access group first, then
  writes the change; when the Cloudflare API call fails, nothing is saved and
  the person sees an error with a stable `code`.
- The Cloudflare API token is used only for the "Content Studio users" group
  and is never returned, logged, or shown.
- D1 queries use bound parameters only.

## 11. Player experience and UX

N/A for players. Staff see the Mantine layout and the pages in Section 8.

## 12. 3D assets and production contracts

N/A.

## 13. Logging, telemetry, and diagnostics

Audit records are written to `audit_events`. Each response's `meta.requestId`
is stored in its audit records. No application logging is added beyond
Cloudflare's defaults; email addresses and tokens are not logged.

## 14. Test-first implementation

Write these checks before the implementation and confirm they fail first:

- The migrations apply to an empty database and create every table in
  Section 8, and the `permissions` table matches the permission list in code.
- Every permission in code has a non-empty area, description, and purpose.
- An active user with a role is let in, with the permissions of their roles;
  a deactivated user, a user with no role, and an unknown email address are
  refused.
- The SuperAdmin passes every permission check.
- Each `studio-api` method refuses a person without its permission.
- Users can be created, listed, changed, deactivated, and reactivated; a
  duplicate email address is refused.
- Roles can be created, listed, changed, and deleted while unused; deleting a
  role in use and a duplicate role name are refused.
- Nobody can change their own roles or status.
- Every change writes an audit record with the person, the action, the record,
  and the values before and after.
- Creating, reactivating, or changing the email address of a user adds them to
  the Access group; deactivating removes them; when the Cloudflare API call
  fails, the user change is not saved.
- "Check sync" reports users missing from the group and group members who
  are not active users.
- The token is never returned, logged, or shown.
- The pages show only what the signed-in person may see and do, and the menu
  hides pages they may not use.
- The theme's text and background colour pairs meet WCAG AA contrast.
- Terraform declares `dd-dev-content` with `jurisdiction = "eu"`, the
  `CONTENT_D1` binding matches, the Access group exists with its members left
  to `studio-api`, and the Access policy allows only the SuperAdmin and the
  group.
- `CF_ACCESS_GROUP_TOKEN` is declared as a required secret of `studio-api`.
- No email address or credential is present in tracked files.

Every check is kept as a test in `tests/FR-00004/`, named after the check it
proves. The end-to-end test extends FR-00003's, with tokens from the local
key server, a local Content D1, and a stand-in for Cloudflare's API.

## 15. Implementation report

`implementation_report.md` is required before this Feature Request moves to
`In Review`. It must not contain credentials, keys, account IDs, tokens, or
email addresses.

## 16. Verification

- All Section 14 checks pass.
- `terraform apply` creates `dd-dev-content` and the Access group and changes
  the Access policy, and a second `plan` reports no changes.
- The migrations apply to `dd-dev-content` in Cloudflare.
- After deploying, the project owner signs in as the SuperAdmin, creates a
  role and a user for their second email address, and signs in as that user,
  who sees only the pages their role allows.
- An email address that is not a user cannot request a PIN.
- After the second user is deactivated, they are refused at once and removed
  from the Access group.
- The FR-00003 deployed checks still pass.
- The commands in `AGENTS.md` work from a clean checkout.

Acceptable evidence is command output, HTTP responses, and screenshots, with
credentials, tokens, and email addresses removed.

## 17. Acceptance criteria

- All verification checks in Section 16 have passed.
- `implementation_report.md` is complete.
- No unresolved decisions remain.
- No unapproved changes were made.

## 18. Unresolved decisions

None. Implementation details, such as the routing library, the Mantine
packages used, and the exact page layout, are settled in the
implementation-decision review before tests are written.
