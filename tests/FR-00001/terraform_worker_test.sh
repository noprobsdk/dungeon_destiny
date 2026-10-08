#!/usr/bin/env bash
# FR-00001 tests for the dd-dev-gateway Worker in Terraform.
#
# Each test is named after the FR-00001 Section 14 check it proves. These
# checks read the Terraform and Wrangler files and run terraform fmt and
# validate; they need no credentials and change nothing in Cloudflare.
#
# Usage: tests/FR-00001/terraform_worker_test.sh
# Exit status: 0 when every test passes, 1 when any test fails, 2 when no test
# fails but at least one is blocked.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="$REPO_ROOT/infra/terraform/envs/dev"
WRANGLER="$REPO_ROOT/apps/gateway/wrangler.jsonc"
WORKER_NAME="dd-dev-gateway"

passed=0
failed=0
blocked=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }
block() { blocked=$((blocked + 1)); echo "BLOCKED $1"; echo "        $2"; }

# All Terraform files of the dev environment, as one text.
tf_text() {
  cat "$TF_DIR"/*.tf 2>/dev/null
}

# The block of the gateway Worker resource, or nothing.
worker_block() {
  tf_text | awk '/^resource "cloudflare_worker" "gateway"/{found=1} found{print} found && /^}/{exit}'
}

# The Wrangler config without // comments, as JSON for jq.
wrangler_json() {
  sed 's#^[[:space:]]*//.*$##; s#[[:space:]]//[^"]*$##' "$WRANGLER"
}

test_worker_resource_declared() {
  local name="FR-00001: Terraform declares the $WORKER_NAME Worker"
  local block
  block="$(worker_block)"
  if [ -z "$block" ]; then
    fail "$name" "No resource \"cloudflare_worker\" \"gateway\" in $TF_DIR."
  elif ! printf '%s\n' "$block" | grep -Eq "^[[:space:]]*name[[:space:]]*=[[:space:]]*\"$WORKER_NAME\""; then
    fail "$name" "The Worker is not named $WORKER_NAME."
  else
    pass "$name"
  fi
}

test_workers_dev_enabled_previews_disabled() {
  local name="FR-00001: the Worker's workers.dev address is enabled and preview URLs are disabled"
  local block
  block="$(worker_block)"
  if ! printf '%s\n' "$block" | grep -Eq '^[[:space:]]*enabled[[:space:]]*=[[:space:]]*true'; then
    fail "$name" "subdomain.enabled is not true."
  elif ! printf '%s\n' "$block" | grep -Eq '^[[:space:]]*previews_enabled[[:space:]]*=[[:space:]]*false'; then
    fail "$name" "subdomain.previews_enabled is not false."
  else
    pass "$name"
  fi
}

test_matches_wrangler_config() {
  local name="FR-00001: the Terraform and Wrangler settings for the Worker agree"
  local json
  json="$(wrangler_json)"
  if [ "$(printf '%s' "$json" | jq -r '.env.dev.name')" != "$WORKER_NAME" ]; then
    fail "$name" "Wrangler env.dev.name is not $WORKER_NAME."
  elif [ "$(printf '%s' "$json" | jq -r '.env.dev.workers_dev')" != "true" ]; then
    fail "$name" "Wrangler env.dev.workers_dev is not true, but Terraform enables workers.dev."
  elif [ "$(printf '%s' "$json" | jq -r '.env.dev.preview_urls')" != "false" ]; then
    fail "$name" "Wrangler env.dev.preview_urls is not false, but Terraform disables previews."
  else
    pass "$name"
  fi
}

test_tags_match_wrangler() {
  local name="FR-00001: the Worker's Terraform tags match the tags Wrangler sets on deploy"
  local json env service block
  json="$(wrangler_json)"
  env="dev"
  service="$(printf '%s' "$json" | jq -r '.name')"
  block="$(worker_block)"
  if ! printf '%s\n' "$block" | grep -q "\"cf:environment=$env\""; then
    fail "$name" "Terraform tags do not include cf:environment=$env."
  elif ! printf '%s\n' "$block" | grep -q "\"cf:service=$service\""; then
    fail "$name" "Terraform tags do not include cf:service=$service."
  else
    pass "$name"
  fi
}

test_account_id_from_variable() {
  local name="FR-00001: the Cloudflare account ID comes from a variable and is not stored in the files"
  local block
  block="$(worker_block)"
  if ! printf '%s\n' "$block" | grep -Eq '^[[:space:]]*account_id[[:space:]]*=[[:space:]]*var\.cloudflare_account_id'; then
    fail "$name" "account_id does not use var.cloudflare_account_id."
  elif ! tf_text | grep -q '^variable "cloudflare_account_id"'; then
    fail "$name" "The variable cloudflare_account_id is not declared."
  elif tf_text | awk '/^variable "cloudflare_account_id"/{f=1} f{print} f && /^}/{exit}' | grep -q 'default'; then
    fail "$name" "The variable cloudflare_account_id has a default value."
  elif tf_text | grep -Eq '[0-9a-f]{32}'; then
    fail "$name" "A 32-character hexadecimal value, such as an account ID, is written in the files."
  else
    pass "$name"
  fi
}

test_fmt_and_validate() {
  local name="FR-00001: terraform fmt and validate pass with the Worker resource"
  local output
  if ! command -v terraform >/dev/null 2>&1; then
    block "$name" "Terraform is not installed."
    return
  fi
  # Validate a copy, so the real folder's R2 backend is never read and no
  # credentials are needed.
  local copy
  copy="$(mktemp -d)"
  cp "$TF_DIR"/*.tf "$TF_DIR/.terraform.lock.hcl" "$copy/"
  if ! output="$(terraform fmt -check -recursive "$REPO_ROOT/infra/terraform" 2>&1)"; then
    fail "$name" "Files need formatting: $output"
  elif ! output="$(terraform -chdir="$copy" init -backend=false -input=false 2>&1)"; then
    fail "$name" "terraform init -backend=false failed: $output"
  elif ! output="$(terraform -chdir="$copy" validate -no-color 2>&1)"; then
    fail "$name" "$output"
  else
    pass "$name"
  fi
  rm -rf "$copy"
}

echo "FR-00001 Terraform tests for $WORKER_NAME"
echo

test_worker_resource_declared
test_workers_dev_enabled_previews_disabled
test_matches_wrangler_config
test_tags_match_wrangler
test_account_id_from_variable
test_fmt_and_validate

echo
echo "$passed passed, $failed failed, $blocked blocked"
if [ "$failed" -gt 0 ]; then
  exit 1
elif [ "$blocked" -gt 0 ]; then
  exit 2
fi
exit 0
