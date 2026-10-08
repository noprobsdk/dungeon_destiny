// FR-00001 tests for the gateway Worker's /health endpoint and the standard
// response format (DD-019). They run in the Workers runtime with the gateway
// Worker's dev configuration.
import { env, exports } from "cloudflare:workers";
import type { ApiResponse } from "@dungeon-destiny/contracts";
import { describe, expect, it } from "vitest";

const BASE = "https://dd-dev-gateway.example";

async function call(path: string, init?: RequestInit) {
  const response = await exports.default.fetch(`${BASE}${path}`, init);
  const body = (await response.json()) as ApiResponse<null>;
  return { response, body };
}

describe("FR-00001: /health", () => {
  it("FR-00001: GET /health returns HTTP 200 and the standard ok response", async () => {
    const { response, body } = await call("/health");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body.status).toBe("ok");
    expect(body.code).toBeNull();
    expect(body.message.length).toBeGreaterThan(0);
    expect(body.data).toBeNull();
    expect(body.meta.service).toBe("gateway");
    expect(body.meta.environment).toBe("dev");
  });

  it("FR-00001: /health reports the deployment version from Cloudflare's version metadata", async () => {
    const { body } = await call("/health");
    expect(body.meta.version).toEqual({
      id: env.CF_VERSION_METADATA.id,
      tag: env.CF_VERSION_METADATA.tag,
      createdAt: env.CF_VERSION_METADATA.timestamp,
    });
  });

  it("FR-00001: another method on /health returns HTTP 405 with Allow: GET and the standard error response", async () => {
    const { response, body } = await call("/health", { method: "POST" });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
    expect(body.status).toBe("error");
    expect(body.code).toBe("METHOD_NOT_ALLOWED");
    expect(body.message.length).toBeGreaterThan(0);
    expect(body.data).toBeNull();
    expect(body.meta.service).toBe("gateway");
  });

  it("FR-00001: another path returns HTTP 404 with the standard error response", async () => {
    const { response, body } = await call("/does-not-exist");
    expect(response.status).toBe(404);
    expect(body.status).toBe("error");
    expect(body.code).toBe("NOT_FOUND");
    expect(body.data).toBeNull();
  });

  it("FR-00001: two requests return different meta.requestId values", async () => {
    const first = await call("/health");
    const second = await call("/health");
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(first.body.meta.requestId).toMatch(uuid);
    expect(second.body.meta.requestId).toMatch(uuid);
    expect(first.body.meta.requestId).not.toBe(second.body.meta.requestId);
  });

  it("FR-00001: meta.timestamp is an ISO 8601 time in UTC", async () => {
    const { body } = await call("/health");
    expect(body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
    expect(Number.isNaN(Date.parse(body.meta.timestamp))).toBe(false);
  });
});
