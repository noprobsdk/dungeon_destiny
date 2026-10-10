#!/usr/bin/env bash
# FR-00003 tests for devops/deploy-studio-api.sh, which deploys studio-api with
# the SuperAdmin email address passed in at deploy time.
#
# Each test is named after the FR-00003 check it proves. A stand-in wrangler
# records its arguments and prints the variable the way Wrangler's binding
# table does, so the tests need no network, credentials, or Cloudflare.
#
# Usage: tests/FR-00003/deploy_script_test.sh
# Exit status: 0 when every test passes, 1 when any test fails.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/devops/deploy-studio-api.sh"
FAKE_SUPERADMIN="superadmin-fake@example.invalid"
# FR-00004: the account ID is passed too, and kept out of the output.
FAKE_ACCOUNT="fakeaccountid0123456789abcdef0000"

passed=0
failed=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }

setup() {
  WORK="$(mktemp -d)"
  if [ -z "$WORK" ] || [ ! -d "$WORK" ]; then
    echo "Could not create a temporary directory." >&2
    exit 1
  fi
  FAKEBIN="$WORK/fakebin"
  WRANGLER_LOG="$WORK/wrangler.log"
  mkdir -p "$FAKEBIN"
  export WRANGLER_LOG
  export FAKE_WRANGLER_EXIT=0
  # Stand-in wrangler: records its working folder and arguments, and prints
  # the --var value as Wrangler's binding table does.
  cat >"$FAKEBIN/wrangler" <<'STUB'
#!/usr/bin/env bash
{ echo "cwd=$PWD"; printf 'arg=%s\n' "$@"; } >>"$WRANGLER_LOG"
for arg in "$@"; do
  case "$arg" in
    SUPERADMIN_EMAIL:*) echo "env.SUPERADMIN_EMAIL (\"${arg#SUPERADMIN_EMAIL:}\")      Environment Variable" ;;
    CF_ACCOUNT_ID:*) echo "env.CF_ACCOUNT_ID (\"${arg#CF_ACCOUNT_ID:}\")      Environment Variable" ;;
  esac
done
echo "Uploaded dd-dev-studio-api"
exit "$FAKE_WRANGLER_EXIT"
STUB
  chmod +x "$FAKEBIN/wrangler"
}

teardown() {
  rm -rf "$WORK"
}

run_script() {
  OUTPUT="$(env -u STUDIO_SUPERADMIN_EMAIL -u CLOUDFLARE_ACCOUNT_ID PATH="$FAKEBIN:$PATH" "$@" bash "$SCRIPT" 2>&1)"
  STATUS=$?
}

test_refuses_without_superadmin() {
  local name="FR-00003: the studio-api deploy refuses to run without STUDIO_SUPERADMIN_EMAIL"
  setup
  run_script
  if [ "$STATUS" -eq 0 ]; then
    fail "$name" "The script succeeded. Output was:"$'\n'"$OUTPUT"
  elif [ -s "$WRANGLER_LOG" ]; then
    fail "$name" "wrangler was run."
  elif ! printf '%s\n' "$OUTPUT" | grep -q 'STUDIO_SUPERADMIN_EMAIL'; then
    fail "$name" "The message does not name STUDIO_SUPERADMIN_EMAIL. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_deploys_with_var_and_tag() {
  local name="FR-00003: the studio-api deploy runs wrangler deploy --env dev with a dev tag and the SuperAdmin email as a variable"
  setup
  run_script STUDIO_SUPERADMIN_EMAIL="$FAKE_SUPERADMIN" CLOUDFLARE_ACCOUNT_ID="$FAKE_ACCOUNT"
  if [ "$STATUS" -ne 0 ]; then
    fail "$name" "The script failed. Output was:"$'\n'"$OUTPUT"
  elif ! grep -qx "cwd=$REPO_ROOT/apps/studio-api" "$WRANGLER_LOG"; then
    fail "$name" "wrangler did not run in apps/studio-api."
  elif ! grep -qx 'arg=deploy' "$WRANGLER_LOG" || ! grep -qx 'arg=--env' "$WRANGLER_LOG" || ! grep -qx 'arg=dev' "$WRANGLER_LOG"; then
    fail "$name" "wrangler was not run as 'wrangler deploy --env dev'."
  elif ! grep -Eqx 'arg=dev-[0-9]{8}-[0-9]{6}' "$WRANGLER_LOG"; then
    fail "$name" "No dev-YYYYMMDD-HHMMSS tag was passed."
  elif ! grep -qx "arg=SUPERADMIN_EMAIL:$FAKE_SUPERADMIN" "$WRANGLER_LOG"; then
    fail "$name" "The SuperAdmin email address was not passed as --var SUPERADMIN_EMAIL."
  else
    pass "$name"
  fi
  teardown
}

