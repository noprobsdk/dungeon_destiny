// FR-00003, FR-00004: the one client for Content Studio's /api calls. Every
// response is read as the standard response format (DD-019); anything else is
// reported as unreadable, so pages never act on unexpected data.
import type { ApiResponse, ErrorCode } from "@dungeon-destiny/contracts";

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

export async function sendApi<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    return { kind: "unreadable", httpStatus: null };
  }
  try {
    const parsed: unknown = await response.json();
    if (isApiResponse(parsed)) {
      return { kind: "response", httpStatus: response.status, body: parsed as ApiResponse<T> };
    }
  } catch {
    // Not JSON; reported as unreadable below.
  }
  return { kind: "unreadable", httpStatus: response.status };
}

export async function getApi<T>(path: string): Promise<ApiResult<T>> {
  return sendApi<T>("GET", path);
}

// FR-00004: a refused or unreadable call, carrying the message to show.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: ErrorCode | null,
    // FR-00004: for VALIDATION_FAILED, the field-by-field reasons.
    readonly details: unknown = null,
  ) {
    super(message);
  }
}

// Returns the successful response, or throws an ApiError with its message.
export async function callApi<T>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
  const result = await sendApi<T>(method, path, body);
  if (result.kind !== "response") throw new ApiError("Content Studio could not be reached. Try again.", null);
  if (result.body.status !== "ok") throw new ApiError(result.body.message, result.body.code, result.body.data);
  return result.body;
}
