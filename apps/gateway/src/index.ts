// FR-00001: the gateway Worker (DD-017), the only Worker that player devices
// call. Every response uses the standard format (DD-019).
// FR-00005: adds GET /app/version, the build check on every call that carries
// the app headers (DD-023), the update link in /app/version, and one request
// log line per request.
// FR-00006: adds Player Identity (DD-024): POST /auth/sign-in,
// POST /auth/refresh, and GET /me, and the accountId in the request log.
import { ERROR_CODES } from "@dungeon-destiny/contracts";
import { evaluateBuild, parseAppHeaders, readThresholds, readUpdateUrl, versionCheckResult } from "./api-gateway/app-version";
import { error, respond } from "./api-gateway/respond";
import type { Handled, RequestContext } from "./api-gateway/respond";
import { writeRequestLog } from "./api-gateway/request-log";
import { me, refresh, signIn } from "./player-identity/routes";

// Each path and the one method it accepts.
const ROUTES = {
  "/health": "GET",
  "/app/version": "GET",
  "/auth/sign-in": "POST",
  "/auth/refresh": "POST",
  "/me": "GET",
} as const;
type Route = keyof typeof ROUTES;

function isRoute(path: string): path is Route {
  return Object.hasOwn(ROUTES, path);
}

async function handle(request: Request, context: RequestContext): Promise<Handled> {
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
  const method = ROUTES[path];
  if (request.method !== method) {
    return {
      ...error(context, 405, ERROR_CODES.METHOD_NOT_ALLOWED, `This endpoint only accepts ${method}.`, { Allow: method }),
      ...checked,
    };
  }

  switch (path) {
    case "/app/version":
      if (version === null) {
        return {
          ...error(context, 400, ERROR_CODES.INVALID_APP_HEADERS, "The X-App-Platform and X-App-Build headers are required."),
          versionCheck: "invalidHeaders",
        };
      }
      return { response: respond(context, 200, "ok", null, "version checked", version), code: null, ...checked };
    case "/auth/sign-in":
      return { ...(await signIn(request, context)), ...checked };
    case "/auth/refresh":
      return { ...(await refresh(request, context)), ...checked };
    case "/me":
      return { ...(await me(request, context)), ...checked };
    case "/health":
      return { response: respond(context, 200, "ok", null, "gateway is running", null), code: null, ...checked };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const started = Date.now();
    const context: RequestContext = { requestId: crypto.randomUUID(), env };
    const handled = await handle(request, context);
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
      ...(handled.accountId ? { accountId: handled.accountId } : {}),
    });
    return handled.response;
  },
} satisfies ExportedHandler<Env>;
