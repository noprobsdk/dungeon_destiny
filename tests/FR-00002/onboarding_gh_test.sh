#!/usr/bin/env bash
# FR-00002 tests for the onboarding script's GitHub CLI (gh) checks.
#
# Each test is named after the FR-00002 Section 14 check it proves. The tests
# copy devops/onboarding.sh into a temporary fake repository, replace every
# external program with a stand-in, and use a temporary HOME, so they need no
# network, install nothing, and use no GitHub account.
#
# Usage: tests/FR-00002/onboarding_gh_test.sh
# Exit status: 0 when every test passes, 1 when any test fails.

set -u

# FR-00004: the tests use only their own fake credential file, so values
# loaded from the owner's credential file in this shell are removed first.
unset CLOUDFLARE_EMAIL CLOUDFLARE_API_KEY CLOUDFLARE_ACCOUNT_ID AWS_ACCESS_KEY_ID \
  AWS_SECRET_ACCESS_KEY STUDIO_SUPERADMIN_EMAIL AWS_ENDPOINT_URL_S3

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_SCRIPT="$REPO_ROOT/devops/onboarding.sh"
FAKE_TOKEN="gho_FAKETOKEN0123456789abcdef"

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
  AVAILABLE="$WORK/available"
  FAKE_REPO="$WORK/repo"
  SUDO_LOG="$WORK/sudo.log"
  GH_LOG="$WORK/gh.log"
  mkdir -p "$HOME" "$FAKEBIN" "$SYSBIN" "$AVAILABLE" "$FAKE_REPO/devops"
  export FAKEBIN AVAILABLE SUDO_LOG GH_LOG FAKE_TOKEN
  export FAKE_GH_AUTH="ok"
  cp "$SOURCE_SCRIPT" "$FAKE_REPO/devops/onboarding.sh"

  local tool
  for tool in bash env cat stat grep sed sort head tail cut tr awk cp mkdir chmod mktemp mv rm; do
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
  cat >"$FAKEBIN/curl" <<'STUB'
#!/usr/bin/env bash
if [ "${1:-}" = "--version" ]; then echo "curl 7.81.0 (x86_64-pc-linux-gnu)"; exit 0; fi
cat >/dev/null
printf '200'
STUB
  printf '#!/usr/bin/env bash\necho ShellCheck\n' >"$FAKEBIN/shellcheck"
  printf '#!/usr/bin/env bash\necho "git version 2.34.1"\n' >"$FAKEBIN/git"
  printf '#!/usr/bin/env bash\necho v24.21.0\n' >"$FAKEBIN/node"
  printf '#!/usr/bin/env bash\necho 12.10.1\n' >"$FAKEBIN/pnpm"
  printf '#!/usr/bin/env bash\necho amd64\n' >"$FAKEBIN/dpkg"
  # Stand-in wget: writes a fake keyring to the -O file.
  cat >"$FAKEBIN/wget" <<'STUB'
#!/usr/bin/env bash
for arg in "$@"; do
  case "$arg" in -O*) [ -n "${arg#-O}" ] && echo "fake keyring" >"${arg#-O}" ;; esac
done
exit 0
STUB
  # Stand-in gh: logs every call. "auth status" succeeds only when
  # FAKE_GH_AUTH is "ok", and prints a fake token like the real gh's status.
  cat >"$AVAILABLE/gh" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"$GH_LOG"
case "$*" in
  --version) echo "gh version 2.102.0 (2026-09-30)" ;;
  "auth status")
    if [ "$FAKE_GH_AUTH" = "ok" ]; then
      echo "github.com"
      echo "  Logged in to github.com account owner"
      echo "  - Token: $FAKE_TOKEN"
      exit 0
    fi
    echo "You are not logged into any GitHub hosts. To log in, run: gh auth login" >&2
    exit 1 ;;
esac
exit 0
STUB
  # Stand-in sudo: logs every command; "apt-get install -y gh" installs the
  # stand-in gh; tee and other commands consume their input.
  cat >"$FAKEBIN/sudo" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"$SUDO_LOG"
case "${1:-}" in
  apt-get) case " $* " in *" gh "*) cp "$AVAILABLE/gh" "$FAKEBIN/gh" ;; esac ;;
  tee) cat >/dev/null ;;
