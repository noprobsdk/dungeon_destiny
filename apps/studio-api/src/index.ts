// FR-00003: the studio-api Worker (DD-017, DD-020). It has no public address;
// studio-web calls its RPC methods through a service binding and passes the
// signed-in person's identity, taken from a validated Access token, as a typed
// argument. Every result uses the standard response format (DD-019).
import { WorkerEntrypoint } from "cloudflare:workers";
import { ERROR_CODES } from "@dungeon-destiny/contracts";
import type {
  ApiResponse,
  ApiStatus,
  ErrorCode,
  ResponseMeta,
  StaffIdentity,
  StaffMember,
  StudioApiRpc,
} from "@dungeon-destiny/contracts";
import { isSuperAdmin } from "./access";

const SERVICE = "studio-api";

function meta(env: Env, requestId: string): ResponseMeta {
  const version = env.CF_VERSION_METADATA;
  return {
    requestId,
    timestamp: new Date().toISOString(),
    service: SERVICE,
    environment: env.ENVIRONMENT,
    version: { id: version.id, tag: version.tag, createdAt: version.timestamp },
  };
}

function result<T>(
  env: Env,
  requestId: string,
  status: ApiStatus,
  code: ErrorCode | null,
  message: string,
  data: T,
): ApiResponse<T> {
  return { status, code, message, data, meta: meta(env, requestId) };
}

export default class StudioApi extends WorkerEntrypoint<Env> implements StudioApiRpc {
  async health(requestId: string): Promise<ApiResponse<null>> {
    return result(this.env, requestId, "ok", null, "studio-api is running", null);
  }

  async me(identity: StaffIdentity, requestId: string): Promise<ApiResponse<StaffMember | null>> {
    if (!isSuperAdmin(identity.email, this.env.SUPERADMIN_EMAIL)) {
      return result(this.env, requestId, "error", ERROR_CODES.NOT_STAFF, "You are not allowed to use Content Studio.", null);
    }
    return result<StaffMember | null>(this.env, requestId, "ok", null, "Signed in.", {
      email: identity.email,
      role: "superadmin",
    });
  }

  // studio-api is reached only through RPC; any HTTP request is refused.
  override async fetch(): Promise<Response> {
    const body = result(this.env, crypto.randomUUID(), "error", ERROR_CODES.NOT_FOUND, "studio-api has no HTTP endpoints.", null);
    return Response.json(body, { status: 404 });
  }
}
