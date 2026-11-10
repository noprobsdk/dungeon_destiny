#!/usr/bin/env bash
# FR-00005 deployed-environment tests for the version check on dd-dev-gateway
# (DD-023). They call the deployed Worker over HTTPS and change nothing. The
# dev thresholds are 1, so build 0 stands for an app that is too old. They are
# recorded as blocked when the network or jq is unavailable.
#
# Usage: tests/FR-00005/deployed_test.sh
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

# Fetch a path with optional app headers; sets STATUS and BODY.
fetch() {
  local path="$1" platform="${2:-}" build="${3:-}" tmp
  local args=(-sS --max-time 20 -o)
  tmp="$(mktemp)"
  args+=("$tmp" -w '%{http_code}')
  [ -n "$platform" ] && args+=(-H "X-App-Platform: $platform")
  [ -n "$build" ] && args+=(-H "X-App-Build: $build")
  STATUS="$(curl "${args[@]}" "$URL$path" 2>/dev/null)"
  BODY="$(cat "$tmp" 2>/dev/null)"
  rm -f "$tmp"
}

field() { printf '%s' "$BODY" | jq -r "$1" 2>/dev/null; }

if ! command -v jq >/dev/null 2>&1; then
  block "FR-00005: deployed tests" "jq is not installed."
  exit 2
fi
fetch /health
if [ -z "$STATUS" ] || [ "$STATUS" = "000" ]; then
  block "FR-00005: deployed tests" "$URL could not be reached."
  exit 2
fi

name="FR-00005: deployed /app/version answers a current build as supported and up to date"
fetch /app/version android 1
if [ "$STATUS" = "200" ] && [ "$(field .data.supported)" = "true" ] && [ "$(field .data.upToDate)" = "true" ] \
  && [ "$(field .data.minimumBuild)" = "1" ] && [ "$(field .data.recommendedBuild)" = "1" ]; then
  pass "$name"
else
  fail "$name" "HTTP $STATUS: $BODY"
fi

name="FR-00005: deployed /app/version answers an https update link"
case "$(field .data.updateUrl)" in
  https://*) pass "$name" ;;
  *) fail "$name" "updateUrl: $(field .data.updateUrl)" ;;
esac

name="FR-00005: deployed /app/version answers build 0 as not supported"
fetch /app/version android 0
if [ "$STATUS" = "200" ] && [ "$(field .data.supported)" = "false" ]; then
  pass "$name"
else
  fail "$name" "HTTP $STATUS: $BODY"
fi

name="FR-00005: deployed /health refuses build 0 with HTTP 426 APP_UPDATE_REQUIRED"
fetch /health android 0
if [ "$STATUS" = "426" ] && [ "$(field .code)" = "APP_UPDATE_REQUIRED" ]; then
  pass "$name"
else
  fail "$name" "HTTP $STATUS: $BODY"
fi

name="FR-00005: deployed /app/version without the app headers answers HTTP 400 INVALID_APP_HEADERS"
fetch /app/version
if [ "$STATUS" = "400" ] && [ "$(field .code)" = "INVALID_APP_HEADERS" ]; then
  pass "$name"
else
  fail "$name" "HTTP $STATUS: $BODY"
fi

name="FR-00005: deployed /health without the app headers still answers"
fetch /health
if [ "$STATUS" = "200" ] && [ "$(field .status)" = "ok" ]; then
  pass "$name"
else
  fail "$name" "HTTP $STATUS: $BODY"
fi

echo
echo "FR-00005 deployed tests: $passed passed, $failed failed, $blocked blocked"
[ "$failed" -gt 0 ] && exit 1
[ "$blocked" -gt 0 ] && exit 2
exit 0
