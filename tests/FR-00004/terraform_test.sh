#!/usr/bin/env bash
# FR-00004 tests for Content D1, the Access group, and the Access policy in
# Terraform, and for studio-api's matching Wrangler configuration.
#
# Each test is named after the FR-00004 check it proves. These checks read the
# Terraform and Wrangler files and run terraform fmt and validate on a copy;
# they need no credentials and change nothing in Cloudflare.
#
# Usage: tests/FR-00004/terraform_test.sh
# Exit status: 0 when every test passes, 1 when any test fails, 2 when no test
# fails but at least one is blocked.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="$REPO_ROOT/infra/terraform/envs/dev"
API_WRANGLER="$REPO_ROOT/apps/studio-api/wrangler.jsonc"

passed=0
failed=0
blocked=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }
block() { blocked=$((blocked + 1)); echo "BLOCKED $1"; echo "        $2"; }

tf_text() {
  cat "$TF_DIR"/*.tf 2>/dev/null
}

tf_block() {
  tf_text | awk -v start="^$1 [{]" '$0 ~ start {found=1} found {print} found && /^}/ {exit}'
}

has_line() {
  printf '%s\n' "$1" | grep -Eq "^[[:space:]]*$2"
}

api_json() {
  sed 's#^[[:space:]]*//.*$##; s#[[:space:]]//[^"]*$##' "$API_WRANGLER"
}

test_content_d1() {
  local name="FR-00004: Terraform declares the dd-dev-content D1 database with EU jurisdiction"
  local block
  block="$(tf_block 'resource "cloudflare_d1_database" "content"')"
  if [ -z "$block" ]; then
    fail "$name" "No resource \"cloudflare_d1_database\" \"content\"."
  elif ! has_line "$block" 'name[[:space:]]*=[[:space:]]*"dd-dev-content"'; then
    fail "$name" "The database is not named dd-dev-content."
  elif ! has_line "$block" 'jurisdiction[[:space:]]*=[[:space:]]*"eu"'; then
    fail "$name" "jurisdiction is not \"eu\"."
  elif ! has_line "$block" 'account_id[[:space:]]*=[[:space:]]*var\.cloudflare_account_id'; then
    fail "$name" "account_id does not use var.cloudflare_account_id."
  else
    pass "$name"
  fi
}

test_binding_matches() {
  local name="FR-00004: studio-api binds dd-dev-content as CONTENT_D1, with the migrations folder, and Terraform outputs its ID"
  local json
  json="$(api_json)"
  if [ "$(printf '%s' "$json" | jq -r '.env.dev.d1_databases[0].binding')" != "CONTENT_D1" ] ||
    [ "$(printf '%s' "$json" | jq -r '.env.dev.d1_databases[0].database_name')" != "dd-dev-content" ] ||
    [ "$(printf '%s' "$json" | jq -r '.env.dev.d1_databases[0].migrations_dir')" != "migrations" ]; then
    fail "$name" "apps/studio-api/wrangler.jsonc does not bind dd-dev-content as CONTENT_D1 with migrations_dir migrations."
  elif ! tf_block 'output "content_d1_id"' | grep -q 'cloudflare_d1_database\.content\.'; then
    fail "$name" "No output \"content_d1_id\" from cloudflare_d1_database.content."
  else
    pass "$name"
  fi
}

