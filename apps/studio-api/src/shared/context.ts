// FR-00004: the per-request context passed explicitly through studio-api's
// services, and the helpers that build standard responses (DD-019).
import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { ApiResponse, ApiStatus, ErrorCode, ResponseMeta } from "@dungeon-destiny/contracts";
import * as schema from "../db/schema";

const SERVICE = "studio-api";

export type Database = DrizzleD1Database<typeof schema>;

// Who is acting: the SuperAdmin, or an active user with at least one role.
export type Actor = {
  email: string;
  displayName: string;
  superadmin: boolean;
  userId: string | null;
  roles: { id: string; name: string }[];
  permissions: Set<string>;
};

export type RequestContext = {
  env: Env;
  db: Database;
  requestId: string;
  actor: Actor;
};

export function database(env: Env): Database {
  return drizzle(env.CONTENT_D1, { schema });
}

export function now(): string {
  return new Date().toISOString();
}

function meta(env: Env, requestId: string): ResponseMeta {
  const version = env.CF_VERSION_METADATA;
  return {
    requestId,
    timestamp: now(),
    service: SERVICE,
    environment: env.ENVIRONMENT,
    version: { id: version.id, tag: version.tag, createdAt: version.timestamp },
  };
}

export function result<T>(
  env: Env,
  requestId: string,
  status: ApiStatus,
  code: ErrorCode | null,
  message: string,
  data: T,
): ApiResponse<T> {
  return { status, code, message, data, meta: meta(env, requestId) };
}

export function ok<T>(context: Pick<RequestContext, "env" | "requestId">, message: string, data: T): ApiResponse<T> {
  return result(context.env, context.requestId, "ok", null, message, data);
}

export function fail(
  context: Pick<RequestContext, "env" | "requestId">,
  code: ErrorCode,
  message: string,
  data: unknown = null,
): ApiResponse<null> {
  return result(context.env, context.requestId, "error", code, message, data as null);
}
