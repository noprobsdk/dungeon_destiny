// FR-00003, FR-00004: the studio-api Worker (DD-017, DD-020). It has no public
// address; studio-web calls its RPC methods through a service binding and
// passes the signed-in person's identity, taken from a validated Access
// token, as a typed argument. Every method decides who is let in and checks
// the permission it needs before reading or changing data. Every result uses
// the standard response format (DD-019).
import { WorkerEntrypoint } from "cloudflare:workers";
import { ERROR_CODES } from "@dungeon-destiny/contracts";
import type {
  AccessSyncReport,
  ApiResponse,
  PermissionName,
  PermissionView,
  RoleView,
  SignedInPerson,
  StaffIdentity,
  StudioApiRpc,
  UserView,
} from "@dungeon-destiny/contracts";
import { resolveActor } from "./access";
import { checkAccessSync, listPermissions } from "./permissions/service";
import { createRole, deleteRole, getRole, listRoles, updateRole } from "./roles/service";
import { database, fail, ok, result } from "./shared/context";
import type { RequestContext } from "./shared/context";
import { createUser, getUser, listUsers, setUserStatus, updateUser } from "./users/service";

export { isSuperAdmin } from "./access";

export default class StudioApi extends WorkerEntrypoint<Env> implements StudioApiRpc {
  // Lets in the person, checks the permission, then runs the action.
  private async guarded<T>(
    identity: StaffIdentity,
    requestId: string,
    permission: PermissionName | null,
    action: (context: RequestContext) => Promise<ApiResponse<T>>,
  ): Promise<ApiResponse<T | null>> {
    const db = database(this.env);
    const base = { env: this.env, requestId };
    const actor = await resolveActor(db, this.env, identity);
    if (!actor) return fail(base, ERROR_CODES.NOT_STAFF, "You are not allowed to use Content Studio.");
    if (permission !== null && !actor.permissions.has(permission)) {
      return fail(base, ERROR_CODES.PERMISSION_DENIED, "You do not have permission to do this.");
    }
    return action({ ...base, db, actor });
  }

  async health(requestId: string): Promise<ApiResponse<null>> {
    return result(this.env, requestId, "ok", null, "studio-api is running", null);
  }

  async me(identity: StaffIdentity, requestId: string): Promise<ApiResponse<SignedInPerson | null>> {
    return this.guarded(identity, requestId, null, async (context) =>
      ok<SignedInPerson>(context, "Signed in.", {
        email: context.actor.email,
        displayName: context.actor.displayName,
        superadmin: context.actor.superadmin,
        roles: context.actor.roles,
        permissions: [...context.actor.permissions].sort(),
      }),
    );
  }

  async listUsers(identity: StaffIdentity, requestId: string): Promise<ApiResponse<UserView[] | null>> {
    return this.guarded(identity, requestId, "users.view", listUsers);
  }

  async getUser(identity: StaffIdentity, requestId: string, id: unknown): Promise<ApiResponse<UserView | null>> {
    return this.guarded(identity, requestId, "users.view", (context) => getUser(context, id));
  }

  async createUser(identity: StaffIdentity, requestId: string, input: unknown): Promise<ApiResponse<UserView | null>> {
    return this.guarded(identity, requestId, "users.manage", (context) => createUser(context, input));
  }

  async updateUser(identity: StaffIdentity, requestId: string, id: unknown, input: unknown): Promise<ApiResponse<UserView | null>> {
    return this.guarded(identity, requestId, "users.manage", (context) => updateUser(context, id, input));
  }

  async deactivateUser(identity: StaffIdentity, requestId: string, id: unknown): Promise<ApiResponse<UserView | null>> {
    return this.guarded(identity, requestId, "users.manage", (context) => setUserStatus(context, id, "deactivated"));
  }

  async reactivateUser(identity: StaffIdentity, requestId: string, id: unknown): Promise<ApiResponse<UserView | null>> {
    return this.guarded(identity, requestId, "users.manage", (context) => setUserStatus(context, id, "active"));
  }

  async checkAccessSync(identity: StaffIdentity, requestId: string): Promise<ApiResponse<AccessSyncReport | null>> {
    return this.guarded(identity, requestId, "users.manage", checkAccessSync);
  }

  async listRoles(identity: StaffIdentity, requestId: string): Promise<ApiResponse<RoleView[] | null>> {
    return this.guarded(identity, requestId, "roles.view", listRoles);
  }

  async getRole(identity: StaffIdentity, requestId: string, id: unknown): Promise<ApiResponse<RoleView | null>> {
    return this.guarded(identity, requestId, "roles.view", (context) => getRole(context, id));
  }

  async listPermissions(identity: StaffIdentity, requestId: string): Promise<ApiResponse<PermissionView[] | null>> {
    return this.guarded(identity, requestId, "roles.view", listPermissions);
  }

  async createRole(identity: StaffIdentity, requestId: string, input: unknown): Promise<ApiResponse<RoleView | null>> {
    return this.guarded(identity, requestId, "roles.manage", (context) => createRole(context, input));
  }

  async updateRole(identity: StaffIdentity, requestId: string, id: unknown, input: unknown): Promise<ApiResponse<RoleView | null>> {
    return this.guarded(identity, requestId, "roles.manage", (context) => updateRole(context, id, input));
  }

  async deleteRole(identity: StaffIdentity, requestId: string, id: unknown): Promise<ApiResponse<null>> {
    return this.guarded(identity, requestId, "roles.manage", (context) => deleteRole(context, id));
  }

  // studio-api is reached only through RPC; any HTTP request is refused.
  override async fetch(): Promise<Response> {
    const body = result(this.env, crypto.randomUUID(), "error", ERROR_CODES.NOT_FOUND, "studio-api has no HTTP endpoints.", null);
    return Response.json(body, { status: 404 });
  }
}
