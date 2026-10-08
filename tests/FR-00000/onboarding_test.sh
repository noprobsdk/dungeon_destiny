#!/usr/bin/env bash
# FR-00000 tests for the onboarding script, devops/onboarding.sh.
#
# Each test is named after the FR-00000 Section 14 check it proves. The tests
# replace terraform, jq, curl, shellcheck, git, sudo, wget, and dpkg with
# stand-in programs and use a temporary HOME, so they need no network access,
# install nothing, and use no real credentials. Guided-mode tests feed their
# answers through standard input with --guided.
#
# Usage: tests/FR-00000/onboarding_test.sh
# Exit status: 0 when every test passes, 1 when any test fails, 2 when no test
# fails but at least one is blocked.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/devops/onboarding.sh"

# Fake credential values. A test fails if any of them appears in output.
FAKE_EMAIL="owner@example.invalid"
FAKE_API_KEY="fake-global-api-key-0123456789"
FAKE_ACCOUNT_ID="fakeaccountid0123456789abcdef"
FAKE_ACCESS_KEY_ID="fake-r2-access-key-id-0123"
FAKE_SECRET="fake-r2-secret-access-key-0123456789"

passed=0
failed=0
blocked=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }
block() { blocked=$((blocked + 1)); echo "BLOCKED $1"; echo "        $2"; }

# Build an isolated environment: a temporary HOME, a directory of stand-in
# programs, and a directory holding only the basic system tools the script
# needs. Nothing else from the real PATH is visible.
setup() {
  WORK="$(mktemp -d)"
  if [ -z "$WORK" ] || [ ! -d "$WORK" ]; then
    echo "Could not create a temporary directory." >&2
    exit 1
  fi
  export HOME="$WORK/home"
  mkdir -p "$HOME"
  FAKEBIN="$WORK/fakebin"
  SYSBIN="$WORK/sysbin"
  mkdir -p "$FAKEBIN" "$SYSBIN"
  local tool
  for tool in bash env cat stat grep sed sort head tail cut tr awk cp mkdir chmod mktemp mv rm; do
    if command -v "$tool" >/dev/null 2>&1 && [ -x "$(command -v "$tool")" ]; then
      ln -s "$(command -v "$tool")" "$SYSBIN/$tool"
    fi
  done
  CURL_ARGS_LOG="$WORK/curl-args.log"
  SUDO_LOG="$WORK/sudo.log"
  AVAILABLE="$WORK/available"
  mkdir -p "$AVAILABLE"
  export CURL_ARGS_LOG SUDO_LOG AVAILABLE FAKEBIN
  export FAKE_TF_VERSION="1.16.5"
  export FAKE_CURL_VERSION="7.81.0"
  export FAKE_CF_HTTP="200"
  export FAKE_R2_HTTP="200"

  cat >"$FAKEBIN/terraform" <<'EOF'
#!/usr/bin/env bash
if [ "${1:-}" = "version" ] && [ "${2:-}" = "-json" ]; then
  printf '{"terraform_version":"%s","platform":"linux_amd64"}\n' "$FAKE_TF_VERSION"
  exit 0
fi
exit 1
EOF
  cat >"$FAKEBIN/jq" <<'EOF'
#!/usr/bin/env bash
# Stand-in for: jq -r .terraform_version
sed -n 's/.*"terraform_version":"\([^"]*\)".*/\1/p'
EOF
  cat >"$FAKEBIN/curl" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"$CURL_ARGS_LOG"
if [ "${1:-}" = "--version" ]; then
  echo "curl $FAKE_CURL_VERSION (x86_64-pc-linux-gnu) libcurl/$FAKE_CURL_VERSION"
  exit 0
fi
config="$(cat)"
case "$config" in
  *api.cloudflare.com*) printf '%s' "$FAKE_CF_HTTP" ;;
  *r2.cloudflarestorage.com*)
    # Like real R2, reject a signed request without x-amz-content-sha256.
    case "$config" in
      *x-amz-content-sha256*) printf '%s' "$FAKE_R2_HTTP" ;;
      *) printf '400' ;;
    esac
    ;;
  *) printf '000' ;;
