// FR-00006: Player Identity in the gateway (DD-024): POST /auth/sign-in,
// POST /auth/refresh, the access-token check, and GET /me. Only the gateway
// decides which Account a caller is; the client never sends an account_id,
// and a player ID from the client is never trusted. Player D1 is reached only
// through the player Worker's RPC. Tokens and server auth codes are never
// logged or returned in an error.
import { ERROR_CODES, SIGN_IN_PROVIDERS } from "@dungeon-destiny/contracts";
import type { AccountView, ApiResponse, AuthTokens, PlayerRpc } from "@dungeon-destiny/contracts";
import { z } from "zod";
import { error, respond } from "../api-gateway/respond";
import type { Handled, RequestContext } from "../api-gateway/respond";
import { confirmPlayGamesPlayer } from "./google";
import type { GoogleClient } from "./google";
import {
  REFRESH_TOKEN_FORMAT,
  bearerToken,
  checkAccessToken,
  hashRefreshToken,
  issueAccessToken,
  loadSigningKey,
  newRefreshToken,
  refreshTokenExpiry,
} from "./tokens";
import type { SigningKey } from "./tokens";

// Bodies are small; anything larger is refused before it is parsed.
const MAX_BODY_BYTES = 8 * 1024;

const signInBody = z.strictObject({
  provider: z.enum(SIGN_IN_PROVIDERS),
  serverAuthCode: z.string().min(1).max(2048),
});

const refreshBody = z.strictObject({
  refreshToken: z.string().regex(REFRESH_TOKEN_FORMAT),
});

// The PLAYER service binding, typed by the shared contract that player
// implements.
function player(env: Env): PlayerRpc {
  return env.PLAYER as unknown as PlayerRpc;
}

function misconfigured(context: RequestContext): Handled {
  return error(context, 500, ERROR_CODES.SERVER_MISCONFIGURED, "The server's sign-in settings are invalid.");
}

function invalidRequest(context: RequestContext): Handled {
  return error(context, 400, ERROR_CODES.INVALID_REQUEST, "The request body is missing or invalid.");
}

function unavailable(context: RequestContext): Handled {
  return error(context, 503, ERROR_CODES.SIGN_IN_UNAVAILABLE, "Sign-in is not available right now. Please try again.");
}

function authRequired(context: RequestContext, invalidToken: boolean): Handled {
  return error(context, 401, ERROR_CODES.AUTH_REQUIRED, "Sign in to use this endpoint.", {
    "WWW-Authenticate": invalidToken ? 'Bearer error="invalid_token"' : "Bearer",
  });
}

