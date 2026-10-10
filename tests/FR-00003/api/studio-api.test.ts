// FR-00003 tests for the studio-api Worker. They run in the Workers runtime
// with studio-api's dev configuration and a test SuperAdmin email address set
// in vitest.config.ts. studio-api is called through its RPC methods, as
// studio-web calls it through the service binding.
import { env, exports } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import type { ApiResponse } from "@dungeon-destiny/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { isSuperAdmin } from "../../../apps/studio-api/src/access";

const SUPERADMIN = "superadmin@example.invalid";
const REQUEST_ID = "00000000-0000-4000-8000-000000000001";

describe("FR-00003: studio-api", () => {
  // FR-00004: studio-api now looks people up in Content D1.
  beforeEach(async () => {
    await applyD1Migrations(env.CONTENT_D1, env.TEST_MIGRATIONS);
  });

  it("FR-00003: studio-api health returns the standard ok response with service studio-api", async () => {
    const body = await exports.default.health(REQUEST_ID);
    expect(body.status).toBe("ok");
    expect(body.code).toBeNull();
    expect(body.message.length).toBeGreaterThan(0);
    expect(body.data).toBeNull();
    expect(body.meta.service).toBe("studio-api");
    expect(body.meta.environment).toBe("dev");
    expect(body.meta.requestId).toBe(REQUEST_ID);
    expect(body.meta.version).toEqual({
      id: env.CF_VERSION_METADATA.id,
      tag: env.CF_VERSION_METADATA.tag,
      createdAt: env.CF_VERSION_METADATA.timestamp,
    });
  });

  it("FR-00003: me returns the SuperAdmin's email address and the role superadmin", async () => {
    const body = await exports.default.me({ email: SUPERADMIN }, REQUEST_ID);
    expect(body.status).toBe("ok");
    expect(body.code).toBeNull();
    // FR-00004: me returns the signed-in person with their permissions.
    expect(body.data?.email).toBe(SUPERADMIN);
    expect(body.data?.superadmin).toBe(true);
    expect(body.meta.service).toBe("studio-api");
    expect(body.meta.requestId).toBe(REQUEST_ID);
  });

  it("FR-00003: me matches the SuperAdmin email address without regard to upper and lower case", async () => {
    const body = await exports.default.me({ email: "SuperAdmin@Example.Invalid" }, REQUEST_ID);
    expect(body.status).toBe("ok");
    expect(body.data?.email).toBe(SUPERADMIN);
    expect(body.data?.superadmin).toBe(true);
  });

  it("FR-00003: me refuses anyone else with the standard error response and code NOT_STAFF", async () => {
    const body = await exports.default.me({ email: "someone@example.invalid" }, REQUEST_ID);
    expect(body.status).toBe("error");
    expect(body.code).toBe("NOT_STAFF");
    expect(body.message.length).toBeGreaterThan(0);
    expect(body.data).toBeNull();
    expect(body.meta.service).toBe("studio-api");
  });

  it("FR-00003: nobody is a SuperAdmin when the SuperAdmin email address is not set", () => {
    expect(isSuperAdmin("", "")).toBe(false);
    expect(isSuperAdmin("someone@example.invalid", "")).toBe(false);
    expect(isSuperAdmin("someone@example.invalid", "   ")).toBe(false);
    expect(isSuperAdmin(SUPERADMIN, SUPERADMIN)).toBe(true);
  });

  it("FR-00003: studio-api answers any HTTP request with HTTP 404 and the standard error response", async () => {
    const response = await exports.default.fetch("https://dd-dev-studio-api.example/health");
    const body = (await response.json()) as ApiResponse<null>;
    expect(response.status).toBe(404);
    expect(body.status).toBe("error");
    expect(body.code).toBe("NOT_FOUND");
    expect(body.meta.service).toBe("studio-api");
  });
});

describe("FR-00003: packages/contracts", () => {
  it("FR-00003: packages/contracts defines the error codes UNAUTHENTICATED and NOT_STAFF", async () => {
    const { ERROR_CODES } = await import("@dungeon-destiny/contracts");
    expect(ERROR_CODES.UNAUTHENTICATED).toBe("UNAUTHENTICATED");
    expect(ERROR_CODES.NOT_STAFF).toBe("NOT_STAFF");
  });
});
