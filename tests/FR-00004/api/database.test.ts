// FR-00004 tests for Content D1's migrations and the permission list.
import { env } from "cloudflare:workers";
import { PERMISSIONS } from "@dungeon-destiny/contracts";
import { describe, expect, it } from "vitest";
import "./helpers";

describe("FR-00004: Content D1", () => {
  it("FR-00004: the migrations apply to an empty database and create every table", async () => {
    const result = await env.CONTENT_D1.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name <> 'd1_migrations' ORDER BY name",
    ).all<{ name: string }>();
    expect(result.results.map((row) => row.name)).toEqual([
      "audit_events",
      "permissions",
      "role_permissions",
      "roles",
      "user_roles",
      "users",
    ]);
  });

  it("FR-00004: the permissions table matches the permission list in code", async () => {
    const result = await env.CONTENT_D1.prepare(
      "SELECT name, area, description, purpose, added_by AS addedBy FROM permissions ORDER BY name",
    ).all<{ name: string; area: string; description: string; purpose: string; addedBy: string }>();
    const expected = [...PERMISSIONS].map((p) => ({ ...p })).sort((a, b) => a.name.localeCompare(b.name));
    expect(result.results).toEqual(expected);
  });

  it("FR-00004: every permission in code has a non-empty area, description, and purpose", () => {
    expect(PERMISSIONS.length).toBeGreaterThan(0);
    for (const permission of PERMISSIONS) {
      expect(permission.name).toMatch(/^[a-z]+(\.[a-z-]+)+$/);
      expect(permission.area.trim()).not.toBe("");
      expect(permission.description.trim().length).toBeGreaterThan(10);
      expect(permission.purpose.trim().length).toBeGreaterThan(10);
      expect(permission.addedBy).toMatch(/^FR-\d{5}$/);
    }
  });

  it("FR-00004: FR-00004 adds users.view, users.manage, roles.view, and roles.manage", () => {
    expect(PERMISSIONS.filter((p) => p.addedBy === "FR-00004").map((p) => p.name)).toEqual([
      "users.view",
      "users.manage",
      "roles.view",
      "roles.manage",
    ]);
  });
});
