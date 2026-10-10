// FR-00004: keeps the Cloudflare Access group "Content Studio users" in step
// with Content Studio's active users (DD-021). studio-api always sends the
// whole member list, so every update also repairs any earlier difference. The
// API token is a Worker secret; it is sent only to Cloudflare's API and never
// returned, logged, or shown.
import { normalizeEmail } from "../access";

export const ACCESS_GROUP_NAME = "Content Studio users";

function groupUrl(env: Env): string | null {
  if (!env.CF_API_BASE || !env.CF_ACCOUNT_ID || !env.ACCESS_GROUP_ID || !env.CF_ACCESS_GROUP_TOKEN) return null;
  return `${env.CF_API_BASE}/accounts/${env.CF_ACCOUNT_ID}/access/groups/${env.ACCESS_GROUP_ID}`;
}

function headers(env: Env): HeadersInit {
  return { Authorization: `Bearer ${env.CF_ACCESS_GROUP_TOKEN}`, "Content-Type": "application/json" };
}

function succeeded(body: unknown): boolean {
  return typeof body === "object" && body !== null && (body as { success?: unknown }).success === true;
}

// The group's members: the SuperAdmin and every active user, once each.
export function groupMembers(env: Env, activeEmails: string[]): string[] {
  const members = new Set(activeEmails.map(normalizeEmail));
  const superadmin = normalizeEmail(env.SUPERADMIN_EMAIL);
  if (superadmin !== "") members.add(superadmin);
  return [...members].sort();
}

// Replaces the group's members. Returns false when the group is not
// configured or Cloudflare refuses, so the caller saves nothing.
export async function replaceGroupMembers(env: Env, activeEmails: string[]): Promise<boolean> {
  const url = groupUrl(env);
  if (!url) return false;
  const include = groupMembers(env, activeEmails).map((email) => ({ email: { email } }));
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: headers(env),
      body: JSON.stringify({ name: ACCESS_GROUP_NAME, include }),
    });
    return response.ok && succeeded(await response.json());
  } catch {
    return false;
  }
}

// The group's current members, or null when they cannot be read.
export async function readGroupMembers(env: Env): Promise<string[] | null> {
  const url = groupUrl(env);
  if (!url) return null;
  try {
    const response = await fetch(url, { method: "GET", headers: headers(env) });
    const body: unknown = await response.json();
    if (!response.ok || !succeeded(body)) return null;
    const include = (body as { result?: { include?: unknown } }).result?.include;
    if (!Array.isArray(include)) return null;
    return include
      .map((rule: unknown) => (rule as { email?: { email?: unknown } }).email?.email)
      .filter((email): email is string => typeof email === "string")
      .map(normalizeEmail);
  } catch {
    return null;
  }
}
