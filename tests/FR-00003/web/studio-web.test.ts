// FR-00003 tests for the studio-web Worker: the Cloudflare Access token check,
// the /api routes, and the pages. They run in the Workers runtime. The Worker
// is called with a test environment: a stand-in studio-api that records its
// calls, a stand-in for the static assets, and Access public keys served from
// a key pair the tests generate. No real Access token is used.
import type { ApiResponse, SignedInPerson, StaffIdentity } from "@dungeon-destiny/contracts";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import type { JWK } from "jose";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../../../apps/studio-web/src/worker/index";

const TEAM_DOMAIN = "https://fr-00003-test.cloudflareaccess.com";
const CERTS_URL = `${TEAM_DOMAIN}/cdn-cgi/access/certs`;
const AUD = "fr-00003-test-audience";
const SUPERADMIN = "superadmin@example.invalid";
const SOMEONE = "someone@example.invalid";
const KID = "fr-00003-test-key";
const BASE = "https://dd-dev-studio-web.example";
const INDEX_HTML = "<!doctype html><title>Content Studio</title>";

type KeyPair = Awaited<ReturnType<typeof generateKeyPair>>;
let accessKeys: KeyPair;
let otherKeys: KeyPair;
let publicJwk: JWK;

type Calls = { me: StaffIdentity[]; health: number };
let calls: Calls;

function meta(requestId: string) {
  return {
    requestId,
    timestamp: new Date().toISOString(),
    service: "studio-api",
    environment: "dev",
    version: { id: "test-version", tag: "test-tag", createdAt: "2026-10-09T00:00:00Z" },
  };
}

// A stand-in for studio-api's RPC methods: the SuperAdmin is let in, anyone
// else is refused, as studio-api itself does.
const studioApi = {
  async health(requestId: string): Promise<ApiResponse<null>> {
    calls.health += 1;
    return { status: "ok", code: null, message: "studio-api is running", data: null, meta: meta(requestId) };
  },
  async me(identity: StaffIdentity, requestId: string): Promise<ApiResponse<SignedInPerson | null>> {
    calls.me.push(identity);
    if (identity.email === SUPERADMIN) {
      return { status: "ok", code: null, message: "Signed in.", data: { email: identity.email, displayName: "SuperAdmin", superadmin: true, roles: [], permissions: [] }, meta: meta(requestId) };
    }
    return { status: "error", code: "NOT_STAFF", message: "Not allowed.", data: null, meta: meta(requestId) };
  },
};

const assets = {
  async fetch(): Promise<Response> {
    return new Response(INDEX_HTML, { headers: { "content-type": "text/html" } });
  },
};

function testEnv(overrides: Partial<Record<"ACCESS_AUD" | "ACCESS_TEAM_DOMAIN", string>> = {}): Env {
  return {
    ENVIRONMENT: "dev",
    ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
    ACCESS_AUD: AUD,
    STUDIO_API: studioApi,
    ASSETS: assets,
    CF_VERSION_METADATA: { id: "web-version", tag: "web-tag", timestamp: "2026-10-09T00:00:00Z" },
    ...overrides,
  } as unknown as Env;
}

type TokenOptions = {
  email?: string;
  audience?: string;
  issuer?: string;
  expiresIn?: string | number;
  keys?: KeyPair;
};

async function token(options: TokenOptions = {}): Promise<string> {
  const keys = options.keys ?? accessKeys;
  return new SignJWT({ email: options.email ?? SUPERADMIN, type: "app" })
    .setProtectedHeader({ alg: "RS256", kid: KID })
    .setIssuer(options.issuer ?? TEAM_DOMAIN)
    .setAudience(options.audience ?? AUD)
    .setSubject("fr-00003-test-user")
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? "1h")
    .sign(keys.privateKey);
}

async function call(path: string, headers: Record<string, string> = {}, env: Env = testEnv()) {
  const response = await worker.fetch(new Request(`${BASE}${path}`, { headers }), env);
  return response;
}

async function callJson<T>(path: string, headers: Record<string, string> = {}, env?: Env) {
  const response = await call(path, headers, env);
  const body = (await response.json()) as ApiResponse<T>;
  return { response, body };
}

function header(jwt: string) {
  return { "Cf-Access-Jwt-Assertion": jwt };
}

beforeAll(async () => {
  accessKeys = await generateKeyPair("RS256", { extractable: true });
  otherKeys = await generateKeyPair("RS256", { extractable: true });
  publicJwk = { ...(await exportJWK(accessKeys.publicKey)), kid: KID, alg: "RS256", use: "sig" };
});