test_only_studio_api_binds_content_d1() {
  local name="FR-00004: no Worker other than studio-api binds Content D1"
  if grep -l 'dd-dev-content\|CONTENT_D1' "$REPO_ROOT"/apps/*/wrangler.jsonc | grep -v 'apps/studio-api/' | grep -q .; then
    fail "$name" "Another Worker's Wrangler configuration mentions Content D1."
  else
    pass "$name"
  fi
}

test_access_group() {
  local name="FR-00004: Terraform declares the Access group \"Content Studio users\" and leaves its members to studio-api"
  local block
  block="$(tf_block 'resource "cloudflare_zero_trust_access_group" "studio_users"')"
  if [ -z "$block" ]; then
    fail "$name" "No resource \"cloudflare_zero_trust_access_group\" \"studio_users\"."
  elif ! has_line "$block" 'name[[:space:]]*=[[:space:]]*"Content Studio users"'; then
    fail "$name" "The group is not named \"Content Studio users\"."
  elif ! printf '%s\n' "$block" | grep -Eq 'ignore_changes[[:space:]]*=[[:space:]]*\[[[:space:]]*include[[:space:]]*\]'; then
    fail "$name" "The group does not ignore changes to include, so Terraform would undo studio-api's updates."
  elif ! tf_block 'output "studio_users_group_id"' | grep -q 'cloudflare_zero_trust_access_group\.studio_users\.id'; then
    fail "$name" "No output \"studio_users_group_id\"."
  else
    pass "$name"
  fi
}

test_policy_superadmin_and_group() {
  local name="FR-00004: the Access policy allows only the SuperAdmin and the Access group"
  local block policies
  block="$(tf_block 'resource "cloudflare_zero_trust_access_application" "studio_web"')"
  policies="$(printf '%s\n' "$block" | awk '/^[[:space:]]*policies[[:space:]]*=/{f=1} f{print} f && /^  \]/{exit}')"
  if ! printf '%s\n' "$policies" | grep -Eq 'email[[:space:]]*=[[:space:]]*\{[[:space:]]*email[[:space:]]*=[[:space:]]*var\.studio_superadmin_email'; then
    fail "$name" "The policy does not include the SuperAdmin email address."
  elif ! printf '%s\n' "$policies" | grep -Eq 'group[[:space:]]*=[[:space:]]*\{[[:space:]]*id[[:space:]]*=[[:space:]]*cloudflare_zero_trust_access_group\.studio_users\.id'; then
    fail "$name" "The policy does not include the studio_users group."
  elif printf '%s\n' "$policies" | grep -Eq 'everyone|email_domain|email_list|any_valid_service_token'; then
    fail "$name" "The policy lets in more than the SuperAdmin and the group."
  else
    pass "$name"
  fi
}

test_required_secret_and_settings() {
  local name="FR-00004: studio-api declares CF_ACCESS_GROUP_TOKEN as a required secret and has the group and API settings"
  local json
  json="$(api_json)"
  if [ "$(printf '%s' "$json" | jq -r '.env.dev.secrets.required | index("CF_ACCESS_GROUP_TOKEN")')" = "null" ]; then
    fail "$name" "CF_ACCESS_GROUP_TOKEN is not in env.dev.secrets.required."
  elif [ "$(printf '%s' "$json" | jq -r '.env.dev.vars.CF_API_BASE')" != "https://api.cloudflare.com/client/v4" ]; then
    fail "$name" "CF_API_BASE is not Cloudflare's API."
  elif [ "$(printf '%s' "$json" | jq -r '.env.dev.vars | has("ACCESS_GROUP_ID")')" != "true" ]; then
    fail "$name" "ACCESS_GROUP_ID is not declared."
  elif printf '%s' "$json" | jq -e '.env.dev.vars | has("CF_ACCESS_GROUP_TOKEN")' >/dev/null; then
    fail "$name" "CF_ACCESS_GROUP_TOKEN is a plain variable, not a secret."
  else
    pass "$name"
  fi
}

test_no_secrets_in_files() {
  local name="FR-00004: no email address, token, or account ID is written in the Terraform or Wrangler files"
  if cat "$TF_DIR"/*.tf "$REPO_ROOT"/apps/*/wrangler.jsonc 2>/dev/null |
    grep -Eq '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'; then
    fail "$name" "An email address is written in the files."
  elif tf_text | grep -Eq '[0-9a-f]{32}'; then
    fail "$name" "A 32-character hexadecimal value, such as an account ID, is written in the Terraform files."
  else
    pass "$name"
  fi
}

test_fmt_and_validate() {
  local name="FR-00004: terraform fmt and validate pass with the FR-00004 resources"
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

echo "FR-00004 Terraform tests for Content D1 and the Access group"
echo

test_content_d1
test_binding_matches
test_only_studio_api_binds_content_d1
test_access_group
test_policy_superadmin_and_group
test_required_secret_and_settings
test_no_secrets_in_files
test_fmt_and_validate

echo
echo "$passed passed, $failed failed, $blocked blocked"
if [ "$failed" -gt 0 ]; then
  exit 1
elif [ "$blocked" -gt 0 ]; then
  exit 2
fi
exit 0
