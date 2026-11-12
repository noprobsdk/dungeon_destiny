// FR-00006 test helpers for the player Worker. Each test starts from an empty
// local Player D1 with every migration applied. No real Play Games player ID,
// token, or Account is used.
import { env, exports } from "cloudflare:workers";
import { applyD1Migrations, reset } from "cloudflare:test";
import type { PlayerSignInInput } from "@dungeon-destiny/contracts";
import { beforeEach } from "vitest";

export const REQUEST_ID = "00000000-0000-4000-8000-000000000006";

export const player = exports.default;

beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.PLAYER_D1, env.TEST_MIGRATIONS);
});

// A made-up refresh-token hash: 64 lowercase hex characters, like SHA-256.
export function hash(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// A made-up Play Games player ID, shaped like a real one.
export function playerId(): string {
  const digits = crypto.getRandomValues(new Uint32Array(5));
  return `g${[...digits].map((n) => (n % 10000).toString().padStart(4, "0")).join("")}`;
}

export const T0 = new Date("2026-11-12T10:00:00.000Z");

export function at(base: Date, milliseconds: number): Date {
  return new Date(base.getTime() + milliseconds);
}

export const DAY = 24 * 60 * 60 * 1000;

export function days(base: Date, count: number): string {
  return at(base, count * DAY).toISOString();
}

export function signInInput(providerPlayerId: string, tokenHash: string, now: Date = T0): PlayerSignInInput {
  return {
    provider: "google_play_games",
    providerPlayerId,
    refreshToken: { hash: tokenHash, expiresAt: days(now, 30) },
  };
}

export async function count(table: string): Promise<number> {
  const row = await env.PLAYER_D1.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>();
  return row?.n ?? 0;
}

export type TokenRow = {
  id: string;
  account_id: string;
  chain_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  replaced_at: string | null;
  revoked_at: string | null;
};

export async function tokenRow(tokenHash: string): Promise<TokenRow | null> {
  return env.PLAYER_D1.prepare("SELECT * FROM refresh_tokens WHERE token_hash = ?").bind(tokenHash).first<TokenRow>();
}

export async function chainRows(chainId: string): Promise<TokenRow[]> {
  const result = await env.PLAYER_D1.prepare("SELECT * FROM refresh_tokens WHERE chain_id = ? ORDER BY created_at, id")
    .bind(chainId)
    .all<TokenRow>();
  return result.results;
}

// A token is usable when it has neither been replaced nor revoked; expiry is
// checked separately.
export function usable(row: TokenRow): boolean {
  return row.replaced_at === null && row.revoked_at === null;
}
