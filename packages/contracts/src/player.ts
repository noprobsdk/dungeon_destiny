// FR-00006: Accounts and sign-in (DD-024). The shapes of the gateway's
// /auth and /me endpoints, and the typed RPC between gateway and the player
// Worker. Player D1 records are defined in
// doc/07-data-model/player-state/account.md.
import type { ApiResponse } from "./index";

// Provider names follow <vendor>_<service>. Player D1 accepts both;
// apple_game_center is reserved for iOS and is not accepted by the gateway
// until the Feature Request that builds Game Center sign-in.
export const ACCOUNT_PROVIDERS = ["google_play_games", "apple_game_center"] as const;
export type AccountProvider = (typeof ACCOUNT_PROVIDERS)[number];

// The providers POST /auth/sign-in accepts today.
export const SIGN_IN_PROVIDERS = ["google_play_games"] as const;
export type SignInProvider = (typeof SIGN_IN_PROVIDERS)[number];

// --- gateway endpoints ------------------------------------------------------

// The body of POST /auth/sign-in.
export type SignInRequest = {
  provider: SignInProvider;
  serverAuthCode: string;
};

// The body of POST /auth/refresh.
export type RefreshRequest = {
  refreshToken: string;
};

// The `data` of a successful POST /auth/sign-in or POST /auth/refresh.
// Times are ISO 8601 in UTC. `created` is true only when this sign-in created
// the Account.
export type AuthTokens = {
  accountId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  created: boolean;
};

// The `data` of GET /me, and of the player Worker's getAccount.
export type AccountView = {
  accountId: string;
  providers: AccountProvider[];
  createdAt: string;
};

// --- RPC between gateway and player -----------------------------------------

// A refresh token as the player Worker sees it: only its SHA-256 hash, as 64
// lowercase hex characters, and when it expires. The token itself never leaves
// the gateway.
export type RefreshTokenRecord = {
  hash: string;
  expiresAt: string;
};

// A sign-in that Google or Apple has already confirmed. providerPlayerId comes
// from the provider's answer, never from the client.
export type PlayerSignInInput = {
  provider: AccountProvider;
  providerPlayerId: string;
  refreshToken: RefreshTokenRecord;
};

export type PlayerSignInResult = {
  accountId: string;
  created: boolean;
};

// Replaces the presented refresh token with the next one in its chain.
export type RotateRefreshTokenInput = {
  presentedHash: string;
  next: RefreshTokenRecord;
};

export type RotateRefreshTokenResult = {
  accountId: string;
};

// The RPC methods the player Worker offers to gateway through its service
// binding. Inputs are checked again by player, so they are typed `unknown`
// on the receiving side.
export interface PlayerRpc {
  health(requestId: string): Promise<ApiResponse<null>>;
  signIn(requestId: string, input: PlayerSignInInput): Promise<ApiResponse<PlayerSignInResult | null>>;
  rotateRefreshToken(requestId: string, input: RotateRefreshTokenInput): Promise<ApiResponse<RotateRefreshTokenResult | null>>;
  getAccount(requestId: string, accountId: string): Promise<ApiResponse<AccountView | null>>;
}
