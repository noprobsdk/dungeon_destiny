#!/usr/bin/env bash
# FR-00005 tests for devops/game-client/build-apk.sh.
#
# The tests copy the script into a temporary fake repository, replace Godot,
# keytool, javac, and adb with stand-ins that only record their arguments, and
# use a temporary HOME. They need no network, no Android SDK, and no phone.
#
# Usage: tests/FR-00005/build_apk_test.sh
# Exit status: 0 when every test passes, 1 when any test fails.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_SCRIPT="$REPO_ROOT/devops/game-client/build-apk.sh"

passed=0
failed=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }

setup() {
  WORK="$(mktemp -d)"
  export HOME="$WORK/home"
  FAKEBIN="$WORK/fakebin"
  FAKE_REPO="$WORK/repo"
  LOG="$WORK/calls.log"
  export LOG
  mkdir -p "$HOME" "$FAKEBIN" "$FAKE_REPO/devops/game-client" "$FAKE_REPO/apps/game-client" "$FAKE_REPO/tests/FR-00005"
  cp "$SOURCE_SCRIPT" "$FAKE_REPO/devops/game-client/build-apk.sh"
  : >"$LOG"

  # The client tests: record that they ran, and pass unless told to fail.
  cat >"$FAKE_REPO/tests/FR-00005/client_test.sh" <<'STUB'
#!/usr/bin/env bash
echo "client_test GODOT=$GODOT" >>"$LOG"
[ "${FAKE_CLIENT_TESTS:-pass}" = pass ]
STUB

  # Godot: reports 4.6.3 (or $FAKE_GODOT_VERSION) and writes the exported APK.
  cat >"$FAKEBIN/godot" <<'STUB'
#!/usr/bin/env bash
echo "godot $*" >>"$LOG"
for arg in "$@"; do
  if [ "$arg" = "--version" ]; then echo "${FAKE_GODOT_VERSION:-4.6.3.stable.official.7d41c59c4}"; exit 0; fi
done
prev=""
for arg in "$@"; do
  if [ "$prev" = "--export-debug" ]; then preset="$arg"; fi
  prev="$arg"
done
if [ -n "${preset:-}" ] && [ "${FAKE_EXPORT:-ok}" = ok ]; then
  out="${*: -1}"
  mkdir -p "$(dirname "$out")"
  echo "apk" >"$out"
fi
exit 0
STUB

  cat >"$FAKEBIN/keytool" <<'STUB'
#!/usr/bin/env bash
echo "keytool $*" >>"$LOG"
prev=""
for arg in "$@"; do
  [ "$prev" = "-keystore" ] && { mkdir -p "$(dirname "$arg")"; echo "keystore" >"$arg"; }
  prev="$arg"
done
STUB

  cat >"$FAKEBIN/javac" <<'STUB'
#!/usr/bin/env bash
echo "javac ${FAKE_JAVA_VERSION:-17.0.12}" >&2
STUB

  cat >"$FAKEBIN/adb" <<'STUB'
#!/usr/bin/env bash
echo "adb $*" >>"$LOG"
if [ "$1" = "devices" ]; then
  echo "List of devices attached"
  for i in $(seq 1 "${FAKE_ADB_DEVICES:-1}"); do printf 'FAKE%03d\tdevice\n' "$i"; done
fi
STUB
  chmod +x "$FAKEBIN"/* "$FAKE_REPO/tests/FR-00005/client_test.sh"

  # A fake JDK, Android SDK, and export templates.
  export JAVA_HOME="$WORK/jdk"
  mkdir -p "$JAVA_HOME/bin"
  ln -s "$FAKEBIN/javac" "$JAVA_HOME/bin/javac"
  export ANDROID_HOME="$WORK/sdk"
  mkdir -p "$ANDROID_HOME/platform-tools" "$ANDROID_HOME/build-tools/36.0.0" "$ANDROID_HOME/platforms/android-36"
  ln -s "$FAKEBIN/adb" "$ANDROID_HOME/platform-tools/adb"
  touch "$ANDROID_HOME/build-tools/36.0.0/apksigner"
  chmod +x "$ANDROID_HOME/build-tools/36.0.0/apksigner"
  mkdir -p "$HOME/.local/share/godot/export_templates/4.6.3.stable"
  touch "$HOME/.local/share/godot/export_templates/4.6.3.stable/android_debug.apk"

  export GODOT="$FAKEBIN/godot"
  unset ADB FAKE_GODOT_VERSION FAKE_CLIENT_TESTS FAKE_EXPORT FAKE_ADB_DEVICES FAKE_JAVA_VERSION WSL_DISTRO_NAME
  export PATH="$FAKEBIN:/usr/bin:/bin"
}

teardown() { rm -rf "$WORK"; }

build() {
  OUTPUT="$(bash "$FAKE_REPO/devops/game-client/build-apk.sh" "$@" 2>&1)"
  STATUS=$?
}

APK_REL="apps/game-client/build/dungeon-destiny-dev.apk"
KEYSTORE_REL=".local/share/godot/keystores/debug.keystore"
SETTINGS_REL=".config/godot/editor_settings-4.6.tres"

# --- Tests --------------------------------------------------------------------

setup
name="FR-00005: build-apk runs the client tests, imports, and exports the Android (dev) preset"
build
if [ "$STATUS" -eq 0 ] && [ -s "$FAKE_REPO/$APK_REL" ] \
  && grep -q "^client_test GODOT=$FAKEBIN/godot" "$LOG" \
  && grep -q -- "--headless --path $FAKE_REPO/apps/game-client --import" "$LOG" \
  && grep -q -- "--export-debug Android (dev) $FAKE_REPO/$APK_REL" "$LOG"; then
  pass "$name"
else
  fail "$name" "status $STATUS; output: $OUTPUT; calls: $(cat "$LOG")"
fi
teardown

setup
name="FR-00005: build-apk creates Godot's debug keystore when it is missing"
build
if [ -s "$HOME/$KEYSTORE_REL" ] && grep -q "keytool -genkeypair" "$LOG" && grep -q "androiddebugkey" "$LOG"; then
  pass "$name"
else
  fail "$name" "calls: $(cat "$LOG")"
fi
teardown

setup
name="FR-00005: build-apk keeps an existing debug keystore"
mkdir -p "$(dirname "$HOME/$KEYSTORE_REL")"
echo "existing" >"$HOME/$KEYSTORE_REL"
build
if [ "$STATUS" -eq 0 ] && ! grep -q "keytool" "$LOG" && [ "$(cat "$HOME/$KEYSTORE_REL")" = "existing" ]; then
  pass "$name"
else
  fail "$name" "calls: $(cat "$LOG")"
fi
teardown

setup
name="FR-00005: build-apk points Godot's editor settings at the SDK, the JDK, and the debug keystore"
build
settings="$HOME/$SETTINGS_REL"
if grep -q "^export/android/android_sdk_path = \"$ANDROID_HOME\"" "$settings" \
  && grep -q "^export/android/java_sdk_path = \"$JAVA_HOME\"" "$settings" \
  && grep -q "^export/android/debug_keystore = \"$HOME/$KEYSTORE_REL\"" "$settings" \
  && grep -q '^\[resource\]' "$settings"; then
  pass "$name"
else
  fail "$name" "$(cat "$settings" 2>/dev/null)"
fi
teardown

setup
name="FR-00005: build-apk updates existing editor settings without losing other values"
mkdir -p "$HOME/.config/godot"
printf '[gd_resource type="EditorSettings" format=3]\n\n[resource]\ninterface/theme/preset = "Default"\nexport/android/android_sdk_path = "/old/sdk"\n' >"$HOME/$SETTINGS_REL"
build
settings="$HOME/$SETTINGS_REL"
if grep -q '^interface/theme/preset = "Default"' "$settings" \
  && grep -q "^export/android/android_sdk_path = \"$ANDROID_HOME\"" "$settings" \
  && [ "$(grep -c '^export/android/android_sdk_path' "$settings")" -eq 1 ] && ! grep -q "/old/sdk" "$settings"; then
  pass "$name"
else
  fail "$name" "$(cat "$settings")"
fi
teardown

setup
name="FR-00005: build-apk stops before exporting when the client tests fail"
export FAKE_CLIENT_TESTS=fail
build
if [ "$STATUS" -eq 1 ] && ! grep -q -- "--export-debug" "$LOG" && [ ! -e "$FAKE_REPO/$APK_REL" ]; then
  pass "$name"
else
  fail "$name" "status $STATUS; calls: $(cat "$LOG")"
fi
teardown

setup
name="FR-00005: build-apk --skip-tests exports without running the client tests"
build --skip-tests
if [ "$STATUS" -eq 0 ] && ! grep -q "client_test" "$LOG" && [ -s "$FAKE_REPO/$APK_REL" ]; then
  pass "$name"
else
  fail "$name" "status $STATUS; calls: $(cat "$LOG")"
fi
teardown

setup
name="FR-00005: build-apk is blocked when Godot is not version 4.6.3"
export FAKE_GODOT_VERSION="4.7.2.stable.official.abc"
build
if [ "$STATUS" -eq 2 ] && printf '%s' "$OUTPUT" | grep -q "4.6.3" && ! grep -q -- "--export-debug" "$LOG"; then
  pass "$name"
else
  fail "$name" "status $STATUS; output: $OUTPUT"
fi
teardown

setup
name="FR-00005: build-apk is blocked when the Android export templates are missing"
rm -rf "$HOME/.local/share/godot/export_templates"
build
if [ "$STATUS" -eq 2 ] && printf '%s' "$OUTPUT" | grep -qi "export templates" && printf '%s' "$OUTPUT" | grep -q "onboarding"; then
  pass "$name"
else
  fail "$name" "status $STATUS; output: $OUTPUT"
fi
teardown

setup
name="FR-00005: build-apk is blocked when the JDK is not version 17"
export FAKE_JAVA_VERSION="21.0.4"
build
if [ "$STATUS" -eq 2 ] && printf '%s' "$OUTPUT" | grep -q "17"; then
  pass "$name"
else
  fail "$name" "status $STATUS; output: $OUTPUT"
fi
teardown

setup
name="FR-00005: build-apk is blocked when an Android SDK component is missing"
rm -rf "$ANDROID_HOME/platforms/android-36"
build
if [ "$STATUS" -eq 2 ] && printf '%s' "$OUTPUT" | grep -q "android-36"; then
  pass "$name"
else
  fail "$name" "status $STATUS; output: $OUTPUT"
fi
teardown

setup
name="FR-00005: build-apk fails when Godot writes no APK"
export FAKE_EXPORT=none
build
if [ "$STATUS" -eq 1 ] && printf '%s' "$OUTPUT" | grep -qi "apk"; then
  pass "$name"
else
  fail "$name" "status $STATUS; output: $OUTPUT"
fi
teardown

setup
name="FR-00005: build-apk --install installs the APK on the one connected phone"
build --install
if [ "$STATUS" -eq 0 ] && grep -q "^adb devices" "$LOG" && grep -q "^adb install -r $FAKE_REPO/$APK_REL" "$LOG"; then
  pass "$name"
else
  fail "$name" "status $STATUS; calls: $(cat "$LOG")"
fi
teardown

setup
name="FR-00005: build-apk --install refuses when no phone, or more than one, is connected"
ok=true
for count in 0 2; do
  : >"$LOG"
  export FAKE_ADB_DEVICES="$count"
  build --install
  if [ "$STATUS" -ne 1 ] || grep -q "^adb install" "$LOG"; then ok=false; fi
done
if [ "$ok" = true ]; then pass "$name"; else fail "$name" "status $STATUS; calls: $(cat "$LOG")"; fi
teardown

setup
name="FR-00005: build-apk never prints the keystore password"
build --install
if ! printf '%s' "$OUTPUT" | grep -qi -- "storepass\|keypass\|password = "; then
  pass "$name"
else
  fail "$name" "$OUTPUT"
fi
teardown

setup
name="FR-00005: build-apk --install in WSL uses Windows' adb.exe, which can see USB devices"
# A stand-in Windows: cmd.exe finds adb.exe, and wslpath converts paths.
mkdir -p "$WORK/win"
cp "$FAKEBIN/adb" "$WORK/win/adb.exe"
sed -i 's/^echo "adb /echo "adb.exe /' "$WORK/win/adb.exe"
printf '#!/usr/bin/env bash\nprintf "C:\\\\platform-tools\\\\adb.exe\\r\\n"\n' >"$FAKEBIN/cmd.exe"
cat >"$FAKEBIN/wslpath" <<STUB
#!/usr/bin/env bash
if [ "\$1" = "-w" ]; then echo "C:\\\\repo\\\\dungeon-destiny-dev.apk"; else echo "$WORK/win/adb.exe"; fi
STUB
chmod +x "$FAKEBIN/cmd.exe" "$FAKEBIN/wslpath"
export WSL_DISTRO_NAME=Ubuntu
build --install
if [ "$STATUS" -eq 0 ] && grep -q "^adb.exe devices" "$LOG" && grep -q '^adb.exe install -r C:\\repo\\dungeon-destiny-dev.apk' "$LOG" \
  && ! grep -q "^adb " "$LOG"; then
  pass "$name"
else
  fail "$name" "status $STATUS; output: $OUTPUT; calls: $(cat "$LOG")"
fi
teardown

setup
name="FR-00005: build-apk --install outside WSL uses the Android SDK's adb"
printf '#!/usr/bin/env bash\necho "C:\\\\x\\\\adb.exe"\n' >"$FAKEBIN/cmd.exe"
chmod +x "$FAKEBIN/cmd.exe"
build --install
if [ "$STATUS" -eq 0 ] && grep -q "^adb install -r" "$LOG"; then
  pass "$name"
else
  fail "$name" "status $STATUS; calls: $(cat "$LOG")"
fi
teardown

echo
echo "FR-00005 build-apk tests: $passed passed, $failed failed"
[ "$failed" -eq 0 ]
