// FR-00006 tests for the access-token check and GET /me in the gateway: only
// an EdDSA token signed with the gateway's key, with its key ID, and not
// expired, identifies an Account (DD-024).
import type { AccountView, AuthTokens } from "@dungeon-destiny/contracts";
import { SignJWT, UnsecuredJWT } from "jose";
import { describe, expect, it } from "vitest";
import { KEY_ID, bearer, call, codeFor, newPlayerId, otherKeys, playerFailure, post, signingKeys } from "./helpers";
import { env } from "cloudflare:workers";

async function signedIn(): Promise<AuthTokens> {
  const { body } = await post<AuthTokens>("/auth/sign-in", { provider: "google_play_games", serverAuthCode: codeFor(newPlayerId()) });
  return body.data;
}

type TokenOptions = { kid?: string; alg?: string; key?: CryptoKey | Uint8Array; issuedAt?: number; expiresAt?: number; extra?: Record<string, unknown> };

async function token(accountId: string, options: TokenOptions = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...(options.extra ?? {}) })
    .setProtectedHeader({ alg: options.alg ?? "EdDSA", kid: options.kid ?? KEY_ID })
    .setSubject(accountId)
    .setIssuedAt(options.issuedAt ?? now)
    .setExpirationTime(options.expiresAt ?? now + 900)
    .sign(options.key ?? signingKeys.privateKey);
}

describe("FR-00006: GET /me", () => {
  it("FR-00006: answers the signed-in Account's ID, providers, and creation time", async () => {
    const tokens = await signedIn();
    const { response, body } = await bearer<AccountView>("/me", tokens.accessToken);
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data).toEqual({ accountId: tokens.accountId, providers: ["google_play_games"], createdAt: expect.any(String) });
    expect(Number.isNaN(Date.parse(body.data.createdAt))).toBe(false);
  });

  it("FR-00006: a token made by the gateway's own key with the right claims is accepted", async () => {
    const tokens = await signedIn();
    const { response } = await bearer("/me", await token(tokens.accountId));
    expect(response.status).toBe(200);
  });

  it("FR-00006: without a token answers AUTH_REQUIRED", async () => {
    const { response, body } = await call("/me");
    expect(response.status).toBe(401);
    expect(body).toEqual(expect.objectContaining({ status: "error", code: "AUTH_REQUIRED", data: null }));
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
  });

  it.each([
    ["a header without Bearer", (t: string) => t],
    ["Basic authentication", (t: string) => `Basic ${t}`],
    ["an empty Bearer token", () => "Bearer "],
    ["a token that is not a JWT", () => "Bearer not.a.jwt"],
  ])("FR-00006: %s answers AUTH_REQUIRED", async (_label, header) => {
    const tokens = await signedIn();
    const { response, body } = await call("/me", { headers: { Authorization: header(tokens.accessToken) } });
    expect(response.status).toBe(401);
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("FR-00006: a token signed with another key answers AUTH_REQUIRED", async () => {
    const tokens = await signedIn();
    const { response, body } = await bearer("/me", await token(tokens.accountId, { key: otherKeys.privateKey }));
    expect(response.status).toBe(401);
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("FR-00006: a token with another key ID answers AUTH_REQUIRED", async () => {
    const tokens = await signedIn();
    const { body } = await bearer("/me", await token(tokens.accountId, { kid: "another-key" }));
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("FR-00006: a token with another algorithm answers AUTH_REQUIRED", async () => {
    const tokens = await signedIn();
    const secret = new TextEncoder().encode("fr-00006-hmac-secret-that-is-long-enough");
    const { body } = await bearer("/me", await token(tokens.accountId, { alg: "HS256", key: secret }));
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("FR-00006: an unsigned token (alg none) answers AUTH_REQUIRED", async () => {
    const tokens = await signedIn();
    const unsigned = new UnsecuredJWT({}).setSubject(tokens.accountId).setIssuedAt().setExpirationTime("15m").encode();
    const { body } = await bearer("/me", unsigned);
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("FR-00006: a token with a changed payload answers AUTH_REQUIRED", async () => {
    const tokens = await signedIn();
    const other = await signedIn();
    const [header, , signature] = tokens.accessToken.split(".");
    const forgedPayload = btoa(JSON.stringify({ sub: other.accountId, iat: 0, exp: 4_102_444_800 })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const { body } = await bearer("/me", `${header}.${forgedPayload}.${signature}`);
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("FR-00006: an expired token answers AUTH_EXPIRED", async () => {
    const tokens = await signedIn();
    const now = Math.floor(Date.now() / 1000);
    const { response, body } = await bearer("/me", await token(tokens.accountId, { issuedAt: now - 1000, expiresAt: now - 100 }));
    expect(response.status).toBe(401);
    expect(body.code).toBe("AUTH_EXPIRED");
  });

  it("FR-00006: a token whose subject is not an Account ID answers AUTH_REQUIRED", async () => {
    const { body } = await bearer("/me", await token("1 OR 1=1"));
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("FR-00006: a token for an Account that no longer exists answers AUTH_REQUIRED", async () => {
    const tokens = await signedIn();
    await env.TEST_PLAYER_D1.prepare("DELETE FROM accounts WHERE account_id = ?").bind(tokens.accountId).run();
    const { response, body } = await bearer("/me", tokens.accessToken);
    expect(response.status).toBe(401);
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("FR-00006: a refresh token used as an access token answers AUTH_REQUIRED", async () => {
    const tokens = await signedIn();
    const { body } = await bearer("/me", tokens.refreshToken);
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("FR-00006: when player fails, /me answers SIGN_IN_UNAVAILABLE", async () => {
    const tokens = await signedIn();
    playerFailure.fail = true;
    const { response, body } = await bearer("/me", tokens.accessToken);
    expect(response.status).toBe(503);
    expect(body.code).toBe("SIGN_IN_UNAVAILABLE");
  });

  it("FR-00006: POST /me answers METHOD_NOT_ALLOWED", async () => {
    const { response } = await call("/me", { method: "POST" });
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  });

  it("FR-00006: the build check of FR-00005 runs before /me", async () => {
    const tokens = await signedIn();
    const { response } = await call(
      "/me",
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
      { APP_MIN_BUILD_ANDROID: "2", APP_RECOMMENDED_BUILD_ANDROID: "2" },
    );
    expect(response.status).toBe(426);
  });
});
