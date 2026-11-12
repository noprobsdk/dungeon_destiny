// FR-00006: the player Worker's Account operations (DD-024), as defined in
// doc/07-data-model/player-state/account.md. Plain functions that take Player
// D1 and the current time explicitly, so they are tested directly. Every
// input is untrusted and checked here, even though only gateway calls them.
//
// Every query is a D1 prepared statement with bound parameters. Steps that
// must happen together run in one D1 batch, which is one transaction.
import { ACCOUNT_PROVIDERS, ERROR_CODES } from "@dungeon-destiny/contracts";
import type {
  AccountProvider,
  AccountView,
  ErrorCode,
  PlayerSignInResult,
  RotateRefreshTokenResult,
} from "@dungeon-destiny/contracts";
import { z } from "zod";

// Using a replaced refresh token within this time of its replacement is a
// retry after a lost answer, not a stolen token.
export const REFRESH_RETRY_WINDOW_MS = 30_000;

export type Result<T> = { ok: true; value: T } | { ok: false; code: ErrorCode; message: string };

function refuse(code: ErrorCode, message: string): { ok: false; code: ErrorCode; message: string } {
  return { ok: false, code, message };
}

const tokenHash = z.string().regex(/^[0-9a-f]{64}$/);
const isoTime = z.iso.datetime();
const refreshTokenRecord = z.strictObject({ hash: tokenHash, expiresAt: isoTime });

const signInInput = z.strictObject({
  provider: z.enum(ACCOUNT_PROVIDERS),
  // Play Games player IDs are short; the limit only stops abuse.
  providerPlayerId: z.string().min(1).max(255),
  refreshToken: refreshTokenRecord,
});

const rotateInput = z
  .strictObject({ presentedHash: tokenHash, next: refreshTokenRecord })
  .refine((input) => input.presentedHash !== input.next.hash);

const accountId = z.uuid();

const INVALID = "The request to player is invalid.";

// The first sign-in with an unknown (provider, provider player ID) creates the
// Account and its sign-in; a later one returns the same Account. Each sign-in
// starts a new refresh-token chain. All of it is one transaction, so two
// sign-ins at the same time can create only one Account.
export async function signIn(db: D1Database, input: unknown, now: Date): Promise<Result<PlayerSignInResult>> {
  const parsed = signInInput.safeParse(input);
  if (!parsed.success) return refuse(ERROR_CODES.INVALID_REQUEST, INVALID);
  const { provider, providerPlayerId, refreshToken } = parsed.data;
  const newAccountId = crypto.randomUUID();
  const at = now.toISOString();
  try {
    const results = await db.batch<{ account_id: string }>([
      db
        .prepare(
          `INSERT INTO accounts (account_id, created_at)
           SELECT ?1, ?2 WHERE NOT EXISTS (
             SELECT 1 FROM account_sign_ins WHERE provider = ?3 AND provider_player_id = ?4)`,
        )
        .bind(newAccountId, at, provider, providerPlayerId),
      db
        .prepare(
          `INSERT INTO account_sign_ins (provider, provider_player_id, account_id, created_at, last_sign_in_at)
           VALUES (?1, ?2, ?3, ?4, ?4)
           ON CONFLICT (provider, provider_player_id) DO UPDATE SET last_sign_in_at = excluded.last_sign_in_at`,
        )
        .bind(provider, providerPlayerId, newAccountId, at),
      db
        .prepare(
          `INSERT INTO refresh_tokens (id, account_id, chain_id, token_hash, created_at, expires_at)
           SELECT ?1, account_id, ?2, ?3, ?4, ?5 FROM account_sign_ins WHERE provider = ?6 AND provider_player_id = ?7`,
        )
        .bind(crypto.randomUUID(), crypto.randomUUID(), refreshToken.hash, at, refreshToken.expiresAt, provider, providerPlayerId),
      db
        .prepare("SELECT account_id FROM account_sign_ins WHERE provider = ?1 AND provider_player_id = ?2")
        .bind(provider, providerPlayerId),
    ]);
    const found = results[3]?.results[0]?.account_id;
    if (found === undefined) return refuse(ERROR_CODES.INVALID_REQUEST, INVALID);
    return { ok: true, value: { accountId: found, created: found === newAccountId } };
  } catch (error) {
    // The only expected failure is a refresh-token hash that is already
    // stored; the gateway makes a new random token, so this is never retried
    // with the same value. Nothing was written.
    console.error(JSON.stringify({ event: "signInFailed", error: errorName(error) }));
    return refuse(ERROR_CODES.INVALID_REQUEST, INVALID);
  }
}

type TokenRow = {
  id: string;
  account_id: string;
  chain_id: string;
  expires_at: string;
  replaced_at: string | null;
  revoked_at: string | null;
};

const INVALID_TOKEN = "The refresh token is unknown, expired, replaced, or revoked.";

