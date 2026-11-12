// FR-00006: the player Worker (DD-017, DD-024). It owns Player D1 and is the
// only Worker that reads or writes it. It has no public address; gateway calls
// its RPC methods through a service binding after Player Identity has checked
// the sign-in with Google. Every result uses the standard response format
// (DD-019). It writes no request log of its own, and never logs Account data.
import { WorkerEntrypoint } from "cloudflare:workers";
import { ERROR_CODES } from "@dungeon-destiny/contracts";
import type {
  AccountView,
  ApiResponse,
  ApiStatus,
  ErrorCode,
  PlayerRpc,
  PlayerSignInInput,
  PlayerSignInResult,
  ResponseMeta,
  RotateRefreshTokenInput,
  RotateRefreshTokenResult,
} from "@dungeon-destiny/contracts";
import { getAccount, rotateRefreshToken, signIn } from "./accounts/service";
import type { Result } from "./accounts/service";

const SERVICE = "player";

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

function response<T>(env: Env, requestId: string, status: ApiStatus, code: ErrorCode | null, message: string, data: T): ApiResponse<T> {
  return { status, code, message, data, meta: meta(env, requestId) };
}

function fromResult<T>(env: Env, requestId: string, result: Result<T>, message: string): ApiResponse<T | null> {
  if (result.ok) return response(env, requestId, "ok", null, message, result.value);
  return response(env, requestId, "error", result.code, result.message, null);
}

export default class PlayerService extends WorkerEntrypoint<Env> implements PlayerRpc {
  async health(requestId: string): Promise<ApiResponse<null>> {
    return response(this.env, requestId, "ok", null, "player is running", null);
  }

  async signIn(requestId: string, input: PlayerSignInInput): Promise<ApiResponse<PlayerSignInResult | null>> {
    const result = await signIn(this.env.PLAYER_D1, input as unknown, new Date());
    return fromResult(this.env, requestId, result, "Signed in.");
  }

  async rotateRefreshToken(requestId: string, input: RotateRefreshTokenInput): Promise<ApiResponse<RotateRefreshTokenResult | null>> {
    const result = await rotateRefreshToken(this.env.PLAYER_D1, input as unknown, new Date());
    return fromResult(this.env, requestId, result, "Refresh token replaced.");
  }

  async getAccount(requestId: string, accountId: string): Promise<ApiResponse<AccountView | null>> {
    const result = await getAccount(this.env.PLAYER_D1, accountId as unknown);
    return fromResult(this.env, requestId, result, "Account found.");
  }

  // player is reached only through RPC; any HTTP request is refused.
  override async fetch(): Promise<Response> {
    const body = response(this.env, crypto.randomUUID(), "error", ERROR_CODES.NOT_FOUND, "player has no HTTP endpoints.", null);
    return Response.json(body, { status: 404 });
  }
}
