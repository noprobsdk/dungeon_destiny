#!/usr/bin/env bash
# FR-00003 tests for the onboarding script's Content Studio checks: the
# SuperAdmin email address, Cloudflare Zero Trust, and Playwright's Chromium.
#
# Each test is named after the FR-00003 check it proves. The tests copy
# devops/onboarding.sh into a temporary fake repository, replace every external
# program with a stand-in, and use a temporary HOME, so they need no network,
# install nothing, and use no Cloudflare account.
#
# Usage: tests/FR-00003/onboarding_access_test.sh
# Exit status: 0 when every test passes, 1 when any test fails.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_SCRIPT="$REPO_ROOT/devops/onboarding.sh"
FAKE_SUPERADMIN="superadmin-fake@example.invalid"

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
  export HOME="$WORK/home"
  FAKEBIN="$WORK/fakebin"
  SYSBIN="$WORK/sysbin"
  FAKE_REPO="$WORK/repo"
  PNPM_LOG="$WORK/pnpm.log"
  mkdir -p "$HOME" "$FAKEBIN" "$SYSBIN" "$FAKE_REPO/devops"
  export FAKEBIN PNPM_LOG HOME
  export FAKE_ZT_STATUS="200"
  cp "$SOURCE_SCRIPT" "$FAKE_REPO/devops/onboarding.sh"

  local tool
  for tool in bash env cat stat grep sed sort head tail cut tr awk cp mkdir chmod mktemp mv rm ls; do
    if command -v "$tool" >/dev/null 2>&1 && [ -x "$(command -v "$tool")" ]; then
      ln -s "$(command -v "$tool")" "$SYSBIN/$tool"
    fi
  done

  printf '#!/usr/bin/env bash\nprintf %s\n' "'{\"terraform_version\":\"1.16.5\"}\n'" >"$FAKEBIN/terraform"
  cat >"$FAKEBIN/jq" <<'STUB'
#!/usr/bin/env bash
case "$*" in
  *terraform_version*) sed -n 's/.*"terraform_version":"\([^"]*\)".*/\1/p' ;;
esac
STUB
  # Stand-in curl: answers the Zero Trust organization request with
  # FAKE_ZT_STATUS and every other request with 200.
  cat >"$FAKEBIN/curl" <<'STUB'
#!/usr/bin/env bash
if [ "${1:-}" = "--version" ]; then echo "curl 7.81.0 (x86_64-pc-linux-gnu)"; exit 0; fi
config="$(cat)"
case "$config" in
  */access/organizations*) printf '%s' "$FAKE_ZT_STATUS" ;;
  *) printf '200' ;;
esac
STUB
  printf '#!/usr/bin/env bash\necho ShellCheck\n' >"$FAKEBIN/shellcheck"
  printf '#!/usr/bin/env bash\necho "git version 2.34.1"\n' >"$FAKEBIN/git"
  printf '#!/usr/bin/env bash\necho v24.21.0\n' >"$FAKEBIN/node"
  printf '#!/usr/bin/env bash\nexit 0\n' >"$FAKEBIN/gh"
  # Stand-in pnpm: logs every call; "exec playwright install" creates a fake
  # Chromium in Playwright's default browser folder.
  cat >"$FAKEBIN/pnpm" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"$PNPM_LOG"
case "$*" in
  --version) echo 12.10.1 ;;
  "exec playwright install"*) mkdir -p "$HOME/.cache/ms-playwright/chromium-0000" ;;
