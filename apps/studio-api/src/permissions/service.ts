// FR-00004: the read-only permission list, with the roles that have each
// permission, and the Access group check.
import { eq } from "drizzle-orm";
import { ERROR_CODES } from "@dungeon-destiny/contracts";
import type { AccessSyncReport, ApiResponse, PermissionView } from "@dungeon-destiny/contracts";
import { normalizeEmail } from "../access";
import { readGroupMembers } from "../access-group/cloudflare";
import { permissions, rolePermissions, roles } from "../db/schema";
import { fail, ok } from "../shared/context";
import type { RequestContext } from "../shared/context";
import { activeEmails } from "../users/service";

export async function listPermissions(context: RequestContext): Promise<ApiResponse<PermissionView[] | null>> {
  const all = await context.db.select().from(permissions).orderBy(permissions.area, permissions.name);
  const grants = await context.db
    .select({ permission: rolePermissions.permissionName, id: roles.id, name: roles.name })
    .from(rolePermissions)
    .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
    .orderBy(roles.name);
  return ok(
    context,
    "Permissions.",
    all.map((permission) => ({
      name: permission.name,
      area: permission.area,
      description: permission.description,
      purpose: permission.purpose,
      addedBy: permission.addedBy,
      roles: grants.filter((grant) => grant.permission === permission.name).map(({ id, name }) => ({ id, name })),
    })),
  );
}

export async function checkAccessSync(context: RequestContext): Promise<ApiResponse<AccessSyncReport | null>> {
  const members = await readGroupMembers(context.env);
  if (!members) return fail(context, ERROR_CODES.ACCESS_SYNC_FAILED, "Cloudflare Access could not be read. Try again.");
  const expected = new Set((await activeEmails(context)).map(normalizeEmail));
  const inGroup = new Set(members);
  const superadmin = normalizeEmail(context.env.SUPERADMIN_EMAIL);
  const missingFromGroup = [...expected].filter((email) => !inGroup.has(email)).sort();
  const notActiveUsers = [...inGroup].filter((email) => !expected.has(email) && email !== superadmin).sort();
  return ok(context, "Access group checked.", {
    inSync: missingFromGroup.length === 0 && notActiveUsers.length === 0,
    missingFromGroup,
    notActiveUsers,
  });
}
