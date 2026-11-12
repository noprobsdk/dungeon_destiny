#!/usr/bin/env bash
# FR-00006: makes a new Ed25519 key for signing Player Identity's access tokens
# (DD-024) and stores it, as a JWK, in the ACCESS_TOKEN_SIGNING_KEY secret of
# dd-dev-gateway with `wrangler secret put` (DD-021). The key goes straight from
# Node.js into Wrangler through a pipe: it is never shown, written to a file,
# or kept in a shell variable.
#
# Only the project owner runs this, in a terminal, after loading the
# credential file. It asks before changing anything. Agents never run it.
# Replacing the key makes every access token invalid; the app gets a new one
# with its refresh token, so nobody is signed out.
#
# Usage, from the repository root:
#   source ~/.config/dungeon-destiny/cloudflare.env
#   devops/player-identity/new-signing-key.sh
#
#   devops/player-identity/new-signing-key.sh --local
#     Writes apps/gateway/.dev.vars for `wrangler dev` instead, with a new
#     local key and a placeholder Google client secret. Changes nothing in
#     Cloudflare, and never overwrites an existing file.
#
# Exit status: 0 when the key was stored, 1 when nothing was changed.

set -u

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
gateway_dir="$script_dir/../../apps/gateway"

# Prints a new Ed25519 private key as a JWK on standard output. Only ever
# called as the left side of a pipe.
new_key() {
  node -e '
    const { generateKeyPairSync } = require("node:crypto");
    const jwk = generateKeyPairSync("ed25519").privateKey.export({ format: "jwk" });
    process.stdout.write(JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, d: jwk.d }));
  '
}

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed; run devops/onboarding.sh. Nothing was changed." >&2
  exit 1
fi

if [ "${1:-}" = "--local" ]; then
  file="$gateway_dir/.dev.vars"
  if [ -e "$file" ]; then
    echo "$file already exists; it was not changed." >&2
    exit 1
  fi
  (
    umask 077
    {
      printf 'ACCESS_TOKEN_SIGNING_KEY='
      new_key
      printf '\nGOOGLE_OAUTH_CLIENT_SECRET=local-placeholder-not-a-secret\n'
    } >"$file"
  ) || exit 1
  echo "Wrote a local signing key to apps/gateway/.dev.vars for wrangler dev. Git ignores it."
  exit 0
fi

if [ "$#" -gt 0 ]; then
  echo "Usage: devops/player-identity/new-signing-key.sh [--local]" >&2
  exit 1
fi

if ! [ -r /dev/tty ] || ! { : </dev/tty; } 2>/dev/null; then
  echo "Run this in a terminal: it asks before replacing the signing key. Nothing was changed." >&2
  exit 1
fi

echo "This replaces ACCESS_TOKEN_SIGNING_KEY of dd-dev-gateway with a new key."
echo "Every access token stops working; the app gets a new one with its refresh token."
printf 'Type yes to continue: '
read -r answer </dev/tty
if [ "$answer" != "yes" ]; then
  echo "Nothing was changed."
  exit 1
fi

cd "$gateway_dir" || exit 1
if command -v wrangler >/dev/null 2>&1; then
  wrangler=(wrangler)
elif [ -x "node_modules/.bin/wrangler" ]; then
  wrangler=("node_modules/.bin/wrangler")
else
  wrangler=(pnpm exec wrangler)
fi

new_key | "${wrangler[@]}" secret put ACCESS_TOKEN_SIGNING_KEY --env dev
status=("${PIPESTATUS[@]}")
if [ "${status[0]}" -ne 0 ] || [ "${status[1]}" -ne 0 ]; then
  echo "The key was not stored." >&2
  exit 1
fi
echo "Stored a new ACCESS_TOKEN_SIGNING_KEY for dd-dev-gateway."
