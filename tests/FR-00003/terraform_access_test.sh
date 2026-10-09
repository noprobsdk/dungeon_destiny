#!/usr/bin/env bash
# FR-00003 tests for the studio-api and studio-web Workers and the Cloudflare
# Access setup in Terraform.
#
# Each test is named after the FR-00003 check it proves. These checks read the
# Terraform and Wrangler files and run terraform fmt and validate on a copy;
# they need no credentials and change nothing in Cloudflare.
#
# Usage: tests/FR-00003/terraform_access_test.sh
# Exit status: 0 when every test passes, 1 when any test fails, 2 when no test
# fails but at least one is blocked.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="$REPO_ROOT/infra/terraform/envs/dev"
STUDIO_WEB_HOST="dd-dev-studio-web.hj-d8e.workers.dev"

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

# One top-level block, such as 'resource "cloudflare_worker" "studio_api"'.
tf_block() {
  tf_text | awk -v start="^$1 [{]" '$0 ~ start {found=1} found {print} found && /^}/ {exit}'
}

has_line() {
  printf '%s\n' "$1" | grep -Eq "^[[:space:]]*$2"
}

# A Wrangler config without // comments, as JSON for jq.
wrangler_json() {
  sed 's#^[[:space:]]*//.*$##; s#[[:space:]]//[^"]*$##' "$REPO_ROOT/apps/$1/wrangler.jsonc"
}

# Checks one Worker resource: its name, workers.dev setting, previews, tags,
# and that Wrangler's settings agree.
check_worker() {
  local resource="$1" app="$2" workers_dev="$3"
  local state="disabled" name block json
  [ "$workers_dev" = true ] && state="enabled"
  name="FR-00003: Terraform declares dd-dev-$app with workers.dev $state, preview URLs disabled, and Wrangler's tags, matching its Wrangler config"
  block="$(tf_block "resource \"cloudflare_worker\" \"$resource\"")"
  json="$(wrangler_json "$app")"
  if [ -z "$block" ]; then
    fail "$name" "No resource \"cloudflare_worker\" \"$resource\" in $TF_DIR."
  elif ! has_line "$block" "name[[:space:]]*=[[:space:]]*\"dd-dev-$app\""; then
    fail "$name" "The Worker is not named dd-dev-$app."
  elif ! has_line "$block" "account_id[[:space:]]*=[[:space:]]*var\\.cloudflare_account_id"; then
    fail "$name" "account_id does not use var.cloudflare_account_id."
  elif ! has_line "$block" "enabled[[:space:]]*=[[:space:]]*$workers_dev"; then
    fail "$name" "subdomain.enabled is not $workers_dev."
  elif ! has_line "$block" 'previews_enabled[[:space:]]*=[[:space:]]*false'; then
    fail "$name" "subdomain.previews_enabled is not false."
  elif ! printf '%s\n' "$block" | grep -q '"cf:environment=dev"' ||
    ! printf '%s\n' "$block" | grep -q "\"cf:service=$app\""; then
    fail "$name" "Terraform tags do not include cf:environment=dev and cf:service=$app."
  elif [ "$(printf '%s' "$json" | jq -r '.env.dev.name')" != "dd-dev-$app" ] ||
    [ "$(printf '%s' "$json" | jq -r '.env.dev.workers_dev')" != "$workers_dev" ] ||
    [ "$(printf '%s' "$json" | jq -r '.env.dev.preview_urls')" != "false" ]; then
    fail "$name" "apps/$app/wrangler.jsonc does not match Terraform (name, workers_dev, preview_urls)."
  else
    pass "$name"
  fi
}

test_studio_api_worker() {
  check_worker studio_api studio-api false
}

test_studio_web_worker() {
  check_worker studio_web studio-web true
}

test_one_time_pin_sign_in() {
  local name="FR-00003: Terraform declares the one-time PIN sign-in method"
  local block
  block="$(tf_block 'resource "cloudflare_zero_trust_access_identity_provider" "one_time_pin"')"
  if [ -z "$block" ]; then
    fail "$name" "No resource \"cloudflare_zero_trust_access_identity_provider\" \"one_time_pin\"."
  elif ! has_line "$block" 'type[[:space:]]*=[[:space:]]*"onetimepin"'; then
    fail "$name" "Its type is not onetimepin."
  else
    pass "$name"
  fi
}