test_output_never_contains_email() {
  local name="FR-00003: the studio-api deploy output never contains the SuperAdmin email address"
  setup
  run_script STUDIO_SUPERADMIN_EMAIL="$FAKE_SUPERADMIN" CLOUDFLARE_ACCOUNT_ID="$FAKE_ACCOUNT"
  if printf '%s\n' "$OUTPUT" | grep -qF "$FAKE_SUPERADMIN"; then
    fail "$name" "The email address appeared in the output."
  elif ! printf '%s\n' "$OUTPUT" | grep -q 'Uploaded dd-dev-studio-api'; then
    fail "$name" "Wrangler's other output was not shown. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_reports_wrangler_failure() {
  local name="FR-00003: the studio-api deploy fails when wrangler fails"
  setup
  export FAKE_WRANGLER_EXIT=3
  run_script STUDIO_SUPERADMIN_EMAIL="$FAKE_SUPERADMIN" CLOUDFLARE_ACCOUNT_ID="$FAKE_ACCOUNT"
  if [ "$STATUS" -eq 0 ]; then
    fail "$name" "The script succeeded although wrangler failed."
  else
    pass "$name"
  fi
  teardown
}

test_refuses_without_account_id() {
  local name="FR-00004: the studio-api deploy refuses to run without CLOUDFLARE_ACCOUNT_ID"
  setup
  run_script STUDIO_SUPERADMIN_EMAIL="$FAKE_SUPERADMIN"
  if [ "$STATUS" -eq 0 ] || [ -s "$WRANGLER_LOG" ]; then
    fail "$name" "The script ran without CLOUDFLARE_ACCOUNT_ID."
  elif ! printf '%s\n' "$OUTPUT" | grep -q 'CLOUDFLARE_ACCOUNT_ID'; then
    fail "$name" "The message does not name CLOUDFLARE_ACCOUNT_ID."
  else
    pass "$name"
  fi
  teardown
}

test_passes_account_id_masked() {
  local name="FR-00004: the studio-api deploy passes the account ID as CF_ACCOUNT_ID and never prints it"
  setup
  run_script STUDIO_SUPERADMIN_EMAIL="$FAKE_SUPERADMIN" CLOUDFLARE_ACCOUNT_ID="$FAKE_ACCOUNT"
  if ! grep -qx "arg=CF_ACCOUNT_ID:$FAKE_ACCOUNT" "$WRANGLER_LOG" 2>/dev/null; then
    fail "$name" "The account ID was not passed as --var CF_ACCOUNT_ID."
  elif printf '%s\n' "$OUTPUT" | grep -qF "$FAKE_ACCOUNT"; then
    fail "$name" "The account ID appeared in the output."
  else
    pass "$name"
  fi
  teardown
}

echo "FR-00003 tests for devops/deploy-studio-api.sh"
echo

test_refuses_without_superadmin
test_deploys_with_var_and_tag
test_output_never_contains_email
test_reports_wrangler_failure
test_refuses_without_account_id
test_passes_account_id_masked

echo
echo "$passed passed, $failed failed"
[ "$failed" -eq 0 ]
