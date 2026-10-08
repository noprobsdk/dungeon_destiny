// Shared contracts between Workers and frontends.
//
// The standard API response format (DD-019): every API response from every
// Worker has these five fields.

export const API_STATUSES = ["ok", "error"] as const;
export type ApiStatus = (typeof API_STATUSES)[number];

// Stable, machine-readable error codes. Clients act on these, never on the
// message text. Add a code here before any Worker returns it.
export const ERROR_CODES = {
  NOT_FOUND: "NOT_FOUND",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// The deployment version from Cloudflare's version metadata, never a Git
// commit.
export type DeploymentVersion = {
  id: string;
  tag: string;
  createdAt: string;
};

export type ResponseMeta = {
  requestId: string;
  timestamp: string;
  service: string;
  environment: string;
  version: DeploymentVersion;
};

export type ApiResponse<T> = {
  status: ApiStatus;
  code: ErrorCode | null;
  message: string;
  data: T;
  meta: ResponseMeta;
};
