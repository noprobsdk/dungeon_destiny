// FR-00006: the access and refresh tokens of Player Identity (DD-024).
// The access token is a JWT signed with Ed25519 (EdDSA) that only the gateway
// signs and checks. The refresh token is 32 random bytes; Player D1 stores only
// its SHA-256 hash. The lifetimes are constants here, not stored settings.
import { SignJWT, errors, importJWK, jwtVerify } from "jose";
import type { CryptoKey, JWK, JWTHeaderParameters } from "jose";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SigningKey = {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  keyId: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Reads the Ed25519 private key, a JWK in the ACCESS_TOKEN_SIGNING_KEY secret.
// Returns null when the secret or the key ID is missing or not an Ed25519
// private key, so the caller can refuse to answer. Never logs the key.
export async function loadSigningKey(secret: unknown, keyId: unknown): Promise<SigningKey | null> {
  if (typeof secret !== "string" || secret === "" || typeof keyId !== "string" || keyId === "") return null;
  let jwk: unknown;
  try {
    jwk = JSON.parse(secret);
  } catch {
    return null;
  }
  if (!isRecord(jwk) || jwk.kty !== "OKP" || jwk.crv !== "Ed25519") return null;
  if (typeof jwk.d !== "string" || typeof jwk.x !== "string") return null;
  try {
    const privateKey = await importJWK({ kty: "OKP", crv: "Ed25519", d: jwk.d, x: jwk.x } satisfies JWK, "EdDSA");
    const publicKey = await importJWK({ kty: "OKP", crv: "Ed25519", x: jwk.x } satisfies JWK, "EdDSA");
    if (privateKey instanceof Uint8Array || publicKey instanceof Uint8Array) return null;
    return { privateKey, publicKey, keyId };
  } catch {
    return null;
  }
}

export type IssuedAccessToken = { token: string; expiresAt: string };

// Signs an access token with only sub, iat, exp, and the key ID in its header.
export async function issueAccessToken(key: SigningKey, accountId: string, now: Date): Promise<IssuedAccessToken> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expires = issuedAt + ACCESS_TOKEN_TTL_SECONDS;
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "EdDSA", kid: key.keyId })
    .setSubject(accountId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expires)
    .sign(key.privateKey);
  return { token, expiresAt: new Date(expires * 1000).toISOString() };
}

export type AccessCheck = { kind: "ok"; accountId: string } | { kind: "expired" } | { kind: "invalid" };

// Checks the signature, the key ID, the algorithm (EdDSA only), and the
// expiry. A token is only "expired" when its signature is valid.
export async function checkAccessToken(key: SigningKey, token: string): Promise<AccessCheck> {
  try {
    const { payload } = await jwtVerify(
      token,
      (header: JWTHeaderParameters) => {
        if (header.kid !== key.keyId) throw new errors.JWKSNoMatchingKey();
        return key.publicKey;
      },
      { algorithms: ["EdDSA"], requiredClaims: ["sub", "iat", "exp"] },
    );
    if (typeof payload.sub !== "string" || !UUID.test(payload.sub)) return { kind: "invalid" };
    return { kind: "ok", accountId: payload.sub };
  } catch (failure) {
    if (failure instanceof errors.JWTExpired) return { kind: "expired" };
    return { kind: "invalid" };
  }
}

// The access token from an "Authorization: Bearer <token>" header, or null.
export function bearerToken(headers: Headers): string | null {
  const value = headers.get("Authorization");
  if (value === null) return null;
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*)$/.exec(value);
  return match?.[1] ?? null;
}

// --- refresh tokens -----------------------------------------------------------

export const REFRESH_TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 32 random bytes from crypto.getRandomValues, as 43 base64url characters.
export function newRefreshToken(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

// The SHA-256 hash of a refresh token, as 64 lowercase hex characters: the
// only form that leaves the gateway.
export async function hashRefreshToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function refreshTokenExpiry(now: Date): string {
  return new Date(now.getTime() + REFRESH_TOKEN_TTL_MS).toISOString();
}
