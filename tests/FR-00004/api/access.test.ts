// FR-00004 tests for who studio-api lets in and what each person may do.
import { PERMISSION_NAMES } from "@dungeon-destiny/contracts";
import type { ApiResponse } from "@dungeon-destiny/contracts";
import { describe, expect, it } from "vitest";
import { REQUEST_ID, api, as, insertRole, insertUser, superadmin, userWith } from "./helpers";

describe("FR-00004: who is let in", () => {
  it("FR-00004: the SuperAdmin is let in with every permission", async () => {
    const body = await api.me(superadmin, REQUEST_ID);
    expect(body.status).toBe("ok");
    expect(body.data?.superadmin).toBe(true);
    expect([...(body.data?.permissions ?? [])].sort()).toEqual([...PERMISSION_NAMES].sort());
  });

  it("FR-00004: an active user with a role is let in, with the permissions of their roles", async () => {
    const viewer = await insertRole("viewer", ["users.view"]);
    const reader = await insertRole("reader", ["roles.view", "users.view"]);
    await insertUser("author@example.invalid", [viewer, reader]);
    const body = await api.me(as("Author@Example.Invalid"), REQUEST_ID);
    expect(body.status).toBe("ok");
    expect(body.data?.superadmin).toBe(false);
    expect(body.data?.email).toBe("author@example.invalid");
    expect(body.data?.roles.map((r) => r.name).sort()).toEqual(["reader", "viewer"]);
    expect([...(body.data?.permissions ?? [])].sort()).toEqual(["roles.view", "users.view"]);
  });

  it("FR-00004: a deactivated user, a user with no role, and an unknown email address are refused", async () => {
    const viewer = await insertRole("viewer", ["users.view"]);
    await insertUser("gone@example.invalid", [viewer], "deactivated");
    await insertUser("norole@example.invalid", []);
    for (const email of ["gone@example.invalid", "norole@example.invalid", "stranger@example.invalid"]) {
      const body = await api.me(as(email), REQUEST_ID);
      expect(body.status, email).toBe("error");
      expect(body.code, email).toBe("NOT_STAFF");
      expect(body.data, email).toBeNull();
    }
  });
});

type Call = { name: string; permission: string; run: (email: string) => Promise<ApiResponse<unknown>> };

const someId = "00000000-0000-4000-8000-0000000000aa";

const calls: Call[] = [
  { name: "listUsers", permission: "users.view", run: (e) => api.listUsers(as(e), REQUEST_ID) },
  { name: "getUser", permission: "users.view", run: (e) => api.getUser(as(e), REQUEST_ID, someId) },
  {
    name: "createUser",
    permission: "users.manage",
    run: (e) => api.createUser(as(e), REQUEST_ID, { email: "new@example.invalid", displayName: "New", roleIds: [] }),
  },
  { name: "updateUser", permission: "users.manage", run: (e) => api.updateUser(as(e), REQUEST_ID, someId, { displayName: "X" }) },
  { name: "deactivateUser", permission: "users.manage", run: (e) => api.deactivateUser(as(e), REQUEST_ID, someId) },
  { name: "reactivateUser", permission: "users.manage", run: (e) => api.reactivateUser(as(e), REQUEST_ID, someId) },
  { name: "checkAccessSync", permission: "users.manage", run: (e) => api.checkAccessSync(as(e), REQUEST_ID) },
  { name: "listRoles", permission: "roles.view", run: (e) => api.listRoles(as(e), REQUEST_ID) },
  { name: "getRole", permission: "roles.view", run: (e) => api.getRole(as(e), REQUEST_ID, someId) },
  { name: "listPermissions", permission: "roles.view", run: (e) => api.listPermissions(as(e), REQUEST_ID) },
  {
    name: "createRole",
    permission: "roles.manage",
    run: (e) => api.createRole(as(e), REQUEST_ID, { name: "new-role", description: "", permissionNames: [] }),
  },
  { name: "updateRole", permission: "roles.manage", run: (e) => api.updateRole(as(e), REQUEST_ID, someId, { description: "X" }) },
  { name: "deleteRole", permission: "roles.manage", run: (e) => api.deleteRole(as(e), REQUEST_ID, someId) },
];

describe("FR-00004: every studio-api method checks its permission", () => {
  for (const call of calls) {
    it(`FR-00004: ${call.name} refuses a user without ${call.permission} with code PERMISSION_DENIED`, async () => {
      const others = PERMISSION_NAMES.filter((p) => p !== call.permission);
      await userWith("limited@example.invalid", others);
      const body = await call.run("limited@example.invalid");
      expect(body.status).toBe("error");
      expect(body.code).toBe("PERMISSION_DENIED");
      expect(body.data).toBeNull();
    });

    it(`FR-00004: ${call.name} refuses someone who is not let in with code NOT_STAFF`, async () => {
      const body = await call.run("stranger@example.invalid");
      expect(body.code).toBe("NOT_STAFF");
    });
  }

  it("FR-00004: the SuperAdmin passes every permission check", async () => {
    for (const call of calls) {
      const body = await call.run(superadmin.email);
      expect(body.code, call.name).not.toBe("PERMISSION_DENIED");
      expect(body.code, call.name).not.toBe("NOT_STAFF");
    }
  });
});
