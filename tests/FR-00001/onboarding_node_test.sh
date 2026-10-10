#!/usr/bin/env bash
# FR-00001 tests for the onboarding script's Node.js, pnpm, and dependency
# checks.
#
# Each test is named after the FR-00001 Section 14 check it proves. The tests
# copy devops/onboarding.sh into a temporary fake repository, replace every
# external program with a stand-in, and use a temporary HOME, so they need no
# network access, install nothing, and use no real credentials.
#
# Usage: tests/FR-00001/onboarding_node_test.sh
# Exit status: 0 when every test passes, 1 when any test fails.

set -u

# FR-00004: the tests use only their own fake credential file, so values
# loaded from the owner's credential file in this shell are removed first.
unset CLOUDFLARE_EMAIL CLOUDFLARE_API_KEY CLOUDFLARE_ACCOUNT_ID AWS_ACCESS_KEY_ID \
  AWS_SECRET_ACCESS_KEY STUDIO_SUPERADMIN_EMAIL AWS_ENDPOINT_URL_S3

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_SCRIPT="$REPO_ROOT/devops/onboarding.sh"
PNPM_PIN="12.10.1"

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
  PNPM_LOG="$WORK/pnpm.log"
  mkdir -p "$HOME" "$FAKEBIN" "$SYSBIN" "$AVAILABLE" "$FAKE_REPO/devops"
  export FAKEBIN AVAILABLE SUDO_LOG PNPM_LOG FAKE_REPO
  cp "$SOURCE_SCRIPT" "$FAKE_REPO/devops/onboarding.sh"

  local tool
  for tool in bash env cat stat grep sed sort head tail cut tr awk cp mkdir chmod mktemp mv rm; do
    if command -v "$tool" >/dev/null 2>&1 && [ -x "$(command -v "$tool")" ]; then
      ln -s "$(command -v "$tool")" "$SYSBIN/$tool"
    fi
  done

  export FAKE_NODE_VERSION="v24.21.0"
  export FAKE_PNPM_VERSION="$PNPM_PIN"

  cat >"$FAKEBIN/terraform" <<'STUB'
#!/usr/bin/env bash
printf '{"terraform_version":"1.16.5"}\n'
STUB
  cat >"$FAKEBIN/jq" <<'STUB'
#!/usr/bin/env bash
# Stand-in for the two jq queries the script uses.
case "$*" in
  *terraform_version*) sed -n 's/.*"terraform_version":"\([^"]*\)".*/\1/p' ;;
  *packageManager*) sed -n 's/.*"packageManager": *"\([^"]*\)".*/\1/p' "${!#}" ;;
esac
STUB
  cat >"$FAKEBIN/curl" <<'STUB'
#!/usr/bin/env bash
if [ "${1:-}" = "--version" ]; then echo "curl 7.81.0 (x86_64-pc-linux-gnu)"; exit 0; fi
case "$*" in
  *deb.nodesource.com*)
    for arg in "$@"; do [ "$prev" = "-o" ] && echo "# nodesource setup" >"$arg"; prev="$arg"; done
    exit 0 ;;
  *get.pnpm.io*) echo "# pnpm installer"; exit 0 ;;
esac
cat >/dev/null
printf '200'
STUB
  printf '#!/usr/bin/env bash\necho "ShellCheck"\n' >"$FAKEBIN/shellcheck"
  printf '#!/usr/bin/env bash\necho "git version 2.34.1"\n' >"$FAKEBIN/git"
  # Stand-in GitHub CLI (FR-00002), installed and signed in.
  printf '#!/usr/bin/env bash\nexit 0\n' >"$FAKEBIN/gh"
  cat >"$AVAILABLE/node" <<'STUB'
#!/usr/bin/env bash
echo "$FAKE_NODE_VERSION"
STUB
  cat >"$AVAILABLE/pnpm" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"$PNPM_LOG"
case "${1:-}" in
  --version) echo "$FAKE_PNPM_VERSION" ;;
  install) mkdir -p node_modules && echo "fake" >node_modules/.modules.yaml ;;
esac
STUB
  # Stand-in sudo: logs every command. "apt-get install nodejs" installs the
  # stand-in node; "bash <file>" runs nothing.
  cat >"$FAKEBIN/sudo" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"$SUDO_LOG"
