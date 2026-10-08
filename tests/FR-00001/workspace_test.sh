#!/usr/bin/env bash
# FR-00001 tests for the pnpm workspace and the Node.js and pnpm pins.
#
# Each test is named after the FR-00001 Section 14 check it proves. The tests
# only read files in the repository; they need no Node.js, network, or
# credentials.
#
# Usage: tests/FR-00001/workspace_test.sh
# Exit status: 0 when every test passes, 1 when any test fails.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NODE_PIN="24.21.0"
PNPM_PIN="12.10.1"

passed=0
failed=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }

test_workspace_includes_apps_and_packages() {
  local name="FR-00001: the pnpm workspace includes apps/* and packages/*"
  local file="$REPO_ROOT/pnpm-workspace.yaml"
  if [ ! -f "$file" ]; then
    fail "$name" "pnpm-workspace.yaml does not exist."
  elif ! grep -Eq "^[[:space:]]*-[[:space:]]*[\"']?apps/\*[\"']?[[:space:]]*$" "$file"; then
    fail "$name" "pnpm-workspace.yaml does not list apps/*."
  elif ! grep -Eq "^[[:space:]]*-[[:space:]]*[\"']?packages/\*[\"']?[[:space:]]*$" "$file"; then
    fail "$name" "pnpm-workspace.yaml does not list packages/*."
  else
    pass "$name"
  fi
}

test_node_is_pinned() {
  local name="FR-00001: Node.js is pinned to $NODE_PIN"
  local file="$REPO_ROOT/.node-version"
  if [ ! -f "$file" ]; then
    fail "$name" ".node-version does not exist."
  elif [ "$(tr -d '[:space:]' <"$file")" != "$NODE_PIN" ]; then
    fail "$name" ".node-version is '$(tr -d '[:space:]' <"$file")', not $NODE_PIN."
  else
    pass "$name"
  fi
}

test_pnpm_is_pinned() {
  local name="FR-00001: pnpm is pinned to $PNPM_PIN in package.json"
  local file="$REPO_ROOT/package.json" value
  if [ ! -f "$file" ]; then
    fail "$name" "package.json does not exist."
    return
  fi
  value="$(jq -r '.packageManager // empty' "$file")"
  if [ "$value" != "pnpm@$PNPM_PIN" ]; then
    fail "$name" "packageManager is '$value', not pnpm@$PNPM_PIN."
  else
    pass "$name"
  fi
}

test_root_package_is_private() {
  local name="FR-00001: the root package.json is private and requires Node.js 24"
  local file="$REPO_ROOT/package.json"
  if [ ! -f "$file" ]; then
    fail "$name" "package.json does not exist."
  elif [ "$(jq -r '.private // false' "$file")" != "true" ]; then
    fail "$name" "package.json is not marked private."
  elif [ "$(jq -r '.engines.node // empty' "$file")" != "24.x" ]; then
    fail "$name" "engines.node is not 24.x."
  else
    pass "$name"
  fi
}

test_node_modules_ignored() {
  local name="FR-00001: node_modules and Wrangler's local state are ignored by Git"
  if git -C "$REPO_ROOT" check-ignore -q --no-index node_modules/x &&
    git -C "$REPO_ROOT" check-ignore -q --no-index apps/gateway/node_modules/x &&
    git -C "$REPO_ROOT" check-ignore -q --no-index apps/gateway/.wrangler/state; then
    pass "$name"
  else
    fail "$name" "node_modules or .wrangler is not ignored."
  fi
}

echo "FR-00001 workspace tests"
echo

test_workspace_includes_apps_and_packages
test_node_is_pinned
test_pnpm_is_pinned
test_root_package_is_private
test_node_modules_ignored

echo
echo "$passed passed, $failed failed"
[ "$failed" -eq 0 ]