esac
exit 0
STUB
  chmod +x "$FAKEBIN"/* "$AVAILABLE"/*
  cp "$AVAILABLE/gh" "$FAKEBIN/gh"

  mkdir -p "$HOME/.config/dungeon-destiny"
  chmod 700 "$HOME/.config/dungeon-destiny"
  cat >"$HOME/.config/dungeon-destiny/cloudflare.env" <<'CREDS'
export CLOUDFLARE_EMAIL="owner@example.invalid"
export CLOUDFLARE_API_KEY="fake-global-api-key"
export CLOUDFLARE_ACCOUNT_ID="fakeaccountid"
export AWS_ACCESS_KEY_ID="fake-access-key-id"
export AWS_SECRET_ACCESS_KEY="fake-secret"
export STUDIO_SUPERADMIN_EMAIL="superadmin@example.invalid"
CREDS
  chmod 600 "$HOME/.config/dungeon-destiny/cloudflare.env"
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

test_fails_when_gh_is_missing() {
  local name="FR-00002: the onboarding script fails when gh is missing"
  setup
  rm "$FAKEBIN/gh"
  run_check
  if [ "$STATUS" -eq 0 ] || ! printf '%s\n' "$OUTPUT" | grep -q '^FAIL.*GitHub CLI.*not installed'; then
    fail "$name" "Expected a FAIL line for the missing GitHub CLI. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_fails_when_gh_is_signed_out() {
  local name="FR-00002: the onboarding script fails when gh is not signed in, and tells the owner to run gh auth login"
  setup
  export FAKE_GH_AUTH="none"
  run_check
  if [ "$STATUS" -eq 0 ] || ! printf '%s\n' "$OUTPUT" | grep -q '^FAIL.*GitHub CLI.*not signed in'; then
    fail "$name" "Expected a FAIL line for the signed-out GitHub CLI. Output was:"$'\n'"$OUTPUT"
  elif ! printf '%s\n' "$OUTPUT" | grep -q 'gh auth login'; then
    fail "$name" "Expected a hint to run 'gh auth login'. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_passes_when_gh_is_ready() {
  local name="FR-00002: the onboarding script passes when gh is installed and signed in"
  setup
  run_check
  if [ "$STATUS" -ne 0 ]; then
    fail "$name" "Expected exit status 0. Output was:"$'\n'"$OUTPUT"
  elif ! printf '%s\n' "$OUTPUT" | grep -q '^PASS.*GitHub CLI.*installed' ||
    ! printf '%s\n' "$OUTPUT" | grep -q '^PASS.*GitHub CLI.*signed in'; then
    fail "$name" "Expected PASS lines for gh installed and signed in. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_guided_installs_gh_only_after_yes_and_never_signs_in() {
  local name="FR-00002: in guided mode, gh is installed only after Yes, and the script never runs gh auth login"
  setup
  rm "$FAKEBIN/gh"
  run_guided '\n\n'
  if [ -s "$SUDO_LOG" ]; then
    fail "$name" "sudo ran after an empty answer."
    teardown
    return
  fi
  teardown
  setup
  rm "$FAKEBIN/gh"
  export FAKE_GH_AUTH="none"
  run_guided 'y\nn\n'
  if ! grep -q 'githubcli-archive-keyring.gpg' "$SUDO_LOG" 2>/dev/null; then
    fail "$name" "Expected GitHub's keyring to be installed after Yes. Output was:"$'\n'"$OUTPUT"
  elif ! grep -q 'apt-get install -y gh' "$SUDO_LOG"; then
    fail "$name" "Expected 'sudo apt-get install -y gh' after Yes."
  elif ! printf '%s\n' "$OUTPUT" | grep -q '^PASS.*GitHub CLI.*installed'; then
    fail "$name" "Expected gh to pass when checked again. Output was:"$'\n'"$OUTPUT"
  elif grep -q 'auth login' "$GH_LOG" 2>/dev/null; then
    fail "$name" "The script ran gh auth login."
  else
    pass "$name"
  fi
  teardown
}

test_guided_rechecks_after_sign_in() {
  local name="FR-00002: in guided mode, after Yes to signing in, the script checks gh again"
  local status_calls
  setup
  export FAKE_GH_AUTH="none"
  run_guided 'y\n'
  status_calls="$(grep -c '^auth status$' "$GH_LOG" 2>/dev/null || true)"
  if [ "${status_calls:-0}" -lt 2 ]; then
    fail "$name" "Expected gh auth status to be checked again after Yes (calls: ${status_calls:-0})."
  elif [ "$STATUS" -eq 0 ] || ! printf '%s\n' "$OUTPUT" | grep -q '^FAIL.*GitHub CLI.*not signed in'; then
    fail "$name" "The script accepted Yes as proof. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_output_never_contains_token() {
  local name="FR-00002: the onboarding script output never contains a GitHub token"
  setup
  run_check
  if printf '%s\n' "$OUTPUT" | grep -qF "$FAKE_TOKEN"; then
    fail "$name" "The fake GitHub token appeared in the output."
  else
    pass "$name"
  fi
  teardown
}

echo "FR-00002 onboarding tests: GitHub CLI"
echo

test_fails_when_gh_is_missing
test_fails_when_gh_is_signed_out
test_passes_when_gh_is_ready
test_guided_installs_gh_only_after_yes_and_never_signs_in
test_guided_rechecks_after_sign_in
test_output_never_contains_token

echo
echo "$passed passed, $failed failed"
[ "$failed" -eq 0 ]