async function readJsonBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("Content-Length") ?? "0");
  if (declared > MAX_BODY_BYTES) return undefined;
  const text = await request.text();
  if (text === "" || new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function googleClient(env: Env): GoogleClient | null {
  const clientId: unknown = env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret: unknown = env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (typeof clientId !== "string" || clientId === "" || typeof clientSecret !== "string" || clientSecret === "") return null;
  return { clientId, clientSecret };
}

function signingKey(env: Env): Promise<SigningKey | null> {
  return loadSigningKey(env.ACCESS_TOKEN_SIGNING_KEY, env.ACCESS_TOKEN_KEY_ID);
}

// Calls player, turning a failed call into null so the caller answers
// SIGN_IN_UNAVAILABLE. Only the error's name is logged.
async function callPlayer<T>(call: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T> | null> {
  try {
    return await call();
  } catch (failure) {
    console.error(JSON.stringify({ event: "playerCallFailed", error: failure instanceof Error ? failure.name : "unknown" }));
    return null;
  }
}

async function tokensFor(
  context: RequestContext,
  key: SigningKey,
  accountId: string,
  refreshToken: string,
  refreshTokenExpiresAt: string,
  created: boolean,
  now: Date,
): Promise<Handled> {
  const access = await issueAccessToken(key, accountId, now);
  const data: AuthTokens = {
    accountId,
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt,
    refreshToken,
    refreshTokenExpiresAt,
    created,
  };
  return { response: respond(context, 200, "ok", null, created ? "Account created." : "Signed in.", data), code: null, accountId };
}

export async function signIn(request: Request, context: RequestContext): Promise<Handled> {
  const key = await signingKey(context.env);
  const client = googleClient(context.env);
  if (key === null || client === null) return misconfigured(context);

  const body = signInBody.safeParse(await readJsonBody(request));
  if (!body.success) return invalidRequest(context);

  const google = await confirmPlayGamesPlayer(body.data.serverAuthCode, client);
  if (google.kind === "refused") {
    return error(context, 401, ERROR_CODES.SIGN_IN_FAILED, "Play Games did not accept the sign-in. Please sign in again.");
  }
  if (google.kind === "unavailable") return unavailable(context);

  const now = new Date();
  const refreshToken = newRefreshToken();
  const refreshTokenExpiresAt = refreshTokenExpiry(now);
  const result = await callPlayer(async () =>
    player(context.env).signIn(context.requestId, {
      provider: body.data.provider,
      providerPlayerId: google.playerId,
      refreshToken: { hash: await hashRefreshToken(refreshToken), expiresAt: refreshTokenExpiresAt },
    }),
  );
  if (result === null || result.status !== "ok" || result.data === null) return unavailable(context);
  return tokensFor(context, key, result.data.accountId, refreshToken, refreshTokenExpiresAt, result.data.created, now);
}

export async function refresh(request: Request, context: RequestContext): Promise<Handled> {
  const key = await signingKey(context.env);
  if (key === null) return misconfigured(context);

  const body = refreshBody.safeParse(await readJsonBody(request));
  if (!body.success) return invalidRequest(context);

  const now = new Date();
  const refreshToken = newRefreshToken();
  const refreshTokenExpiresAt = refreshTokenExpiry(now);
  const presentedHash = await hashRefreshToken(body.data.refreshToken);
  const nextHash = await hashRefreshToken(refreshToken);
  const result = await callPlayer(() =>
    player(context.env).rotateRefreshToken(context.requestId, {
      presentedHash,
      next: { hash: nextHash, expiresAt: refreshTokenExpiresAt },
    }),
  );
  if (result === null) return unavailable(context);
  if (result.code === ERROR_CODES.INVALID_REFRESH_TOKEN) {
    return error(context, 401, ERROR_CODES.INVALID_REFRESH_TOKEN, "The refresh token is not valid. Please sign in again.");
  }
  if (result.status !== "ok" || result.data === null) return unavailable(context);
  return tokensFor(context, key, result.data.accountId, refreshToken, refreshTokenExpiresAt, false, now);
}

export type Authenticated = { kind: "ok"; accountId: string } | { kind: "refused"; handled: Handled };

// The access-token check for every call that needs an Account.
export async function authenticate(request: Request, context: RequestContext): Promise<Authenticated> {
  const key = await signingKey(context.env);
  if (key === null) return { kind: "refused", handled: misconfigured(context) };
  const token = bearerToken(request.headers);
  if (token === null) {
    return { kind: "refused", handled: authRequired(context, request.headers.has("Authorization")) };
  }
  const check = await checkAccessToken(key, token);
  if (check.kind === "expired") {
    return {
      kind: "refused",
      handled: error(context, 401, ERROR_CODES.AUTH_EXPIRED, "The access token has expired. Refresh it and try again.", {
        "WWW-Authenticate": 'Bearer error="invalid_token"',
      }),
    };
  }
  if (check.kind === "invalid") return { kind: "refused", handled: authRequired(context, true) };
  return { kind: "ok", accountId: check.accountId };
}

export async function me(request: Request, context: RequestContext): Promise<Handled> {
  const auth = await authenticate(request, context);
  if (auth.kind === "refused") return auth.handled;
  const result = await callPlayer(() => player(context.env).getAccount(context.requestId, auth.accountId));
  if (result === null) return unavailable(context);
  // A token for an Account that no longer exists identifies nobody.
  if (result.code === ERROR_CODES.NOT_FOUND) return authRequired(context, true);
  if (result.status !== "ok" || result.data === null) return unavailable(context);
  const data: AccountView = result.data;
  return { response: respond(context, 200, "ok", null, "Signed in.", data), code: null, accountId: auth.accountId };
}
