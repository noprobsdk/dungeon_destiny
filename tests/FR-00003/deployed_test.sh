#!/usr/bin/env bash
# FR-00003 tests of the deployed Content Studio, run after every deploy.
#
# Each test is named after the FR-00003 Section 16 check it proves. They call
# the public addresses without signing in, so they need no credentials and
# change nothing. Signing in with a one-time PIN is checked by the owner.
#
# Usage: tests/FR-00003/deployed_test.sh
# Exit status: 0 when every test passes, 1 when any test fails, 2 when no test
# fails but at least one is blocked.

set -u

STUDIO_WEB="https://dd-dev-studio-web.hj-d8e.workers.dev"
STUDIO_API="https://dd-dev-studio-api.hj-d8e.workers.dev"
ACCESS_HOST="dd-main-team.cloudflareaccess.com"

passed=0
failed=0
blocked=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }
block() { blocked=$((blocked + 1)); echo "BLOCKED $1"; echo "        $2"; }

# Prints "<status> <redirect host>" for a request without following redirects.
probe() {
  curl --silent --output /dev/null --max-time 20 \
    --write-out '%{http_code} %{redirect_url}' "$1" | sed -E 's#^([0-9]+) https?://([^/]+).*#\1 \2#'
}

check_redirect() {
  local name="$1" url="$2" result
  result="$(probe "$url")"
  if [ -z "$result" ] || [ "${result%% *}" = "000" ]; then
    block "$name" "$url could not be reached."
  elif [ "$result" = "302 $ACCESS_HOST" ]; then
    pass "$name"
  else
    fail "$name" "Expected a 302 redirect to $ACCESS_HOST, got: $result"
  fi
}

test_pages_redirect_to_access() {
  check_redirect "FR-00003: without signing in, the deployed studio-web address does not return Content Studio pages; it redirects to Access" "$STUDIO_WEB/"
}

test_api_redirects_to_access() {
  check_redirect "FR-00003: without signing in, the deployed studio-web address does not return API responses; it redirects to Access" "$STUDIO_WEB/api/me"
}

test_studio_api_has_no_address() {
  local name="FR-00003: studio-api has no workers.dev address"
  local result
  result="$(probe "$STUDIO_API/")"
  if [ -z "$result" ] || [ "${result%% *}" = "000" ]; then
    block "$name" "$STUDIO_API could not be reached."
  elif [ "${result%% *}" = "404" ]; then
    pass "$name"
  else
    fail "$name" "Expected HTTP 404 from $STUDIO_API, got: $result"
  fi
}

echo "FR-00003 deployed tests for Content Studio"
echo

test_pages_redirect_to_access
test_api_redirects_to_access
test_studio_api_has_no_address

echo
echo "$passed passed, $failed failed, $blocked blocked"
if [ "$failed" -gt 0 ]; then
  exit 1
elif [ "$blocked" -gt 0 ]; then
  exit 2
fi
exit 0
