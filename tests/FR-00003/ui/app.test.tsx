// FR-00003 tests for Content Studio's pages. They render the React app in
// jsdom and answer its /api calls with stand-in responses in the standard
// response format.
import type { ApiResponse, ErrorCode, StaffMember } from "@dungeon-destiny/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../../apps/studio-web/src/app/App";

const SUPERADMIN = "superadmin@example.invalid";

function body<T>(status: "ok" | "error", code: ErrorCode | null, data: T, service: string): ApiResponse<T> {
  return {
    status,
    code,
    message: status === "ok" ? "OK." : "Refused.",
    data,
    meta: {
      requestId: "00000000-0000-4000-8000-000000000002",
      timestamp: "2026-10-09T00:00:00Z",
      service,
      environment: "dev",
      version: { id: "api-version-id", tag: "dev-20261009-120000", createdAt: "2026-10-09T12:00:00Z" },
    },
  };
}

type Answers = Record<string, { status: number; body: unknown }>;

function answer(answers: Answers) {
  const requested: string[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const path = typeof input === "string" ? input : input instanceof URL ? input.pathname : new URL(input.url).pathname;
    requested.push(path);
    const found = answers[path];
    if (!found) return Response.json(body("error", "NOT_FOUND", null, "studio-web"), { status: 404 });
    return Response.json(found.body, { status: found.status });
  });
  return requested;
}

const healthy = { status: 200, body: body("ok", null, null, "studio-api") };

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("FR-00003: Content Studio pages", () => {
  it("FR-00003: the signed-in page shows the SuperAdmin's email address and the studio-api status", async () => {
    const requested = answer({
      "/api/me": { status: 200, body: body<StaffMember>("ok", null, { email: SUPERADMIN, role: "superadmin" }, "studio-api") },
      "/api/health": healthy,
    });
    render(<App />);
    expect(await screen.findByRole("heading", { name: /welcome/i })).toBeTruthy();
    expect(await screen.findByText(SUPERADMIN)).toBeTruthy();
    expect(await screen.findByText(/studio-api is running/i)).toBeTruthy();
    expect(await screen.findByText(/dev-20261009-120000/)).toBeTruthy();
    expect(requested).toContain("/api/me");
    expect(requested).toContain("/api/health");
  });

  it("FR-00003: the not-allowed page is shown to anyone who is not let in", async () => {
    answer({
      "/api/me": { status: 403, body: body("error", "NOT_STAFF", null, "studio-api") },
      "/api/health": healthy,
    });
    render(<App />);
    expect(await screen.findByRole("heading", { name: /not allowed/i })).toBeTruthy();
    expect(screen.queryByText(/welcome/i)).toBeNull();
    expect(screen.queryByText(/studio-api is running/i)).toBeNull();
  });

  it("FR-00003: a missing or expired sign-in shows a page asking the person to sign in again", async () => {
    answer({
      "/api/me": { status: 401, body: body("error", "UNAUTHENTICATED", null, "studio-web") },
    });
    render(<App />);
    expect(await screen.findByRole("heading", { name: /sign in/i })).toBeTruthy();
    expect(screen.queryByText(/welcome/i)).toBeNull();
  });

  it("FR-00003: the signed-in page says when studio-api is not running", async () => {
    answer({
      "/api/me": { status: 200, body: body<StaffMember>("ok", null, { email: SUPERADMIN, role: "superadmin" }, "studio-api") },
      "/api/health": { status: 500, body: { unexpected: true } },
    });
    render(<App />);
    expect(await screen.findByRole("heading", { name: /welcome/i })).toBeTruthy();
    expect(await screen.findByText(/studio-api is not responding/i)).toBeTruthy();
  });
});