esac
EOF
  printf '#!/usr/bin/env bash\necho "ShellCheck - shell script analysis tool"\n' >"$FAKEBIN/shellcheck"
  printf '#!/usr/bin/env bash\necho "git version 2.34.1"\n' >"$FAKEBIN/git"
  # Stand-in sudo: logs every command and, for an apt-get install, "installs"
  # the package by copying its stand-in from $AVAILABLE into $FAKEBIN.
  cat >"$FAKEBIN/sudo" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"$SUDO_LOG"
case "${1:-}" in
  apt-get)
    if [ "${2:-}" = "install" ]; then
      shift 2
      for package in "$@"; do
        case "$package" in
          -*) ;;
          *) if [ -f "$AVAILABLE/$package" ]; then cp "$AVAILABLE/$package" "$FAKEBIN/$package"; fi ;;
        esac
      done
    fi
    ;;
  gpg | tee) cat >/dev/null ;;
esac
exit 0
STUB
  printf '#!/usr/bin/env bash\nexit 0\n' >"$FAKEBIN/wget"
  printf '#!/usr/bin/env bash\necho amd64\n' >"$FAKEBIN/dpkg"
  # Stand-ins for Node.js 24 and pnpm (FR-00001), so these tests see a
  # machine where they are already installed.
  printf '#!/usr/bin/env bash\necho v24.21.0\n' >"$FAKEBIN/node"
  printf '#!/usr/bin/env bash\necho 12.10.1\n' >"$FAKEBIN/pnpm"
  chmod +x "$FAKEBIN"/*
  cp "$FAKEBIN/terraform" "$FAKEBIN/jq" "$FAKEBIN/shellcheck" "$FAKEBIN/git" "$AVAILABLE/"
  # Run a copy of the script in a fake repository without a pnpm workspace, so
  # the result does not depend on the real checkout's installed dependencies.
  mkdir -p "$WORK/repo/devops"
  cp "$SCRIPT" "$WORK/repo/devops/onboarding.sh"
  RUN_SCRIPT="$WORK/repo/devops/onboarding.sh"
}

teardown() {
  rm -rf "$WORK"
}

write_credentials() {
  mkdir -p "$HOME/.config/dungeon-destiny"
  chmod 700 "$HOME/.config/dungeon-destiny"
  CRED_FILE="$HOME/.config/dungeon-destiny/cloudflare.env"
  cat >"$CRED_FILE" <<EOF
export CLOUDFLARE_EMAIL="$FAKE_EMAIL"
export CLOUDFLARE_API_KEY="$FAKE_API_KEY"
export CLOUDFLARE_ACCOUNT_ID="$FAKE_ACCOUNT_ID"
export AWS_ACCESS_KEY_ID="$FAKE_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$FAKE_SECRET"
EOF
  chmod 600 "$CRED_FILE"
}

# Run the onboarding script in the isolated environment, without a terminal.
run_script() {
  OUTPUT="$(PATH="$FAKEBIN:$SYSBIN" "$SYSBIN/bash" "$RUN_SCRIPT" "$@" </dev/null 2>&1)"
  STATUS=$?
}

# Run the onboarding script in guided mode, feeding one answer per line.
run_guided() {
  OUTPUT="$(printf '%b' "$1" | PATH="$FAKEBIN:$SYSBIN" "$SYSBIN/bash" "$RUN_SCRIPT" --guided 2>&1)"
  STATUS=$?
}

sudo_was_called() {
  [ -s "$SUDO_LOG" ]
}

asked_a_question() {
  printf '%s\n' "$OUTPUT" | grep -q '\[y/N\]'
}

script_ready() {
  [ -f "$SCRIPT" ]
}

contains_secret() {
  local text="$1" value
  for value in "$FAKE_EMAIL" "$FAKE_API_KEY" "$FAKE_ACCOUNT_ID" "$FAKE_ACCESS_KEY_ID" "$FAKE_SECRET"; do
    case "$text" in *"$value"*) return 0 ;; esac
  done
  return 1
}

# Assert that the script failed with a FAIL line matching a pattern.
expect_failure() {
  local name="$1" pattern="$2"
  if ! script_ready; then
    fail "$name" "devops/onboarding.sh does not exist."
    return
  fi
  run_script
  if [ "$STATUS" -eq 0 ]; then
    fail "$name" "Expected a non-zero exit status, got 0."
  elif ! printf '%s\n' "$OUTPUT" | grep -q "^FAIL.*$pattern"; then
    fail "$name" "Expected a FAIL line matching '$pattern'. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
}

test_script_exists_and_is_executable() {
  local name="FR-00000: the onboarding script exists in devops/ and is executable"
  if [ -f "$SCRIPT" ] && [ -x "$SCRIPT" ]; then
    pass "$name"
  else
    fail "$name" "devops/onboarding.sh is missing or not executable."
  fi
}

test_script_passes_shellcheck() {
  local name="FR-00000: the onboarding script passes ShellCheck"
  if ! command -v shellcheck >/dev/null 2>&1; then
    block "$name" "ShellCheck is not installed on this machine."
  elif ! script_ready; then
    fail "$name" "devops/onboarding.sh does not exist."
  elif shellcheck "$SCRIPT"; then
    pass "$name"
  else
    fail "$name" "ShellCheck reported problems."
  fi
}

test_passes_when_everything_is_ready() {
  local name="FR-00000: the onboarding script passes when every prerequisite is met"
  setup
  write_credentials
  if ! script_ready; then
    fail "$name" "devops/onboarding.sh does not exist."
  else
    run_script
    if [ "$STATUS" -ne 0 ]; then
      fail "$name" "Expected exit status 0, got $STATUS. Output was:"$'\n'"$OUTPUT"
    elif printf '%s\n' "$OUTPUT" | grep -q '^FAIL'; then
      fail "$name" "Unexpected FAIL line. Output was:"$'\n'"$OUTPUT"
    else
      pass "$name"
    fi
  fi
  teardown
}

test_fails_when_terraform_is_missing() {
  setup
  write_credentials
  rm "$FAKEBIN/terraform"
  expect_failure "FR-00000: the onboarding script fails when Terraform is missing" "Terraform"
  teardown
}

test_fails_when_terraform_is_too_old() {
  setup
  write_credentials
  export FAKE_TF_VERSION="1.10.5"
  expect_failure "FR-00000: the onboarding script fails when Terraform is older than 1.11" "Terraform"
  teardown
}

test_fails_when_jq_is_missing() {
  setup
  write_credentials
  rm "$FAKEBIN/jq"
  expect_failure "FR-00000: the onboarding script fails when jq is missing" "jq"
  teardown
}

test_fails_when_curl_is_too_old() {
  setup
  write_credentials
  export FAKE_CURL_VERSION="7.74.0"
  expect_failure "FR-00000: the onboarding script fails when curl is older than 7.75" "curl"
  teardown
}

test_fails_when_shellcheck_is_missing() {
  setup
  write_credentials
  rm "$FAKEBIN/shellcheck"
  expect_failure "FR-00000: the onboarding script fails when ShellCheck is missing" "ShellCheck"
  teardown
}

test_fails_when_git_is_missing() {
  setup
  write_credentials
  rm "$FAKEBIN/git"
  expect_failure "FR-00000: the onboarding script fails when git is missing" "git"
  teardown
}

test_fails_when_credential_file_is_missing() {
  setup
  expect_failure "FR-00000: the onboarding script fails when the credential file is missing" "credential file"
  teardown
}

test_fails_when_credential_file_is_readable_by_others() {
  setup
  write_credentials
  chmod 644 "$CRED_FILE"
  expect_failure "FR-00000: the onboarding script fails when the credential file is readable by others" "credential file"
  teardown
}

test_fails_when_a_required_value_is_missing() {
  local variable
  for variable in CLOUDFLARE_EMAIL CLOUDFLARE_API_KEY CLOUDFLARE_ACCOUNT_ID AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
    setup
    write_credentials
    sed -i "/^export $variable=/d" "$CRED_FILE"
    expect_failure "FR-00000: the onboarding script fails when $variable is missing" "$variable"
    teardown
  done
}

test_fails_when_cloudflare_rejects_credentials() {
  setup
  write_credentials
  export FAKE_CF_HTTP="403"
  expect_failure "FR-00000: the onboarding script fails when Cloudflare rejects the Global API Key" "Cloudflare"
  teardown
}

test_fails_when_r2_rejects_credentials() {
  setup
  write_credentials
  export FAKE_R2_HTTP="403"
  expect_failure "FR-00000: the onboarding script fails when R2 rejects the access key pair" "R2"
  teardown
}

test_output_never_contains_credentials() {
  local name="FR-00000: the onboarding script output never contains credential values"
  local scenario leaked=""
  for scenario in ready cf_rejected r2_rejected; do
    setup
    write_credentials
    case "$scenario" in
      cf_rejected) export FAKE_CF_HTTP="403" ;;
      r2_rejected) export FAKE_R2_HTTP="403" ;;
    esac
    if script_ready; then
      run_script
      contains_secret "$OUTPUT" && leaked="$leaked $scenario"
    else
      leaked="missing"
    fi
    teardown
  done
  if [ "$leaked" = "missing" ]; then
    fail "$name" "devops/onboarding.sh does not exist."
  elif [ -n "$leaked" ]; then
    fail "$name" "A credential value appeared in the output in:$leaked"
  else
    pass "$name"
  fi
}

test_credentials_never_in_command_arguments() {
  local name="FR-00000: the onboarding script never passes credentials as command-line arguments"
  setup
  write_credentials
  if ! script_ready; then
    fail "$name" "devops/onboarding.sh does not exist."
  else
    run_script
    if [ ! -s "$CURL_ARGS_LOG" ]; then
      fail "$name" "curl was never called, so the access checks did not run."
    elif contains_secret "$(cat "$CURL_ARGS_LOG")"; then
      fail "$name" "A credential value was passed to curl as an argument."
    else
      pass "$name"
    fi
  fi
  teardown
}

test_check_mode_never_prompts_or_changes() {
  local name="FR-00000: with --check, or without a terminal, the onboarding script never prompts and changes nothing"
  local problem="" args
  setup
  rm "$FAKEBIN/shellcheck"
  if ! script_ready; then
    problem="devops/onboarding.sh does not exist."
  else
    for args in "--check" ""; do
      if [ -n "$args" ]; then run_script "$args"; else run_script; fi
      if asked_a_question; then
        problem="It prompted (arguments: '$args')."
      elif sudo_was_called; then
        problem="It ran sudo (arguments: '$args')."
      elif [ -e "$HOME/.config/dungeon-destiny" ]; then
        problem="It created the credential folder (arguments: '$args')."
      fi
    done
  fi
  if [ -n "$problem" ]; then fail "$name" "$problem"; else pass "$name"; fi
  teardown
}

test_guided_no_answer_changes_nothing() {
  local name="FR-00000: in guided mode, an empty answer or No runs no command and changes no file"
  local problem="" answers
  setup
  rm "$FAKEBIN/shellcheck"
  if ! script_ready; then
    problem="devops/onboarding.sh does not exist."
  else
    for answers in '\n\n\n\n\n\n\n\n\n\n' 'n\nn\nn\nn\nn\nn\nn\nn\nn\nn\n'; do
      run_guided "$answers"
      if ! asked_a_question; then
        problem="It never asked a question. Output was:"$'\n'"$OUTPUT"
      elif sudo_was_called; then
        problem="It ran sudo after an empty answer or No."
      elif [ -e "$HOME/.config/dungeon-destiny" ]; then
        problem="It created the credential folder after an empty answer or No."
      fi
    done
  fi
  if [ -n "$problem" ]; then fail "$name" "$problem"; else pass "$name"; fi
  teardown
}

test_guided_installs_only_after_yes() {
  local name="FR-00000: in guided mode, an install command runs only after Yes"
  setup
  write_credentials
  rm "$FAKEBIN/shellcheck"
  if ! script_ready; then
    fail "$name" "devops/onboarding.sh does not exist."
  else
    run_guided 'y\n'
    if ! grep -q '^apt-get install .*shellcheck' "$SUDO_LOG" 2>/dev/null; then
      fail "$name" "Expected 'sudo apt-get install ... shellcheck' after Yes. Output was:"$'\n'"$OUTPUT"
    elif ! printf '%s\n' "$OUTPUT" | grep -q '^PASS.*ShellCheck'; then
      fail "$name" "Expected ShellCheck to pass when checked again. Output was:"$'\n'"$OUTPUT"
    else
      pass "$name"
    fi
  fi
  teardown
}

test_guided_stores_entered_values_safely() {
  local name="FR-00000: in guided mode, entered values are stored, not shown, and the file stays at mode 600"
  local cred stored
  setup
  if ! script_ready; then
    fail "$name" "devops/onboarding.sh does not exist."
    teardown
    return
  fi
  run_guided "$ENTER_ALL_VALUES"
  cred="$HOME/.config/dungeon-destiny/cloudflare.env"
  stored=""
  if [ -f "$cred" ]; then
    stored="$(bash -c 'source "$1"; printf "%s|%s|%s|%s|%s" "$CLOUDFLARE_EMAIL" "$CLOUDFLARE_API_KEY" "$CLOUDFLARE_ACCOUNT_ID" "$AWS_ACCESS_KEY_ID" "$AWS_SECRET_ACCESS_KEY"' _ "$cred")"
  fi
  if [ ! -f "$cred" ]; then
    fail "$name" "The credential file was not created. Output was:"$'\n'"$OUTPUT"
  elif [ "$stored" != "$FAKE_EMAIL|$FAKE_API_KEY|$FAKE_ACCOUNT_ID|$FAKE_ACCESS_KEY_ID|$FAKE_SECRET" ]; then
    fail "$name" "The stored values do not match what was entered."
  elif [ "$(stat -c '%a' "$cred")" != "600" ]; then
    fail "$name" "The credential file mode is $(stat -c '%a' "$cred"), not 600."
  elif [ "$(stat -c '%a' "$(dirname "$cred")")" != "700" ]; then
    fail "$name" "The credential folder mode is not 700."
  elif contains_secret "$OUTPUT"; then
    fail "$name" "An entered value was shown in the output."
  elif [ "$STATUS" -ne 0 ]; then
    fail "$name" "Expected every check to pass afterwards. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_guided_explains_where_to_find_values() {
  local name="FR-00000: in guided mode, the script explains where to find each value before asking for it"
  local missing="" hint
  setup
  if ! script_ready; then
    fail "$name" "devops/onboarding.sh does not exist."
    teardown
    return
  fi
  run_guided "$ENTER_ALL_VALUES"
  for hint in "sign in to Cloudflare" "Global API Key" "Copy account ID" "Access Key ID" "Secret Access Key" \
    "Create bucket" "Create Account API token" "Object Read & Write"; do
    printf '%s\n' "$OUTPUT" | grep -q "$hint" || missing="$missing '$hint'"
  done
  if [ -n "$missing" ]; then
    fail "$name" "Missing explanations:$missing. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

test_guided_rechecks_after_dashboard_step() {
  local name="FR-00000: in guided mode, after Yes to a dashboard step, the script checks that item again"
  local config_calls
  setup
  write_credentials
  export FAKE_CF_HTTP="403"
  if ! script_ready; then
    fail "$name" "devops/onboarding.sh does not exist."
  else
    # Yes, the dashboard step is done; No, do not re-enter the values.
    run_guided 'y\nn\n'
    config_calls="$(grep -c -- '--config' "$CURL_ARGS_LOG" 2>/dev/null || true)"
    if [ "$STATUS" -eq 0 ]; then
      fail "$name" "The script accepted Yes as proof and exited 0."
    elif ! printf '%s\n' "$OUTPUT" | grep -q '^FAIL.*Cloudflare'; then
      fail "$name" "Expected Cloudflare to still fail. Output was:"$'\n'"$OUTPUT"
    elif [ "${config_calls:-0}" -lt 3 ]; then
      fail "$name" "Expected Cloudflare to be checked again after Yes (access checks run: ${config_calls:-0})."
    else
      pass "$name"
    fi
  fi
  teardown
}

test_guided_value_prompt_takes_the_value_directly() {
  local name="FR-00000: in guided mode, a value is typed straight at its prompt, and Enter skips it"
  local cred
  setup
  if ! script_ready; then
    fail "$name" "devops/onboarding.sh does not exist."
    teardown
    return
  fi
  # Yes to creating the file, the email typed directly, then Enter for the rest.
  run_guided "y\n$FAKE_EMAIL\n\n\n\n\n"
  cred="$HOME/.config/dungeon-destiny/cloudflare.env"
  if [ ! -f "$cred" ]; then
    fail "$name" "The credential file was not created. Output was:"$'\n'"$OUTPUT"
  elif ! grep -q '^export CLOUDFLARE_EMAIL=' "$cred"; then
    fail "$name" "The email typed at its prompt was not stored. Output was:"$'\n'"$OUTPUT"
  elif [ "$(grep -c '^export ' "$cred")" -ne 1 ]; then
    fail "$name" "Pressing Enter stored a value."
  elif ! printf '%s\n' "$OUTPUT" | grep -q '^FAIL.*AWS_SECRET_ACCESS_KEY'; then
    fail "$name" "A skipped value should still fail. Output was:"$'\n'"$OUTPUT"
  else
    pass "$name"
  fi
  teardown
}

# Answers for guided mode with no credential file: Yes to creating the file,
# then each of the five values typed at its prompt, in the script's order.
ENTER_ALL_VALUES="y\n$FAKE_EMAIL\n$FAKE_API_KEY\n$FAKE_ACCOUNT_ID\n$FAKE_ACCESS_KEY_ID\n$FAKE_SECRET\n"

echo "FR-00000 onboarding script tests"
echo

test_script_exists_and_is_executable
test_script_passes_shellcheck
test_passes_when_everything_is_ready
test_fails_when_terraform_is_missing
test_fails_when_terraform_is_too_old
test_fails_when_jq_is_missing
test_fails_when_curl_is_too_old
test_fails_when_shellcheck_is_missing
test_fails_when_git_is_missing
test_fails_when_credential_file_is_missing
test_fails_when_credential_file_is_readable_by_others
test_fails_when_a_required_value_is_missing
test_fails_when_cloudflare_rejects_credentials
test_fails_when_r2_rejects_credentials
test_output_never_contains_credentials
test_credentials_never_in_command_arguments
test_check_mode_never_prompts_or_changes
test_guided_no_answer_changes_nothing
test_guided_installs_only_after_yes
test_guided_stores_entered_values_safely
test_guided_explains_where_to_find_values
test_guided_value_prompt_takes_the_value_directly
test_guided_rechecks_after_dashboard_step

echo
echo "$passed passed, $failed failed, $blocked blocked"

if [ "$failed" -gt 0 ]; then
  exit 1
elif [ "$blocked" -gt 0 ]; then
  exit 2
fi
exit 0
