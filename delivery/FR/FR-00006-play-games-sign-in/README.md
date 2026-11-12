# FR-00006: Play Games sign-in

- **Status:** In Progress
- **Sprint:** Not used. The project has one developer, so sprints are not used.
- **Type:** Implementation
- **Tracking:** [GitHub Issue #7](https://github.com/noprobsdk/dungeon_destiny/issues/7)

## 1. Purpose

Give every player an Account, so that every later feature has a stable UserID
to store things against. On Android the player signs in automatically with
Google Play Games: the first sign-in creates the Account, and every later
start signs in to the same Account without asking.

It adds Player Identity to the `gateway` Worker, the first `player` Worker
with Player D1 and its Account tables, the access and refresh tokens, and a
sign-in step with a Play Games plugin to the Godot client. A new
`GET /me` proves the token end to end, and the client's Ready screen shows
that the player is signed in (DD-011, DD-024).

After this Feature Request, every call from the game can carry a checked
`account_id`. It contains no Heroes, gameplay, Account linking, Account
deletion, or iOS sign-in.

## 2. Implementation sequence

1. Move this Feature Request to `Backlog`, then to `In Progress`.
2. Review the implementation decisions with the project owner.
3. **Play Console and Google Cloud.** The project owner sets up the app and
   Play Games Services, registers the dev upload key, creates the OAuth
   clients, and adds themself as a tester (Section 6). The device check
   depends on this.
4. **`player` Worker and Player D1 first.** Write the tests and confirm they
   fail, then build the schema, the first migration, and the Account
   operations until they pass.
5. **Player Identity in `gateway`.** Write the tests and confirm they fail,
   then build sign-in, refresh, the token check, and `GET /me` until they pass.
6. Create `dd-dev-player` and Player D1 with Terraform; the project owner sets
   the `gateway` secrets; apply the migration to Cloudflare; deploy `player`,
   then `gateway`. Each step needs the project owner's approval. Run the
   deployed tests. The client work depends on this deploy.
7. **Godot client.** Write the client tests and confirm they fail, then build
   the Play Games plugin, the sign-in step, the token storage, and the signed-in
   Ready screen until they pass. Change the APK build to the Gradle build and
   the checked dev upload key.
8. Build the debug APK, install it on the project owner's Android device, and
   verify it with the project owner (Section 16).
9. Update the how-tos and `AGENTS.md`.
10. Complete `implementation_report.md` and move to `In Review`.
11. After acceptance, hand over to documentation and as-built.

## 3. Scope boundaries

This Feature Request creates or changes:

- a new `player` Worker in `apps/player/`, deployed as `dd-dev-player`, with
  no public address, called only by `gateway` through a service binding;
- Player D1, `dd-dev-player`, bound only to `player`, with the `accounts`,
  `account_sign_ins`, and `refresh_tokens` tables and its first migration;
- Player Identity in the `gateway` Worker: `POST /auth/sign-in`,
  `POST /auth/refresh`, the access-token check, and `GET /me`;
- the `gateway` secrets for the token signing key and Google's OAuth client
  secret, declared as required;
- `accountId` in the `gateway` request log for authenticated calls;
- the shared types for the new endpoints and the RPC between `gateway` and
  `player` in `packages/contracts/`;
- Terraform for the `player` Worker, Player D1, and the service binding;
- the Godot client's sign-in step, sign-in screen, token storage, and the
  signed-in Ready screen;
- a Play Games Android plugin in `apps/game-client/android/plugins/play_games/`;
- the APK build: the Gradle build with Godot's Android build template, and
  the dev upload key check;
- the onboarding checks for the dev upload key and the Gradle build;
- the tests in `tests/FR-00006/`, `apps/player/`, `apps/gateway/`, and
  `apps/game-client/tests/FR-00006/`;
- the how-tos and the commands in `AGENTS.md`.

This Feature Request does not create or change:

- Heroes, Hero names, or gameplay of any kind;
- Account linking, Sign in with Apple, or Game Center (DD-024);
- Account deletion, data retention, or the web page for deletion requests;
- a guest Account or any sign-in other than Google Play Games;
- the game server or how it learns which Account a connection belongs to;
- achievements, leaderboards, or saved games from Play Games;
- rate limiting of the sign-in endpoints;
- Content D1, Content Studio, or the runtime manifest;
- staging or production environments, release builds, Play App Signing, or a
  store listing.

Deferred to later Feature Requests: Game Center sign-in on iOS, Account
linking, Account deletion and data retention, and Heroes.

## 4. Source

- [DD-010, DD-011, DD-017, DD-019, DD-021, DD-023, and DD-024](../../../doc/12-decisions/decision-log.md).
- [Account data model](../../../doc/07-data-model/player-state/account.md).
- [Access and edge services](../../../doc/08-technical/service-architecture/access-and-edge.md),
  section "Player Identity".
- [Technology and tooling](../../../doc/08-technical/service-architecture/technology.md),
  section "Secrets".
- [Database change management](../../../doc/08-technical/database-change-management.md),
  section "Player D1".
- [FR-00004](../FR-00004-content-d1-user-model/README.md): the Content D1
  pattern with Drizzle and Wrangler migrations.
- [FR-00005](../FR-00005-godot-android-client/README.md): the `gateway`
  version check, request log, Godot client, and APK build.
- [`doc/test-driven-development.md`](../../../doc/test-driven-development.md).

Design baseline commit: `3c59f92`.

Source-document readiness gate: passes for this scope. DD-024 and the Account
data model define the Account, the sign-ins, and the tokens. The open
decisions on Account deletion and the game server do not affect it.

## 5. Target ownership

- **Database:** Player D1 owns the Account, sign-in, and refresh-token
  records. Its schema and migrations live in `apps/player/`.
- **Online services:** the `player` Worker owns every read and write of
  Player D1. The `gateway` Worker owns Player Identity: it checks the Play
  Games sign-in with Google, signs and checks the access token, and creates
  and checks refresh tokens through `player`. Terraform owns the Workers, the
  database, and the binding; Wrangler deploys the code and holds the secrets.
- **Godot app:** owns the Play Games plugin, the sign-in step, the stored
  tokens, and the screens. It never decides who the player is.
- **Content Studio, runtime manifest, 3D production:** N/A.

## 6. Prerequisites and deployment blockers

- FR-00005 is `Complete`.
- The project owner's Google Play Console developer account.
- In the Play Console, set up by the project owner:
  - an app with the package name `com.dungeondestiny.game.dev`, not
    published;
  - Play Games Services for it, with its project ID;
  - an Android OAuth client for the package name and the SHA-1 of the dev
    upload key;
  - a web OAuth client, whose client ID goes into the `gateway` and the
    client, and whose secret the project owner stores as a `gateway` secret;
  - the project owner's Google account as a Play Games tester.
- The dev upload key exists on the project owner's computer and is backed up
  outside the repository.
- The project owner's Android device has Google Play Games and is signed in to
  the tester account.
- Every `terraform apply`, migration applied to Cloudflare, secret, and deploy
  needs the project owner's approval.

Blockers: none.

## 7. Approved decisions

**Accounts and sign-ins (DD-024)**

- `account_id` is a UUID v4 made with `crypto.randomUUID()`. "UserID" is only
  another name for it.
- The provider is `google_play_games`. `apple_game_center` is reserved for
  iOS. Provider names follow `<vendor>_<service>`.
- The first sign-in with an unknown Play Games player ID creates the Account
  and its sign-in in one atomic operation. A later sign-in with the same ID
  returns the same Account.
- Player D1 stores only the records of the Account data model: no name,
  avatar, or email.
- There are no guest Accounts.

**Sign-in with Play Games**

- The client gets a one-time server auth code from Play Games for the web
  OAuth client ID, and sends it to `POST /auth/sign-in` with the provider.
- The `gateway` exchanges the code with Google's OAuth token endpoint, using
  the web client ID and secret, then reads the player's ID from the Play Games
  Services API. A code is used once; Google's answer, not the client, decides
  the player ID.
- The client tries the automatic sign-in after the version and health checks.
  If it fails, the client shows a sign-in screen with a "Sign in with Play
  Games" button and does not try again by itself. On a device without Play
  Games, it says that Play Games is needed.

**Tokens**

- The access token is a JWT signed with Ed25519 (`EdDSA`), valid for 15
  minutes, with only `sub` (the `account_id`), `iat`, `exp`, and `kid`.
- The refresh token is a random value of 32 bytes from
  `crypto.getRandomValues`, valid for 30 days, replaced on every use, and
  stored only as its SHA-256 hash.
- Using a replaced refresh token within 30 seconds of its replacement is a
  retry: the token issued for it is revoked and a new next token is issued,
  because only hashes are stored. Using it later revokes its whole chain.
- The lifetimes are constants in the `gateway` code.
- On every start, the client uses its stored refresh token. If it is missing
  or refused, the client signs in with Play Games again.
- The client stores the refresh token only in the app's private storage, and
  the app is excluded from Android backup, so the token never leaves the
  device.

**Endpoints**

All answers use the standard response format (DD-019) and the app headers of
DD-023.

| Endpoint | Needs | Answers |
|---|---|---|
| `POST /auth/sign-in` | `{ provider, serverAuthCode }` | `accountId`, `accessToken`, `accessTokenExpiresAt`, `refreshToken`, `refreshTokenExpiresAt`, and `created` (`true` for a new Account) |
| `POST /auth/refresh` | `{ refreshToken }` | the same, with `created` `false` |
| `GET /me` | `Authorization: Bearer <access token>` | `accountId`, `providers`, `createdAt` |

New error codes:

| HTTP | Code | When |
|---|---|---|
| 400 | `INVALID_REQUEST` | The body is missing, not JSON, or has a wrong or unknown field or provider. |
| 401 | `SIGN_IN_FAILED` | Google refuses the server auth code. |
| 401 | `INVALID_REFRESH_TOKEN` | The refresh token is unknown, expired, replaced, or revoked. |
| 401 | `AUTH_REQUIRED` | A call that needs an Account has no valid access token. |
| 401 | `AUTH_EXPIRED` | The access token has expired. |
| 503 | `SIGN_IN_UNAVAILABLE` | Google cannot be reached or answers with an error. |

**Workers, database, and secrets**

- `player` is deployed as `dd-dev-player`, has no public address, and exposes
  its Account operations through typed RPC. Its code lives in
  `apps/player/src/accounts/`.
- Player D1 is named `dd-dev-player`. Its schema is
  `apps/player/src/db/schema.ts` with Drizzle, and its migrations are in
  `apps/player/migrations/`. Every Account row cascades from
  `accounts.account_id`.
- Player Identity lives in `apps/gateway/src/player-identity/`.
- The `gateway` secrets are `ACCESS_TOKEN_SIGNING_KEY` (the Ed25519 private
  key as a JWK) and `GOOGLE_OAUTH_CLIENT_SECRET`, both in
  `secrets.required`. The project owner sets them; agents never read, set,
  or print them. Local tests use test values in `.dev.vars` and a stand-in
  for Google (DD-021).
- The web OAuth client ID and the key ID are Wrangler variables:
  `GOOGLE_OAUTH_CLIENT_ID` and `ACCESS_TOKEN_KEY_ID`.

**Godot client and APK build**

- Our own Godot Android plugin, written in Kotlin, in
  `apps/game-client/android/plugins/play_games/`. It uses Google's
  `play-services-games-v2`, pinned to one version, and exposes only
  `signIn()`, `isAuthenticated()`, and `requestServerAuthCode(webClientId)`,
  with signals for the results.
- The Android export uses the Gradle build with Godot's Android build template
  for 4.6.3. The generated build folder is not committed.
- The Play Games project ID and the web OAuth client ID are committed project
  settings; neither is a secret.
- The dev upload key stays in `~/.local/share/godot/keystores/` and is never
  committed. Its SHA-1 is committed in `apps/game-client/dev-upload-key.sha1`.
  The APK build no longer creates a new key: it stops when the key is missing
  or its SHA-1 does not match, and explains how to restore it.

## 8. Data model and Content Studio

The records are those of the
[Account data model](../../../doc/07-data-model/player-state/account.md):
`accounts`, `account_sign_ins`, and `refresh_tokens`, with their keys, unique
keys, and rules. They are created by the first Player D1 migration and are
not redefined here.

The migration follows the
[Player D1 rules](../../../doc/08-technical/database-change-management.md):
it is additive, it is applied before the `player` code that needs it, and
foreign keys cascade from `accounts.account_id`.

Content Studio: N/A.

## 9. Runtime manifest and Godot runtime

No manifest is used. The loading screen of FR-00005 gets a sign-in step after
the health check:

1. Check the version and health, as in FR-00005.
2. With a stored refresh token, call `POST /auth/refresh`. On success,
   continue to step 5.
3. Sign in with Play Games automatically and get a server auth code. Call
   `POST /auth/sign-in`.
4. If the automatic sign-in fails, show the sign-in screen. The button starts
   the manual Play Games sign-in, then step 3.
5. Call `GET /me` with the access token and show the Ready screen.

The client keeps the access token only in memory and gets a new one with the
refresh token shortly before it expires. If a call answers `AUTH_EXPIRED`,
it refreshes once and repeats the call. If the refresh is refused, it starts
again at step 3.

## 10. Online services and access

- `POST /auth/sign-in` and `POST /auth/refresh` need no access token.
  `GET /me` needs a valid access token.
- The `gateway` checks the signature, `kid`, and `exp` of every access token,
  and accepts only `EdDSA`.
- Only the `gateway` decides which Account a caller is. The client never
  sends an `account_id`, and a Play Games player ID sent by the client is
  never trusted.
- Only `player` writes Player D1, and only when the `gateway` asks through
  RPC. Player devices cannot reach `player`.
- Tokens and server auth codes are never written to a log or returned in an
  error.

## 11. Player experience and UX

- Sign-in happens on the loading screen with the status "Signing in…". A
  player who is already signed in to Play Games sees no extra step.
- Play Games shows its own sign-in banner; the game does not cover it.
- The sign-in screen explains in one sentence that the game saves progress to
  the player's Play Games account, and has a "Sign in with Play Games" button
  at least 48 dp high. The game does not continue without signing in.
- Without Play Games on the device, the screen says that Play Games is needed.
- The Ready screen shows "Signed in" and the first 8 characters of the
  `account_id` in small text.
- Connection errors during sign-in use the FR-00005 connection error screen
  with its `requestId` and retry button.

Deferred: a main menu, a settings page, and signing out.

## 12. 3D assets and production contracts

N/A. The app shows no 3D content.

## 13. Logging, telemetry, and diagnostics

- The `gateway` request log adds `accountId` to every call made with a valid
  access token and to a successful sign-in or refresh. It is the one personal
  value allowed in the log (DD-024). Workers Logs keeps it for at most 7
  days.
- The log never contains tokens, server auth codes, Play Games player IDs,
  Google's answers, IP addresses, or other request headers.
- The `player` Worker writes no request log of its own; errors are logged
  without Account data.
- The client logs each sign-in step and the `requestId` of each response, but
  never a token or server auth code.

## 14. Test-first implementation

**`player`, with Vitest in the Workers runtime and a local Player D1 with
every migration applied:**

- the first sign-in creates one Account and one sign-in; a second sign-in with
  the same ID returns the same Account;
- two sign-ins at the same time with a new ID create only one Account;
- an Account has at most one sign-in per provider;
- refresh-token rows are stored with the hash only; replace, retry within 30
  seconds, reuse after 30 seconds revoking the chain, expiry, and revoke;
- deleting an Account deletes its sign-ins and refresh tokens;
- the migrations apply to an empty database, and the schema matches
  `schema.ts`.

**`gateway`, with Vitest in the Workers runtime and a stand-in for Google:**

- sign-in with a good code returns tokens and `created`; with a code Google
  refuses, `SIGN_IN_FAILED`; with Google down, `SIGN_IN_UNAVAILABLE`;
- a bad body or unknown provider answers `INVALID_REQUEST`;
- the access token is `EdDSA`, has only the four claims, and lasts 15
  minutes; a wrong signature, wrong `kid`, other algorithm, or `none` is
  refused with `AUTH_REQUIRED`, and an expired token with `AUTH_EXPIRED`;
- refresh replaces the token, and reuse revokes the chain;
- `GET /me` answers the signed-in Account, and without a token
  `AUTH_REQUIRED`;
- the request log has `accountId` on authenticated calls and never a token,
  code, or Play Games player ID;
- both secrets are in `secrets.required`, and no secret value is in the
  repository;
- the build check of FR-00005 still runs before every endpoint.

**Godot client, with GUT headless and a stubbed plugin and HTTP:**

- each sign-in result leads to the right step: refresh, automatic sign-in,
  sign-in screen, Ready, or connection error;
- a refused refresh falls back to Play Games sign-in;
- `AUTH_EXPIRED` refreshes once and repeats the call;
- the refresh token is stored only in private storage, and no token is
  printed to the log;
- the export preset uses the Gradle build and excludes the app from backup.

**APK build and scope:** the build stops when the dev upload key is missing
or its SHA-1 does not match; no keystore, password, secret, or token is in
the repository.

**Deployed, against dev:** `GET /me` without a token answers `AUTH_REQUIRED`;
sign-in with a made-up code answers `SIGN_IN_FAILED`; refresh with a made-up
token answers `INVALID_REFRESH_TOKEN`. They change nothing.

The commands to run the tests are added to `AGENTS.md`.

## 15. Implementation report

`implementation_report.md` is required before this Feature Request moves to
`In Review`. It records what was created, the final versions and settings,
the implementation decisions, approved deviations, test, migration, and
deployment results, the device used, defects, limitations, follow-up work,
and a ready-to-post GitHub Issue completion recap. It must not contain
tokens, keys, secrets, server auth codes, Play Games player IDs, full
`account_id` values, or email addresses.

## 16. Verification

- All FR-00006 tests pass, and all earlier tests still pass.
- `terraform plan` reports no changes after the deploys.
- The Player D1 migration list in Cloudflare shows the first migration as
  applied.
- The deployed tests pass against `dd-dev-gateway`.
- The debug APK builds with the documented command and the checked dev upload
  key.
- On the project owner's Android device, signed in to Play Games:
  - a fresh install signs in without a button and shows "Signed in" with an
    Account ID;
  - closing and opening the app shows the same Account ID, using the refresh
    token;
  - uninstalling and installing again shows the same Account ID, using Play
    Games;
  - with Play Games signed out, the sign-in screen appears, and its button
    signs in to the same Account.
- `devops/logs/tail.sh` shows the sign-in, refresh, and `/me` calls with an
  `accountId`, and no token.
- A read-only `SELECT` on Player D1 with `wrangler d1 execute --remote`
  shows one Account with one `google_play_games` sign-in and only hashed
  refresh tokens.

Acceptable evidence: test output, the deploy and migration output, and
screenshots from the device. Evidence must not show tokens, keys, secrets,
server auth codes, Play Games player IDs, full `account_id` values, email
addresses, or the full `gateway` address.

## 17. Acceptance criteria

- All checks in Section 16 have passed.
- `implementation_report.md` is complete.
- No decisions are unresolved.
- No unapproved changes were made.

## 18. Unresolved decisions

None.