// Replaces a valid refresh token with the next one in its chain. A token that
// was replaced within the retry window, and whose next token has not been
// used, is a retry: the token issued for it is revoked and a new next token is
// issued. Any other reuse of a replaced token revokes its whole chain.
export async function rotateRefreshToken(db: D1Database, input: unknown, now: Date): Promise<Result<RotateRefreshTokenResult>> {
  const parsed = rotateInput.safeParse(input);
  if (!parsed.success) return refuse(ERROR_CODES.INVALID_REQUEST, INVALID);
  const { presentedHash, next } = parsed.data;
  const at = now.toISOString();

  const row = await db
    .prepare("SELECT id, account_id, chain_id, expires_at, replaced_at, revoked_at FROM refresh_tokens WHERE token_hash = ?1")
    .bind(presentedHash)
    .first<TokenRow>();
  if (row === null || row.revoked_at !== null || row.expires_at <= at) {
    return refuse(ERROR_CODES.INVALID_REFRESH_TOKEN, INVALID_TOKEN);
  }

  if (row.replaced_at === null) {
    // Replace it, but only if no other request replaced it first; the next
    // token is inserted only when this request made the replacement.
    const [replaced, inserted] = await db.batch([
      db
        .prepare("UPDATE refresh_tokens SET replaced_at = ?1 WHERE id = ?2 AND replaced_at IS NULL AND revoked_at IS NULL")
        .bind(at, row.id),
      db
        .prepare(
          `INSERT INTO refresh_tokens (id, account_id, chain_id, token_hash, created_at, expires_at)
           SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE changes() = 1`,
        )
        .bind(crypto.randomUUID(), row.account_id, row.chain_id, next.hash, at, next.expiresAt),
    ]);
    if (replaced?.meta.changes === 1 && inserted?.meta.changes === 1) {
      return { ok: true, value: { accountId: row.account_id } };
    }
    // Another request replaced it at the same moment: treat this one as its
    // retry, below.
    const current = await db
      .prepare("SELECT replaced_at, revoked_at FROM refresh_tokens WHERE id = ?1")
      .bind(row.id)
      .first<{ replaced_at: string | null; revoked_at: string | null }>();
    if (current === null || current.revoked_at !== null || current.replaced_at === null) {
      return refuse(ERROR_CODES.INVALID_REFRESH_TOKEN, INVALID_TOKEN);
    }
    row.replaced_at = current.replaced_at;
  }

  const replacedAt = row.replaced_at;
  const withinWindow = now.getTime() - Date.parse(replacedAt) <= REFRESH_RETRY_WINDOW_MS;
  // Has any token issued at or after this replacement been used? Then the
  // device already has a newer token, and this is reuse, not a retry.
  const usedLater = await db
    .prepare(
      `SELECT 1 AS used FROM refresh_tokens
       WHERE chain_id = ?1 AND id <> ?2 AND created_at >= ?3 AND replaced_at IS NOT NULL LIMIT 1`,
    )
    .bind(row.chain_id, row.id, replacedAt)
    .first<{ used: number }>();

  if (withinWindow && usedLater === null) {
    await db.batch([
      db
        .prepare("UPDATE refresh_tokens SET revoked_at = ?1 WHERE chain_id = ?2 AND replaced_at IS NULL AND revoked_at IS NULL")
        .bind(at, row.chain_id),
      db
        .prepare("INSERT INTO refresh_tokens (id, account_id, chain_id, token_hash, created_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
        .bind(crypto.randomUUID(), row.account_id, row.chain_id, next.hash, at, next.expiresAt),
    ]);
    return { ok: true, value: { accountId: row.account_id } };
  }

  await db.prepare("UPDATE refresh_tokens SET revoked_at = ?1 WHERE chain_id = ?2 AND revoked_at IS NULL").bind(at, row.chain_id).run();
  console.warn(JSON.stringify({ event: "refreshTokenReused", chainRevoked: true }));
  return refuse(ERROR_CODES.INVALID_REFRESH_TOKEN, INVALID_TOKEN);
}

// The Account's ID, its sign-in providers, and when it was created.
export async function getAccount(db: D1Database, id: unknown): Promise<Result<AccountView>> {
  const parsed = accountId.safeParse(id);
  if (!parsed.success) return refuse(ERROR_CODES.INVALID_REQUEST, INVALID);
  const [account, signIns] = await db.batch<{ account_id?: string; created_at?: string; provider?: AccountProvider }>([
    db.prepare("SELECT account_id, created_at FROM accounts WHERE account_id = ?1").bind(parsed.data),
    db.prepare("SELECT provider FROM account_sign_ins WHERE account_id = ?1 ORDER BY provider").bind(parsed.data),
  ]);
  const found = account?.results[0];
  if (found?.account_id === undefined || found.created_at === undefined) {
    return refuse(ERROR_CODES.NOT_FOUND, "No Account has this ID.");
  }
  const providers = (signIns?.results ?? []).flatMap((row) => (row.provider === undefined ? [] : [row.provider]));
  return { ok: true, value: { accountId: found.account_id, providers, createdAt: found.created_at } };
}

// Only the error's name is logged: messages from D1 can contain values.
function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}
