// Shared contracts between Workers and frontends.
//
// The standard API response format (DD-019): every API response from every
// Worker has these five fields.

import type {
  AccessSyncReport,
  PermissionView,
  RoleView,
  SignedInPerson,
  UserView,
} from "./studio";

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
  // FR-00004: a signed-in user without the permission an action needs.
  PERMISSION_DENIED: "PERMISSION_DENIED",
  // FR-00004: input that does not match its schema.
  VALIDATION_FAILED: "VALIDATION_FAILED",
  // FR-00004: a duplicate email address or role name, a role still in use, or
  // a change to the person's own roles or status.
  CONFLICT: "CONFLICT",
  // FR-00004: Cloudflare refused to update the Access group, so nothing was
  // saved.
  ACCESS_SYNC_FAILED: "ACCESS_SYNC_FAILED",
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

// FR-00004: the RPC methods studio-api offers to studio-web through its
// service binding. Every method receives the signed-in person's identity and
// the request ID; methods that change data also receive the untrusted input,
// which studio-api checks against the schemas in ./studio.
export interface StudioApiRpc {
  health(requestId: string): Promise<ApiResponse<null>>;
  me(identity: StaffIdentity, requestId: string): Promise<ApiResponse<SignedInPerson | null>>;
  listUsers(identity: StaffIdentity, requestId: string): Promise<ApiResponse<UserView[] | null>>;
  getUser(identity: StaffIdentity, requestId: string, id: unknown): Promise<ApiResponse<UserView | null>>;
  createUser(identity: StaffIdentity, requestId: string, input: unknown): Promise<ApiResponse<UserView | null>>;
  updateUser(identity: StaffIdentity, requestId: string, id: unknown, input: unknown): Promise<ApiResponse<UserView | null>>;
  deactivateUser(identity: StaffIdentity, requestId: string, id: unknown): Promise<ApiResponse<UserView | null>>;
  reactivateUser(identity: StaffIdentity, requestId: string, id: unknown): Promise<ApiResponse<UserView | null>>;
  listRoles(identity: StaffIdentity, requestId: string): Promise<ApiResponse<RoleView[] | null>>;
  getRole(identity: StaffIdentity, requestId: string, id: unknown): Promise<ApiResponse<RoleView | null>>;
  createRole(identity: StaffIdentity, requestId: string, input: unknown): Promise<ApiResponse<RoleView | null>>;
  updateRole(identity: StaffIdentity, requestId: string, id: unknown, input: unknown): Promise<ApiResponse<RoleView | null>>;
  deleteRole(identity: StaffIdentity, requestId: string, id: unknown): Promise<ApiResponse<null>>;
  listPermissions(identity: StaffIdentity, requestId: string): Promise<ApiResponse<PermissionView[] | null>>;
  checkAccessSync(identity: StaffIdentity, requestId: string): Promise<ApiResponse<AccessSyncReport | null>>;
}

export * from "./permissions";
export * from "./studio";
