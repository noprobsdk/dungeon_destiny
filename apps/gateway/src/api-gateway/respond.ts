// FR-00001, FR-00005: the gateway's standard responses (DD-019), shared by
// every route. FR-00006 moved them here from index.ts so Player Identity can
// use them.
import type {
  ApiResponse,
  ApiStatus,
  AppPlatform,
  ErrorCode,
  ResponseMeta,
  VersionCheckResult,
} from "@dungeon-destiny/contracts";

const SERVICE = "gateway";

// Per-request values, passed explicitly; nothing request-scoped is global.
export type RequestContext = {
  requestId: string;
  env: Env;
};

// A response plus what the request log needs to know about it.
export type Handled = {
  response: Response;
  code: ErrorCode | null;
  app?: { platform: AppPlatform; build: number };
  versionCheck?: VersionCheckResult;
  // FR-00006: the Account of an authenticated call or a successful sign-in or
  // refresh (DD-024).
  accountId?: string;
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

export function respond<T>(
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

export function error(context: RequestContext, httpStatus: number, code: ErrorCode, message: string, headers?: HeadersInit): Handled {
  return { response: respond(context, httpStatus, "error", code, message, null, headers), code };
}
