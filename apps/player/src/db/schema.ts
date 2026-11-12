// FR-00006: the Player D1 schema (DD-017, DD-024), as defined in
// doc/07-data-model/player-state/account.md. drizzle-kit generates the
// numbered migrations in ../../migrations from this file; both must describe
// the same structure (doc/08-technical/database-change-management.md). IDs are
// text UUIDs and times are ISO 8601 UTC text. Every Account row refers to
// accounts.account_id and is deleted with it.
import { sql } from "drizzle-orm";
import { check, index, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// One row per player. No name, avatar, or email is stored.
export const accounts = sqliteTable("accounts", {
  accountId: text("account_id").primaryKey(),
  createdAt: text("created_at").notNull(),
});

// Which platform sign-in belongs to which Account. The provider's player ID is
// stored only as Google or Apple confirmed it.
export const accountSignIns = sqliteTable(
  "account_sign_ins",
  {
    provider: text("provider", { enum: ["google_play_games", "apple_game_center"] }).notNull(),
    providerPlayerId: text("provider_player_id").notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.accountId, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
    lastSignInAt: text("last_sign_in_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerPlayerId] }),
    uniqueIndex("account_sign_ins_account_provider_unique").on(table.accountId, table.provider),
    check("account_sign_ins_provider_check", sql`${table.provider} IN ('google_play_games', 'apple_game_center')`),
  ],
);

// Refresh tokens, stored only as the SHA-256 hash of the token. A chain is
// every token that descends from one sign-in on one device.
export const refreshTokens = sqliteTable(
  "refresh_tokens",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.accountId, { onDelete: "cascade" }),
    chainId: text("chain_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    replacedAt: text("replaced_at"),
    revokedAt: text("revoked_at"),
  },
  (table) => [
    index("refresh_tokens_chain_id_idx").on(table.chainId),
    index("refresh_tokens_account_id_idx").on(table.accountId),
  ],
);
