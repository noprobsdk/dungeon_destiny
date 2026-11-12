// FR-00006 tests for the player Worker's Account operations: the first
// sign-in creates the Account, later sign-ins return it, and only one Account
// can come from one Play Games player ID (DD-024).
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { getAccount, signIn } from "../../../apps/player/src/accounts/service";
import { REQUEST_ID, T0, at, count, hash, player, playerId, signInInput, tokenRow } from "./helpers";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type SignInRow = {
  provider: string;
  provider_player_id: string;
  account_id: string;
  created_at: string;
  last_sign_in_at: string;
};

async function signInRows(): Promise<SignInRow[]> {
  const result = await env.PLAYER_D1.prepare("SELECT * FROM account_sign_ins").all<SignInRow>();
  return result.results;
}

describe("FR-00006: player sign-in", () => {
  it("FR-00006: the first sign-in creates one Account with a UUID v4 and one sign-in", async () => {
    const id = playerId();
    const result = await signIn(env.PLAYER_D1, signInInput(id, hash()), T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.created).toBe(true);
    expect(result.value.accountId).toMatch(UUID_V4);
    expect(await count("accounts")).toBe(1);
    expect(await signInRows()).toEqual([
      {
        provider: "google_play_games",
        provider_player_id: id,
        account_id: result.value.accountId,
        created_at: T0.toISOString(),
        last_sign_in_at: T0.toISOString(),
      },
    ]);
  });

  it("FR-00006: a second sign-in with the same ID returns the same Account and updates last_sign_in_at", async () => {
    const id = playerId();
    const first = await signIn(env.PLAYER_D1, signInInput(id, hash()), T0);
    const later = at(T0, 60_000);
    const second = await signIn(env.PLAYER_D1, signInInput(id, hash(), later), later);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value).toEqual({ accountId: first.value.accountId, created: false });
    expect(await count("accounts")).toBe(1);
    const [row] = await signInRows();
    expect(row?.created_at).toBe(T0.toISOString());
    expect(row?.last_sign_in_at).toBe(later.toISOString());
  });

  it("FR-00006: different player IDs get different Accounts", async () => {
    const a = await signIn(env.PLAYER_D1, signInInput(playerId(), hash()), T0);
    const b = await signIn(env.PLAYER_D1, signInInput(playerId(), hash()), T0);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.accountId).not.toBe(b.value.accountId);
    expect(await count("accounts")).toBe(2);
  });

  it("FR-00006: two sign-ins at the same time with a new ID create only one Account", async () => {
    const id = playerId();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => signIn(env.PLAYER_D1, signInInput(id, hash()), T0)),
    );
    const accountIds = new Set(results.map((r) => (r.ok ? r.value.accountId : "failed")));
    expect(accountIds.size).toBe(1);
    expect(accountIds.has("failed")).toBe(false);
    expect(results.filter((r) => r.ok && r.value.created)).toHaveLength(1);
    expect(await count("accounts")).toBe(1);
    expect(await count("account_sign_ins")).toBe(1);
    expect(await count("refresh_tokens")).toBe(5);
  });

  it("FR-00006: every sign-in starts a new refresh-token chain for the Account", async () => {
    const id = playerId();
    const firstHash = hash();
    const secondHash = hash();
    await signIn(env.PLAYER_D1, signInInput(id, firstHash), T0);
    await signIn(env.PLAYER_D1, signInInput(id, secondHash), T0);
    const first = await tokenRow(firstHash);
    const second = await tokenRow(secondHash);
    expect(first?.account_id).toBe(second?.account_id);
    expect(first?.chain_id).not.toBe(second?.chain_id);
    expect(first?.replaced_at).toBeNull();
    expect(second?.replaced_at).toBeNull();
  });

  it("FR-00006: the Account is not created when the refresh-token hash is already used", async () => {
    const used = hash();
    await signIn(env.PLAYER_D1, signInInput(playerId(), used), T0);
    const result = await signIn(env.PLAYER_D1, signInInput(playerId(), used), T0);
    expect(result.ok).toBe(false);
    expect(await count("accounts")).toBe(1);
    expect(await count("account_sign_ins")).toBe(1);
  });

  it.each([
    ["no input", undefined],
    ["an unknown provider", { ...signInInput("g1", hash()), provider: "guest" }],
    ["an empty player ID", signInInput("", hash())],
    ["a player ID that is too long", signInInput("g".repeat(256), hash())],
    ["a hash that is not SHA-256 hex", signInInput("g1", "not-a-hash")],
    ["an expiry that is not a date", { ...signInInput("g1", hash()), refreshToken: { hash: hash(), expiresAt: "soon" } }],
    ["an extra field", { ...signInInput("g1", hash()), accountId: "00000000-0000-4000-8000-000000000000" }],
  ])("FR-00006: sign-in with %s is refused with INVALID_REQUEST and changes nothing", async (_label, input) => {
    const result = await signIn(env.PLAYER_D1, input, T0);
    expect(result).toEqual(expect.objectContaining({ ok: false, code: "INVALID_REQUEST" }));
    expect(await count("accounts")).toBe(0);
  });
});

describe("FR-00006: player getAccount", () => {
  it("FR-00006: answers the Account's ID, providers, and creation time", async () => {
    const created = await signIn(env.PLAYER_D1, signInInput(playerId(), hash()), T0);
    if (!created.ok) throw new Error("sign-in failed");
    const result = await getAccount(env.PLAYER_D1, created.value.accountId);
    expect(result).toEqual({
      ok: true,
      value: { accountId: created.value.accountId, providers: ["google_play_games"], createdAt: T0.toISOString() },
    });
  });

  it("FR-00006: an unknown Account answers NOT_FOUND", async () => {
    expect(await getAccount(env.PLAYER_D1, crypto.randomUUID())).toEqual(expect.objectContaining({ ok: false, code: "NOT_FOUND" }));
  });

  it("FR-00006: an Account ID that is not a UUID answers INVALID_REQUEST", async () => {
    expect(await getAccount(env.PLAYER_D1, "1 OR 1=1")).toEqual(expect.objectContaining({ ok: false, code: "INVALID_REQUEST" }));
  });
});

describe("FR-00006: player RPC", () => {
  it("FR-00006: health answers ok in the standard format", async () => {
    const response = await player.health(REQUEST_ID);
    expect(response).toEqual(
      expect.objectContaining({ status: "ok", code: null, data: null, meta: expect.objectContaining({ requestId: REQUEST_ID, service: "player" }) }),
    );
  });

  it("FR-00006: signIn and getAccount work through RPC with the standard response format", async () => {
    const signedIn = await player.signIn(REQUEST_ID, signInInput(playerId(), hash(), new Date()));
    expect(signedIn.status).toBe("ok");
    expect(signedIn.data?.created).toBe(true);
    const accountId = signedIn.data?.accountId ?? "";
    const account = await player.getAccount(REQUEST_ID, accountId);
    expect(account).toEqual(
      expect.objectContaining({ status: "ok", code: null, data: expect.objectContaining({ accountId, providers: ["google_play_games"] }) }),
    );
  });

  it("FR-00006: refused input comes back as an error in the standard format", async () => {
    const response = await player.signIn(REQUEST_ID, { provider: "guest" } as never);
    expect(response).toEqual(expect.objectContaining({ status: "error", code: "INVALID_REQUEST", data: null }));
  });

  it("FR-00006: player has no HTTP endpoints", async () => {
    const response = await player.fetch(new Request("https://dd-dev-player.example/health"));
    expect(response.status).toBe(404);
  });
});
