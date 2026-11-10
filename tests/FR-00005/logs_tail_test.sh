#!/usr/bin/env bash
# FR-00005 tests for devops/logs/tail.sh, which shows the last gateway log
# lines from Workers Logs.
#
# A stand-in curl records its arguments and the request body, and answers with
# a fixed Workers Logs response, so these tests need no credentials and no
# network, and change nothing. They need jq.
#
# Usage: tests/FR-00005/logs_tail_test.sh
# Exit status: 0 when every test passes, 1 when any test fails, 2 when jq is
# not installed.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/devops/logs/tail.sh"

passed=0
failed=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }

if ! command -v jq >/dev/null 2>&1; then
  echo "BLOCKED FR-00005: logs tail tests"
  echo "        jq is not installed."
  exit 2
fi

# Test values only; no real account.
FAKE_ACCOUNT="fr-00005-test-account"
FAKE_EMAIL="owner@example.invalid"
FAKE_KEY="fr-00005-fake-api-key"

setup() {
  WORK="$(mktemp -d)"
  FAKEBIN="$WORK/fakebin"
  mkdir -p "$FAKEBIN"
  export CURL_LOG="$WORK/curl.log" CURL_BODY="$WORK/body.json" CURL_HEADERS="$WORK/headers.txt"
  export CURL_ANSWER="$WORK/answer.json"
  : >"$CURL_LOG"
  # Stand-in curl: records each argument, the headers read from a file, and
  # the request body, then prints the prepared answer.
  cat >"$FAKEBIN/curl" <<'STUB'
#!/usr/bin/env bash
printf 'arg=%s\n' "$@" >>"$CURL_LOG"
while [ $# -gt 0 ]; do
  case "$1" in
    -H) case "$2" in @*) cat "${2#@}" >>"$CURL_HEADERS" ;; *) echo "$2" >>"$CURL_HEADERS" ;; esac; shift ;;
    --data) case "$2" in @-) cat >"$CURL_BODY" ;; *) printf '%s' "$2" >"$CURL_BODY" ;; esac; shift ;;
  esac
  shift
done
cat "$CURL_ANSWER"
STUB
  chmod +x "$FAKEBIN/curl"
  # Three gateway request lines out of order, and one Cloudflare event that is
  # not a request line. The second request line carries an IP address in its
  # metadata, which must never be printed.
  cat >"$CURL_ANSWER" <<'JSON'
{"success": true, "errors": [], "result": {"events": {"events": [
  {"timestamp": 1794311678000, "$metadata": {"ip": "203.0.113.7"}, "source": {"event": "request", "requestId": "rid-3", "method": "GET", "path": "/health", "status": 200, "environment": "dev", "versionId": "v1", "durationMs": 0}},
  {"timestamp": 1794311676000, "source": {"event": "request", "requestId": "rid-1", "method": "GET", "path": "/app/version", "status": 200, "environment": "dev", "versionId": "v1", "durationMs": 0, "platform": "android", "build": 1, "versionCheck": "upToDate"}},
  {"timestamp": 1794311677000, "source": {"event": "request", "requestId": "rid-2", "method": "GET", "path": "/health", "status": 426, "code": "APP_UPDATE_REQUIRED", "environment": "dev", "versionId": "v1", "durationMs": 0, "platform": "android", "build": 0, "versionCheck": "updateRequired"}},
  {"timestamp": 1794311679000, "source": {"message": "invocation"}}
]}}}
JSON
}

teardown() {
  rm -rf "$WORK"
}

# Runs the script with the stand-in curl and the test credentials.
run_tail() {
  PATH="$FAKEBIN:$PATH" CLOUDFLARE_ACCOUNT_ID="$FAKE_ACCOUNT" CLOUDFLARE_EMAIL="$FAKE_EMAIL" \
    CLOUDFLARE_API_KEY="$FAKE_KEY" "$SCRIPT" "$@" >"$WORK/out.txt" 2>"$WORK/err.txt"
  STATUS=$?
  OUT="$(cat "$WORK/out.txt")"
  ERR="$(cat "$WORK/err.txt")"
}

# ---------------------------------------------------------------------------

setup
name="FR-00005: tail without the credential file loaded refuses and calls nothing"
env -u CLOUDFLARE_ACCOUNT_ID -u CLOUDFLARE_EMAIL -u CLOUDFLARE_API_KEY -u CLOUDFLARE_API_TOKEN \
  PATH="$FAKEBIN:$PATH" "$SCRIPT" >"$WORK/out.txt" 2>"$WORK/err.txt"
