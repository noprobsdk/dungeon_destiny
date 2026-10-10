// FR-00004: Content Studio roles and the permissions each role has. A role
// can be deleted only while no user has it.
import { and, count, eq, ne } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { ERROR_CODES, idInput, roleInput, updateRoleInput } from "@dungeon-destiny/contracts";
import type { ApiResponse, RoleView } from "@dungeon-destiny/contracts";
import { auditInsert } from "../audit/audit";
import { rolePermissions, roles, userRoles } from "../db/schema";
import { fail, now, ok } from "../shared/context";
import type { RequestContext } from "../shared/context";

type Result<T> = ApiResponse<T | null>;

async function roleView(context: RequestContext, id: string): Promise<RoleView | null> {
  const role = await context.db.query.roles.findFirst({ where: eq(roles.id, id) });
  if (!role) return null;
  const granted = await context.db
    .select({ name: rolePermissions.permissionName })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, id))
    .orderBy(rolePermissions.permissionName);
  const [users] = await context.db.select({ n: count() }).from(userRoles).where(eq(userRoles.roleId, id));
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissionNames: granted.map((row) => row.name),
    userCount: users?.n ?? 0,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

function invalid(context: RequestContext, issues: unknown): ApiResponse<null> {
  return fail(context, ERROR_CODES.VALIDATION_FAILED, "The input is not valid.", issues);
}

async function nameTaken(context: RequestContext, name: string, exceptId?: string): Promise<boolean> {
  const where = exceptId ? and(eq(roles.name, name), ne(roles.id, exceptId)) : eq(roles.name, name);
  return (await context.db.query.roles.findFirst({ where })) !== undefined;
}

function snapshot(view: RoleView) {
  return { name: view.name, description: view.description, permissionNames: view.permissionNames };
}

export async function listRoles(context: RequestContext): Promise<Result<RoleView[]>> {
  const all = await context.db.select({ id: roles.id }).from(roles).orderBy(roles.name);
  const views: RoleView[] = [];
  for (const { id } of all) {
    const view = await roleView(context, id);
    if (view) views.push(view);
  }
  return ok(context, "Roles.", views);
}

export async function getRole(context: RequestContext, rawId: unknown): Promise<Result<RoleView>> {
  const id = idInput.safeParse(rawId);
  if (!id.success) return invalid(context, id.error.issues);
  const view = await roleView(context, id.data);
  if (!view) return fail(context, ERROR_CODES.NOT_FOUND, "No role has this ID.");
  return ok(context, "Role.", view);
}

export async function createRole(context: RequestContext, raw: unknown): Promise<Result<RoleView>> {
  const input = roleInput.safeParse(raw);
  if (!input.success) return invalid(context, input.error.issues);
  const { name, description, permissionNames } = input.data;
  if (await nameTaken(context, name)) return fail(context, ERROR_CODES.CONFLICT, "A role with this name already exists.");
  const id = crypto.randomUUID();
  const timestamp = now();
  const granted = [...new Set(permissionNames)].sort();
  const statements: BatchItem<"sqlite">[] = [
    context.db.insert(roles).values({ id, name, description, createdAt: timestamp, updatedAt: timestamp }),
    ...granted.map((permissionName) => context.db.insert(rolePermissions).values({ roleId: id, permissionName })),
    auditInsert(context, "role.create", "role", id, null, { name, description, permissionNames: granted }),
  ];
  await context.db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return ok(context, "Role created.", await roleView(context, id));
}

export async function updateRole(context: RequestContext, rawId: unknown, raw: unknown): Promise<Result<RoleView>> {
  const id = idInput.safeParse(rawId);
  if (!id.success) return invalid(context, id.error.issues);
  const input = updateRoleInput.safeParse(raw);
  if (!input.success) return invalid(context, input.error.issues);
  const before = await roleView(context, id.data);
  if (!before) return fail(context, ERROR_CODES.NOT_FOUND, "No role has this ID.");
  const change = input.data;
  if (change.name !== undefined && (await nameTaken(context, change.name, before.id))) {
    return fail(context, ERROR_CODES.CONFLICT, "A role with this name already exists.");
  }
  const statements: BatchItem<"sqlite">[] = [
    context.db
      .update(roles)
      .set({
        ...(change.name !== undefined ? { name: change.name } : {}),
        ...(change.description !== undefined ? { description: change.description } : {}),
        updatedAt: now(),
      })
      .where(eq(roles.id, before.id)),
  ];
  const granted = change.permissionNames !== undefined ? [...new Set(change.permissionNames)].sort() : before.permissionNames;
  if (change.permissionNames !== undefined) {
    statements.push(context.db.delete(rolePermissions).where(eq(rolePermissions.roleId, before.id)));
    for (const permissionName of granted) {
      statements.push(context.db.insert(rolePermissions).values({ roleId: before.id, permissionName }));
    }
  }
  statements.push(
    auditInsert(context, "role.update", "role", before.id, snapshot(before), {
      name: change.name ?? before.name,
      description: change.description ?? before.description,
      permissionNames: granted,
    }),
  );
  await context.db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return ok(context, "Role saved.", await roleView(context, before.id));
}

export async function deleteRole(context: RequestContext, rawId: unknown): Promise<ApiResponse<null>> {
  const id = idInput.safeParse(rawId);
  if (!id.success) return invalid(context, id.error.issues);
  const before = await roleView(context, id.data);
  if (!before) return fail(context, ERROR_CODES.NOT_FOUND, "No role has this ID.");
  if (before.userCount > 0) return fail(context, ERROR_CODES.CONFLICT, "This role is still given to users. Remove it from them first.");
  await context.db.batch([
    context.db.delete(rolePermissions).where(eq(rolePermissions.roleId, before.id)),
    context.db.delete(roles).where(eq(roles.id, before.id)),
    auditInsert(context, "role.delete", "role", before.id, snapshot(before), null),
  ]);
  return ok(context, "Role deleted.", null);
}
