# Account data model

## Why this data model is necessary

Every player has one Account. It is the player's UserID for every feature that
stores something for a player: Heroes, the Account Inventory, Parties, and
results all refer to it by `account_id`. See
[DD-011](../../12-decisions/decision-log.md) and
[DD-024](../../12-decisions/decision-log.md).

A player never creates an Account by hand. The first sign-in with the
platform's game service creates it: Google Play Games on Android and Apple
Game Center on iOS. Without a separate Account and sign-in model:

- the platform's player ID would become the UserID, so an Account could never
  move to, or be linked with, another sign-in;
- a player's Android and iOS sign-ins could never be joined into one Account;
- adding Sign in with Apple or another provider later would change every table
  that refers to a player;
- a refresh token could not be revoked without signing the player out of every
  device.

The Account model uses:

- `accounts`;
- `account_sign_ins`;
- `refresh_tokens`.

## Ownership relationship

```text
Account (account_id)
├── sign-ins
│   └── one provider + that provider's player ID
├── refresh tokens
│   └── one chain per signed-in device
├── Heroes
└── Account Inventory
```

## Ownership boundaries

- Accounts, sign-ins, and refresh tokens are persistent player state stored in
  Player D1, which the `player` Worker owns. See
  [Service architecture](../../08-technical/service-architecture.md).
- Player Identity in the `gateway` Worker checks every sign-in with Google or
  Apple and issues the tokens. It reads and writes these records only through
  the `player` Worker. See
  [Access and edge services](../../08-technical/service-architecture/access-and-edge.md).
- Clients cannot create, change, or delete these records, and never see a
  provider's player ID of another Account.
- Heroes and the Account Inventory refer to the Account by `account_id`. See
  [Account Inventory data model](account-inventory.md).

## `accounts`

### Responsibility

`accounts` records each player's Account and its stable identifier.

### Fields

| Field | Type | Required | Responsibility |
|---|---|---:|---|
| `account_id` | Text, primary key | Yes | Stable Account identifier: a UUID v4 made with `crypto.randomUUID()`. |
| `created_at` | Text/timestamp | Yes | When the first sign-in created the Account. |

### Rules

- `account_id` never changes and is never reused.
- `account_id` is not a secret, but it is personal data: it identifies one
  player. It is not a code that players share with each other.
- The Account stores no name, avatar, or email. The name other players see is
  the Hero's name. See [Hero creation](../../05-ux/hero-creation.md).
- There are no guest Accounts. Every Account has at least one sign-in.

## `account_sign_ins`

### Responsibility

`account_sign_ins` records which platform sign-in belongs to which Account.

### Fields

| Field | Type | Required | Responsibility |
|---|---|---:|---|
| `provider` | Text | Yes | `google_play_games` or `apple_game_center`. |
| `provider_player_id` | Text | Yes | The player's ID from that provider, as checked by Google or Apple. |
| `account_id` | Text, foreign key | Yes | References `accounts.account_id`. |
| `created_at` | Text/timestamp | Yes | When this sign-in was first used. |
| `last_sign_in_at` | Text/timestamp | Yes | When this sign-in was last used. |

The primary key is:

```text
(provider, provider_player_id)
```

`(account_id, provider)` is unique.

### Rules

- Provider names follow `<vendor>_<service>`. A new provider is added as a new
  value, without changing `accounts`.
- The primary key maps each provider's player ID to exactly one Account.
- The unique key allows an Account at most one sign-in per provider.
- The first sign-in with an unknown `(provider, provider_player_id)` creates
  the Account and its sign-in in one atomic operation.
- `provider_player_id` is stored only as Google or Apple confirmed it, never
  as the client sent it.
- Until Account linking is built, each Account has exactly one sign-in, so a
  player's Android and iOS devices have separate Accounts.

## `refresh_tokens`

### Responsibility

`refresh_tokens` records the refresh tokens that keep a device signed in, so
that each one can be replaced, checked, and revoked.

### Fields

| Field | Type | Required | Responsibility |
|---|---|---:|---|
| `id` | Text, primary key | Yes | Stable refresh-token record identifier. |
| `account_id` | Text, foreign key | Yes | References `accounts.account_id`. |
| `chain_id` | Text | Yes | Shared by every token that descends from one sign-in on one device. |
| `token_hash` | Text, unique | Yes | SHA-256 hash of the refresh token. The token itself is never stored. |
| `created_at` | Text/timestamp | Yes | When the token was issued. |
| `expires_at` | Text/timestamp | Yes | 30 days after `created_at`. |
| `replaced_at` | Text/timestamp | No | When the token was used and replaced by the next one in its chain. |
| `revoked_at` | Text/timestamp | No | When the token was revoked. |

### Rules

- A sign-in starts a new chain. Each use of a refresh token replaces it with a
  new token in the same chain.
- A token is valid only when it has not expired, has not been revoked, and
  has not been replaced.
- Using a replaced token within 30 seconds of its replacement is treated as a
  retry after a lost answer. Using it later revokes every token in its chain,
  and that device must sign in again.
- The lifetimes are constants in the code, not stored settings, and can be
  changed without a migration.
- Revoking a chain signs out one device. Revoking every chain of an Account
  signs it out everywhere.

## Deletion

Every row that belongs to an Account, in these tables and in every later
Player D1 table, refers to `accounts.account_id` and is deleted with the
Account.

Deleting an Account inside the app, which both app stores require, and what
is kept after deletion are decided in a later Feature Request before the
first store release.

## Out of scope

This model does not define:

- Hero records;
- Account linking between providers;
- Account deletion and data retention;
- the access token, which is signed and checked by Player Identity and never
  stored.