status=$?
if [ "$status" -eq 2 ] && [ ! -s "$CURL_LOG" ] && grep -q "cloudflare.env" "$WORK/err.txt"; then
  pass "$name"
else
  fail "$name" "exit $status, curl calls: $(wc -l <"$CURL_LOG")"
fi
teardown

setup
name="FR-00005: tail rejects a count that is not a whole number from 1 to 100"
bad=""
for count in abc 0 101 -5 1.5; do
  run_tail "$count"
  if [ "$STATUS" -ne 2 ] || [ -s "$CURL_LOG" ]; then bad="$bad $count"; fi
done
if [ -z "$bad" ]; then
  pass "$name"
else
  fail "$name" "accepted:$bad"
fi
teardown

setup
name="FR-00005: tail queries the dd-dev-gateway Workers Logs of the last 3 days"
run_tail
if [ "$STATUS" -eq 0 ] \
  && grep -qx "arg=https://api.cloudflare.com/client/v4/accounts/$FAKE_ACCOUNT/workers/observability/telemetry/query" "$CURL_LOG" \
  && [ "$(jq -r '.view' "$CURL_BODY")" = "events" ] \
  && [ "$(jq -r '.parameters.filters[0].value' "$CURL_BODY")" = "dd-dev-gateway" ] \
  && [ "$(jq -r '(.timeframe.to - .timeframe.from) / 3600000' "$CURL_BODY")" = "72" ]; then
  pass "$name"
else
  fail "$name" "exit $STATUS, body: $(cat "$CURL_BODY" 2>/dev/null)"
fi
teardown

setup
name="FR-00005: tail asks for four times as many events as lines, because Cloudflare's own events count too"
run_tail 10
limit_10="$(jq -r '.limit' "$CURL_BODY")"
run_tail 3
limit_3="$(jq -r '.limit' "$CURL_BODY")"
if [ "$limit_10" = "40" ] && [ "$limit_3" = "12" ]; then
  pass "$name"
else
  fail "$name" "limits: $limit_10 and $limit_3"
fi
teardown

setup
name="FR-00005: tail prints the request lines oldest first, with a header and no other events"
run_tail
lines="$(printf '%s\n' "$OUT" | tail -n +2 | awk -F'\t' '{print $NF}' | tr '\n' ' ')"
if [ "$STATUS" -eq 0 ] && [ "$(printf '%s\n' "$OUT" | head -n 1 | cut -f1)" = "time (UTC)" ] \
  && [ "$lines" = "rid-1 rid-2 rid-3 " ] \
  && printf '%s\n' "$OUT" | grep -q $'426\tAPP_UPDATE_REQUIRED\tandroid\t0\tupdateRequired'; then
  pass "$name"
else
  fail "$name" "output: $OUT"
fi
teardown

setup
name="FR-00005: tail keeps only the last N request lines"
run_tail 2
lines="$(printf '%s\n' "$OUT" | tail -n +2 | awk -F'\t' '{print $NF}' | tr '\n' ' ')"
if [ "$STATUS" -eq 0 ] && [ "$lines" = "rid-2 rid-3 " ]; then
  pass "$name"
else
  fail "$name" "output: $OUT"
fi
teardown

setup
name="FR-00005: tail never prints the credentials or Cloudflare's metadata, and keeps them off the command line"
run_tail
args="$(cat "$CURL_LOG")"
if [ "$STATUS" -eq 0 ] \
  && ! printf '%s%s' "$OUT" "$ERR" | grep -qE "$FAKE_KEY|$FAKE_EMAIL|$FAKE_ACCOUNT|203\.0\.113\.7" \
  && ! printf '%s' "$args" | grep -qE "$FAKE_KEY|$FAKE_EMAIL" \
  && grep -qx "X-Auth-Key: $FAKE_KEY" "$CURL_HEADERS"; then
  pass "$name"
else
  fail "$name" "exit $STATUS"
fi
teardown

setup
name="FR-00005: an error from Cloudflare is reported with exit status 1"
echo '{"success": false, "errors": [{"code": 10000, "message": "Authentication error"}], "result": null}' >"$CURL_ANSWER"
run_tail
if [ "$STATUS" -eq 1 ] && printf '%s' "$ERR" | grep -q "Authentication error"; then
  pass "$name"
else
  fail "$name" "exit $STATUS, stderr: $ERR"
fi
teardown

echo
echo "FR-00005 logs tail tests: $passed passed, $failed failed"
[ "$failed" -eq 0 ]
