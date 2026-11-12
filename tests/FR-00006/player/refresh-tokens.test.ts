// FR-00006 tests for refresh-token rotation in the player Worker: only hashes
// are stored, each use replaces the token, a retry within 30 seconds gets a
// new next token, and a later reuse revokes the chain (DD-024).
import { env } from "cloudflare:workers";
import type { RotateRefreshTokenInput } from "@dungeon-destiny/contracts";
import { describe, expect, it } from "vitest";
import { REFRESH_RETRY_WINDOW_MS, rotateRefreshToken, signIn } from "../../../apps/player/src/accounts/service";
import { DAY, REQUEST_ID, T0, at, chainRows, days, hash, player, playerId, signInInput, tokenRow, usable } from "./helpers";

async function signedIn(tokenHash: string = hash(), now: Date = T0): Promise<{ accountId: string; tokenHash: string }> {
  const result = await signIn(env.PLAYER_D1, signInInput(playerId(), tokenHash, now), now);
  if (!result.ok) throw new Error("sign-in failed");
  return { accountId: result.value.accountId, tokenHash };
}

function rotation(presentedHash: string, nextHash: string, now: Date): RotateRefreshTokenInput {
  return { presentedHash, next: { hash: nextHash, expiresAt: days(now, 30) } };
}

describe("FR-00006: refresh-token storage", () => {
  it("FR-00006: a refresh token is stored as its hash only, with a 30-day expiry from the gateway", async () => {
    const tokenHash = hash();
    const { accountId } = await signedIn(tokenHash);
    const row = await tokenRow(tokenHash);
    expect(row).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      account_id: accountId,
      chain_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      token_hash: tokenHash,
      created_at: T0.toISOString(),
      expires_at: days(T0, 30),
      replaced_at: null,
      revoked_at: null,
    });
  });
});

