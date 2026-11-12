#!/usr/bin/env bash
# FR-00006 tests for the player Worker, Player D1, and Player Identity's
# configuration: Terraform, the Wrangler files of player and gateway, the
# required secrets, and that no secret value is in the repository.
#
# Each test is named after the FR-00006 check it proves. These checks read the
# files and run terraform fmt and validate on a copy; they need no credentials
# and change nothing in Cloudflare.
#
# Usage: tests/FR-00006/config_test.sh
# Exit status: 0 when every test passes, 1 when any test fails, 2 when no test
# fails but at least one is blocked.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="$REPO_ROOT/infra/terraform/envs/dev"

passed=0
failed=0
blocked=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }
block() { blocked=$((blocked + 1)); echo "BLOCKED $1"; echo "        $2"; }

tf_text() {
  cat "$TF_DIR"/*.tf 2>/dev/null
}

# One top-level block, such as 'resource "cloudflare_worker" "player"'.
tf_block() {
  tf_text | awk -v start="^$1 [{]" '$0 ~ start {found=1} found {print} found && /^}/ {exit}'
}

has_line() {
  printf '%s\n' "$1" | grep -Eq "^[[:space:]]*$2"
}

# A Wrangler file as JSON, without its // comments.
wrangler_json() {
  sed 's#^[[:space:]]*//.*$##; s#[[:space:]]//[^"]*$##' "$REPO_ROOT/apps/$1/wrangler.jsonc"
}

test_player_worker() {
  local name="FR-00006: Terraform declares the dd-dev-player Worker without a public address"
  local block
  block="$(tf_block 'resource "cloudflare_worker" "player"')"
  if [ -z "$block" ]; then
    fail "$name" "No resource \"cloudflare_worker\" \"player\"."
  elif ! has_line "$block" 'name[[:space:]]*=[[:space:]]*"dd-dev-player"'; then
    fail "$name" "The Worker is not named dd-dev-player."
  elif ! printf '%s\n' "$block" | awk '/subdomain = \{/{f=1} f{print} f && /\}/{exit}' | grep -Eq 'enabled[[:space:]]*=[[:space:]]*false' ||
    ! printf '%s\n' "$block" | grep -Eq 'previews_enabled[[:space:]]*=[[:space:]]*false'; then
    fail "$name" "subdomain.enabled and previews_enabled are not both false."
  elif printf '%s\n' "$block" | awk '/subdomain = \{/{f=1} f{print} f && /\}/{exit}' | grep -Eq '^[[:space:]]*enabled[[:space:]]*=[[:space:]]*true'; then
    fail "$name" "The workers.dev address is enabled."
  elif ! printf '%s\n' "$block" | grep -q '"cf:environment=dev", "cf:service=player"'; then
    fail "$name" "The tags Wrangler sets are not declared."
  elif ! printf '%s\n' "$block" | awk '/observability = \{/{f=1} f{print} f && /\}/{exit}' | grep -Eq 'enabled[[:space:]]*=[[:space:]]*true'; then
    fail "$name" "observability is not enabled, as in apps/player/wrangler.jsonc."
  else
    pass "$name"
  fi
}

test_player_d1() {
  local name="FR-00006: Terraform declares Player D1, dd-dev-player, in the EU, and outputs its ID"
  local block
  block="$(tf_block 'resource "cloudflare_d1_database" "player"')"
  if [ -z "$block" ]; then
    fail "$name" "No resource \"cloudflare_d1_database\" \"player\"."
  elif ! has_line "$block" 'name[[:space:]]*=[[:space:]]*"dd-dev-player"'; then
    fail "$name" "The database is not named dd-dev-player."
  elif ! has_line "$block" 'jurisdiction[[:space:]]*=[[:space:]]*"eu"'; then
    fail "$name" "jurisdiction is not \"eu\"."
  elif ! has_line "$block" 'account_id[[:space:]]*=[[:space:]]*var\.cloudflare_account_id'; then
    fail "$name" "account_id does not use var.cloudflare_account_id."
  elif ! tf_block 'output "player_d1_id"' | grep -q 'cloudflare_d1_database\.player\.id'; then
    fail "$name" "No output \"player_d1_id\"."
  else
    pass "$name"
  fi
}

test_player_wrangler() {
  local name="FR-00006: apps/player/wrangler.jsonc matches Terraform and binds dd-dev-player as PLAYER_D1"
  local json
  json="$(wrangler_json player)"
  if [ "$(printf '%s' "$json" | jq -r '.env.dev.name')" != "dd-dev-player" ] ||
    [ "$(printf '%s' "$json" | jq -r '.env.dev.workers_dev')" != "false" ] ||
    [ "$(printf '%s' "$json" | jq -r '.env.dev.preview_urls')" != "false" ]; then
    fail "$name" "name, workers_dev, or preview_urls does not match Terraform."
  elif [ "$(printf '%s' "$json" | jq -r '.env.dev.d1_databases | length')" != "1" ] ||
    [ "$(printf '%s' "$json" | jq -r '.env.dev.d1_databases[0].binding')" != "PLAYER_D1" ] ||
    [ "$(printf '%s' "$json" | jq -r '.env.dev.d1_databases[0].database_name')" != "dd-dev-player" ] ||
    [ "$(printf '%s' "$json" | jq -r '.env.dev.d1_databases[0].migrations_dir')" != "migrations" ]; then
    fail "$name" "player does not bind exactly dd-dev-player as PLAYER_D1 with migrations_dir migrations."
  elif ! printf '%s' "$json" | jq -r '.env.dev.d1_databases[0].database_id' |
    grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; then
    fail "$name" "database_id is not a UUID."
  elif [ "$(printf '%s' "$json" | jq -r '.env.dev.observability.enabled')" != "true" ]; then
    fail "$name" "observability is not enabled, as in Terraform."
  else
    pass "$name"
  fi
}

