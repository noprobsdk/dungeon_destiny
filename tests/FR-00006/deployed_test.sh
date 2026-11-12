#!/usr/bin/env bash
# FR-00006 deployed-environment tests for Player Identity on dd-dev-gateway
# (DD-024). They call the deployed Worker over HTTPS with made-up values only,
# so they create no Account and change nothing: Google refuses the made-up
# server auth code, and the made-up refresh token matches no stored hash. They
# are recorded as blocked when the network or jq is unavailable.
#
# Usage: tests/FR-00006/deployed_test.sh
# Exit status: 0 when every test passes, 1 when any test fails, 2 when no test
# fails but at least one is blocked.

set -u

URL="https://dd-dev-gateway.hj-d8e.workers.dev"

passed=0
failed=0
blocked=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }
block() { blocked=$((blocked + 1)); echo "BLOCKED $1"; echo "        $2"; }

# Calls a path as the app does; sets STATUS and BODY. $2 is a JSON body for a
# POST, $3 an Authorization header.
fetch() {
  local path="$1" body="${2:-}" authorization="${3:-}" tmp
  local args=(-sS --max-time 20 -H "X-App-Platform: android" -H "X-App-Build: 1" -o)
  tmp="$(mktemp)"
  args+=("$tmp" -w '%{http_code}')
  [ -n "$body" ] && args+=(-X POST -H "Content-Type: application/json" --data "$body")
  [ -n "$authorization" ] && args+=(-H "Authorization: $authorization")
  STATUS="$(curl "${args[@]}" "$URL$path" 2>/dev/null)"
  BODY="$(cat "$tmp" 2>/dev/null)"
  rm -f "$tmp"
}

field() { printf '%s' "$BODY" | jq -r "$1" 2>/dev/null; }

expect_error() {
  local name="$1" status="$2" code="$3"
  if [ "$STATUS" = "$status" ] && [ "$(field .status)" = "error" ] && [ "$(field .code)" = "$code" ] && [ "$(field .data)" = "null" ]; then
    pass "$name"
  else
    fail "$name" "HTTP $STATUS, code $(field .code)"
  fi
}

if ! command -v jq >/dev/null 2>&1; then
  block "FR-00006: deployed tests" "jq is not installed."
  exit 2
fi
fetch /health
if [ -z "$STATUS" ] || [ "$STATUS" = "000" ]; then
  block "FR-00006: deployed tests" "The deployed gateway could not be reached."
  exit 2
fi

fetch /me
expect_error "FR-00006: deployed GET /me without a token answers HTTP 401 AUTH_REQUIRED" 401 AUTH_REQUIRED

fetch /me "" "Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJmci0wMDAwNiJ9."
expect_error "FR-00006: deployed GET /me with an unsigned token answers HTTP 401 AUTH_REQUIRED" 401 AUTH_REQUIRED

fetch /auth/sign-in '{"provider":"google_play_games","serverAuthCode":"4/fr-00006-made-up-server-auth-code"}'
expect_error "FR-00006: deployed sign-in with a made-up code answers HTTP 401 SIGN_IN_FAILED" 401 SIGN_IN_FAILED

fetch /auth/sign-in '{"provider":"guest","serverAuthCode":"x"}'
expect_error "FR-00006: deployed sign-in with an unknown provider answers HTTP 400 INVALID_REQUEST" 400 INVALID_REQUEST

made_up="$(head -c 32 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n')"
fetch /auth/refresh "{\"refreshToken\":\"$made_up\"}"
expect_error "FR-00006: deployed refresh with a made-up token answers HTTP 401 INVALID_REFRESH_TOKEN" 401 INVALID_REFRESH_TOKEN

echo
echo "FR-00006 deployed tests: $passed passed, $failed failed, $blocked blocked"
[ "$failed" -gt 0 ] && exit 1
[ "$blocked" -gt 0 ] && exit 2
exit 0
