// FR-00003: the studio-web Worker (DD-020). Cloudflare Access stands in front
// of it, and it checks the Access token on every request, pages included
// (run_worker_first). Signed-in requests to /api are passed to studio-api
// through its typed RPC service binding, with the identity taken from the
// token; anything else is served from the static assets. Responses that
// studio-web itself produces use the standard response format (DD-019).
import { ERROR_CODES } from "@dungeon-destiny/contracts";
import type { ApiResponse, ErrorCode, ResponseMeta, StudioApiRpc } from "@dungeon-destiny/contracts";
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
  if (body.code === ERROR_CODES.NOT_STAFF) return 403;
  if (body.code === ERROR_CODES.NOT_FOUND) return 404;
  return 500;
}

async function api(context: RequestContext, request: Request, path: string, email: string): Promise<Response> {
  if (path !== "/api/me" && path !== "/api/health") {
    return error(context, 404, ERROR_CODES.NOT_FOUND, "No endpoint exists at this path.");
  }
  if (request.method !== "GET") {
    return error(context, 405, ERROR_CODES.METHOD_NOT_ALLOWED, "This endpoint only accepts GET.", { Allow: "GET" });
  }
  const body =
    path === "/api/me"
      ? await studioApi(context.env).me({ email }, context.requestId)
      : await studioApi(context.env).health(context.requestId);
  return Response.json(body, { status: httpStatus(body) });
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