test_only_player_binds_player_d1() {
  local name="FR-00006: no Worker other than player binds Player D1"
  if grep -l 'PLAYER_D1\|"database_name": "dd-dev-player"' "$REPO_ROOT"/apps/*/wrangler.jsonc | grep -v 'apps/player/' | grep -q .; then
    fail "$name" "Another Worker's Wrangler configuration binds Player D1."
  else
    pass "$name"
  fi
}

test_gateway_binding_and_settings() {
  local name="FR-00006: gateway binds player as PLAYER and declares the Player Identity settings"
  local json
  json="$(wrangler_json gateway)"
  if [ "$(printf '%s' "$json" | jq -c '.env.dev.services')" != '[{"binding":"PLAYER","service":"dd-dev-player"}]' ]; then
    fail "$name" "gateway does not bind dd-dev-player as PLAYER."
  elif [ "$(printf '%s' "$json" | jq -r '.env.dev.vars | has("GOOGLE_OAUTH_CLIENT_ID") and has("ACCESS_TOKEN_KEY_ID")')" != "true" ]; then
    fail "$name" "GOOGLE_OAUTH_CLIENT_ID or ACCESS_TOKEN_KEY_ID is not a Wrangler variable."
  elif [ -z "$(printf '%s' "$json" | jq -r '.env.dev.vars.ACCESS_TOKEN_KEY_ID')" ]; then
    fail "$name" "ACCESS_TOKEN_KEY_ID is empty."
  elif [ "$(printf '%s' "$json" | jq -r '.env.dev.d1_databases // [] | length')" != "0" ]; then
    fail "$name" "gateway binds a D1 database; only player may bind Player D1."
  else
    pass "$name"
  fi
}

test_required_secrets() {
  local name="FR-00006: both gateway secrets are in secrets.required and not plain variables"
  local json
  json="$(wrangler_json gateway)"
  if [ "$(printf '%s' "$json" | jq -c '.env.dev.secrets.required | sort')" != '["ACCESS_TOKEN_SIGNING_KEY","GOOGLE_OAUTH_CLIENT_SECRET"]' ]; then
    fail "$name" "secrets.required is not exactly ACCESS_TOKEN_SIGNING_KEY and GOOGLE_OAUTH_CLIENT_SECRET."
  elif printf '%s' "$json" | jq -e '.env.dev.vars | has("ACCESS_TOKEN_SIGNING_KEY") or has("GOOGLE_OAUTH_CLIENT_SECRET")' >/dev/null; then
    fail "$name" "A secret is a plain variable."
  else
    pass "$name"
  fi
}

test_dev_vars_ignored() {
  local name="FR-00006: Wrangler's local secrets file .dev.vars is never committed"
  if ! git -C "$REPO_ROOT" check-ignore -q apps/gateway/.dev.vars ||
    ! git -C "$REPO_ROOT" check-ignore -q apps/player/.dev.vars.dev; then
    fail "$name" ".dev.vars is not ignored by Git."
  elif git -C "$REPO_ROOT" ls-files | grep -Eq '(^|/)\.dev\.vars'; then
    fail "$name" "A .dev.vars file is committed."
  else
    pass "$name"
  fi
}

test_no_secret_values() {
  local name="FR-00006: no private key, OAuth client secret, or token is in the repository"
  local files
  files="$(git -C "$REPO_ROOT" ls-files --cached --others --exclude-standard | grep -Ev '(^|/)node_modules/|pnpm-lock\.yaml$')"
  if printf '%s\n' "$files" | (cd "$REPO_ROOT" && xargs -d '\n' grep -lE '"d"[[:space:]]*:[[:space:]]*"[A-Za-z0-9_-]{40,}"' 2>/dev/null) | grep -q .; then
    fail "$name" "A file contains a private JWK."
  elif printf '%s\n' "$files" | (cd "$REPO_ROOT" && xargs -d '\n' grep -lE 'GOCSPX-[A-Za-z0-9_-]{10,}' 2>/dev/null) | grep -q .; then
    fail "$name" "A file contains a Google OAuth client secret."
  elif printf '%s\n' "$files" | (cd "$REPO_ROOT" && xargs -d '\n' grep -l 'BEGIN [A-Z ]*PRIVATE KEY' 2>/dev/null) | grep -v '^tests/FR-00006/config_test.sh$' | grep -q .; then
    fail "$name" "A file contains a PEM private key."
  else
    pass "$name"
  fi
}

test_fmt_and_validate() {
  local name="FR-00006: terraform fmt and validate pass with the FR-00006 resources"
  local output copy
  if ! command -v terraform >/dev/null 2>&1; then
    block "$name" "Terraform is not installed."
    return
  fi
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
  rm -rf "${copy:?}"
}

echo "FR-00006 configuration tests for player, Player D1, and Player Identity"
echo

if ! command -v jq >/dev/null 2>&1; then
  echo "BLOCKED jq is not installed."
  exit 2
fi

test_player_worker
test_player_d1
test_player_wrangler
test_only_player_binds_player_d1
test_gateway_binding_and_settings
test_required_secrets
test_dev_vars_ignored
test_no_secret_values
test_fmt_and_validate

echo
echo "Passed: $passed  Failed: $failed  Blocked: $blocked"
if [ "$failed" -gt 0 ]; then exit 1; fi
if [ "$blocked" -gt 0 ]; then exit 2; fi
exit 0
