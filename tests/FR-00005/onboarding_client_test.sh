#!/usr/bin/env bash
# FR-00005 tests for the onboarding script's game-client checks: Godot 4.6.3,
# its Android export templates, JDK 17, and the Android SDK.
#
# The tests copy devops/onboarding.sh into a temporary fake repository,
# replace external programs with stand-ins, and use a temporary HOME. They
# need no network and install nothing.
#
# Usage: tests/FR-00005/onboarding_client_test.sh
# Exit status: 0 when every test passes, 1 when any test fails.

set -u

unset CLOUDFLARE_EMAIL CLOUDFLARE_API_KEY CLOUDFLARE_ACCOUNT_ID AWS_ACCESS_KEY_ID \
  AWS_SECRET_ACCESS_KEY STUDIO_SUPERADMIN_EMAIL AWS_ENDPOINT_URL_S3 JAVA_HOME ANDROID_HOME GODOT

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_SCRIPT="$REPO_ROOT/devops/onboarding.sh"

passed=0
failed=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }

setup() {
  WORK="$(mktemp -d)"
  export HOME="$WORK/home"
  FAKEBIN="$WORK/fakebin"
  SYSBIN="$WORK/sysbin"
  FAKE_REPO="$WORK/repo"
  CALLS="$WORK/calls.log"
  export CALLS
  mkdir -p "$HOME" "$FAKEBIN" "$SYSBIN" "$FAKE_REPO/devops"
  cp "$SOURCE_SCRIPT" "$FAKE_REPO/devops/onboarding.sh"
  : >"$CALLS"
  local tool
  for tool in bash env cat stat grep sed sort head tail cut tr awk cp mkdir chmod mktemp mv rm ln dirname readlink basename; do
    command -v "$tool" >/dev/null 2>&1 && ln -s "$(command -v "$tool")" "$SYSBIN/$tool"
  done
  # Programs that must not run unless the owner answers Yes.
  for tool in curl sudo sdkmanager unzip sha512sum; do
    # The stand-in expands $* and $CALLS when it runs, not here.
    # shellcheck disable=SC2016
    printf '#!/usr/bin/env bash\necho "%s $*" >>"$CALLS"\nexit 1\n' "$tool" >"$FAKEBIN/$tool"
  done
  chmod +x "$FAKEBIN"/*
}

teardown() { rm -rf "$WORK"; }

# Installs a working fake toolchain in the temporary HOME.
install_fake_toolchain() {
  mkdir -p "$HOME/.local/bin"
  printf '#!/usr/bin/env bash\necho "%s"\n' "${1:-4.6.3.stable.official.7d41c59c4}" >"$HOME/.local/bin/godot"
  chmod +x "$HOME/.local/bin/godot"
  mkdir -p "$HOME/.local/share/godot/export_templates/4.6.3.stable"
  touch "$HOME/.local/share/godot/export_templates/4.6.3.stable/android_debug.apk"
  mkdir -p "$WORK/jdk/bin"
  printf '#!/usr/bin/env bash\necho "javac %s" >&2\n' "${2:-17.0.12}" >"$WORK/jdk/bin/javac"
  chmod +x "$WORK/jdk/bin/javac"
  ln -s "$WORK/jdk/bin/javac" "$FAKEBIN/javac"
  local sdk="$HOME/Android/Sdk"
  mkdir -p "$sdk/platform-tools" "$sdk/build-tools/36.0.0" "$sdk/platforms/android-36"
  touch "$sdk/platform-tools/adb" "$sdk/build-tools/36.0.0/apksigner"
}

run_check() {
  OUTPUT="$(cd "$FAKE_REPO" && PATH="$FAKEBIN:$SYSBIN" "$SYSBIN/bash" devops/onboarding.sh --check </dev/null 2>&1)"
}

run_guided_no() {
  OUTPUT="$(cd "$FAKE_REPO" && yes '' 2>/dev/null | head -n 200 | PATH="$FAKEBIN:$SYSBIN" "$SYSBIN/bash" devops/onboarding.sh --guided 2>&1)"
}

line() { printf '%s\n' "$OUTPUT" | grep -E "^(PASS|FAIL|SKIP)  .*$1" | head -n 1; }

# --- Tests --------------------------------------------------------------------

setup
install_fake_toolchain
run_check
name="FR-00005: onboarding passes a complete game-client toolchain"
if line "Godot 4.6.3 is installed" | grep -q '^PASS' \
  && line "Android export templates" | grep -q '^PASS' \
  && line "JDK 17" | grep -q '^PASS' \
  && line "Android SDK" | grep -q '^PASS'; then
  pass "$name"
else
  fail "$name" "$(printf '%s\n' "$OUTPUT" | grep -Ei 'godot|template|jdk|android')"
fi
teardown

setup
run_check
name="FR-00005: onboarding fails each missing game-client tool with a hint"
if line "Godot" | grep -q '^FAIL' && line "export templates" | grep -q '^FAIL' \
  && line "JDK" | grep -q '^FAIL' && line "Android SDK" | grep -q '^FAIL' \
  && printf '%s\n' "$OUTPUT" | grep -q "Fix: .*devops/onboarding.sh\|Fix: .*sdkmanager\|Fix: .*openjdk-17"; then
  pass "$name"
else
  fail "$name" "$(printf '%s\n' "$OUTPUT" | grep -Ei -A1 'godot|template|jdk|android')"
fi
teardown

setup
install_fake_toolchain "4.7.2.stable.official.abc"
run_check
name="FR-00005: onboarding fails a Godot version other than 4.6.3"
if line "Godot" | grep -q '^FAIL' && line "Godot" | grep -q "4.7.2"; then
  pass "$name"
else
  fail "$name" "$(line Godot)"
fi
teardown

setup
install_fake_toolchain "" "21.0.4"
run_check
name="FR-00005: onboarding fails a JDK other than 17"
if line "JDK" | grep -q '^FAIL'; then pass "$name"; else fail "$name" "$(line JDK)"; fi
teardown

setup
install_fake_toolchain
rm -rf "$HOME/Android/Sdk/build-tools"
run_check
name="FR-00005: onboarding fails an Android SDK without build tools 36.0.0"
if line "Android SDK" | grep -q '^FAIL' && line "Android SDK" | grep -q "36.0.0"; then
  pass "$name"
else
  fail "$name" "$(line 'Android SDK')"
fi
teardown

setup
run_guided_no
name="FR-00005: guided onboarding downloads and installs nothing for the game client when every answer is No"
if ! grep -Eq "^curl .*(godot|Godot)|^sudo .*openjdk|^sdkmanager|^unzip" "$CALLS" \
  && printf '%s\n' "$OUTPUT" | grep -q "1.26 GB\|1.2 GB"; then
  pass "$name"
else
  fail "$name" "calls: $(cat "$CALLS")"
fi
teardown

echo
echo "FR-00005 onboarding tests: $passed passed, $failed failed"
[ "$failed" -eq 0 ]
