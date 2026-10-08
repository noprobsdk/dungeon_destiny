// FR-00001: the gateway Worker (DD-017). Its only endpoint for now is the
// public GET /health. Every response uses the standard format (DD-019).
import { ERROR_CODES } from "@dungeon-destiny/contracts";
import type { ApiResponse, ApiStatus, ErrorCode, ResponseMeta } from "@dungeon-destiny/contracts";

const SERVICE = "gateway";

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
    version: {
      id: version.id,
      tag: version.tag,
      createdAt: version.timestamp,
    },
  };
}

function respond<T>(
  context: RequestContext,
  httpStatus: number,
  status: ApiStatus,
  code: ErrorCode | null,
  message: string,
  data: T,
  headers?: HeadersInit,
): Response {
  const body: ApiResponse<T> = { status, code, message, data, meta: meta(context) };
  return Response.json(body, { status: httpStatus, ...(headers ? { headers } : {}) });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const context: RequestContext = { requestId: crypto.randomUUID(), env };
    const url = new URL(request.url);

    if (url.pathname !== "/health") {
      return respond(context, 404, "error", ERROR_CODES.NOT_FOUND, "No endpoint exists at this path.", null);
    }
    if (request.method !== "GET") {
      return respond(
        context,
        405,
        "error",
        ERROR_CODES.METHOD_NOT_ALLOWED,
        "This endpoint only accepts GET.",
        null,
        { Allow: "GET" },
      );
    }
    return respond(context, 200, "ok", null, "gateway is running", null);
  },
} satisfies ExportedHandler<Env>;
