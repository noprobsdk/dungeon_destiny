// FR-00006 tests for POST /auth/sign-in in the gateway: the server auth code
// is exchanged with Google, the player ID comes from Google's answer, and the
// answer carries an access token and a refresh token (DD-024).
import { env } from "cloudflare:workers";
import type { AuthTokens } from "@dungeon-destiny/contracts";
import { decodeProtectedHeader, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import {
  CLIENT_ID,
  CLIENT_SECRET,
  KEY_ID,
  call,
  codeFor,
  count,
  google,
  newPlayerId,
  playerFailure,
  post,
  sha256Hex,
  signingKeys,
} from "./helpers";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REFRESH_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const DAY = 24 * 60 * 60 * 1000;

function signInBody(serverAuthCode: string): { provider: string; serverAuthCode: string } {
  return { provider: "google_play_games", serverAuthCode };
}

describe("FR-00006: POST /auth/sign-in", () => {
  it("FR-00006: a good code creates an Account and answers both tokens and created", async () => {
    const before = Date.now();
    const { response, body } = await post<AuthTokens>("/auth/sign-in", signInBody(codeFor(newPlayerId())));
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.code).toBeNull();
    expect(body.meta.service).toBe("gateway");
    const data = body.data;
    expect(Object.keys(data).sort()).toEqual(
      ["accountId", "accessToken", "accessTokenExpiresAt", "created", "refreshToken", "refreshTokenExpiresAt"].sort(),
    );
    expect(data.accountId).toMatch(UUID_V4);
    expect(data.created).toBe(true);
    expect(data.refreshToken).toMatch(REFRESH_TOKEN);
    const accessExpires = Date.parse(data.accessTokenExpiresAt);
    expect(accessExpires - before).toBeGreaterThanOrEqual(15 * 60 * 1000 - 1000);
    expect(accessExpires - before).toBeLessThanOrEqual(15 * 60 * 1000 + 2000);
    const refreshExpires = Date.parse(data.refreshTokenExpiresAt);
    expect(refreshExpires - before).toBeGreaterThanOrEqual(30 * DAY - 1000);
    expect(refreshExpires - before).toBeLessThanOrEqual(30 * DAY + 2000);
    expect(await count("accounts")).toBe(1);
  });

  it("FR-00006: the access token is EdDSA with the key ID and only sub, iat, and exp, lasting 15 minutes", async () => {
    const { body } = await post<AuthTokens>("/auth/sign-in", signInBody(codeFor(newPlayerId())));
    const token = body.data.accessToken;
    expect(decodeProtectedHeader(token)).toEqual({ alg: "EdDSA", kid: KEY_ID });
    const { payload } = await jwtVerify(token, signingKeys.publicKey, { algorithms: ["EdDSA"] });
    expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "sub"]);
    expect(payload.sub).toBe(body.data.accountId);
    expect(payload.exp! - payload.iat!).toBe(15 * 60);
    expect(new Date(payload.exp! * 1000).toISOString()).toBe(body.data.accessTokenExpiresAt);
  });

  it("FR-00006: the code is exchanged with Google using the web client ID and secret, then the player ID is read", async () => {
    const id = newPlayerId();
    await post("/auth/sign-in", signInBody(codeFor(id)));
    expect(google.tokenCalls).toHaveLength(1);
    const form = google.tokenCalls[0]!;
    expect(form.get("grant_type")).toBe("authorization_code");
    expect(form.get("code")).toBe(codeFor(id));
    expect(form.get("client_id")).toBe(CLIENT_ID);
    expect(form.get("client_secret")).toBe(CLIENT_SECRET);
    expect(form.get("redirect_uri")).toBe("");
    expect(google.playerCalls).toEqual([`Bearer google-access:${id}`]);
    const row = await env.TEST_PLAYER_D1.prepare("SELECT provider, provider_player_id FROM account_sign_ins").first();
    expect(row).toEqual({ provider: "google_play_games", provider_player_id: id });
  });

  it("FR-00006: Player D1 stores only the SHA-256 hash of the refresh token", async () => {
    const { body } = await post<AuthTokens>("/auth/sign-in", signInBody(codeFor(newPlayerId())));
    const rows = await env.TEST_PLAYER_D1.prepare("SELECT token_hash, expires_at FROM refresh_tokens").all<{ token_hash: string; expires_at: string }>();
    expect(rows.results).toEqual([{ token_hash: await sha256Hex(body.data.refreshToken), expires_at: body.data.refreshTokenExpiresAt }]);
    const dump = JSON.stringify(
      (await env.TEST_PLAYER_D1.prepare("SELECT * FROM refresh_tokens UNION ALL SELECT *, NULL, NULL, NULL FROM account_sign_ins").all()).results,
    );
    expect(dump).not.toContain(body.data.refreshToken);
  });

  it("FR-00006: a second sign-in with the same Play Games player returns the same Account with created false", async () => {
    const id = newPlayerId();
    const first = await post<AuthTokens>("/auth/sign-in", signInBody(codeFor(id)));
    const second = await post<AuthTokens>("/auth/sign-in", signInBody(codeFor(id)));
    expect(second.response.status).toBe(200);
    expect(second.body.data.accountId).toBe(first.body.data.accountId);
    expect(second.body.data.created).toBe(false);
    expect(second.body.data.refreshToken).not.toBe(first.body.data.refreshToken);
    expect(await count("accounts")).toBe(1);
  });

  it("FR-00006: a code Google refuses answers SIGN_IN_FAILED and creates nothing", async () => {
    const { response, body } = await post("/auth/sign-in", signInBody("fr-00006-refused-code"));
    expect(response.status).toBe(401);
    expect(body).toEqual(expect.objectContaining({ status: "error", code: "SIGN_IN_FAILED", data: null }));
    expect(google.playerCalls).toHaveLength(0);
    expect(await count("accounts")).toBe(0);
  });

  it.each([
    ["answers with an error", "error"],
    ["cannot be reached", "network"],
  ] as const)("FR-00006: when Google %s, sign-in answers SIGN_IN_UNAVAILABLE", async (_label, mode) => {
    google.down = mode;
    const { response, body } = await post("/auth/sign-in", signInBody(codeFor(newPlayerId())));
    expect(response.status).toBe(503);
    expect(body.code).toBe("SIGN_IN_UNAVAILABLE");
    expect(await count("accounts")).toBe(0);
  });

  it("FR-00006: when the Play Games Services API fails after the exchange, sign-in answers SIGN_IN_UNAVAILABLE", async () => {
    google.playersMeDown = true;
    const { response, body } = await post("/auth/sign-in", signInBody(codeFor(newPlayerId())));
    expect(response.status).toBe(503);
    expect(body.code).toBe("SIGN_IN_UNAVAILABLE");
    expect(await count("accounts")).toBe(0);
  });

  it("FR-00006: when player fails, sign-in answers SIGN_IN_UNAVAILABLE without tokens", async () => {
    playerFailure.fail = true;
    const { response, body } = await post("/auth/sign-in", signInBody(codeFor(newPlayerId())));
    expect(response.status).toBe(503);
    expect(body).toEqual(expect.objectContaining({ code: "SIGN_IN_UNAVAILABLE", data: null }));
  });

  it.each([
    ["no body", undefined],
    ["a body that is not JSON", "provider=google_play_games"],
    ["a JSON array", "[]"],
    ["no provider", { serverAuthCode: "code-for:g1" }],
    ["no server auth code", { provider: "google_play_games" }],
    ["an empty server auth code", { provider: "google_play_games", serverAuthCode: "" }],
    ["a server auth code that is not a string", { provider: "google_play_games", serverAuthCode: 42 }],
    ["a server auth code that is too long", { provider: "google_play_games", serverAuthCode: "x".repeat(2049) }],
    ["an unknown provider", { provider: "guest", serverAuthCode: "code-for:g1" }],
    ["Game Center, which is not built yet", { provider: "apple_game_center", serverAuthCode: "code-for:g1" }],
    ["a player ID sent by the client", { provider: "google_play_games", serverAuthCode: "code-for:g1", playerId: "g1" }],
    ["an Account ID sent by the client", { provider: "google_play_games", serverAuthCode: "code-for:g1", accountId: crypto.randomUUID() }],
  ])("FR-00006: %s answers INVALID_REQUEST without calling Google", async (_label, body) => {
    const result = body === undefined ? await call("/auth/sign-in", { method: "POST" }) : await post("/auth/sign-in", body);
    expect(result.response.status).toBe(400);
    expect(result.body).toEqual(expect.objectContaining({ status: "error", code: "INVALID_REQUEST", data: null }));
    expect(google.tokenCalls).toHaveLength(0);
  });

  it("FR-00006: a body over 8 KiB answers INVALID_REQUEST", async () => {
    const { response, body } = await post("/auth/sign-in", JSON.stringify({ provider: "google_play_games", serverAuthCode: "x", pad: "y".repeat(9000) }));
    expect(response.status).toBe(400);
    expect(body.code).toBe("INVALID_REQUEST");
  });

  it("FR-00006: GET /auth/sign-in answers METHOD_NOT_ALLOWED with Allow: POST", async () => {
    const { response, body } = await call("/auth/sign-in");
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(body.code).toBe("METHOD_NOT_ALLOWED");
  });

  it.each([
    ["the signing key is missing", { ACCESS_TOKEN_SIGNING_KEY: "" }],
    ["the signing key is not a JWK", { ACCESS_TOKEN_SIGNING_KEY: "not json" }],
    ["the signing key is a public key", { ACCESS_TOKEN_SIGNING_KEY: "{\"kty\":\"OKP\",\"crv\":\"Ed25519\",\"x\":\"11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo\"}" }],
    ["the key ID is missing", { ACCESS_TOKEN_KEY_ID: "" }],
    ["the client ID is missing", { GOOGLE_OAUTH_CLIENT_ID: "" }],
    ["the client secret is missing", { GOOGLE_OAUTH_CLIENT_SECRET: "" }],
  ])("FR-00006: when %s, sign-in answers SERVER_MISCONFIGURED without calling Google", async (_label, overrides) => {
    const { response, body } = await post("/auth/sign-in", signInBody(codeFor(newPlayerId())), overrides);
    expect(response.status).toBe(500);
    expect(body.code).toBe("SERVER_MISCONFIGURED");
    expect(google.tokenCalls).toHaveLength(0);
  });

  it("FR-00006: the build check of FR-00005 runs before sign-in", async () => {
    const { response, body } = await post("/auth/sign-in", signInBody(codeFor(newPlayerId())), {
      APP_MIN_BUILD_ANDROID: "2",
      APP_RECOMMENDED_BUILD_ANDROID: "2",
    });
    expect(response.status).toBe(426);
    expect(body.code).toBe("APP_UPDATE_REQUIRED");
    expect(google.tokenCalls).toHaveLength(0);
  });
});
