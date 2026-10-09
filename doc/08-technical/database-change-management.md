# Database change management

This document defines how Content Studio database schema and reference-data changes are designed, implemented, validated, and released.

It applies to the Cloudflare D1-compatible SQLite database, Drizzle schema definitions, migrations, seed data, API contracts, and runtime manifests.

## Sources of truth

The database structure has two connected sources of truth:

1. `apps/studio-api/src/db/schema.ts` defines the current application-level schema with Drizzle ORM (DD-020).
2. Numbered SQL files under `apps/studio-api/migrations/`, generated with `drizzle-kit` and applied with `wrangler d1 migrations apply`, define the ordered history required to create or upgrade a database.

Both must describe the same final structure.

Runtime initialization code is not a schema-migration system. It may verify prerequisites and insert safe reference data, but it must not replace numbered migrations.

## Change categories

Every database change must be identified as one of the following:

| Category | Examples | Requirement |
|---|---|---|
| Additive schema change | New nullable column, table, index, or optional relationship | Numbered migration |
| Breaking schema change | Rename, type change, required relationship, table replacement | Migration with explicit data-preservation plan |
| Data migration | Transforming existing records to a new structure | Versioned migration with validation |
| Reference-data change | Approved Body Archetype, Rig Profile, rule identifier, or similar stable record | Idempotent seed or controlled Content Studio change |
| Content change | Enemy, Hero, Dungeon Level, equipment, or other editable game content | Content Studio lifecycle and versioning; not a schema migration |

## Required workflow

Database changes follow this order:

1. Describe the proposed change, including From and To structures.
2. Identify affected tables, relations, API contracts, UI, manifests, and existing records.
3. Obtain approval before implementation.
4. Update `apps/studio-api/src/db/schema.ts`.
5. Generate the next numbered migration under `apps/studio-api/migrations/` with `drizzle-kit`, and review the generated SQL.
6. Preserve or explicitly transform existing data.
7. Update TypeScript types, API queries, validation, and UI consumers.
8. Apply the migration to a clean local database.
9. Apply the migration to a copy of an existing database containing representative data.
10. Run schema, foreign-key, API, build, and relevant UI tests.
11. Review the resulting schema and migrated data.
12. Commit the schema, migration, application changes, and documentation together.
13. Apply the migration to the test environment before deploying application code that requires it.
14. Apply the approved migration to production before publishing a manifest that uses the new schema.

## Migration rules

Migration files are forward-only and ordered.

A migration that has been shared or applied to a persistent environment must never be edited, renumbered, or deleted. Corrections require a new migration.

Migration names use the next available sequence number and a descriptive suffix:

`0015_rig_profiles.sql`

Schema changes must not depend on application startup order or undocumented manual database edits.

For an incompatible SQLite table change:

1. Create a replacement table with the new structure.
2. Copy and transform existing records.
3. Validate row counts, identifiers, required values, and foreign keys.
4. Replace the old table only after successful validation.
5. Recreate required indexes and constraints.

The operation must be implemented as safely and atomically as supported by the target D1 environment.

## Prohibited runtime operations

Application startup and normal API requests must never:

- drop permanent tables;
- recreate permanent tables;
- delete existing Content Studio records;
- overwrite user-edited content with seed values;
- silently change the database schema;
- silently assign compatibility relationships that have not been validated.

Statements such as the following are prohibited outside an explicit, reviewed migration:

`DROP TABLE IF EXISTS base_bodies`

`DROP TABLE IF EXISTS rig_profiles`

Runtime code may check whether required structures exist and fail with a clear schema-version error when the database is not compatible.

## Seed and reference-data rules

Seed operations must be idempotent.

Stable reference records use stable identifiers. Running a seed more than once must not create duplicates or erase Content Studio changes.

Unknown technical values must remain `NULL` or explicitly unverified. They must not be guessed.

A seed may create a missing stable reference record. It must not silently replace an existing validated record with different compatibility data.

Editable game content should be created and maintained through Content Studio rather than repeatedly inserted during application startup.

## Existing-data protection

Every migration must state how existing records are handled.

Adding a required field requires one of the following:

- a valid value can be derived deterministically from existing data;
- a temporary nullable field is introduced and populated through a reviewed migration;
- affected records are marked incomplete until explicitly configured.

A migration must not assign a Rig Profile, asset, animation set, equipment configuration, or other compatibility relationship solely from a naming assumption.

Before a potentially destructive migration is applied to a persistent environment, an export or recoverable backup must exist.

## Validation gates

A database change is not complete until all applicable checks pass:

- all migrations apply successfully to an empty database;
- an existing database upgrades without losing records;
- expected row counts are preserved;
- primary keys remain unique;
- foreign-key integrity passes;
- required indexes and constraints exist;
- seed operations can run repeatedly without destructive effects;
- runtime startup performs no destructive schema changes;
- TypeScript and application builds pass;
- affected API responses match their declared types;
- affected Content Studio pages load and display migrated data;
- publication validation rejects incomplete or incompatible records;
- the runtime manifest declares the correct schema version.

The validation result must distinguish between implementation complete, data migrated, and production applied.

## Rollback and correction

Applied migrations are not rolled back by rewriting history.

The default correction strategy is a new forward-fix migration.

A rollback may be used only when a tested reverse migration exists and no published manifest or newer data depends on the changed structure.

Restoring a backup is an operational recovery action and must not replace a proper forward migration in source control.

## Schema and manifest versions

A schema change that affects published data or the Godot contract must increment the Content Schema Version.

The published runtime manifest records the exact schema version it requires.

Godot must reject a manifest whose schema version it does not support. It must not infer missing fields or silently invent compatibility relationships.

## Ownership and approval

Technical schema structure is maintained in the application schema and migrations.

Concrete editable content is maintained through Content Studio.

3D compatibility facts must comply with the approved 3D production contracts before they are stored as validated database relationships.

A database change is approved only when its schema, migration, data-preservation behavior, validation results, and affected contracts have been reviewed together.
