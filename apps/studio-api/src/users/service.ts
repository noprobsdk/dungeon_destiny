// FR-00004: Content Studio users. A change that affects who may sign in
// updates the Access group first, and is saved only when that succeeded.
// Users are deactivated, never deleted, and nobody changes their own roles or
// status.
import { and, eq, inArray, ne } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { ERROR_CODES, createUserInput, idInput, updateUserInput } from "@dungeon-destiny/contracts";
import type { ApiResponse, UserStatus, UserView } from "@dungeon-destiny/contracts";
import { replaceGroupMembers } from "../access-group/cloudflare";
import { auditInsert } from "../audit/audit";
import { roles, userRoles, users } from "../db/schema";
import { fail, now, ok } from "../shared/context";
import type { RequestContext } from "../shared/context";

type Result<T> = ApiResponse<T | null>;

async function userView(context: RequestContext, id: string): Promise<UserView | null> {
  const user = await context.db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) return null;
  const assigned = await context.db
    .select({ id: roles.id, name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, id))
    .orderBy(roles.name);
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    roles: assigned,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function activeEmails(context: RequestContext, exceptId?: string): Promise<string[]> {
  const where = exceptId ? and(eq(users.status, "active"), ne(users.id, exceptId)) : eq(users.status, "active");
  const rows = await context.db.select({ email: users.email }).from(users).where(where);
  return rows.map((row) => row.email);
}

async function emailTaken(context: RequestContext, email: string, exceptId?: string): Promise<boolean> {
  const where = exceptId ? and(eq(users.email, email), ne(users.id, exceptId)) : eq(users.email, email);
  return (await context.db.query.users.findFirst({ where })) !== undefined;
}

async function rolesExist(context: RequestContext, roleIds: string[]): Promise<boolean> {
  if (roleIds.length === 0) return true;
  const found = await context.db.select({ id: roles.id }).from(roles).where(inArray(roles.id, roleIds));
  return found.length === new Set(roleIds).size;
}

function syncFailed(context: RequestContext): ApiResponse<null> {
  return fail(context, ERROR_CODES.ACCESS_SYNC_FAILED, "Cloudflare Access could not be updated, so nothing was saved. Try again.");
}

function invalid(context: RequestContext, issues: unknown): ApiResponse<null> {
  return fail(context, ERROR_CODES.VALIDATION_FAILED, "The input is not valid.", issues);
}

export async function listUsers(context: RequestContext): Promise<Result<UserView[]>> {
  const all = await context.db.select({ id: users.id }).from(users).orderBy(users.email);
  const views: UserView[] = [];
  for (const { id } of all) {
    const view = await userView(context, id);
    if (view) views.push(view);
  }
  return ok(context, "Users.", views);
}

export async function getUser(context: RequestContext, rawId: unknown): Promise<Result<UserView>> {
  const id = idInput.safeParse(rawId);
  if (!id.success) return invalid(context, id.error.issues);
  const view = await userView(context, id.data);
  if (!view) return fail(context, ERROR_CODES.NOT_FOUND, "No user has this ID.");
  return ok(context, "User.", view);
}

export async function createUser(context: RequestContext, raw: unknown): Promise<Result<UserView>> {
  const input = createUserInput.safeParse(raw);
  if (!input.success) return invalid(context, input.error.issues);
  const { email, displayName, roleIds } = input.data;
  if (await emailTaken(context, email)) return fail(context, ERROR_CODES.CONFLICT, "A user with this email address already exists.");
  if (!(await rolesExist(context, roleIds))) return invalid(context, [{ path: ["roleIds"], message: "Unknown role." }]);
  if (!(await replaceGroupMembers(context.env, [...(await activeEmails(context)), email]))) return syncFailed(context);

  const id = crypto.randomUUID();
  const timestamp = now();
  const statements: BatchItem<"sqlite">[] = [
    context.db.insert(users).values({ id, email, displayName, status: "active", createdAt: timestamp, updatedAt: timestamp }),
    ...[...new Set(roleIds)].map((roleId) => context.db.insert(userRoles).values({ userId: id, roleId })),
    auditInsert(context, "user.create", "user", id, null, { email, displayName, status: "active", roleIds }),
  ];
  await context.db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return ok(context, "User created.", await userView(context, id));
}

