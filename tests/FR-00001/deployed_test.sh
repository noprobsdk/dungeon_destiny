#!/usr/bin/env bash
# FR-00001 deployed-environment tests for dd-dev-gateway.
#
# Each test is named after the FR-00001 Section 16 check it proves. They call
# the deployed Worker over HTTPS and read its deployments with Wrangler, using
# the owner's credential file. They change nothing. They are recorded as
# blocked when the credential file, pnpm, or the network is unavailable.
#
# Usage: tests/FR-00001/deployed_test.sh
# Exit status: 0 when every test passes, 1 when any test fails, 2 when no test
# fails but at least one is blocked.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
URL="https://dd-dev-gateway.hj-d8e.workers.dev"
CRED_FILE="$HOME/.config/dungeon-destiny/cloudflare.env"
PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"

passed=0
failed=0
blocked=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }
block() { blocked=$((blocked + 1)); echo "BLOCKED $1"; echo "        $2"; }

# Fetch a URL; sets STATUS (HTTP code), HEADERS, and BODY.
fetch() {
  local method="$1" path="$2" tmp
  tmp="$(mktemp -d)"
  STATUS="$(curl -sS --max-time 20 -X "$method" -D "$tmp/h" -o "$tmp/b" -w '%{http_code}' "$URL$path" 2>/dev/null)"
  HEADERS="$(cat "$tmp/h" 2>/dev/null)"
  BODY="$(cat "$tmp/b" 2>/dev/null)"
  rm -rf "$tmp"
}

# The version ID of the deployment currently serving traffic, from Wrangler.
deployed_version_id() {
  (
    # shellcheck source=/dev/null
    source "$CRED_FILE"
    cd "$REPO_ROOT/apps/gateway" &&
      pnpm exec wrangler deployments status --env dev --json 2>/dev/null |
      jq -r '.versions[0].version_id // empty'
  )
}

reachable() {
  curl -sS -o /dev/null --max-time 20 "$URL/health" 2>/dev/null
}

test_health_deployed() {
  local name="FR-00001: the deployed GET /health returns the standard ok response"
  fetch GET /health
  if [ "$STATUS" != "200" ]; then
    fail "$name" "Expected HTTP 200, got $STATUS. Body: $BODY"
  elif [ "$(jq -r '.status' <<<"$BODY")" != "ok" ] || [ "$(jq -r '.code' <<<"$BODY")" != "null" ] ||
    [ "$(jq -r '.data' <<<"$BODY")" != "null" ] || [ "$(jq -r '.meta.service' <<<"$BODY")" != "gateway" ] ||
    [ "$(jq -r '.meta.environment' <<<"$BODY")" != "dev" ]; then
    fail "$name" "The body is not the expected standard response: $BODY"
  else
    pass "$name"
  fi
}

test_version_matches_deployment() {
  local name="FR-00001: the deployed /health reports the version that is actually deployed, with a dev tag"
  local reported tag deployed
  if [ ! -f "$CRED_FILE" ] || ! command -v pnpm >/dev/null 2>&1; then
    block "$name" "The credential file or pnpm is missing, so the deployed version cannot be read."
    return
  fi
  fetch GET /health
  reported="$(jq -r '.meta.version.id' <<<"$BODY")"
  tag="$(jq -r '.meta.version.tag' <<<"$BODY")"
  deployed="$(deployed_version_id)"
  if [ -z "$deployed" ]; then
    fail "$name" "Wrangler reported no deployment for dd-dev-gateway."
  elif [ "$reported" != "$deployed" ]; then
    fail "$name" "/health reports version $reported, but Wrangler reports $deployed."
  elif ! [[ "$tag" =~ ^dev-[0-9]{8}-[0-9]{6}$ ]]; then
    fail "$name" "The version tag '$tag' is not in the form dev-YYYYMMDD-HHMMSS."
  else
    pass "$name"
  fi
}

test_method_not_allowed_deployed() {
  local name="FR-00001: another method on the deployed /health returns 405 with the standard error response"
  fetch POST /health
  if [ "$STATUS" != "405" ]; then
    fail "$name" "Expected HTTP 405, got $STATUS."
  elif ! grep -qi '^allow: GET' <<<"$HEADERS"; then
    fail "$name" "The Allow: GET header is missing."
  elif [ "$(jq -r '.status + " " + .code' <<<"$BODY")" != "error METHOD_NOT_ALLOWED" ]; then
    fail "$name" "The body is not the expected error response: $BODY"
  else
    pass "$name"
  fi
}

test_not_found_deployed() {
  local name="FR-00001: another path on the deployed Worker returns 404 with the standard error response"
  fetch GET /does-not-exist
  if [ "$STATUS" != "404" ]; then
    fail "$name" "Expected HTTP 404, got $STATUS."
  elif [ "$(jq -r '.status + " " + .code' <<<"$BODY")" != "error NOT_FOUND" ]; then
    fail "$name" "The body is not the expected error response: $BODY"
  else
    pass "$name"
  fi
}

echo "FR-00001 deployed tests for $URL"
echo

if ! reachable; then
  block "FR-00001: deployed tests" "$URL cannot be reached."
else
  test_health_deployed
  test_version_matches_deployment
  test_method_not_allowed_deployed
  test_not_found_deployed
fi

echo
echo "$passed passed, $failed failed, $blocked blocked"
if [ "$failed" -gt 0 ]; then
  exit 1
elif [ "$blocked" -gt 0 ]; then
  exit 2
fi
exit 0
