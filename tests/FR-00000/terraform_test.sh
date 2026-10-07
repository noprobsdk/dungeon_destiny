#!/usr/bin/env bash
# FR-00000 tests for the Terraform project in infra/terraform/envs/dev/.
#
# Each test is named after the FR-00000 Section 14 or Section 16 check it
# proves. Local checks need no credentials. Checks that use Cloudflare R2 load
# the owner's credential file and are recorded as blocked when it is missing.
# Credential values are never printed: any value found in Terraform output is
# replaced with *** before it is shown.
#
# These tests write the dev state file, and briefly its lock file, to the
# dd-terraform-state bucket. They create no Cloudflare resources.
#
# Usage: tests/FR-00000/terraform_test.sh
# Exit status: 0 when every test passes, 1 when any test fails, 2 when no test
# fails but at least one is blocked.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TF_DIR="$REPO_ROOT/infra/terraform/envs/dev"
CRED_FILE="$HOME/.config/dungeon-destiny/cloudflare.env"
STATE_BUCKET="dd-terraform-state"
STATE_KEY="dev/terraform.tfstate"
EMPTY_BODY_SHA256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

passed=0
failed=0
blocked=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && printf '        %s\n' "$2"; }
block() { blocked=$((blocked + 1)); echo "BLOCKED $1"; echo "        $2"; }

