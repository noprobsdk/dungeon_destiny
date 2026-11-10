// FR-00005 tests for the gateway request log: one JSON line per request with
// fixed fields, and nothing that identifies a person.
import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appHeaders, call } from "./helpers";

let lines: string[] = [];

beforeEach(() => {
  lines = [];
  vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function onlyLine(): Record<string, unknown> {
  expect(lines).toHaveLength(1);
  return JSON.parse(lines[0]!) as Record<string, unknown>;
}

describe("FR-00005: request log", () => {
  it("FR-00005: a request without app headers writes one line with the fixed fields", async () => {
    const { body } = await call("/health");
    const line = onlyLine();
    expect(line).toEqual({
      event: "request",
      requestId: body.meta.requestId,
      method: "GET",
      path: "/health",
      status: 200,
      code: null,
      durationMs: expect.any(Number),
      environment: "dev",
      versionId: env.CF_VERSION_METADATA.id,
    });
  });

  it("FR-00005: a version check writes platform, build, and upToDate", async () => {
    await call("/app/version", { headers: appHeaders("android", "1") });
    const line = onlyLine();
    expect(line.platform).toBe("android");
    expect(line.build).toBe(1);
    expect(line.versionCheck).toBe("upToDate");
    expect(line.status).toBe(200);
  });

  it("FR-00005: a refused old build writes updateRequired with HTTP 426", async () => {
    await call("/health", { headers: appHeaders("android", "0") });
    const line = onlyLine();
    expect(line.versionCheck).toBe("updateRequired");
    expect(line.status).toBe(426);
    expect(line.code).toBe("APP_UPDATE_REQUIRED");
  });

  it("FR-00005: invalid app headers write invalidHeaders", async () => {
    await call("/app/version", { headers: appHeaders("ios", "1") });
    const line = onlyLine();
    expect(line.versionCheck).toBe("invalidHeaders");
    expect(line.code).toBe("INVALID_APP_HEADERS");
    expect(line).not.toHaveProperty("platform");
    expect(line).not.toHaveProperty("build");
  });

  it("FR-00005: the log contains no IP address, other header, or query string", async () => {
    await call("/health?token=query-secret-value", {
      headers: {
        ...appHeaders("android", "1"),
        "CF-Connecting-IP": "203.0.113.77",
        "X-Forwarded-For": "198.51.100.23",
        "User-Agent": "fr-00005-user-agent",
        Authorization: "Bearer header-secret-value",
        Cookie: "session=cookie-secret-value",
      },
    });
    const raw = lines.join("\n");
    for (const forbidden of [
      "203.0.113.77",
      "198.51.100.23",
      "fr-00005-user-agent",
      "header-secret-value",
      "cookie-secret-value",
      "query-secret-value",
      "token=",
    ]) {
      expect(raw).not.toContain(forbidden);
    }
    expect(onlyLine().path).toBe("/health");
  });
});
