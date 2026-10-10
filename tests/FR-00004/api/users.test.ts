// FR-00004 tests for managing users, the Access group, and audit records.
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  FAKE_TOKEN,
  REQUEST_ID,
  SUPERADMIN,
  api,
  as,
  auditFor,
  cloudflare,
  count,
  insertRole,
  insertUser,
  superadmin,
  userWith,
} from "./helpers";

describe("FR-00004: users", () => {
  it("FR-00004: a user can be created, with a lower-case email address, and is added to the Access group", async () => {
    const editor = await insertRole("editor", ["users.view"]);
    const body = await api.createUser(superadmin, REQUEST_ID, {
      email: "New.Person@Example.Invalid",
      displayName: "New Person",
      roleIds: [editor],
    });
    expect(body.status).toBe("ok");
    expect(body.data?.email).toBe("new.person@example.invalid");
    expect(body.data?.status).toBe("active");
    expect(body.data?.roles.map((r) => r.name)).toEqual(["editor"]);
    expect(cloudflare.calls.at(-1)?.method).toBe("PUT");
    expect(cloudflare.calls.at(-1)?.authorization).toBe(`Bearer ${FAKE_TOKEN}`);
    expect([...cloudflare.members].sort()).toEqual([SUPERADMIN, "new.person@example.invalid"].sort());
  });

  it("FR-00004: users are listed with their roles and status, and can be read one by one", async () => {
    const editor = await insertRole("editor", []);
    const id = await insertUser("a@example.invalid", [editor]);
    await insertUser("b@example.invalid", [], "deactivated");
    const list = await api.listUsers(superadmin, REQUEST_ID);
    expect(list.data?.map((u) => [u.email, u.status, u.roles.map((r) => r.name)])).toEqual([
      ["a@example.invalid", "active", ["editor"]],
      ["b@example.invalid", "deactivated", []],
    ]);
    const one = await api.getUser(superadmin, REQUEST_ID, id);
    expect(one.data?.email).toBe("a@example.invalid");
    const missing = await api.getUser(superadmin, REQUEST_ID, crypto.randomUUID());
    expect(missing.code).toBe("NOT_FOUND");
  });

  it("FR-00004: a duplicate email address is refused with code CONFLICT, and nothing changes", async () => {
    await insertUser("taken@example.invalid");
    const callsBefore = cloudflare.calls.length;
    const body = await api.createUser(superadmin, REQUEST_ID, { email: "TAKEN@example.invalid", displayName: "X", roleIds: [] });
    expect(body.code).toBe("CONFLICT");
    expect(await count("users")).toBe(1);
    expect(cloudflare.calls.length).toBe(callsBefore);
  });

  it("FR-00004: invalid input is refused with code VALIDATION_FAILED", async () => {
    for (const input of [
      { email: "not-an-email", displayName: "X", roleIds: [] },
      { email: "a@example.invalid", displayName: "", roleIds: [] },
      { email: "a@example.invalid", displayName: "X", roleIds: ["not-a-uuid"] },
      { email: "a@example.invalid", displayName: "X", roleIds: [], extra: true },
      "a string",
    ]) {
      const body = await api.createUser(superadmin, REQUEST_ID, input);
      expect(body.code, JSON.stringify(input)).toBe("VALIDATION_FAILED");
    }
    expect(await count("users")).toBe(0);
  });

  it("FR-00004: changing a user's email address replaces it in the Access group", async () => {
    const id = await insertUser("old@example.invalid");
    const body = await api.updateUser(superadmin, REQUEST_ID, id, { email: "new@example.invalid", displayName: "Renamed" });
    expect(body.status).toBe("ok");
    expect(body.data?.displayName).toBe("Renamed");
    expect([...cloudflare.members].sort()).toEqual([SUPERADMIN, "new@example.invalid"].sort());
  });

  it("FR-00004: deactivating removes the user from the Access group and refuses them at once; reactivating adds them back", async () => {
    const viewer = await insertRole("viewer", ["users.view"]);
    const id = await insertUser("member@example.invalid", [viewer]);
    cloudflare.members = [SUPERADMIN, "member@example.invalid"];
    const off = await api.deactivateUser(superadmin, REQUEST_ID, id);
    expect(off.data?.status).toBe("deactivated");
    expect(cloudflare.members).toEqual([SUPERADMIN]);
    expect((await api.me(as("member@example.invalid"), REQUEST_ID)).code).toBe("NOT_STAFF");
    const on = await api.reactivateUser(superadmin, REQUEST_ID, id);
    expect(on.data?.status).toBe("active");
    expect([...cloudflare.members].sort()).toEqual([SUPERADMIN, "member@example.invalid"].sort());
  });

  it("FR-00004: when Cloudflare refuses the Access group update, the user change is not saved", async () => {
    const id = await insertUser("member@example.invalid");
    cloudflare.fail = true;
    const created = await api.createUser(superadmin, REQUEST_ID, { email: "x@example.invalid", displayName: "X", roleIds: [] });
    expect(created.code).toBe("ACCESS_SYNC_FAILED");
    expect(await count("users")).toBe(1);
    const off = await api.deactivateUser(superadmin, REQUEST_ID, id);
    expect(off.code).toBe("ACCESS_SYNC_FAILED");
    const row = await env.CONTENT_D1.prepare("SELECT status FROM users WHERE id = ?").bind(id).first<{ status: string }>();
    expect(row?.status).toBe("active");
    expect(await count("audit_events")).toBe(0);
  });

  it("FR-00004: nobody can change their own roles or status", async () => {
    const managerId = await userWith("manager@example.invalid", ["users.manage", "users.view"]);
    const other = await insertRole("other", ["roles.manage"]);
    const ownRoles = await api.updateUser(as("manager@example.invalid"), REQUEST_ID, managerId, { roleIds: [other] });
    expect(ownRoles.code).toBe("CONFLICT");
    const ownStatus = await api.deactivateUser(as("manager@example.invalid"), REQUEST_ID, managerId);
    expect(ownStatus.code).toBe("CONFLICT");
    const ownName = await api.updateUser(as("manager@example.invalid"), REQUEST_ID, managerId, { displayName: "Me" });
    expect(ownName.status).toBe("ok");
  });

  it("FR-00004: every user change writes an audit record with the person, action, record, before and after, and request ID", async () => {
    const created = await api.createUser(superadmin, REQUEST_ID, { email: "a@example.invalid", displayName: "A", roleIds: [] });
    const id = created.data?.id ?? "";
    await api.updateUser(superadmin, REQUEST_ID, id, { displayName: "B" });
    await api.deactivateUser(superadmin, REQUEST_ID, id);
    const rows = await auditFor(id);
    expect(rows.map((r) => r.action)).toEqual(["user.create", "user.update", "user.deactivate"]);
    for (const row of rows) {
      expect(row.actor_email).toBe(SUPERADMIN);
      expect(row.target_type).toBe("user");
      expect(row.request_id).toBe(REQUEST_ID);
    }
    expect(rows[0]?.before).toBeNull();
    expect(JSON.parse(rows[1]?.before ?? "{}").displayName).toBe("A");
    expect(JSON.parse(rows[1]?.after ?? "{}").displayName).toBe("B");
  });
});

