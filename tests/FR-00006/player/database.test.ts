// FR-00006 tests for Player D1's first migration: the Account tables of
// doc/07-data-model/player-state/account.md, their keys, and the cascade from
// accounts.account_id. That the migrations match schema.ts is checked by
// tests/FR-00006/schema_test.sh with drizzle-kit.
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { T0, count, hash, playerId } from "./helpers";

type Column = { name: string; type: string; notnull: number; pk: number };
type ForeignKey = { table: string; from: string; to: string; on_delete: string };

async function columns(table: string): Promise<Column[]> {
  const result = await env.PLAYER_D1.prepare(`PRAGMA table_info(${table})`).all<Column>();
  return result.results;
}

async function foreignKeys(table: string): Promise<ForeignKey[]> {
  const result = await env.PLAYER_D1.prepare(`PRAGMA foreign_key_list(${table})`).all<ForeignKey>();
  return result.results;
}

async function insertAccount(accountId: string): Promise<void> {
  await env.PLAYER_D1.prepare("INSERT INTO accounts (account_id, created_at) VALUES (?, ?)").bind(accountId, T0.toISOString()).run();
}

async function insertSignIn(accountId: string, provider: string, providerPlayerId: string): Promise<void> {
  await env.PLAYER_D1.prepare(
    "INSERT INTO account_sign_ins (provider, provider_player_id, account_id, created_at, last_sign_in_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(provider, providerPlayerId, accountId, T0.toISOString(), T0.toISOString())
    .run();
}

async function insertToken(accountId: string, tokenHash: string): Promise<void> {
  await env.PLAYER_D1.prepare(
    "INSERT INTO refresh_tokens (id, account_id, chain_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(crypto.randomUUID(), accountId, crypto.randomUUID(), tokenHash, T0.toISOString(), T0.toISOString())
    .run();
}

describe("FR-00006: Player D1", () => {
  it("FR-00006: the migrations apply to an empty database and create the three Account tables", async () => {
    const result = await env.PLAYER_D1.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name <> 'd1_migrations' ORDER BY name",
    ).all<{ name: string }>();
    expect(result.results.map((row) => row.name)).toEqual(["account_sign_ins", "accounts", "refresh_tokens"]);
  });

  it("FR-00006: accounts has only account_id and created_at, with account_id as primary key", async () => {
    const cols = await columns("accounts");
    expect(cols.map((c) => c.name)).toEqual(["account_id", "created_at"]);
    expect(cols.find((c) => c.name === "account_id")?.pk).toBe(1);
    expect(cols.every((c) => c.notnull === 1 || c.pk === 1)).toBe(true);
  });

  it("FR-00006: account_sign_ins has the data-model fields and (provider, provider_player_id) as primary key", async () => {
    const cols = await columns("account_sign_ins");
    expect(cols.map((c) => c.name)).toEqual(["provider", "provider_player_id", "account_id", "created_at", "last_sign_in_at"]);
    expect(cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name)).toEqual(["provider", "provider_player_id"]);
    expect(cols.every((c) => c.notnull === 1)).toBe(true);
  });

  it("FR-00006: refresh_tokens has the data-model fields, with replaced_at and revoked_at optional", async () => {
    const cols = await columns("refresh_tokens");
    expect(cols.map((c) => c.name)).toEqual([
      "id",
      "account_id",
      "chain_id",
      "token_hash",
      "created_at",
      "expires_at",
      "replaced_at",
      "revoked_at",
    ]);
    const optional = cols.filter((c) => c.notnull === 0 && c.pk === 0).map((c) => c.name);
    expect(optional).toEqual(["replaced_at", "revoked_at"]);
  });

  it("FR-00006: no table stores a name, avatar, or email", async () => {
    for (const table of ["accounts", "account_sign_ins", "refresh_tokens"]) {
      const names = (await columns(table)).map((c) => c.name);
      for (const name of names) {
        expect(name).not.toMatch(/name|avatar|email|token$/);
      }
    }
  });

  it("FR-00006: every Account row refers to accounts.account_id and is deleted with it", async () => {
    for (const table of ["account_sign_ins", "refresh_tokens"]) {
      expect(await foreignKeys(table)).toEqual([
        expect.objectContaining({ table: "accounts", from: "account_id", to: "account_id", on_delete: "CASCADE" }),
      ]);
    }
  });

  it("FR-00006: an unknown provider is refused by the database", async () => {
    const accountId = crypto.randomUUID();
    await insertAccount(accountId);
    await expect(insertSignIn(accountId, "guest", playerId())).rejects.toThrow();
  });

  it("FR-00006: an Account has at most one sign-in per provider", async () => {
    const accountId = crypto.randomUUID();
    await insertAccount(accountId);
    await insertSignIn(accountId, "google_play_games", playerId());
    await expect(insertSignIn(accountId, "google_play_games", playerId())).rejects.toThrow(/UNIQUE/);
    // A different provider for the same Account is allowed by the schema; it
    // is how linking will work later.
    await insertSignIn(accountId, "apple_game_center", playerId());
    expect(await count("account_sign_ins")).toBe(2);
  });

  it("FR-00006: a provider's player ID belongs to exactly one Account", async () => {
    const id = playerId();
    const first = crypto.randomUUID();
    const second = crypto.randomUUID();
    await insertAccount(first);
    await insertAccount(second);
    await insertSignIn(first, "google_play_games", id);
    await expect(insertSignIn(second, "google_play_games", id)).rejects.toThrow(/UNIQUE|PRIMARY/);
  });

  it("FR-00006: a sign-in or refresh token for an unknown Account is refused", async () => {
    await expect(insertSignIn(crypto.randomUUID(), "google_play_games", playerId())).rejects.toThrow(/FOREIGN KEY/);
    await expect(insertToken(crypto.randomUUID(), hash())).rejects.toThrow(/FOREIGN KEY/);
  });

  it("FR-00006: a token hash is stored only once", async () => {
    const accountId = crypto.randomUUID();
    const tokenHash = hash();
    await insertAccount(accountId);
    await insertToken(accountId, tokenHash);
    await expect(insertToken(accountId, tokenHash)).rejects.toThrow(/UNIQUE/);
  });

  it("FR-00006: deleting an Account deletes its sign-ins and refresh tokens, and nothing else", async () => {
    const doomed = crypto.randomUUID();
    const kept = crypto.randomUUID();
    for (const accountId of [doomed, kept]) {
      await insertAccount(accountId);
      await insertSignIn(accountId, "google_play_games", playerId());
      await insertToken(accountId, hash());
      await insertToken(accountId, hash());
    }
    await env.PLAYER_D1.prepare("DELETE FROM accounts WHERE account_id = ?").bind(doomed).run();
    expect(await count("accounts")).toBe(1);
    expect(await count("account_sign_ins")).toBe(1);
    expect(await count("refresh_tokens")).toBe(2);
    const left = await env.PLAYER_D1.prepare("SELECT DISTINCT account_id FROM refresh_tokens").all<{ account_id: string }>();
    expect(left.results).toEqual([{ account_id: kept }]);
  });
});
