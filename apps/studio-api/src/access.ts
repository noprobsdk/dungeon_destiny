// FR-00003, FR-00004: who studio-api lets in, and what they may do. The
// SuperAdmin, set at deploy time, is let in with every permission. Anyone else
// must be an active user with at least one role, and gets the permissions of
// their roles. When the SuperAdmin email address is not set, nobody is a
// SuperAdmin.
import { and, eq } from "drizzle-orm";
import { PERMISSION_NAMES } from "@dungeon-destiny/contracts";
import type { StaffIdentity } from "@dungeon-destiny/contracts";
import { rolePermissions, roles, userRoles, users } from "./db/schema";
import type { Actor, Database } from "./shared/context";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isSuperAdmin(email: string, superAdminEmail: string): boolean {
  const expected = normalizeEmail(superAdminEmail);
  if (expected === "") return false;
  return normalizeEmail(email) === expected;
}

export async function resolveActor(db: Database, env: Env, identity: StaffIdentity): Promise<Actor | null> {
  const email = normalizeEmail(identity.email);
  if (isSuperAdmin(email, env.SUPERADMIN_EMAIL)) {
    return { email, displayName: "SuperAdmin", superadmin: true, userId: null, roles: [], permissions: new Set(PERMISSION_NAMES) };
  }
  const user = await db.query.users.findFirst({ where: and(eq(users.email, email), eq(users.status, "active")) });
  if (!user) return null;
  const rows = await db
    .select({ roleId: roles.id, roleName: roles.name, permission: rolePermissions.permissionName })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));
  if (rows.length === 0) return null;
  const roleMap = new Map<string, string>();
  const permissions = new Set<string>();
  for (const row of rows) {
    roleMap.set(row.roleId, row.roleName);
    if (row.permission) permissions.add(row.permission);
  }
  return {
    email,
    displayName: user.displayName,
    superadmin: false,
    userId: user.id,
    roles: [...roleMap].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    permissions,
  };
}
