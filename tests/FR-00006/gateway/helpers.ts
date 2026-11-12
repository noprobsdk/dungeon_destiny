// FR-00006 test helpers for Player Identity in the gateway Worker. The Worker
// is called with a test environment:
// - PLAYER runs the real player Account operations on a local Player D1 with
//   every migration applied, in the same isolate, and can fail on purpose;
// - Google's OAuth token endpoint and the Play Games Services API are replaced
//   by a stand-in that records calls;
// - the Ed25519 signing key is generated here for each test run, so no key is
//   in the repository.
// No real server auth code, token, player ID, or secret is used.
import { env } from "cloudflare:workers";
import { applyD1Migrations, reset } from "cloudflare:test";
import type {
  AccountView,
  ApiResponse,
  PlayerRpc,
  PlayerSignInInput,
  PlayerSignInResult,
  ResponseMeta,
  RotateRefreshTokenInput,
  RotateRefreshTokenResult,
} from "@dungeon-destiny/contracts";
import { exportJWK, generateKeyPair } from "jose";
import type { CryptoKey, JWK } from "jose";
import { afterEach, beforeAll, beforeEach, vi } from "vitest";
import worker from "../../../apps/gateway/src/index";
import { getAccount, rotateRefreshToken, signIn } from "../../../apps/player/src/accounts/service";
import type { Result } from "../../../apps/player/src/accounts/service";

export const BASE = "https://dd-dev-gateway.example";
export const KEY_ID = "fr-00006-test-key";
export const CLIENT_ID = "fr-00006-test-client.apps.googleusercontent.com";
export const CLIENT_SECRET = "fr-00006-fake-client-secret";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const PLAYERS_ME_URL = "https://games.googleapis.com/games/v1/players/me";

export type KeyPair = { privateKey: CryptoKey; publicKey: CryptoKey; privateJwk: JWK; publicJwk: JWK };

export let signingKeys: KeyPair;
export let otherKeys: KeyPair;

async function keyPair(): Promise<KeyPair> {
  const { privateKey, publicKey } = await generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
  return { privateKey, publicKey, privateJwk: await exportJWK(privateKey), publicJwk: await exportJWK(publicKey) };
}

beforeAll(async () => {
  signingKeys = await keyPair();
  otherKeys = await keyPair();
});

// --- Google stand-in --------------------------------------------------------

// A server auth code "code-for:<player ID>" is accepted for that player; the
// code "refused" is refused. `google.down` makes both Google addresses fail.
export const google = {
  tokenCalls: [] as URLSearchParams[],
  playerCalls: [] as (string | null)[],
  down: false as false | "error" | "network",
  playersMeDown: false,
};

export function codeFor(playerId: string): string {
  return `code-for:${playerId}`;
}

// A made-up Play Games player ID, shaped like a real one.
export function newPlayerId(): string {
  const digits = crypto.getRandomValues(new Uint32Array(5));
  return `g${[...digits].map((n) => (n % 10000).toString().padStart(4, "0")).join("")}`;
}

async function googleStandIn(request: Request): Promise<Response> {
  if (request.url === TOKEN_URL && request.method === "POST") {
    const form = new URLSearchParams(await request.text());
    google.tokenCalls.push(form);
    if (google.down === "network") throw new TypeError("Network connection lost.");
    if (google.down === "error") return Response.json({ error: "backend_error" }, { status: 503 });
    const code = form.get("code") ?? "";
    if (!code.startsWith("code-for:")) {
      return Response.json({ error: "invalid_grant", error_description: "Bad Request" }, { status: 400 });
    }
    return Response.json({
      access_token: `google-access:${code.slice("code-for:".length)}`,
      expires_in: 3599,
      scope: "https://www.googleapis.com/auth/games_lite",
      token_type: "Bearer",
    });
  }
  if (request.url === PLAYERS_ME_URL && request.method === "GET") {
    const authorization = request.headers.get("authorization");
    google.playerCalls.push(authorization);
    if (google.down === "network") throw new TypeError("Network connection lost.");
    if (google.down === "error" || google.playersMeDown) return Response.json({ error: { code: 503 } }, { status: 503 });
    const prefix = "Bearer google-access:";
    if (authorization === null || !authorization.startsWith(prefix)) {
      return Response.json({ error: { code: 401 } }, { status: 401 });
    }
    return Response.json({ kind: "games#player", playerId: authorization.slice(prefix.length), displayName: "Not stored" });
  }
  return new Response("unexpected request in test", { status: 599 });
}

