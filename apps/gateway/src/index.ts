// FR-00001: the gateway Worker (DD-017), the only Worker that player devices
// call. Every response uses the standard format (DD-019).
// FR-00005: adds GET /app/version, the build check on every call that carries
// the app headers (DD-023), the update link in /app/version, and one request
// log line per request.
import { ERROR_CODES } from "@dungeon-destiny/contracts";
import type {
  ApiResponse,
  ApiStatus,
  AppPlatform,
  ErrorCode,
  ResponseMeta,
  VersionCheckResult,
} from "@dungeon-destiny/contracts";
import { evaluateBuild, parseAppHeaders, readThresholds, readUpdateUrl, versionCheckResult } from "./api-gateway/app-version";
import { writeRequestLog } from "./api-gateway/request-log";

const SERVICE = "gateway";

// Per-request values, passed explicitly; nothing request-scoped is global.
type RequestContext = {
  requestId: string;
  env: Env;
};

// A response plus what the request log needs to know about it.
type Handled = {
  response: Response;
  code: ErrorCode | null;
  app?: { platform: AppPlatform; build: number };
  versionCheck?: VersionCheckResult;
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

function error(context: RequestContext, httpStatus: number, code: ErrorCode, message: string, headers?: HeadersInit): Handled {
  return { response: respond(context, httpStatus, "error", code, message, null, headers), code };
}

const ROUTES = ["/health", "/app/version"] as const;
type Route = (typeof ROUTES)[number];

function isRoute(path: string): path is Route {
  return (ROUTES as readonly string[]).includes(path);
}

function handle(request: Request, context: RequestContext): Handled {
  const path = new URL(request.url).pathname;
  const app = parseAppHeaders(request.headers);

  // DD-023: a call that carries the app headers is checked before routing, so
  // an old build is refused on every path except /app/version.
  if (app.kind === "invalid") {
    return {
      ...error(context, 400, ERROR_CODES.INVALID_APP_HEADERS, "The X-App-Platform and X-App-Build headers are missing or invalid."),
      versionCheck: "invalidHeaders",
    };
  }
  let version: ReturnType<typeof evaluateBuild> | null = null;
  if (app.kind === "present") {
    const config = context.env as unknown as Record<string, unknown>;
    const thresholds = readThresholds(config, app.platform);
    if (thresholds === null) {
      return error(context, 500, ERROR_CODES.SERVER_MISCONFIGURED, "The server's version settings are invalid.");
    }
    version = evaluateBuild(app.platform, app.build, thresholds, readUpdateUrl(config, app.platform));
  }
  const checked = version ? { app: { platform: version.platform, build: version.build }, versionCheck: versionCheckResult(version) } : {};

  if (version && !version.supported && path !== "/app/version") {
    return {
      ...error(context, 426, ERROR_CODES.APP_UPDATE_REQUIRED, "This version of the app is no longer supported. Please update."),
      ...checked,
    };
  }

  if (!isRoute(path)) {
    return { ...error(context, 404, ERROR_CODES.NOT_FOUND, "No endpoint exists at this path."), ...checked };
  }
  if (request.method !== "GET") {
    return {
      ...error(context, 405, ERROR_CODES.METHOD_NOT_ALLOWED, "This endpoint only accepts GET.", { Allow: "GET" }),
      ...checked,
    };
  }

  if (path === "/app/version") {
    if (version === null) {
      return {
        ...error(context, 400, ERROR_CODES.INVALID_APP_HEADERS, "The X-App-Platform and X-App-Build headers are required."),
        versionCheck: "invalidHeaders",
      };
    }
    return { response: respond(context, 200, "ok", null, "version checked", version), code: null, ...checked };
  }
  return { response: respond(context, 200, "ok", null, "gateway is running", null), code: null, ...checked };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const started = Date.now();
    const context: RequestContext = { requestId: crypto.randomUUID(), env };
    const handled = handle(request, context);
    writeRequestLog({
      event: "request",
      requestId: context.requestId,
      method: request.method,
      path: new URL(request.url).pathname,
      status: handled.response.status,
      code: handled.code,
      // Workers only advance the clock during I/O, so this is often 0.
      durationMs: Date.now() - started,
      environment: env.ENVIRONMENT,
      versionId: env.CF_VERSION_METADATA.id,
      ...(handled.app ? { platform: handled.app.platform, build: handled.app.build } : {}),
      ...(handled.versionCheck ? { versionCheck: handled.versionCheck } : {}),
    });
    return handled.response;
  },
} satisfies ExportedHandler<Env>;