describe("FR-00006: refresh-token rotation", () => {
  it("FR-00006: using a valid token replaces it with the next token in the same chain", async () => {
    const { accountId, tokenHash } = await signedIn();
    const nextHash = hash();
    const now = at(T0, 10 * 60_000);
    const result = await rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, nextHash, now), now);
    expect(result).toEqual({ ok: true, value: { accountId } });
    const old = await tokenRow(tokenHash);
    const next = await tokenRow(nextHash);
    expect(old?.replaced_at).toBe(now.toISOString());
    expect(old?.revoked_at).toBeNull();
    expect(next?.chain_id).toBe(old?.chain_id);
    expect(next?.created_at).toBe(now.toISOString());
    expect(next?.expires_at).toBe(days(now, 30));
    expect(next && usable(next)).toBe(true);
  });

  it("FR-00006: a chain can be rotated many times", async () => {
    const { accountId, tokenHash } = await signedIn();
    let current = tokenHash;
    for (let step = 1; step <= 5; step += 1) {
      const nextHash = hash();
      const now = at(T0, step * DAY);
      expect(await rotateRefreshToken(env.PLAYER_D1, rotation(current, nextHash, now), now)).toEqual({ ok: true, value: { accountId } });
      current = nextHash;
    }
    const rows = await chainRows((await tokenRow(current))!.chain_id);
    expect(rows).toHaveLength(6);
    expect(rows.filter(usable).map((r) => r.token_hash)).toEqual([current]);
  });

  it("FR-00006: a retry within 30 seconds revokes the token issued for it and issues a new next token", async () => {
    const { accountId, tokenHash } = await signedIn();
    const lostHash = hash();
    const retryHash = hash();
    const first = at(T0, 60_000);
    await rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, lostHash, first), first);
    const retry = at(first, REFRESH_RETRY_WINDOW_MS);
    expect(await rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, retryHash, retry), retry)).toEqual({ ok: true, value: { accountId } });
    expect((await tokenRow(lostHash))?.revoked_at).toBe(retry.toISOString());
    const next = await tokenRow(retryHash);
    expect(next && usable(next)).toBe(true);
    expect(next?.chain_id).toBe((await tokenRow(tokenHash))?.chain_id);
    // The retried token keeps its first replacement time, so retries do not
    // stretch the window.
    expect((await tokenRow(tokenHash))?.replaced_at).toBe(first.toISOString());
  });

  it("FR-00006: a second retry within the window also works and leaves one usable token", async () => {
    const { tokenHash } = await signedIn();
    const first = at(T0, 60_000);
    await rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, hash(), first), first);
    await rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, hash(), at(first, 5_000)), at(first, 5_000));
    const lastHash = hash();
    const result = await rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, lastHash, at(first, 10_000)), at(first, 10_000));
    expect(result.ok).toBe(true);
    const rows = await chainRows((await tokenRow(tokenHash))!.chain_id);
    expect(rows.filter(usable).map((r) => r.token_hash)).toEqual([lastHash]);
  });

  it("FR-00006: reuse after 30 seconds revokes the whole chain and is refused", async () => {
    const { tokenHash } = await signedIn();
    const nextHash = hash();
    const first = at(T0, 60_000);
    await rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, nextHash, first), first);
    const late = at(first, REFRESH_RETRY_WINDOW_MS + 1);
    const result = await rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, hash(), late), late);
    expect(result).toEqual(expect.objectContaining({ ok: false, code: "INVALID_REFRESH_TOKEN" }));
    const rows = await chainRows((await tokenRow(tokenHash))!.chain_id);
    expect(rows.filter(usable)).toEqual([]);
    expect((await tokenRow(nextHash))?.revoked_at).toBe(late.toISOString());
    // The device must sign in again: the token it holds is refused too.
    const after = at(late, 1_000);
    expect(await rotateRefreshToken(env.PLAYER_D1, rotation(nextHash, hash(), after), after)).toEqual(
      expect.objectContaining({ ok: false, code: "INVALID_REFRESH_TOKEN" }),
    );
  });

  it("FR-00006: reusing a token whose next token was already used revokes the chain, even within 30 seconds", async () => {
    const { tokenHash } = await signedIn();
    const secondHash = hash();
    const first = at(T0, 60_000);
    await rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, secondHash, first), first);
    await rotateRefreshToken(env.PLAYER_D1, rotation(secondHash, hash(), at(first, 1_000)), at(first, 1_000));
    const result = await rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, hash(), at(first, 2_000)), at(first, 2_000));
    expect(result).toEqual(expect.objectContaining({ ok: false, code: "INVALID_REFRESH_TOKEN" }));
    expect((await chainRows((await tokenRow(tokenHash))!.chain_id)).filter(usable)).toEqual([]);
  });

  it("FR-00006: revoking one chain leaves the Account's other devices signed in", async () => {
    const id = playerId();
    const phone = hash();
    const tablet = hash();
    await signIn(env.PLAYER_D1, signInInput(id, phone), T0);
    await signIn(env.PLAYER_D1, signInInput(id, tablet), T0);
    const first = at(T0, 60_000);
    await rotateRefreshToken(env.PLAYER_D1, rotation(phone, hash(), first), first);
    const late = at(first, 10 * 60_000);
    await rotateRefreshToken(env.PLAYER_D1, rotation(phone, hash(), late), late);
    const tabletRow = await tokenRow(tablet);
    expect(tabletRow && usable(tabletRow)).toBe(true);
    expect((await rotateRefreshToken(env.PLAYER_D1, rotation(tablet, hash(), late), late)).ok).toBe(true);
  });

  it("FR-00006: an expired token is refused and not replaced", async () => {
    const { tokenHash } = await signedIn();
    const expired = at(T0, 30 * DAY);
    const result = await rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, hash(), expired), expired);
    expect(result).toEqual(expect.objectContaining({ ok: false, code: "INVALID_REFRESH_TOKEN" }));
    expect((await tokenRow(tokenHash))?.replaced_at).toBeNull();
  });

  it("FR-00006: a token that expires one millisecond later is still accepted", async () => {
    const { tokenHash } = await signedIn();
    const almost = at(T0, 30 * DAY - 1);
    expect((await rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, hash(), almost), almost)).ok).toBe(true);
  });

  it("FR-00006: a revoked token is refused, even within the retry window", async () => {
    const { tokenHash } = await signedIn();
    const lostHash = hash();
    const first = at(T0, 60_000);
    await rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, lostHash, first), first);
    await rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, hash(), at(first, 1_000)), at(first, 1_000));
    // lostHash was revoked by the retry; using it now is refused.
    const result = await rotateRefreshToken(env.PLAYER_D1, rotation(lostHash, hash(), at(first, 2_000)), at(first, 2_000));
    expect(result).toEqual(expect.objectContaining({ ok: false, code: "INVALID_REFRESH_TOKEN" }));
  });

  it("FR-00006: an unknown token is refused and changes nothing", async () => {
    const { tokenHash } = await signedIn();
    const result = await rotateRefreshToken(env.PLAYER_D1, rotation(hash(), hash(), T0), T0);
    expect(result).toEqual(expect.objectContaining({ ok: false, code: "INVALID_REFRESH_TOKEN" }));
    const row = await tokenRow(tokenHash);
    expect(row && usable(row)).toBe(true);
  });

  it("FR-00006: two uses of the same token at the same time leave exactly one usable token", async () => {
    const { accountId, tokenHash } = await signedIn();
    const now = at(T0, 60_000);
    const results = await Promise.all(
      Array.from({ length: 4 }, () => rotateRefreshToken(env.PLAYER_D1, rotation(tokenHash, hash(), now), now)),
    );
    for (const result of results) expect(result).toEqual({ ok: true, value: { accountId } });
    const rows = await chainRows((await tokenRow(tokenHash))!.chain_id);
    expect(rows.filter(usable)).toHaveLength(1);
  });

  it.each([
    ["no input", undefined],
    ["a presented hash that is not hex", { presentedHash: "abc", next: { hash: hash(), expiresAt: days(T0, 30) } }],
    ["a next hash that is not hex", { presentedHash: hash(), next: { hash: "xyz", expiresAt: days(T0, 30) } }],
    ["the same hash twice", (() => { const h = hash(); return { presentedHash: h, next: { hash: h, expiresAt: days(T0, 30) } }; })()],
  ])("FR-00006: rotation with %s is refused with INVALID_REQUEST", async (_label, input) => {
    expect(await rotateRefreshToken(env.PLAYER_D1, input, T0)).toEqual(expect.objectContaining({ ok: false, code: "INVALID_REQUEST" }));
  });

  it("FR-00006: rotateRefreshToken works through RPC with the standard response format", async () => {
    const now = new Date();
    const tokenHash = hash();
    const signed = await player.signIn(REQUEST_ID, signInInput(playerId(), tokenHash, now));
    const response = await player.rotateRefreshToken(REQUEST_ID, rotation(tokenHash, hash(), now));
    expect(response).toEqual(expect.objectContaining({ status: "ok", data: { accountId: signed.data?.accountId } }));
    const refused = await player.rotateRefreshToken(REQUEST_ID, rotation(hash(), hash(), now));
    expect(refused).toEqual(expect.objectContaining({ status: "error", code: "INVALID_REFRESH_TOKEN", data: null }));
  });
});