test_policy_allows_only_superadmin() {
  local name="FR-00003: the Access application's policy allows only the SuperAdmin email address, read from a variable without a default"
  local block policies variable
  block="$(tf_block 'resource "cloudflare_zero_trust_access_application" "studio_web"')"
  policies="$(printf '%s\n' "$block" | awk '/^[[:space:]]*policies[[:space:]]*=/{f=1} f{print} f && /^  \]/{exit}')"
  variable="$(tf_block 'variable "studio_superadmin_email"')"
  if [ -z "$policies" ]; then
    fail "$name" "The Access application has no policies."
  elif ! has_line "$policies" 'decision[[:space:]]*=[[:space:]]*"allow"'; then
    fail "$name" "The policy's decision is not allow."
  elif ! printf '%s\n' "$policies" | grep -Eq 'email[[:space:]]*=[[:space:]]*\{[[:space:]]*email[[:space:]]*=[[:space:]]*var\.studio_superadmin_email[[:space:]]*\}'; then
    fail "$name" "The policy does not include exactly email = { email = var.studio_superadmin_email }."
  elif [ "$(printf '%s\n' "$policies" | grep -c 'email')" -ne 1 ] || printf '%s\n' "$policies" | grep -Eq 'everyone|email_domain|email_list|[[:space:]]id[[:space:]]*='; then
    fail "$name" "The policy includes more than the SuperAdmin email address."
  elif [ -z "$variable" ]; then
    fail "$name" "The variable studio_superadmin_email is not declared."
  elif printf '%s\n' "$variable" | grep -q 'default'; then
    fail "$name" "The variable studio_superadmin_email has a default value."
  elif ! has_line "$variable" 'sensitive[[:space:]]*=[[:space:]]*true'; then
    fail "$name" "The variable studio_superadmin_email is not marked sensitive."
  else
    pass "$name"
  fi
}

test_access_application() {
  local name="FR-00003: the Access application protects $STUDIO_WEB_HOST with a 24-hour session, and the one-time PIN only"
  local block
  block="$(tf_block 'resource "cloudflare_zero_trust_access_application" "studio_web"')"
  if [ -z "$block" ]; then
    fail "$name" "No resource \"cloudflare_zero_trust_access_application\" \"studio_web\"."
  elif ! has_line "$block" 'type[[:space:]]*=[[:space:]]*"self_hosted"'; then
    fail "$name" "Its type is not self_hosted."
  elif ! has_line "$block" "domain[[:space:]]*=[[:space:]]*\"$STUDIO_WEB_HOST\""; then
    fail "$name" "Its domain is not $STUDIO_WEB_HOST."
  elif ! has_line "$block" 'session_duration[[:space:]]*=[[:space:]]*"24h"'; then
    fail "$name" "Its session duration is not 24h."
  elif ! printf '%s\n' "$block" | grep -Eq 'allowed_idps[[:space:]]*=[[:space:]]*\[[[:space:]]*cloudflare_zero_trust_access_identity_provider\.one_time_pin\.id[[:space:]]*\]'; then
    fail "$name" "allowed_idps is not only the one-time PIN sign-in method."
  elif ! has_line "$block" 'auto_redirect_to_identity[[:space:]]*=[[:space:]]*true'; then
    fail "$name" "auto_redirect_to_identity is not true."
  else
    pass "$name"
  fi
}

test_aud_output() {
  local name="FR-00003: Terraform outputs the Access application's AUD tag for apps/studio-web/wrangler.jsonc"
  local block
  block="$(tf_block 'output "studio_web_access_aud"')"
  if [ -z "$block" ]; then
    fail "$name" "No output \"studio_web_access_aud\"."
  elif ! printf '%s\n' "$block" | grep -q 'cloudflare_zero_trust_access_application\.studio_web\.aud'; then
    fail "$name" "The output does not read cloudflare_zero_trust_access_application.studio_web.aud."
  else
    pass "$name"
  fi
}

test_team_domain_in_wrangler() {
  local name="FR-00003: apps/studio-web/wrangler.jsonc checks tokens against the team domain dd-main-team.cloudflareaccess.com"
  local domain
  domain="$(wrangler_json studio-web | jq -r '.env.dev.vars.ACCESS_TEAM_DOMAIN')"
  if [ "$domain" != "https://dd-main-team.cloudflareaccess.com" ]; then
    fail "$name" "ACCESS_TEAM_DOMAIN is '$domain'."
  else
    pass "$name"
  fi
}

test_no_email_address_in_files() {
  local name="FR-00003: no email address is written in the Terraform or Wrangler files"
  if cat "$TF_DIR"/*.tf "$REPO_ROOT"/apps/*/wrangler.jsonc 2>/dev/null |
    grep -Eq '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'; then
    fail "$name" "An email address is written in the files."
  else
    pass "$name"
  fi
}

test_fmt_and_validate() {
  local name="FR-00003: terraform fmt and validate pass with the Content Studio resources"
  local output copy
  if ! command -v terraform >/dev/null 2>&1; then
    block "$name" "Terraform is not installed."
    return
  fi
  # Validate a copy, so the real folder's R2 backend is never read and no
  # credentials are needed.
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

echo "FR-00003 Terraform tests for Content Studio and Cloudflare Access"
echo

test_studio_api_worker
test_studio_web_worker
test_one_time_pin_sign_in
test_policy_allows_only_superadmin
test_access_application
test_aud_output
test_team_domain_in_wrangler
test_no_email_address_in_files
test_fmt_and_validate

echo
echo "$passed passed, $failed failed, $blocked blocked"
if [ "$failed" -gt 0 ]; then
  exit 1
elif [ "$blocked" -gt 0 ]; then
  exit 2
fi
exit 0