esac
exit 0
STUB
  chmod +x "$FAKEBIN"/*

  mkdir -p "$HOME/.config/dungeon-destiny"
  chmod 700 "$HOME/.config/dungeon-destiny"
  cat >"$HOME/.config/dungeon-destiny/cloudflare.env" <<CREDS
export CLOUDFLARE_EMAIL="owner@example.invalid"
export CLOUDFLARE_API_KEY="fake-global-api-key"
export CLOUDFLARE_ACCOUNT_ID="fakeaccountid"
export AWS_ACCESS_KEY_ID="fake-access-key-id"
export AWS_SECRET_ACCESS_KEY="fake-secret"
export STUDIO_SUPERADMIN_EMAIL="$FAKE_SUPERADMIN"
CREDS
  chmod 600 "$HOME/.config/dungeon-destiny/cloudflare.env"
}

# A workspace whose dependencies include Playwright.
add_workspace_with_playwright() {
  printf '{"packageManager":"pnpm@12.10.1"}\n' >"$FAKE_REPO/package.json"
  mkdir -p "$FAKE_REPO/node_modules/.bin"
  : >"$FAKE_REPO/node_modules/.modules.yaml"
  printf '#!/usr/bin/env bash\nexit 0\n' >"$FAKE_REPO/node_modules/.bin/playwright"
  chmod +x "$FAKE_REPO/node_modules/.bin/playwright"
}

remove_superadmin() {
  sed -i '/STUDIO_SUPERADMIN_EMAIL/d' "$HOME/.config/dungeon-destiny/cloudflare.env"
}

teardown() {
  rm -rf "$WORK"
}

run_check() {
  OUTPUT="$(cd "$FAKE_REPO" && PATH="$FAKEBIN:$SYSBIN" "$SYSBIN/bash" devops/onboarding.sh --check </dev/null 2>&1)"
  STATUS=$?
}

run_guided() {
  OUTPUT="$(cd "$FAKE_REPO" && printf '%b' "$1" | PATH="$FAKEBIN:$SYSBIN" "$SYSBIN/bash" devops/onboarding.sh --guided 2>&1)"
  STATUS=$?
}

test_fails_when_superadmin_missing() {
  local name="FR-00003: the onboarding script fails when STUDIO_SUPERADMIN_EMAIL is not set"
  setup
  remove_superadmin
  run_check
  if [ "$STATUS" -eq 0 ] || ! printf '%s\n' "$OUTPUT" | grep -q '^FAIL.*STUDIO_SUPERADMIN_EMAIL'; then
    fail "$name" "Expected a FAIL line for STUDIO_SUPERADMIN_EMAIL. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_passes_when_superadmin_set_and_never_prints_it() {
  local name="FR-00003: the onboarding script passes STUDIO_SUPERADMIN_EMAIL when set, and never prints its value"
  setup
  run_check
  if ! printf '%s\n' "$OUTPUT" | grep -q '^PASS.*STUDIO_SUPERADMIN_EMAIL is set'; then
    fail "$name" "Expected a PASS line for STUDIO_SUPERADMIN_EMAIL. Output was:"$'\n'"$OUTPUT"
  elif printf '%s\n' "$OUTPUT" | grep -qF "$FAKE_SUPERADMIN"; then
    fail "$name" "The SuperAdmin email address appeared in the output."
  else
    pass "$name"
  fi
  teardown
}

test_fails_when_superadmin_not_plain_email() {
  local name="FR-00003: the onboarding script fails when STUDIO_SUPERADMIN_EMAIL is not a plain email address, without printing it"
  local bad
  for bad in $'super\xc2@example.invalid' 'superadmin@example.invalid ' 'not-an-email-address'; do
    setup
    remove_superadmin
    printf 'export STUDIO_SUPERADMIN_EMAIL=%q\n' "$bad" >>"$HOME/.config/dungeon-destiny/cloudflare.env"
    run_check
    if [ "$STATUS" -eq 0 ] || ! printf '%s\n' "$OUTPUT" | grep -q '^FAIL.*STUDIO_SUPERADMIN_EMAIL.*plain email address'; then
      fail "$name" "Expected a FAIL line for a malformed value. Output was:"$'\n'"$OUTPUT"
      teardown
      return
    fi
    if printf '%s\n' "$OUTPUT" | grep -qF "${bad%% *}"; then
      fail "$name" "The malformed value appeared in the output."
      teardown
      return
    fi
    teardown
  done
  pass "$name"
}

test_fails_when_zero_trust_not_enabled() {
  local name="FR-00003: the onboarding script fails when Cloudflare Zero Trust is not turned on, and points to the setup guide"
  setup
  export FAKE_ZT_STATUS="403"
  run_check
  if [ "$STATUS" -eq 0 ] || ! printf '%s\n' "$OUTPUT" | grep -q '^FAIL.*Zero Trust'; then
    fail "$name" "Expected a FAIL line for Zero Trust. Output was:"$'\n'"$OUTPUT"
  elif ! printf '%s\n' "$OUTPUT" | grep -q 'howto-cloudflare-setup.md'; then
    fail "$name" "Expected a hint pointing to the setup guide. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_passes_when_zero_trust_enabled() {
  local name="FR-00003: the onboarding script passes when Cloudflare Zero Trust is turned on"
  setup
  run_check
  if [ "$STATUS" -ne 0 ] || ! printf '%s\n' "$OUTPUT" | grep -q '^PASS.*Zero Trust'; then
    fail "$name" "Expected a PASS line for Zero Trust and exit status 0. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_guided_zero_trust_rechecks_and_changes_nothing() {
  local name="FR-00003: in guided mode, Zero Trust is a manual step: the script asks, checks again, and changes nothing"
  setup
  export FAKE_ZT_STATUS="403"
  run_guided 'y\n'
  if ! printf '%s\n' "$OUTPUT" | grep -q 'Is that step done?'; then
    fail "$name" "Expected the script to ask whether the manual step is done. Output was:"$'\n'"$OUTPUT"
  elif ! printf '%s\n' "$OUTPUT" | grep -q '^FAIL.*Zero Trust'; then
    fail "$name" "The script accepted Yes as proof instead of checking again. Output was:"$'\n'"$OUTPUT"
  elif [ -s "$PNPM_LOG" ] && grep -q 'playwright' "$PNPM_LOG"; then
    fail "$name" "The script ran an install it was not asked for."
  else
    pass "$name"
  fi
  teardown
}

test_fails_when_chromium_missing() {
  local name="FR-00003: the onboarding script fails when Playwright's Chromium is not installed"
  setup
  add_workspace_with_playwright
  run_check
  if [ "$STATUS" -eq 0 ] || ! printf '%s\n' "$OUTPUT" | grep -q '^FAIL.*Chromium'; then
    fail "$name" "Expected a FAIL line for Chromium. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_passes_when_chromium_installed() {
  local name="FR-00003: the onboarding script passes when Playwright's Chromium is installed"
  setup
  add_workspace_with_playwright
  mkdir -p "$HOME/.cache/ms-playwright/chromium-0000"
  run_check
  if [ "$STATUS" -ne 0 ] || ! printf '%s\n' "$OUTPUT" | grep -q '^PASS.*Chromium'; then
    fail "$name" "Expected a PASS line for Chromium and exit status 0. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_guided_installs_chromium_only_after_yes() {
  local name="FR-00003: in guided mode, Chromium is installed only after Yes"
  setup
  add_workspace_with_playwright
  run_guided '\n'
  if grep -q 'playwright install' "$PNPM_LOG" 2>/dev/null; then
    fail "$name" "Chromium was installed after an empty answer."
    teardown
    return
  fi
  teardown
  setup
  add_workspace_with_playwright
  run_guided 'y\n'
  if ! grep -q '^exec playwright install --with-deps chromium$' "$PNPM_LOG" 2>/dev/null; then
    fail "$name" "Expected 'pnpm exec playwright install --with-deps chromium' after Yes. Output was:"$'\n'"$OUTPUT"
  elif ! printf '%s\n' "$OUTPUT" | grep -q '^PASS.*Chromium'; then
    fail "$name" "Expected Chromium to pass when checked again. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

echo "FR-00003 onboarding tests: SuperAdmin, Zero Trust, and Chromium"
echo

test_fails_when_superadmin_missing
test_passes_when_superadmin_set_and_never_prints_it
test_fails_when_superadmin_not_plain_email
test_fails_when_zero_trust_not_enabled
test_passes_when_zero_trust_enabled
test_guided_zero_trust_rechecks_and_changes_nothing
test_fails_when_chromium_missing
test_passes_when_chromium_installed
test_guided_installs_chromium_only_after_yes

echo
echo "$passed passed, $failed failed"
[ "$failed" -eq 0 ]