describe("FR-00004: check sync and the token", () => {
  it("FR-00004: check sync reports users missing from the group and group members who are not active users", async () => {
    await insertUser("missing@example.invalid");
    cloudflare.members = [SUPERADMIN, "leftover@example.invalid"];
    const body = await api.checkAccessSync(superadmin, REQUEST_ID);
    expect(body.data).toEqual({
      inSync: false,
      missingFromGroup: ["missing@example.invalid"],
      notActiveUsers: ["leftover@example.invalid"],
    });
    cloudflare.members = [SUPERADMIN, "missing@example.invalid"];
    expect((await api.checkAccessSync(superadmin, REQUEST_ID)).data?.inSync).toBe(true);
  });

  it("FR-00004: the Cloudflare API token is never returned in any response", async () => {
    const created = await api.createUser(superadmin, REQUEST_ID, { email: "a@example.invalid", displayName: "A", roleIds: [] });
    cloudflare.fail = true;
    const failed = await api.createUser(superadmin, REQUEST_ID, { email: "b@example.invalid", displayName: "B", roleIds: [] });
    const sync = await api.checkAccessSync(superadmin, REQUEST_ID);
    for (const body of [created, failed, sync]) {
      expect(JSON.stringify(body)).not.toContain(FAKE_TOKEN);
    }
  });
});
