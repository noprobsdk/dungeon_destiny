// FR-00004 test helpers for studio-api. Each test starts from an empty local
// Content D1 with every migration applied, and Cloudflare's API is replaced by
// a stand-in that records calls and can fail on purpose. No real token, group,
// or account is used.
import { env, exports } from "cloudflare:workers";
import { applyD1Migrations, reset } from "cloudflare:test";
import type { StaffIdentity } from "@dungeon-destiny/contracts";
import { afterEach, beforeEach, vi } from "vitest";

export const SUPERADMIN = "superadmin@example.invalid";
export const REQUEST_ID = "00000000-0000-4000-8000-000000000004";
export const FAKE_TOKEN = "fr-00004-fake-access-group-token";
export const GROUP_ID = "fr-00004-test-group";
export const ACCOUNT_ID = "fr-00004-test-account";
export const API_BASE = "https://cloudflare-api.fr-00004.test/client/v4";

export const api = exports.default;

export function as(email: string): StaffIdentity {
  return { email };
}

export const superadmin = as(SUPERADMIN);

type GroupCall = { method: string; url: string; authorization: string | null; emails: string[] };

export const cloudflare = {
  calls: [] as GroupCall[],
  members: [] as string[],
  fail: false,
};

function groupUrl(): string {
  return `${API_BASE}/accounts/${ACCOUNT_ID}/access/groups/${GROUP_ID}`;
}

function includeEmails(body: unknown): string[] {
  if (typeof body !== "object" || body === null) return [];
  const include = (body as { include?: unknown }).include;
  if (!Array.isArray(include)) return [];
  return include
    .map((rule: unknown) => (rule as { email?: { email?: unknown } }).email?.email)
    .filter((email): email is string => typeof email === "string");
}

beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.CONTENT_D1, env.TEST_MIGRATIONS);
  cloudflare.calls = [];
  cloudflare.members = [SUPERADMIN];
  cloudflare.fail = false;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = new Request(input, init);
    if (request.url !== groupUrl()) {
      return new Response("unexpected request in test", { status: 599 });
    }
    const call: GroupCall = {
      method: request.method,
      url: request.url,
      authorization: request.headers.get("authorization"),
      emails: [],
    };
    if (request.method === "PUT") {
      call.emails = includeEmails(await request.json());
    }
    cloudflare.calls.push(call);
    if (cloudflare.fail) {
      return Response.json({ success: false, errors: [{ code: 10000, message: "Authentication error" }] }, { status: 403 });
    }
    if (request.method === "PUT") {
      cloudflare.members = call.emails;
    }
    return Response.json({
      success: true,
      errors: [],
      result: { id: GROUP_ID, name: "Content Studio users", include: cloudflare.members.map((email) => ({ email: { email } })) },
    });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const now = "2026-10-10T12:00:00.000Z";

export async function insertRole(name: string, permissionNames: string[] = []): Promise<string> {
  const id = crypto.randomUUID();
  await env.CONTENT_D1.prepare("INSERT INTO roles (id, name, description, created_at, updated_at) VALUES (?, ?, '', ?, ?)")
    .bind(id, name, now, now)
    .run();
  for (const permission of permissionNames) {
    await env.CONTENT_D1.prepare("INSERT INTO role_permissions (role_id, permission_name) VALUES (?, ?)").bind(id, permission).run();
  }
  return id;
}

export async function insertUser(
  email: string,
  roleIds: string[] = [],
  status: "active" | "deactivated" = "active",
): Promise<string> {
  const id = crypto.randomUUID();
  await env.CONTENT_D1.prepare(
    "INSERT INTO users (id, email, display_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(id, email, email.split("@")[0], status, now, now)
    .run();
  for (const roleId of roleIds) {
    await env.CONTENT_D1.prepare("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)").bind(id, roleId).run();
  }
  return id;
}

// A user with a role that has exactly these permissions.
export async function userWith(email: string, permissionNames: string[]): Promise<string> {
  const roleId = await insertRole(`role-${crypto.randomUUID().slice(0, 8)}`, permissionNames);
  return insertUser(email, [roleId]);
}

export async function count(table: string): Promise<number> {
  const row = await env.CONTENT_D1.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>();
  return row?.n ?? 0;
}

export type AuditRow = {
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string;
  before: string | null;
  after: string | null;
  request_id: string;
};

export async function auditFor(targetId: string): Promise<AuditRow[]> {
  const result = await env.CONTENT_D1.prepare(
    "SELECT actor_email, action, target_type, target_id, before, after, request_id FROM audit_events WHERE target_id = ? ORDER BY occurred_at",
  )
    .bind(targetId)
    .all<AuditRow>();
  return result.results;
}
