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
  // FR-00003: no valid Cloudflare Access token.
  UNAUTHENTICATED: "UNAUTHENTICATED",
  // FR-00003: a valid Access token for someone who is not let in.
  NOT_STAFF: "NOT_STAFF",
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

// --- Content Studio (FR-00003, DD-020) -------------------------------------

// The signed-in person, taken by studio-web from a validated Cloudflare Access
// token and passed to studio-api as a typed RPC argument, never as a header.
export type StaffIdentity = {
  email: string;
};

export type StaffRole = "superadmin";

export type StaffMember = {
  email: string;
  role: StaffRole;
};

// The RPC methods studio-api offers to studio-web through its service binding.
export interface StudioApiRpc {
  health(requestId: string): Promise<ApiResponse<null>>;
  me(identity: StaffIdentity, requestId: string): Promise<ApiResponse<StaffMember | null>>;
}
