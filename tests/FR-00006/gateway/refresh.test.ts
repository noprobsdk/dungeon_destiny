// FR-00006 tests for POST /auth/refresh in the gateway: the refresh token is
// replaced on every use, a retry within 30 seconds is accepted, and later
// reuse revokes the chain (DD-024).
import type { AuthTokens } from "@dungeon-destiny/contracts";
import { jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { call, codeFor, google, newPlayerId, playerClock, playerFailure, post, signingKeys } from "./helpers";

async function signedIn(): Promise<AuthTokens> {
  const { body } = await post<AuthTokens>("/auth/sign-in", { provider: "google_play_games", serverAuthCode: codeFor(newPlayerId()) });
  return body.data;
}

function refresh(refreshToken: unknown) {
  return post<AuthTokens>("/auth/refresh", { refreshToken });
}

describe("FR-00006: POST /auth/refresh", () => {
  it("FR-00006: a valid refresh token answers new tokens for the same Account, with created false", async () => {
    const tokens = await signedIn();
    const { response, body } = await refresh(tokens.refreshToken);
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data.accountId).toBe(tokens.accountId);
    expect(body.data.created).toBe(false);
    expect(body.data.refreshToken).not.toBe(tokens.refreshToken);
    const { payload } = await jwtVerify(body.data.accessToken, signingKeys.publicKey, { algorithms: ["EdDSA"] });
    expect(payload.sub).toBe(tokens.accountId);
    expect(google.tokenCalls).toHaveLength(1);
  });

  it("FR-00006: the new refresh token works, and so does the next one", async () => {
    const tokens = await signedIn();
    const second = await refresh(tokens.refreshToken);
    const third = await refresh(second.body.data.refreshToken);
    expect(third.response.status).toBe(200);
    expect(third.body.data.accountId).toBe(tokens.accountId);
  });

  it("FR-00006: a retry with the same token within 30 seconds is accepted", async () => {
    const tokens = await signedIn();
    await refresh(tokens.refreshToken);
    playerClock.offsetMs = 20_000;
    const retry = await refresh(tokens.refreshToken);
    expect(retry.response.status).toBe(200);
    expect(retry.body.data.accountId).toBe(tokens.accountId);
  });

  it("FR-00006: reuse after 30 seconds is refused and revokes the chain", async () => {
    const tokens = await signedIn();
    const next = await refresh(tokens.refreshToken);
    playerClock.offsetMs = 31_000;
    const reuse = await refresh(tokens.refreshToken);
    expect(reuse.response.status).toBe(401);
    expect(reuse.body).toEqual(expect.objectContaining({ status: "error", code: "INVALID_REFRESH_TOKEN", data: null }));
    const after = await refresh(next.body.data.refreshToken);
    expect(after.response.status).toBe(401);
    expect(after.body.code).toBe("INVALID_REFRESH_TOKEN");
  });

  it("FR-00006: an unknown refresh token answers INVALID_REFRESH_TOKEN", async () => {
    const made = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const { response, body } = await refresh(made);
    expect(response.status).toBe(401);
    expect(body.code).toBe("INVALID_REFRESH_TOKEN");
  });

  it.each([
    ["no refresh token", {}],
    ["a token of the wrong length", { refreshToken: "short" }],
    ["a token with characters outside base64url", { refreshToken: `${"a".repeat(42)}=` }],
    ["a token that is not a string", { refreshToken: 7 }],
    ["an extra field", { refreshToken: "a".repeat(43), accountId: crypto.randomUUID() }],
  ])("FR-00006: %s answers INVALID_REQUEST", async (_label, body) => {
    const { response, body: answer } = await post("/auth/refresh", body);
    expect(response.status).toBe(400);
    expect(answer.code).toBe("INVALID_REQUEST");
  });

  it("FR-00006: when player fails, refresh answers SIGN_IN_UNAVAILABLE", async () => {
    const tokens = await signedIn();
    playerFailure.fail = true;
    const { response, body } = await refresh(tokens.refreshToken);
    expect(response.status).toBe(503);
    expect(body.code).toBe("SIGN_IN_UNAVAILABLE");
  });

  it("FR-00006: GET /auth/refresh answers METHOD_NOT_ALLOWED", async () => {
    const { response } = await call("/auth/refresh");
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });
});
