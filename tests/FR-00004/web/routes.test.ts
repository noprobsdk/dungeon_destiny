// FR-00004 tests for studio-web's /api routes: each route passes the request to
// one studio-api RPC method, with the identity from the validated Access token
// and the request body as untrusted input, and turns the result's code into
// the right HTTP status. studio-api is replaced by a stand-in that records
// its calls; Access tokens are signed with keys the tests generate.
import type { ApiResponse, ErrorCode } from "@dungeon-destiny/contracts";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import type { JWK } from "jose";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../../../apps/studio-web/src/worker/index";

const TEAM_DOMAIN = "https://fr-00004-test.cloudflareaccess.com";
const AUD = "fr-00004-test-audience";
const KID = "fr-00004-test-key";
const EMAIL = "person@example.invalid";
const ID = "00000000-0000-4000-8000-0000000000bb";

let privateKey: CryptoKey;
let publicJwk: JWK;
let token: string;

type Call = { method: string; args: unknown[] };
let calls: Call[];
let nextCode: ErrorCode | null;

function response(code: ErrorCode | null): ApiResponse<{ done: true } | null> {
  return {
    status: code === null ? "ok" : "error",
    code,
    message: code === null ? "Done." : "Refused.",
    data: code === null ? { done: true } : null,
    meta: {
      requestId: "r",
      timestamp: "2026-10-10T00:00:00Z",
      service: "studio-api",
      environment: "dev",
      version: { id: "v", tag: "t", createdAt: "2026-10-10T00:00:00Z" },
    },
  };
}

// Every RPC method records its arguments and answers with nextCode.
const studioApi = new Proxy(
  {},
  {
    get: (_target, method: string) =>
      async (...args: unknown[]) => {
        calls.push({ method, args });
        return response(nextCode);
      },
  },
);

function env(): Env {
  return {
    ENVIRONMENT: "dev",
    ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
    ACCESS_AUD: AUD,
    STUDIO_API: studioApi,
    ASSETS: { fetch: async () => new Response("<!doctype html>") },
    CF_VERSION_METADATA: { id: "web", tag: "web", timestamp: "2026-10-10T00:00:00Z" },
  } as unknown as Env;
}

async function call(method: string, path: string, body?: string) {
  const headers: Record<string, string> = { "Cf-Access-Jwt-Assertion": token };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await worker.fetch(new Request(`https://studio.example${path}`, { method, headers, ...(body !== undefined ? { body } : {}) }), env());
  return { res, body: (await res.json()) as ApiResponse<unknown> };
}

beforeAll(async () => {
  const keys = await generateKeyPair("RS256", { extractable: true });
  privateKey = keys.privateKey;
  publicJwk = { ...(await exportJWK(keys.publicKey)), kid: KID, alg: "RS256", use: "sig" };
  token = await new SignJWT({ email: EMAIL })
    .setProtectedHeader({ alg: "RS256", kid: KID })
    .setIssuer(TEAM_DOMAIN)
    .setAudience(AUD)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
});

beforeEach(() => {
  calls = [];
  nextCode = null;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === `${TEAM_DOMAIN}/cdn-cgi/access/certs`) return Response.json({ keys: [publicJwk] });
    return new Response("unexpected", { status: 599 });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const routes: { method: string; path: string; body?: string; rpc: string; args: unknown[] }[] = [
  { method: "GET", path: "/api/me", rpc: "me", args: [] },
  { method: "GET", path: "/api/users", rpc: "listUsers", args: [] },
  { method: "POST", path: "/api/users", body: '{"email":"a@b.cd"}', rpc: "createUser", args: [{ email: "a@b.cd" }] },
  { method: "GET", path: `/api/users/${ID}`, rpc: "getUser", args: [ID] },
  { method: "PATCH", path: `/api/users/${ID}`, body: '{"displayName":"X"}', rpc: "updateUser", args: [ID, { displayName: "X" }] },
  { method: "POST", path: `/api/users/${ID}/deactivate`, rpc: "deactivateUser", args: [ID] },
  { method: "POST", path: `/api/users/${ID}/reactivate`, rpc: "reactivateUser", args: [ID] },
  { method: "GET", path: "/api/access-sync", rpc: "checkAccessSync", args: [] },
  { method: "GET", path: "/api/roles", rpc: "listRoles", args: [] },
  { method: "POST", path: "/api/roles", body: '{"name":"r"}', rpc: "createRole", args: [{ name: "r" }] },
  { method: "GET", path: `/api/roles/${ID}`, rpc: "getRole", args: [ID] },
  { method: "PATCH", path: `/api/roles/${ID}`, body: '{"description":"d"}', rpc: "updateRole", args: [ID, { description: "d" }] },
  { method: "DELETE", path: `/api/roles/${ID}`, rpc: "deleteRole", args: [ID] },
  { method: "GET", path: "/api/permissions", rpc: "listPermissions", args: [] },
];

describe("FR-00004: studio-web /api routes", () => {
  for (const route of routes) {
    it(`FR-00004: ${route.method} ${route.path} calls studio-api ${route.rpc} with the token's identity`, async () => {
      const { res } = await call(route.method, route.path, route.body);
      expect(res.status).toBe(200);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.method).toBe(route.rpc);
      expect(calls[0]?.args[0]).toEqual({ email: EMAIL });
      expect(typeof calls[0]?.args[1]).toBe("string");
      expect(calls[0]?.args.slice(2)).toEqual(route.args);
    });
  }

  it("FR-00004: studio-api's error codes become HTTP statuses", async () => {
    const expected: [ErrorCode, number][] = [
      ["NOT_STAFF", 403],
      ["PERMISSION_DENIED", 403],
      ["VALIDATION_FAILED", 400],
      ["NOT_FOUND", 404],
      ["CONFLICT", 409],
      ["ACCESS_SYNC_FAILED", 502],
    ];
    for (const [code, status] of expected) {
      nextCode = code;
      const { res, body } = await call("GET", "/api/users");
      expect(res.status, code).toBe(status);
      expect(body.code, code).toBe(code);
    }
  });

  it("FR-00004: a body that is not JSON is refused with HTTP 400 and code VALIDATION_FAILED, without calling studio-api", async () => {
    const { res, body } = await call("POST", "/api/users", "{not json");
    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(calls).toHaveLength(0);
  });

  it("FR-00004: a method a route does not accept is refused with HTTP 405 and an Allow header", async () => {
    const { res, body } = await call("DELETE", "/api/users");
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, POST");
    expect(body.code).toBe("METHOD_NOT_ALLOWED");
    expect(calls).toHaveLength(0);
  });

  it("FR-00004: an unknown /api path is refused with HTTP 404", async () => {
    const { res, body } = await call("GET", "/api/heroes");
    expect(res.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
  });
});
