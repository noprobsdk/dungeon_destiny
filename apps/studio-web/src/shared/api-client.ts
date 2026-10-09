// FR-00003: the one client for Content Studio's /api calls. Every response is
// read as the standard response format (DD-019); anything else is reported as
// unreadable, so pages never act on unexpected data.
import type { ApiResponse } from "@dungeon-destiny/contracts";

export type ApiResult<T> =
  | { kind: "response"; httpStatus: number; body: ApiResponse<T> }
  | { kind: "unreadable"; httpStatus: number | null };

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    (body["status"] === "ok" || body["status"] === "error") &&
    typeof body["message"] === "string" &&
    "data" in body &&
    typeof body["meta"] === "object" &&
    body["meta"] !== null
  );
}

export async function getApi<T>(path: string): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, { headers: { Accept: "application/json" } });
  } catch {
    return { kind: "unreadable", httpStatus: null };
  }
  try {
    const body: unknown = await response.json();
    if (isApiResponse(body)) {
      return { kind: "response", httpStatus: response.status, body: body as ApiResponse<T> };
    }
  } catch {
    // Not JSON; reported as unreadable below.
  }
  return { kind: "unreadable", httpStatus: response.status };
}