have_terraform() { command -v terraform >/dev/null 2>&1; }
have_project() { [ -d "$TF_DIR" ] && ls "$TF_DIR"/*.tf >/dev/null 2>&1; }

# Load credentials into this test process. They are never printed.
creds_loaded=false
if [ -f "$CRED_FILE" ]; then
  # shellcheck source=/dev/null
  source "$CRED_FILE" && creds_loaded=true
  if [ "$creds_loaded" = true ]; then
    export AWS_ENDPOINT_URL_S3="https://${CLOUDFLARE_ACCOUNT_ID:-}.r2.cloudflarestorage.com"
  fi
fi

# Replace every credential value in the text with ***.
mask() {
  local text="$1" value
  for value in "${CLOUDFLARE_EMAIL:-}" "${CLOUDFLARE_API_KEY:-}" "${CLOUDFLARE_ACCOUNT_ID:-}" \
    "${AWS_ACCESS_KEY_ID:-}" "${AWS_SECRET_ACCESS_KEY:-}"; do
    [ -n "$value" ] && text="${text//"$value"/***}"
  done
  printf '%s' "$text"
}

tf() {
  terraform -chdir="$TF_DIR" "$@"
}

# List object keys in the state bucket that start with a prefix. The / in the
# prefix is encoded, because curl before 8.x signs an unencoded / incorrectly.
r2_list() {
  curl --silent --max-time 20 --config - <<EOF | grep -o '<Key>[^<]*</Key>' | sed 's/<[^>]*>//g'
url = "https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com/$STATE_BUCKET?list-type=2&prefix=${1//\//%2F}"
user = "$AWS_ACCESS_KEY_ID:$AWS_SECRET_ACCESS_KEY"
aws-sigv4 = "aws:amz:auto:s3"
header = "x-amz-content-sha256: $EMPTY_BODY_SHA256"
EOF
}

# --- Local checks --------------------------------------------------------------

test_gitignore() {
  local name="FR-00000: .gitignore excludes .terraform/ and *.tfstate*, and keeps .terraform.lock.hcl"
  local path problem=""
  cd "$REPO_ROOT" || return
  for path in infra/terraform/envs/dev/.terraform/providers infra/terraform/envs/dev/terraform.tfstate \
    infra/terraform/envs/dev/terraform.tfstate.backup infra/terraform/envs/dev/crash.log; do
    git check-ignore -q --no-index "$path" || problem="$problem $path is not ignored."
  done
  if git check-ignore -q --no-index infra/terraform/envs/dev/.terraform.lock.hcl; then
    problem="$problem .terraform.lock.hcl is ignored."
  fi
  if [ -n "$problem" ]; then fail "$name" "$problem"; else pass "$name"; fi
}

test_no_secrets_or_state_in_repository() {
  local name="FR-00000: no credentials, keys, or state files are present in repository files"
  local files state_files values hits
  cd "$REPO_ROOT" || return
  # Tracked files and new files that are not ignored: what a commit could contain.
  files="$(git ls-files --cached --others --exclude-standard)"
  state_files="$(printf '%s\n' "$files" | grep -E '\.tfstate($|\.)|(^|/)cloudflare\.env$' || true)"
  if [ -n "$state_files" ]; then
    fail "$name" "State or credential files would be committed: $state_files"
    return
  fi
  if [ "$creds_loaded" != true ]; then
    block "$name" "No state files found, but the credential file is missing, so values cannot be searched for."
    return
  fi
  values="$(mktemp)"
  chmod 600 "$values"
  printf '%s\n' "${CLOUDFLARE_EMAIL:-}" "${CLOUDFLARE_API_KEY:-}" "${CLOUDFLARE_ACCOUNT_ID:-}" \
    "${AWS_ACCESS_KEY_ID:-}" "${AWS_SECRET_ACCESS_KEY:-}" | grep -v '^$' >"$values"
  hits="$(printf '%s\n' "$files" | while IFS= read -r f; do
    [ -f "$f" ] && grep -qF -f "$values" "$f" && echo "$f"
  done)"
  rm -f "$values"
  if [ -n "$hits" ]; then
    fail "$name" "Credential values found in: $hits"
  else
    pass "$name"
  fi
}

test_lock_file_exists() {
  local name="FR-00000: the provider lock file .terraform.lock.hcl exists in infra/terraform/envs/dev/"
  if [ -f "$TF_DIR/.terraform.lock.hcl" ]; then pass "$name"; else fail "$name" "It does not exist."; fi
}

test_fmt() {
  local name="FR-00000: terraform fmt -check passes"
  local output
  if ! have_terraform; then block "$name" "Terraform is not installed."; return; fi
  if ! have_project; then fail "$name" "infra/terraform/envs/dev/ has no Terraform files."; return; fi
  if output="$(terraform fmt -check -recursive "$REPO_ROOT/infra/terraform" 2>&1)"; then
    pass "$name"
  else
    fail "$name" "Files need formatting: $output"
  fi
}

test_validate() {
  local name="FR-00000: terraform validate passes"
  local output
  if ! have_terraform; then block "$name" "Terraform is not installed."; return; fi
  if ! have_project; then fail "$name" "infra/terraform/envs/dev/ has no Terraform files."; return; fi
  if ! output="$(tf init -backend=false -input=false 2>&1)"; then
    fail "$name" "terraform init -backend=false failed: $(mask "$output")"
  elif ! output="$(tf validate 2>&1)"; then
    fail "$name" "$(mask "$output")"
  else
    pass "$name"
  fi
}

# --- Checks that use Cloudflare R2 --------------------------------------------

r2_ready() {
  local name="$1"
  if ! have_terraform; then block "$name" "Terraform is not installed."; return 1; fi
  if [ "$creds_loaded" != true ]; then block "$name" "The credential file $CRED_FILE is missing."; return 1; fi
  if ! have_project; then fail "$name" "infra/terraform/envs/dev/ has no Terraform files."; return 1; fi
  return 0
}

test_init() {
  local name="FR-00000: terraform init connects to the R2 backend"
  local output
  r2_ready "$name" || return
  if output="$(tf init -input=false -reconfigure 2>&1)" &&
    printf '%s\n' "$output" | grep -q 'Successfully configured the backend "s3"'; then
    pass "$name"
  else
    fail "$name" "$(mask "$output")"
  fi
}

test_plan_no_changes() {
  local name="FR-00000: terraform plan reports no changes"
  local output status
  r2_ready "$name" || return
  output="$(tf plan -input=false -detailed-exitcode 2>&1)"
  status=$?
  if [ "$status" -eq 0 ]; then
    pass "$name"
  else
    fail "$name" "Exit status $status (0 means no changes): $(mask "$output")"
  fi
}

test_apply_writes_state() {
  local name="FR-00000: terraform apply completes with no changes and the state exists in R2 at $STATE_KEY"
  local output
  r2_ready "$name" || return
  if ! output="$(tf apply -input=false -auto-approve 2>&1)"; then
    fail "$name" "$(mask "$output")"
  elif ! printf '%s\n' "$output" | grep -q 'Resources: 0 added, 0 changed, 0 destroyed'; then
    fail "$name" "Apply reported changes: $(mask "$output")"
  elif ! r2_list "$STATE_KEY" | grep -qx "$STATE_KEY"; then
    fail "$name" "The state object $STATE_KEY was not found in the $STATE_BUCKET bucket."
  else
    pass "$name"
  fi
}

test_state_lock() {
  local name="FR-00000: while one Terraform run holds the lock, a second run is refused, and the lock is removed afterwards"
  local output holder probe seen=false lock_key="$STATE_KEY.tflock"
  r2_ready "$name" || return
  # Hold the lock with a temporary copy of the project that has one extra
  # output, so apply stops at its confirmation prompt while holding the lock.
  # The answer is "no", so nothing is applied and the state is unchanged.
  probe="$(mktemp -d)"
  cp "$TF_DIR"/*.tf "$TF_DIR/.terraform.lock.hcl" "$probe/"
  cp -r "$TF_DIR/.terraform" "$probe/"
  echo 'output "fr_00000_lock_probe" { value = "lock probe" }' >"$probe/lock_probe.tf"
  { sleep 25; echo no; } | terraform -chdir="$probe" apply >/dev/null 2>&1 &
  holder=$!
  for _ in $(seq 1 20); do
    if r2_list "$lock_key" | grep -qx "$lock_key"; then seen=true; break; fi
    sleep 1
  done
  output="$(tf plan -input=false -lock-timeout=0s 2>&1)"
  wait "$holder"
  rm -rf "$probe"
  sleep 2
  if [ "$seen" != true ]; then
    fail "$name" "No lock file $lock_key appeared in R2 while apply was waiting. If R2 locking does not work, record the one-run-at-a-time rule (FR-00000 Section 7)."
  elif ! printf '%s\n' "$output" | grep -q 'Error acquiring the state lock'; then
    fail "$name" "The second run was not refused. If R2 locking does not work, record the one-run-at-a-time rule (FR-00000 Section 7). Output: $(mask "$output")"
  elif r2_list "$lock_key" | grep -qx "$lock_key"; then
    fail "$name" "The lock file $lock_key was not removed after the first run ended."
  else
    pass "$name"
  fi
}

echo "FR-00000 Terraform tests"
echo

test_gitignore
test_no_secrets_or_state_in_repository
test_fmt
test_validate
test_lock_file_exists
test_init
test_plan_no_changes
test_apply_writes_state
test_state_lock

echo
echo "$passed passed, $failed failed, $blocked blocked"

if [ "$failed" -gt 0 ]; then
  exit 1
elif [ "$blocked" -gt 0 ]; then
  exit 2
fi
exit 0
