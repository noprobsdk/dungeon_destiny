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
  // FR-00005: the app headers are missing or invalid, or name an unknown
  // platform (DD-023).
  INVALID_APP_HEADERS: "INVALID_APP_HEADERS",
  // FR-00005: the app's build is below the minimum supported build; the app
  // must show "Update required" (DD-023). Sent with HTTP 426.
  APP_UPDATE_REQUIRED: "APP_UPDATE_REQUIRED",
  // FR-00005: the Worker's own configuration is invalid, so it refuses to
  // answer rather than guess.
  SERVER_MISCONFIGURED: "SERVER_MISCONFIGURED",
  // FR-00006: the body is missing, not JSON, or has a wrong or unknown field
  // or provider. Sent with HTTP 400.
  INVALID_REQUEST: "INVALID_REQUEST",
  // FR-00006: Google refused the server auth code. Sent with HTTP 401.
  SIGN_IN_FAILED: "SIGN_IN_FAILED",
  // FR-00006: the refresh token is unknown, expired, replaced, or revoked.
  // Sent with HTTP 401.
  INVALID_REFRESH_TOKEN: "INVALID_REFRESH_TOKEN",
  // FR-00006: a call that needs an Account has no valid access token. Sent
  // with HTTP 401.
  AUTH_REQUIRED: "AUTH_REQUIRED",
  // FR-00006: the access token has expired. Sent with HTTP 401.
  AUTH_EXPIRED: "AUTH_EXPIRED",
  // FR-00006: Google cannot be reached or answered with an error. Sent with
  // HTTP 503.
  SIGN_IN_UNAVAILABLE: "SIGN_IN_UNAVAILABLE",
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

// --- App version check (FR-00005, DD-023) ---------------------------------

// Every call from the game client to the gateway carries these two headers.
export const APP_HEADERS = { platform: "X-App-Platform", build: "X-App-Build" } as const;

// The platforms the gateway knows. iOS is added with the iOS build.
export const APP_PLATFORMS = ["android"] as const;
export type AppPlatform = (typeof APP_PLATFORMS)[number];

// The `data` of a GET /app/version response.
export type AppVersionData = {
  platform: AppPlatform;
  build: number;
  minimumBuild: number;
  recommendedBuild: number;
  supported: boolean;
  upToDate: boolean;
  // The https link to the new version, or null when none is configured.
  updateUrl: string | null;
};

// The result of a version check, as written to the gateway's request log.
export const VERSION_CHECK_RESULTS = ["upToDate", "updateAvailable", "updateRequired", "invalidHeaders"] as const;
export type VersionCheckResult = (typeof VERSION_CHECK_RESULTS)[number];

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
export * from "./player";
export * from "./studio";
