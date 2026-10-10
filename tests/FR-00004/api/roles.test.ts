// FR-00004 tests for managing roles and reading the permission list.
import { PERMISSIONS } from "@dungeon-destiny/contracts";
import { describe, expect, it } from "vitest";
import { REQUEST_ID, SUPERADMIN, api, auditFor, count, insertRole, insertUser, superadmin } from "./helpers";

describe("FR-00004: roles", () => {
  it("FR-00004: a role can be created with permissions, and roles are listed with their numbers of users and permissions", async () => {
    const created = await api.createRole(superadmin, REQUEST_ID, {
      name: "content-author",
      description: "Writes content.",
      permissionNames: ["users.view", "roles.view"],
    });
    expect(created.status).toBe("ok");
    expect([...(created.data?.permissionNames ?? [])].sort()).toEqual(["roles.view", "users.view"]);
    await insertUser("a@example.invalid", [created.data?.id ?? ""]);
    const list = await api.listRoles(superadmin, REQUEST_ID);
    expect(list.data?.map((r) => [r.name, r.userCount, r.permissionNames.length])).toEqual([["content-author", 1, 2]]);
  });

  it("FR-00004: a duplicate role name is refused with code CONFLICT", async () => {
    await insertRole("editor");
    const body = await api.createRole(superadmin, REQUEST_ID, { name: "editor", description: "", permissionNames: [] });
    expect(body.code).toBe("CONFLICT");
    expect(await count("roles")).toBe(1);
  });

  it("FR-00004: an unknown permission or an invalid role name is refused with code VALIDATION_FAILED", async () => {
    for (const input of [
      { name: "editor", description: "", permissionNames: ["heroes.fly"] },
      { name: "Editor Role", description: "", permissionNames: [] },
      { name: "", description: "", permissionNames: [] },
    ]) {
      expect((await api.createRole(superadmin, REQUEST_ID, input)).code, JSON.stringify(input)).toBe("VALIDATION_FAILED");
    }
  });

  it("FR-00004: a role can be changed, and its permissions replaced", async () => {
    const id = await insertRole("editor", ["users.view"]);
    const body = await api.updateRole(superadmin, REQUEST_ID, id, { description: "Edits.", permissionNames: ["roles.view"] });
    expect(body.data?.description).toBe("Edits.");
    expect(body.data?.permissionNames).toEqual(["roles.view"]);
  });

  it("FR-00004: a role can be deleted while unused; deleting a role in use is refused with code CONFLICT", async () => {
    const unused = await insertRole("unused", ["users.view"]);
    expect((await api.deleteRole(superadmin, REQUEST_ID, unused)).status).toBe("ok");
    const used = await insertRole("used");
    await insertUser("a@example.invalid", [used]);
    expect((await api.deleteRole(superadmin, REQUEST_ID, used)).code).toBe("CONFLICT");
    expect(await count("roles")).toBe(1);
  });

  it("FR-00004: every role change writes an audit record", async () => {
    const created = await api.createRole(superadmin, REQUEST_ID, { name: "editor", description: "", permissionNames: [] });
    const id = created.data?.id ?? "";
    await api.updateRole(superadmin, REQUEST_ID, id, { description: "Changed." });
    await api.deleteRole(superadmin, REQUEST_ID, id);
    const rows = await auditFor(id);
    expect(rows.map((r) => r.action)).toEqual(["role.create", "role.update", "role.delete"]);
    expect(rows.every((r) => r.actor_email === SUPERADMIN && r.target_type === "role")).toBe(true);
  });
});

describe("FR-00004: permissions", () => {
  it("FR-00004: the permission list shows each permission's area, description, purpose, the Feature Request that added it, and its roles", async () => {
    await insertRole("viewer", ["users.view"]);
    const body = await api.listPermissions(superadmin, REQUEST_ID);
    expect(body.data?.map((p) => p.name).sort()).toEqual(PERMISSIONS.map((p) => p.name).sort());
    const usersView = body.data?.find((p) => p.name === "users.view");
    const definition = PERMISSIONS.find((p) => p.name === "users.view");
    expect(usersView).toMatchObject({
      area: definition?.area,
      description: definition?.description,
      purpose: definition?.purpose,
      addedBy: "FR-00004",
    });
    expect(usersView?.roles.map((r) => r.name)).toEqual(["viewer"]);
  });
});