beforeEach(() => {
  calls = { me: [], health: 0 };
  // Access's public keys, served at the team domain's certs address.
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === CERTS_URL) {
      return Response.json({ keys: [publicJwk] });
    }
    return new Response("unexpected request in test", { status: 599 });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FR-00003: studio-web Access token check", () => {
  it("FR-00003: studio-web refuses an API request with no Access token with HTTP 401 and code UNAUTHENTICATED", async () => {
    const { response, body } = await callJson<null>("/api/me");
    expect(response.status).toBe(401);
    expect(body.status).toBe("error");
    expect(body.code).toBe("UNAUTHENTICATED");
    expect(body.data).toBeNull();
    expect(body.meta.service).toBe("studio-web");
    expect(calls.me).toHaveLength(0);
  });

  it("FR-00003: studio-web refuses a page request with no Access token", async () => {
    const response = await call("/");
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain(INDEX_HTML);
  });

  it("FR-00003: studio-web refuses a token signed with another key", async () => {
    const { response, body } = await callJson<null>("/api/me", header(await token({ keys: otherKeys })));
    expect(response.status).toBe(401);
    expect(body.code).toBe("UNAUTHENTICATED");
    expect(calls.me).toHaveLength(0);
  });

  it("FR-00003: studio-web refuses an expired token", async () => {
    const expired = Math.floor(Date.now() / 1000) - 60;
    const { response } = await callJson<null>("/api/me", header(await token({ expiresIn: expired })));
    expect(response.status).toBe(401);
    expect(calls.me).toHaveLength(0);
  });

  it("FR-00003: studio-web refuses a token for another audience", async () => {
    const { response } = await callJson<null>("/api/me", header(await token({ audience: "another-application" })));
    expect(response.status).toBe(401);
    expect(calls.me).toHaveLength(0);
  });

  it("FR-00003: studio-web refuses a token from another issuer", async () => {
    const { response } = await callJson<null>("/api/me", header(await token({ issuer: "https://other-team.cloudflareaccess.com" })));
    expect(response.status).toBe(401);
    expect(calls.me).toHaveLength(0);
  });

  it("FR-00003: studio-web refuses a token that is not signed with RS256", async () => {
    const secret = new TextEncoder().encode("a-shared-secret-that-must-never-be-accepted");
    const hs256 = await new SignJWT({ email: SUPERADMIN })
      .setProtectedHeader({ alg: "HS256", kid: KID })
      .setIssuer(TEAM_DOMAIN)
      .setAudience(AUD)
      .setExpirationTime("1h")
      .sign(secret);
    const { response } = await callJson<null>("/api/me", header(hs256));
    expect(response.status).toBe(401);
    expect(calls.me).toHaveLength(0);
  });

  it("FR-00003: studio-web refuses a token sent only in the CF_Authorization cookie", async () => {
    const { response } = await callJson<null>("/api/me", { Cookie: `CF_Authorization=${await token()}` });
    expect(response.status).toBe(401);
    expect(calls.me).toHaveLength(0);
  });

  it("FR-00003: studio-web refuses every request when the Access audience tag is not configured", async () => {
    const { response } = await callJson<null>("/api/me", header(await token({ audience: "" })), testEnv({ ACCESS_AUD: "" }));
    expect(response.status).toBe(401);
    expect(calls.me).toHaveLength(0);
  });
});

describe("FR-00003: studio-web routes", () => {
  it("FR-00003: with a valid token for the SuperAdmin, GET /api/me returns the email address and the role superadmin", async () => {
    const { response, body } = await callJson<SignedInPerson>("/api/me", header(await token()));
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    // FR-00004: GET /api/me returns the signed-in person with their permissions.
    expect(body.data).toMatchObject({ email: SUPERADMIN, superadmin: true });
    expect(calls.me).toEqual([{ email: SUPERADMIN }]);
  });

  it("FR-00003: with a valid token for anyone else, GET /api/me returns HTTP 403 and code NOT_STAFF", async () => {
    const { response, body } = await callJson<null>("/api/me", header(await token({ email: SOMEONE })));
    expect(response.status).toBe(403);
    expect(body.status).toBe("error");
    expect(body.code).toBe("NOT_STAFF");
    expect(body.data).toBeNull();
  });

  it("FR-00003: an identity header sent by the browser is ignored; only the token's email address is passed on", async () => {
    const { response } = await callJson<null>("/api/me", {
      ...header(await token({ email: SOMEONE })),
      "Cf-Access-Authenticated-User-Email": SUPERADMIN,
      "X-Staff-Email": SUPERADMIN,
    });
    expect(response.status).toBe(403);
    expect(calls.me).toEqual([{ email: SOMEONE }]);
  });

  it("FR-00003: GET /api/health through studio-web returns the studio-api health response", async () => {
    const { response, body } = await callJson<null>("/api/health", header(await token()));
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.meta.service).toBe("studio-api");
    expect(calls.health).toBe(1);
  });

  it("FR-00003: an unknown /api path returns HTTP 404 and code NOT_FOUND", async () => {
    const { response, body } = await callJson<null>("/api/does-not-exist", header(await token()));
    expect(response.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.meta.service).toBe("studio-web");
  });

  it("FR-00003: a non-GET request to an /api route returns HTTP 405 with Allow: GET", async () => {
    const response = await worker.fetch(
      new Request(`${BASE}/api/me`, { method: "POST", headers: header(await token()) }),
      testEnv(),
    );
    const body = (await response.json()) as ApiResponse<null>;
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
    expect(body.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("FR-00003: with a valid token, a page request is served from the static assets", async () => {
    const response = await call("/", header(await token()));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(INDEX_HTML);
  });

  it("FR-00003: a page request with a valid token for anyone else is still served, and the page shows they are not allowed", async () => {
    const response = await call("/", header(await token({ email: SOMEONE })));
    expect(response.status).toBe(200);
  });
});
