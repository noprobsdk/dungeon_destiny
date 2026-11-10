#!/usr/bin/env bash
# FR-00005 tests for the gateway's configuration: Workers Logs is turned on in
# both Terraform and the Wrangler configuration, and the dev thresholds are
# declared. They read files only; they need no credentials and change nothing.
#
# Usage: tests/FR-00005/config_test.sh
# Exit status: 0 when every test passes, 1 when any test fails.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="$REPO_ROOT/infra/terraform/envs/dev"
WRANGLER="$REPO_ROOT/apps/gateway/wrangler.jsonc"

passed=0
failed=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }

# The block of the gateway Worker resource.
worker_block() {
  cat "$TF_DIR"/*.tf | awk '/^resource "cloudflare_worker" "gateway"/{found=1} found{print} found && /^}/{exit}'
}

# The Wrangler config without // comments.
wrangler_text() {
  sed 's#^[[:space:]]*//.*$##; s#[[:space:]]//[^"]*$##' "$WRANGLER"
}

name="FR-00005: Terraform turns on Workers Logs for dd-dev-gateway"
if worker_block | awk '/observability[[:space:]]*=[[:space:]]*\{/{found=1} found && /enabled[[:space:]]*=[[:space:]]*true/{ok=1} found && /^[[:space:]]*\}/{exit} END{exit !ok}'; then
  pass "$name"
else
  fail "$name" "No observability = { enabled = true } in the gateway Worker resource."
fi

name="FR-00005: the Wrangler configuration turns on Workers Logs for dd-dev-gateway"
if wrangler_text | tr -d '\n ' | grep -q '"observability":{"enabled":true}'; then
  pass "$name"
else
  fail "$name" "No \"observability\": { \"enabled\": true } in $WRANGLER."
fi

name="FR-00005: the Wrangler configuration declares both Android thresholds"
if wrangler_text | grep -q '"APP_MIN_BUILD_ANDROID"' && wrangler_text | grep -q '"APP_RECOMMENDED_BUILD_ANDROID"'; then
  pass "$name"
else
  fail "$name" "APP_MIN_BUILD_ANDROID or APP_RECOMMENDED_BUILD_ANDROID is missing from $WRANGLER."
fi

echo
echo "FR-00005 config tests: $passed passed, $failed failed"
[ "$failed" -eq 0 ]
