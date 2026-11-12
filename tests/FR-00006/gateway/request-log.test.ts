// FR-00006 tests for the gateway request log with Player Identity: accountId
// is added to authenticated calls and successful sign-ins and refreshes, and
// no token, server auth code, or Play Games player ID is ever logged.
import type { AuthTokens } from "@dungeon-destiny/contracts";
import { describe, expect, it } from "vitest";
import { bearer, call, codeFor, google, logs, newPlayerId, post } from "./helpers";

function requestLines(): Record<string, unknown>[] {
  return logs
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((line) => line.event === "request");
}

function lastLine(): Record<string, unknown> {
  const lines = requestLines();
  expect(lines.length).toBeGreaterThan(0);
  return lines[lines.length - 1]!;
}

describe("FR-00006: request log", () => {
  it("FR-00006: a successful sign-in, refresh, and /me each log the accountId", async () => {
    const id = newPlayerId();
    const signIn = await post<AuthTokens>("/auth/sign-in", { provider: "google_play_games", serverAuthCode: codeFor(id) });
    expect(lastLine()).toEqual(expect.objectContaining({ path: "/auth/sign-in", status: 200, accountId: signIn.body.data.accountId }));
    const refreshed = await post<AuthTokens>("/auth/refresh", { refreshToken: signIn.body.data.refreshToken });
    expect(lastLine()).toEqual(expect.objectContaining({ path: "/auth/refresh", status: 200, accountId: signIn.body.data.accountId }));
    await bearer("/me", refreshed.body.data.accessToken);
    expect(lastLine()).toEqual(expect.objectContaining({ path: "/me", status: 200, accountId: signIn.body.data.accountId }));
  });

  it("FR-00006: refused calls log no accountId", async () => {
    await call("/me");
    expect(lastLine()).not.toHaveProperty("accountId");
    await post("/auth/sign-in", { provider: "google_play_games", serverAuthCode: "fr-00006-refused-code" });
    expect(lastLine()).not.toHaveProperty("accountId");
    expect(lastLine()).toEqual(expect.objectContaining({ code: "SIGN_IN_FAILED" }));
  });

  it("FR-00006: no log line contains a token, server auth code, Play Games player ID, or Google's answer", async () => {
    const id = newPlayerId();
    const code = codeFor(id);
    const signIn = await post<AuthTokens>("/auth/sign-in", { provider: "google_play_games", serverAuthCode: code });
    const refreshed = await post<AuthTokens>("/auth/refresh", { refreshToken: signIn.body.data.refreshToken });
    await bearer("/me", refreshed.body.data.accessToken);
    await post("/auth/sign-in", { provider: "google_play_games", serverAuthCode: "fr-00006-refused-code" });
    google.down = "network";
    await post("/auth/sign-in", { provider: "google_play_games", serverAuthCode: code });
    const secrets = [
      code,
      id,
      `google-access:${id}`,
      signIn.body.data.accessToken,
      signIn.body.data.refreshToken,
      refreshed.body.data.accessToken,
      refreshed.body.data.refreshToken,
      "fr-00006-fake-client-secret",
      "invalid_grant",
    ];
    expect(logs.length).toBeGreaterThan(0);
    for (const line of logs) {
      for (const secret of secrets) expect(line).not.toContain(secret);
    }
  });

  it("FR-00006: an error answer never contains the token or code that was sent", async () => {
    const { body } = await post("/auth/sign-in", { provider: "google_play_games", serverAuthCode: "fr-00006-refused-code" });
    expect(JSON.stringify(body)).not.toContain("fr-00006-refused-code");
    const made = "b".repeat(43);
    const refresh = await post("/auth/refresh", { refreshToken: made });
    expect(JSON.stringify(refresh.body)).not.toContain(made);
  });
});
