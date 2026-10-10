// FR-00003, FR-00004: the studio-web Worker (DD-020). Cloudflare Access stands in front
// of it, and it checks the Access token on every request, pages included
// (run_worker_first). Signed-in requests to /api are passed to studio-api
// through its typed RPC service binding, with the identity taken from the
// token; anything else is served from the static assets. Responses that
// studio-web itself produces use the standard response format (DD-019).
import { ERROR_CODES } from "@dungeon-destiny/contracts";
import type { ApiResponse, ErrorCode, ResponseMeta, StaffIdentity, StudioApiRpc } from "@dungeon-destiny/contracts";
import { verifyAccessToken } from "./access-token";

const SERVICE = "studio-web";
const ACCESS_TOKEN_HEADER = "Cf-Access-Jwt-Assertion";

// Per-request values, passed explicitly; nothing request-scoped is global.
type RequestContext = {
  requestId: string;
  env: Env;
};

function meta(context: RequestContext): ResponseMeta {
  const version = context.env.CF_VERSION_METADATA;
  return {
    requestId: context.requestId,
    timestamp: new Date().toISOString(),
    service: SERVICE,
    environment: context.env.ENVIRONMENT,
    version: { id: version.id, tag: version.tag, createdAt: version.timestamp },
  };
}

function error(context: RequestContext, httpStatus: number, code: ErrorCode, message: string, headers?: HeadersInit): Response {
  const body: ApiResponse<null> = { status: "error", code, message, data: null, meta: meta(context) };
  return Response.json(body, { status: httpStatus, ...(headers ? { headers } : {}) });
}

// The STUDIO_API service binding, typed by the shared contract that studio-api
// implements (DD-017). Wrangler types the binding only as a Fetcher.
function studioApi(env: Env): StudioApiRpc {
  return env.STUDIO_API as unknown as StudioApiRpc;
}

// The HTTP status for a studio-api result.
function httpStatus(body: ApiResponse<unknown>): number {
  if (body.status === "ok") return 200;
  switch (body.code) {
    case ERROR_CODES.NOT_STAFF:
    case ERROR_CODES.PERMISSION_DENIED:
      return 403;
    case ERROR_CODES.VALIDATION_FAILED:
      return 400;
    case ERROR_CODES.NOT_FOUND:
      return 404;
    case ERROR_CODES.CONFLICT:
      return 409;
    case ERROR_CODES.ACCESS_SYNC_FAILED:
      return 502;
    default:
      return 500;
  }
}

// FR-00004: one route per studio-api RPC method. Each handler receives the
// API, the identity, the request ID, the path's ID, and the parsed body.
type Call = (
  api: StudioApiRpc,
  identity: StaffIdentity,
  requestId: string,
  id: string,
  body: unknown,
) => Promise<ApiResponse<unknown>>;

type Route = { pattern: RegExp; methods: Record<string, Call> };

const ID = "([0-9a-fA-F-]{36})";

const ROUTES: Route[] = [
  { pattern: /^\/api\/me$/, methods: { GET: (api, who, rid) => api.me(who, rid) } },
  { pattern: /^\/api\/health$/, methods: { GET: (api, _who, rid) => api.health(rid) } },
  {
    pattern: /^\/api\/users$/,
    methods: {
      GET: (api, who, rid) => api.listUsers(who, rid),
      POST: (api, who, rid, _id, body) => api.createUser(who, rid, body),
    },
  },
  {
    pattern: new RegExp(`^/api/users/${ID}$`),
    methods: {
      GET: (api, who, rid, id) => api.getUser(who, rid, id),
      PATCH: (api, who, rid, id, body) => api.updateUser(who, rid, id, body),
    },
  },
  { pattern: new RegExp(`^/api/users/${ID}/deactivate$`), methods: { POST: (api, who, rid, id) => api.deactivateUser(who, rid, id) } },
  { pattern: new RegExp(`^/api/users/${ID}/reactivate$`), methods: { POST: (api, who, rid, id) => api.reactivateUser(who, rid, id) } },
  { pattern: /^\/api\/access-sync$/, methods: { GET: (api, who, rid) => api.checkAccessSync(who, rid) } },
  {
    pattern: /^\/api\/roles$/,
    methods: {
      GET: (api, who, rid) => api.listRoles(who, rid),
      POST: (api, who, rid, _id, body) => api.createRole(who, rid, body),
    },
  },
  {
    pattern: new RegExp(`^/api/roles/${ID}$`),
    methods: {
      GET: (api, who, rid, id) => api.getRole(who, rid, id),
      PATCH: (api, who, rid, id, body) => api.updateRole(who, rid, id, body),
      DELETE: (api, who, rid, id) => api.deleteRole(who, rid, id),
    },
  },
  { pattern: /^\/api\/permissions$/, methods: { GET: (api, who, rid) => api.listPermissions(who, rid) } },
];

async function readBody(request: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  if (request.method === "GET" || request.method === "DELETE") return { ok: true, body: undefined };
  const text = await request.text();
  if (text.trim() === "") return { ok: true, body: undefined };
  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

async function api(context: RequestContext, request: Request, path: string, email: string): Promise<Response> {
  for (const route of ROUTES) {
    const match = route.pattern.exec(path);
    if (!match) continue;
    const handler = route.methods[request.method];
    if (!handler) {
      return error(context, 405, ERROR_CODES.METHOD_NOT_ALLOWED, "This endpoint does not accept this method.", {
        Allow: Object.keys(route.methods).join(", "),
      });
    }
    const parsed = await readBody(request);
    if (!parsed.ok) return error(context, 400, ERROR_CODES.VALIDATION_FAILED, "The request body is not valid JSON.");
    const body = await handler(studioApi(context.env), { email }, context.requestId, match[1] ?? "", parsed.body);
    return Response.json(body, { status: httpStatus(body) });
  }
  return error(context, 404, ERROR_CODES.NOT_FOUND, "No endpoint exists at this path.");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const context: RequestContext = { requestId: crypto.randomUUID(), env };
    const identity = await verifyAccessToken(
      request.headers.get(ACCESS_TOKEN_HEADER),
      env.ACCESS_TEAM_DOMAIN,
      env.ACCESS_AUD,
    );
    if (!identity) {
      return error(context, 401, ERROR_CODES.UNAUTHENTICATED, "Sign in to Content Studio through Cloudflare Access.");
    }
    const path = new URL(request.url).pathname;
    if (path === "/api" || path.startsWith("/api/")) {
      return api(context, request, path, identity.email);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
