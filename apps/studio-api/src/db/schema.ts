// FR-00004: the Content D1 schema (DD-020). drizzle-kit generates the numbered
// migrations in ../../migrations from this file; both must describe the same
// structure (doc/08-technical/database-change-management.md). IDs are text
// UUIDs and times are ISO 8601 UTC text.
import { index, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Content Studio users: human people who sign in. Never players.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  status: text("status", { enum: ["active", "deactivated"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Copied from the permission list in packages/contracts by migrations.
export const permissions = sqliteTable("permissions", {
  name: text("name").primaryKey(),
  area: text("area").notNull(),
  description: text("description").notNull(),
  purpose: text("purpose").notNull(),
  addedBy: text("added_by").notNull(),
});

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionName: text("permission_name")
      .notNull()
      .references(() => permissions.name),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionName] })],
);

export const userRoles = sqliteTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] }), index("user_roles_role_id_idx").on(table.roleId)],
);

// Every change to a user or a role (DD-008). `before` and `after` are JSON.
export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    occurredAt: text("occurred_at").notNull(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    before: text("before"),
    after: text("after"),
    requestId: text("request_id").notNull(),
  },
  (table) => [index("audit_events_target_idx").on(table.targetType, table.targetId)],
);