[ "${1:-}" = "-E" ] && shift
case "${1:-}" in
  apt-get) case " $* " in *" nodejs "*) cp "$AVAILABLE/node" "$FAKEBIN/node" ;; esac ;;
esac
exit 0
STUB
  # Stand-in sh for the pnpm installer: installs the stand-in pnpm where
  # pnpm 12's installer puts it, in the bin folder under PNPM_HOME.
  cat >"$FAKEBIN/sh" <<'STUB'
#!/usr/bin/env bash
cat >/dev/null
printf 'pnpm-installer PNPM_VERSION=%s\n' "${PNPM_VERSION:-}" >>"$SUDO_LOG.user"
mkdir -p "$HOME/.local/share/pnpm/bin"
cp "$AVAILABLE/pnpm" "$HOME/.local/share/pnpm/bin/pnpm"
STUB
  cp "$AVAILABLE/node" "$FAKEBIN/node"
  cp "$AVAILABLE/pnpm" "$FAKEBIN/pnpm"
  chmod +x "$FAKEBIN"/* "$AVAILABLE"/*

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

# Give the fake repository a pnpm workspace.
add_workspace() {
  printf '{\n  "name": "dungeon-destiny",\n  "packageManager": "pnpm@%s"\n}\n' "$PNPM_PIN" >"$FAKE_REPO/package.json"
}

run_check() {
  OUTPUT="$(cd "$FAKE_REPO" && PATH="$FAKEBIN:$SYSBIN" "$SYSBIN/bash" devops/onboarding.sh --check </dev/null 2>&1)"
  STATUS=$?
}

run_guided() {
  OUTPUT="$(cd "$FAKE_REPO" && printf '%b' "$1" | PATH="$FAKEBIN:$SYSBIN" "$SYSBIN/bash" devops/onboarding.sh --guided 2>&1)"
  STATUS=$?
}

expect_fail_line() {
  local name="$1" pattern="$2"
  if [ "$STATUS" -eq 0 ]; then
    fail "$name" "Expected a non-zero exit status. Output was:"$'\n'"$OUTPUT"
  elif ! printf '%s\n' "$OUTPUT" | grep -q "^FAIL.*$pattern"; then
    fail "$name" "Expected a FAIL line matching '$pattern'. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
}

test_fails_when_node_is_missing() {
  setup
  rm "$FAKEBIN/node"
  run_check
  expect_fail_line "FR-00001: the onboarding script fails when Node.js is missing" "Node.js"
  teardown
}

test_fails_when_node_is_not_24() {
  setup
  export FAKE_NODE_VERSION="v22.20.0"
  run_check
  expect_fail_line "FR-00001: the onboarding script fails when Node.js is not version 24" "Node.js"
  teardown
}

test_fails_when_pnpm_is_missing() {
  setup
  rm "$FAKEBIN/pnpm"
  run_check
  expect_fail_line "FR-00001: the onboarding script fails when pnpm is missing" "pnpm"
  teardown
}

test_fails_when_pnpm_is_not_the_pinned_version() {
  setup
  add_workspace
  export FAKE_PNPM_VERSION="11.0.0"
  run_check
  expect_fail_line "FR-00001: the onboarding script fails when pnpm is not the pinned version" "pnpm"
  teardown
}

test_fails_when_dependencies_are_missing() {
  setup
  add_workspace
  run_check
  expect_fail_line "FR-00001: the onboarding script fails when the project dependencies are not installed" "dependencies"
  teardown
}

test_passes_when_node_pnpm_and_dependencies_are_ready() {
  local name="FR-00001: the onboarding script passes when Node.js 24, pnpm, and the dependencies are ready"
  setup
  add_workspace
  mkdir -p "$FAKE_REPO/node_modules" && echo fake >"$FAKE_REPO/node_modules/.modules.yaml"
  run_check
  if [ "$STATUS" -ne 0 ]; then
    fail "$name" "Expected exit status 0. Output was:"$'\n'"$OUTPUT"
  elif ! printf '%s\n' "$OUTPUT" | grep -q '^PASS.*Node.js 24' ||
    ! printf '%s\n' "$OUTPUT" | grep -q '^PASS.*pnpm' ||
    ! printf '%s\n' "$OUTPUT" | grep -q '^PASS.*dependencies'; then
    fail "$name" "Expected PASS lines for Node.js, pnpm, and dependencies. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_guided_installs_node_only_after_yes() {
  local name="FR-00001: in guided mode, Node.js is installed only after Yes"
  setup
  rm "$FAKEBIN/node"
  run_guided '\n'
  if [ -s "$SUDO_LOG" ]; then
    fail "$name" "sudo ran after an empty answer."
    teardown
    return
  fi
  teardown
  setup
  rm "$FAKEBIN/node"
  run_guided 'y\n'
  if ! grep -q 'bash .*nodesource' "$SUDO_LOG" 2>/dev/null; then
    fail "$name" "Expected the NodeSource setup_24.x script to run after Yes. Output was:"$'\n'"$OUTPUT"
  elif ! grep -q 'apt-get install -y nodejs' "$SUDO_LOG"; then
    fail "$name" "Expected 'sudo apt-get install -y nodejs' after Yes."
  elif ! printf '%s\n' "$OUTPUT" | grep -q '^PASS.*Node.js 24'; then
    fail "$name" "Expected Node.js to pass when checked again. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_guided_installs_pnpm_only_after_yes() {
  local name="FR-00001: in guided mode, pnpm is installed with its standalone installer only after Yes"
  setup
  add_workspace
  mkdir -p "$FAKE_REPO/node_modules" && echo fake >"$FAKE_REPO/node_modules/.modules.yaml"
  rm "$FAKEBIN/pnpm"
  run_guided 'y\n'
  if ! grep -q "pnpm-installer PNPM_VERSION=$PNPM_PIN" "$SUDO_LOG.user" 2>/dev/null; then
    fail "$name" "Expected the pnpm installer to run with PNPM_VERSION=$PNPM_PIN. Output was:"$'\n'"$OUTPUT"
  elif [ -s "$SUDO_LOG" ]; then
    fail "$name" "The pnpm installation used sudo."
  elif ! printf '%s\n' "$OUTPUT" | grep -q '^PASS.*pnpm'; then
    fail "$name" "Expected pnpm to pass when checked again. Output was:"$'\n'"$OUTPUT"
  elif ! printf '%s\n' "$OUTPUT" | grep -q 'source ~/.bashrc'; then
    fail "$name" "Expected a hint to open a new terminal or run 'source ~/.bashrc'."
  else
    pass "$name"
  fi
  teardown
}

test_guided_installs_dependencies_only_after_yes() {
  local name="FR-00001: in guided mode, the project dependencies are installed only after Yes"
  setup
  add_workspace
  run_guided '\n'
  if grep -q '^install' "$PNPM_LOG" 2>/dev/null; then
    fail "$name" "pnpm install ran after an empty answer."
    teardown
    return
  fi
  teardown
  setup
  add_workspace
  run_guided 'y\n'
  if ! grep -q '^install --frozen-lockfile' "$PNPM_LOG" 2>/dev/null; then
    fail "$name" "Expected 'pnpm install --frozen-lockfile' after Yes. Output was:"$'\n'"$OUTPUT"
  elif ! printf '%s\n' "$OUTPUT" | grep -q '^PASS.*dependencies'; then
    fail "$name" "Expected the dependencies to pass when checked again. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_skips_dependencies_without_workspace() {
  local name="FR-00001: the onboarding script skips the dependency check when there is no workspace"
  setup
  run_check
  if printf '%s\n' "$OUTPUT" | grep -q '^SKIP.*dependencies'; then
    pass "$name"
  else
    fail "$name" "Expected a SKIP line for dependencies. Output was:"$'\n'"$OUTPUT"
  fi
  teardown
}

echo "FR-00001 onboarding tests: Node.js, pnpm, and dependencies"
echo

test_fails_when_node_is_missing
test_fails_when_node_is_not_24
test_fails_when_pnpm_is_missing
test_fails_when_pnpm_is_not_the_pinned_version
test_fails_when_dependencies_are_missing
test_passes_when_node_pnpm_and_dependencies_are_ready
test_guided_installs_node_only_after_yes
test_guided_installs_pnpm_only_after_yes
test_guided_installs_dependencies_only_after_yes
test_skips_dependencies_without_workspace

echo
echo "$passed passed, $failed failed"
[ "$failed" -eq 0 ]