export async function updateUser(context: RequestContext, rawId: unknown, raw: unknown): Promise<Result<UserView>> {
  const id = idInput.safeParse(rawId);
  if (!id.success) return invalid(context, id.error.issues);
  const input = updateUserInput.safeParse(raw);
  if (!input.success) return invalid(context, input.error.issues);
  const before = await userView(context, id.data);
  if (!before) return fail(context, ERROR_CODES.NOT_FOUND, "No user has this ID.");
  const change = input.data;
  if (change.roleIds !== undefined && context.actor.userId === before.id) {
    return fail(context, ERROR_CODES.CONFLICT, "You cannot change your own roles.");
  }
  if (change.email !== undefined && change.email !== before.email && (await emailTaken(context, change.email, before.id))) {
    return fail(context, ERROR_CODES.CONFLICT, "A user with this email address already exists.");
  }
  if (change.roleIds !== undefined && !(await rolesExist(context, change.roleIds))) {
    return invalid(context, [{ path: ["roleIds"], message: "Unknown role." }]);
  }
  const emailChanged = change.email !== undefined && change.email !== before.email;
  if (emailChanged && before.status === "active") {
    const emails = [...(await activeEmails(context, before.id)), change.email as string];
    if (!(await replaceGroupMembers(context.env, emails))) return syncFailed(context);
  }

  const statements: BatchItem<"sqlite">[] = [
    context.db
      .update(users)
      .set({
        ...(change.email !== undefined ? { email: change.email } : {}),
        ...(change.displayName !== undefined ? { displayName: change.displayName } : {}),
        updatedAt: now(),
      })
      .where(eq(users.id, before.id)),
  ];
  if (change.roleIds !== undefined) {
    statements.push(context.db.delete(userRoles).where(eq(userRoles.userId, before.id)));
    for (const roleId of new Set(change.roleIds)) {
      statements.push(context.db.insert(userRoles).values({ userId: before.id, roleId }));
    }
  }
  const after = {
    email: change.email ?? before.email,
    displayName: change.displayName ?? before.displayName,
    roleIds: change.roleIds ?? before.roles.map((role) => role.id),
  };
  statements.push(
    auditInsert(
      context,
      "user.update",
      "user",
      before.id,
      { email: before.email, displayName: before.displayName, roleIds: before.roles.map((role) => role.id) },
      after,
    ),
  );
  await context.db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return ok(context, "User saved.", await userView(context, before.id));
}

export async function setUserStatus(context: RequestContext, rawId: unknown, status: UserStatus): Promise<Result<UserView>> {
  const id = idInput.safeParse(rawId);
  if (!id.success) return invalid(context, id.error.issues);
  const before = await userView(context, id.data);
  if (!before) return fail(context, ERROR_CODES.NOT_FOUND, "No user has this ID.");
  if (context.actor.userId === before.id) return fail(context, ERROR_CODES.CONFLICT, "You cannot change your own status.");
  if (before.status === status) return ok(context, "No change.", before);

  const others = await activeEmails(context, before.id);
  const emails = status === "active" ? [...others, before.email] : others;
  if (!(await replaceGroupMembers(context.env, emails))) return syncFailed(context);

  const action = status === "active" ? "user.reactivate" : "user.deactivate";
  await context.db.batch([
    context.db.update(users).set({ status, updatedAt: now() }).where(eq(users.id, before.id)),
    auditInsert(context, action, "user", before.id, { status: before.status }, { status }),
  ]);
  return ok(context, status === "active" ? "User reactivated." : "User deactivated.", await userView(context, before.id));
}

export { activeEmails };
