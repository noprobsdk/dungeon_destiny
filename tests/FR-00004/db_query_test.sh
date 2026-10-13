#!/usr/bin/env bash
# FR-00004 tests for devops/db/query.sh, the read-only Content D1 query script.
#
# Each test is named after the FR-00004 check it proves. A stand-in wrangler
# records its arguments, so these tests need no credentials, no network, and
# no database, and change nothing.
#
# Usage: tests/FR-00004/db_query_test.sh
# Exit status: 0 when every test passes, 1 when any test fails.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/devops/db/query.sh"

passed=0
failed=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }

setup() {
  WORK="$(mktemp -d)"
  FAKEBIN="$WORK/fakebin"
  WRANGLER_LOG="$WORK/wrangler.log"
  mkdir -p "$FAKEBIN"
  : >"$WRANGLER_LOG"
  export WRANGLER_LOG
  # Stand-in wrangler: records its working folder and each argument.
  cat >"$FAKEBIN/wrangler" <<'STUB'
#!/usr/bin/env bash
{ echo "cwd=$PWD"; printf 'arg=%s\n' "$@"; } >>"$WRANGLER_LOG"
exit 0
STUB
  chmod +x "$FAKEBIN/wrangler"
}

teardown() {
  rm -rf "$WORK"
}

# Runs the script with made-up credentials (or none with NO_CREDENTIALS=1).
run_script() {
  if [ "${NO_CREDENTIALS:-0}" = 1 ]; then
    OUTPUT="$(env -u CLOUDFLARE_API_KEY -u CLOUDFLARE_EMAIL -u CLOUDFLARE_ACCOUNT_ID \
      PATH="$FAKEBIN:$PATH" bash "$SCRIPT" "$@" 2>&1)"
  else
    OUTPUT="$(env CLOUDFLARE_API_KEY=test-key CLOUDFLARE_EMAIL=test@example.invalid \
      CLOUDFLARE_ACCOUNT_ID=test-account PATH="$FAKEBIN:$PATH" bash "$SCRIPT" "$@" 2>&1)"
  fi
  STATUS=$?
}

logged() { grep -qxF -- "$1" "$WRANGLER_LOG"; }

# The SQL passed to wrangler with --command, or empty.
logged_sql() { grep -A1 -xF 'arg=--command' "$WRANGLER_LOG" | sed -n 's/^arg=//p' | tail -n 1; }

test_script_exists() {
  local name="FR-00004: devops/db/query.sh exists and is executable"
  if [ -x "$SCRIPT" ]; then pass "$name"; else fail "$name" "$SCRIPT is missing or not executable."; fi
}

test_named_queries_run() {
  local q
  for q in tables users roles permissions audit; do
    local name="FR-00004: query.sh $q runs one SELECT with wrangler d1 execute on dd-dev-content"
    setup
    run_script "$q"
    if [ "$STATUS" -ne 0 ]; then
      fail "$name" "Exit status $STATUS. Output was:"$'\n'"$OUTPUT"
    elif ! logged "arg=d1" || ! logged "arg=execute" || ! logged "arg=dd-dev-content" \
      || ! logged "arg=--env" || ! logged "arg=dev"; then
      fail "$name" "wrangler was not called with d1 execute dd-dev-content --env dev."
    elif ! logged_sql | grep -qiE '^[[:space:]]*select[[:space:]]'; then
      fail "$name" "The query is not a SELECT: $(logged_sql)"
    else
      pass "$name"
    fi
    teardown
  done
}

test_migrations_runs() {
  local name="FR-00004: query.sh migrations runs wrangler d1 migrations list on dd-dev-content"
  setup
  run_script migrations
  if [ "$STATUS" -ne 0 ]; then
    fail "$name" "Exit status $STATUS. Output was:"$'\n'"$OUTPUT"
  elif ! logged "arg=migrations" || ! logged "arg=list" || ! logged "arg=dd-dev-content"; then
    fail "$name" "wrangler was not called with d1 migrations list dd-dev-content."
  elif logged "arg=apply"; then
    fail "$name" "wrangler was asked to apply migrations."
  else
    pass "$name"
  fi
  teardown
}