// --- player stand-in --------------------------------------------------------

// Moves the player Worker's clock, to test the refresh-token retry window.
export const playerClock = { offsetMs: 0 };
export const playerFailure = { fail: false };

function playerNow(): Date {
  return new Date(Date.now() + playerClock.offsetMs);
}

function meta(requestId: string): ResponseMeta {
  return {
    requestId,
    timestamp: new Date().toISOString(),
    service: "player",
    environment: "dev",
    version: { id: "player-test-version", tag: "player-test-tag", createdAt: "2026-11-12T00:00:00Z" },
  };
}

function wrap<T>(requestId: string, result: Result<T>): ApiResponse<T | null> {
  if (result.ok) return { status: "ok", code: null, message: "ok", data: result.value, meta: meta(requestId) };
  return { status: "error", code: result.code, message: result.message, data: null, meta: meta(requestId) };
}

function failing(): never {
  throw new Error("player is unavailable in this test");
}

export const player: PlayerRpc = {
  async health(requestId: string): Promise<ApiResponse<null>> {
    return { status: "ok", code: null, message: "player is running", data: null, meta: meta(requestId) };
  },
  async signIn(requestId: string, input: PlayerSignInInput): Promise<ApiResponse<PlayerSignInResult | null>> {
    if (playerFailure.fail) failing();
    return wrap(requestId, await signIn(env.TEST_PLAYER_D1, input, playerNow()));
  },
  async rotateRefreshToken(requestId: string, input: RotateRefreshTokenInput): Promise<ApiResponse<RotateRefreshTokenResult | null>> {
    if (playerFailure.fail) failing();
    return wrap(requestId, await rotateRefreshToken(env.TEST_PLAYER_D1, input, playerNow()));
  },
  async getAccount(requestId: string, accountId: string): Promise<ApiResponse<AccountView | null>> {
    if (playerFailure.fail) failing();
    return wrap(requestId, await getAccount(env.TEST_PLAYER_D1, accountId));
  },
};

// --- calling the gateway -----------------------------------------------------

export type EnvOverrides = Partial<Record<
  | "ACCESS_TOKEN_SIGNING_KEY"
  | "ACCESS_TOKEN_KEY_ID"
  | "GOOGLE_OAUTH_CLIENT_ID"
  | "GOOGLE_OAUTH_CLIENT_SECRET"
  | "APP_MIN_BUILD_ANDROID"
  | "APP_RECOMMENDED_BUILD_ANDROID",
  string
>>;

export function testEnv(overrides: EnvOverrides = {}): Env {
  return {
    ...env,
    ACCESS_TOKEN_SIGNING_KEY: JSON.stringify(signingKeys.privateJwk),
    ACCESS_TOKEN_KEY_ID: KEY_ID,
    GOOGLE_OAUTH_CLIENT_ID: CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: CLIENT_SECRET,
    PLAYER: player,
    ...overrides,
  } as unknown as Env;
}

export const APP = { "X-App-Platform": "android", "X-App-Build": "1" } as const;

export async function call<T = unknown>(path: string, init: RequestInit = {}, overrides: EnvOverrides = {}) {
  const request = new Request(`${BASE}${path}`, { ...init, headers: { ...APP, ...(init.headers as Record<string, string> | undefined) } });
  const response = await worker.fetch(request, testEnv(overrides));
  const body = (await response.json()) as ApiResponse<T>;
  return { response, body };
}

export function post<T = unknown>(path: string, body: unknown, overrides: EnvOverrides = {}) {
  return call<T>(path, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "Content-Type": "application/json" } }, overrides);
}

export function bearer<T = unknown>(path: string, token: string, overrides: EnvOverrides = {}) {
  return call<T>(path, { headers: { Authorization: `Bearer ${token}` } }, overrides);
}

// --- per-test setup -----------------------------------------------------------

export let logs: string[] = [];

beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.TEST_PLAYER_D1, env.TEST_PLAYER_MIGRATIONS);
  google.tokenCalls = [];
  google.playerCalls = [];
  google.down = false;
  google.playersMeDown = false;
  playerClock.offsetMs = 0;
  playerFailure.fail = false;
  logs = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => googleStandIn(new Request(input, init)));
  for (const method of ["log", "info", "warn", "error"] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function count(table: string): Promise<number> {
  const row = await env.TEST_PLAYER_D1.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>();
  return row?.n ?? 0;
}
