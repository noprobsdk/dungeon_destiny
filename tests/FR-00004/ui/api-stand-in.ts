// FR-00004: a stand-in for studio-web's /api, answering Content Studio's
// pages in the standard response format. A response can be held back, so
// tests can check what the page shows while it waits.
import type { ApiResponse, ErrorCode, PermissionView, RoleView, SignedInPerson, UserView } from "@dungeon-destiny/contracts";
import { vi } from "vitest";

export function body<T>(data: T, code: ErrorCode | null = null, message = code ? "Refused." : "OK."): ApiResponse<T> {
  return {
    status: code ? "error" : "ok",
    code,
    message,
    data,
    meta: {
      requestId: "00000000-0000-4000-8000-0000000000cc",
      timestamp: "2026-10-10T12:00:00Z",
      service: "studio-api",
      environment: "dev",
      version: { id: "api-version", tag: "dev-20261010-120000", createdAt: "2026-10-10T12:00:00Z" },
    },
  };
}

export function person(permissions: string[], superadmin = false): SignedInPerson {
  return { email: "me@example.invalid", displayName: "Me", superadmin, roles: [], permissions };
}

export const ALL = ["roles.manage", "roles.view", "users.manage", "users.view"];

export const roleEditor: RoleView = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "editor",
  description: "Edits content.",
  permissionNames: ["users.view"],
  userCount: 1,
  createdAt: "2026-10-10T12:00:00Z",
  updatedAt: "2026-10-10T12:00:00Z",
};

export const userAnna: UserView = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "anna@example.invalid",
  displayName: "Anna",
  status: "active",
  roles: [{ id: roleEditor.id, name: "editor" }],
  createdAt: "2026-10-10T12:00:00Z",
  updatedAt: "2026-10-10T12:00:00Z",
};

export const permissionList: PermissionView[] = [
  {
    name: "users.view",
    area: "Users",
    description: "See the list of users.",
    purpose: "For team leads who need to know who has access.",
    addedBy: "FR-00004",
    roles: [{ id: roleEditor.id, name: "editor" }],
  },
  {
    name: "roles.manage",
    area: "Roles",
    description: "Create and change roles.",
    purpose: "For the people responsible for access.",
    addedBy: "FR-00004",
    roles: [],
  },
];

type Answer = { status: number; body: unknown; hold?: Promise<void> };

export type Request = { method: string; path: string; body: unknown };

// Answers by "METHOD /path". Returns the list of requests received.
export function answer(answers: Record<string, Answer>): Request[] {
  const requests: Request[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const path = new URL(url, "http://localhost").pathname;
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const text = typeof init?.body === "string" ? init.body : undefined;
    requests.push({ method, path, body: text ? JSON.parse(text) : undefined });
    const found = answers[`${method} ${path}`];
    if (!found) return Response.json(body(null, "NOT_FOUND"), { status: 404 });
    if (found.hold) await found.hold;
    return Response.json(found.body, { status: found.status });
  });
  return requests;
}

export function held(): { promise: Promise<void>; release: () => void } {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

export function at(path: string): void {
  window.history.pushState({}, "", path);
}