test_no_named_query_selects_email() {
  local name="FR-00004: no named query selects an email address"
  local q bad=""
  for q in tables users roles permissions audit; do
    setup
    run_script "$q"
    if [ -z "$(logged_sql)" ]; then bad="$bad $q(no query run)"
    elif logged_sql | grep -qi 'email'; then bad="$bad $q"; fi
    teardown
  done
  if [ -n "$bad" ]; then fail "$name" "These queries mention email:$bad"; else pass "$name"; fi
}

test_sql_runs_one_select() {
  local name="FR-00004: query.sh sql runs one SELECT statement as given"
  setup
  run_script sql "select name from roles order by name;"
  if [ "$STATUS" -ne 0 ]; then
    fail "$name" "Exit status $STATUS. Output was:"$'\n'"$OUTPUT"
  elif [ "$(logged_sql)" != "select name from roles order by name" ]; then
    fail "$name" "wrangler got: $(logged_sql)"
  else
    pass "$name"
  fi
  teardown
}

test_sql_refuses() {
  local label="$1" statement="$2"
  local name="FR-00004: query.sh sql refuses $label"
  setup
  run_script sql "$statement"
  if [ "$STATUS" -eq 0 ]; then
    fail "$name" "The script succeeded."
  elif [ -s "$WRANGLER_LOG" ]; then
    fail "$name" "wrangler was run."
  elif ! printf '%s\n' "$OUTPUT" | grep -q 'one SELECT statement'; then
    fail "$name" "The message does not explain that only one SELECT statement is allowed. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_defaults_to_cloudflare() {
  local name="FR-00004: query.sh uses Cloudflare (--remote) by default"
  setup
  run_script roles
  if logged "arg=--remote" && ! logged "arg=--local"; then pass "$name"; else fail "$name" "wrangler was not called with --remote only."; fi
  teardown
}

test_local_switch() {
  local name="FR-00004: query.sh --local uses the local database and needs no credentials"
  setup
  NO_CREDENTIALS=1 run_script --local roles
  if [ "$STATUS" -ne 0 ]; then
    fail "$name" "Exit status $STATUS. Output was:"$'\n'"$OUTPUT"
  elif logged "arg=--local" && ! logged "arg=--remote"; then
    pass "$name"
  else
    fail "$name" "wrangler was not called with --local only."
  fi
  teardown
}

test_refuses_cloudflare_without_credentials() {
  local name="FR-00004: query.sh refuses Cloudflare when the credentials are not loaded"
  setup
  NO_CREDENTIALS=1 run_script roles
  if [ "$STATUS" -eq 0 ]; then
    fail "$name" "The script succeeded."
  elif [ -s "$WRANGLER_LOG" ]; then
    fail "$name" "wrangler was run."
  elif ! printf '%s\n' "$OUTPUT" | grep -q 'cloudflare.env'; then
    fail "$name" "The message does not point to the credential file. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_unknown_query_refused() {
  local name="FR-00004: query.sh refuses an unknown query name and shows its usage"
  setup
  run_script drop-everything
  if [ "$STATUS" -eq 0 ] || [ -s "$WRANGLER_LOG" ]; then
    fail "$name" "The script succeeded or ran wrangler."
  elif ! printf '%s\n' "$OUTPUT" | grep -qi 'usage'; then
    fail "$name" "No usage text. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_script_exists
test_named_queries_run
test_migrations_runs
test_no_named_query_selects_email
test_sql_runs_one_select
test_sql_refuses "an empty statement" "   "
test_sql_refuses "a statement that is not a SELECT" "DELETE FROM users"
test_sql_refuses "an UPDATE hidden behind leading spaces" "  update users set status = 'active'"
test_sql_refuses "more than one statement" "SELECT 1; DROP TABLE users"
test_sql_refuses "a missing statement" ""
test_defaults_to_cloudflare
test_local_switch
test_refuses_cloudflare_without_credentials
test_unknown_query_refused

echo
echo "$passed passed, $failed failed"
[ "$failed" -eq 0 ]
