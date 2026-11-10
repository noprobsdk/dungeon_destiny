#!/usr/bin/env bash
# FR-00005: builds the game client's Android debug APK, and can install it on
# a connected phone.
#
# Steps: check the toolchain, make Godot's debug keystore if it is missing,
# point Godot's editor settings at the Android SDK, the JDK, and the keystore,
# run the client tests, then export the "Android (dev)" preset to
# apps/game-client/build/dungeon-destiny-dev.apk. The toolchain is installed by
# devops/onboarding.sh.
#
# Usage: devops/game-client/build-apk.sh [--skip-tests] [--install]
#   --skip-tests  export without running the client tests first
#   --install     install the APK on the one phone adb sees
# Environment: GODOT (Godot 4.6.3), JAVA_HOME (JDK 17), ANDROID_HOME (Android
# SDK, default ~/Android/Sdk), ADB (the adb to use). Without ADB, WSL uses
# Windows' adb.exe when Windows has one, because WSL cannot see USB devices;
# elsewhere the SDK's adb is used. A Windows adb.exe is given the APK's
# Windows path.
# Exit status: 0 on success, 1 when a step fails, 2 when the toolchain is
# missing.

set -u

readonly GODOT_VERSION="4.6.3"
readonly JDK_MAJOR="17"
readonly ANDROID_PLATFORM="android-36"
readonly BUILD_TOOLS="36.0.0"
readonly PRESET="Android (dev)"
# Godot's standard debug keystore and its well-known, public debug password.
readonly KEYSTORE="$HOME/.local/share/godot/keystores/debug.keystore"
readonly KEYSTORE_USER="androiddebugkey"
readonly KEYSTORE_SECRET="android"
readonly TEMPLATES="$HOME/.local/share/godot/export_templates/$GODOT_VERSION.stable"
readonly SETTINGS="$HOME/.config/godot/editor_settings-4.6.tres"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$script_dir/../.." && pwd)"
PROJECT="$REPO_ROOT/apps/game-client"
APK="$PROJECT/build/dungeon-destiny-dev.apk"

run_tests=true
install=false
for arg in "$@"; do
  case "$arg" in
    --skip-tests) run_tests=false ;;
    --install) install=true ;;
    *)
      echo "Usage: devops/game-client/build-apk.sh [--skip-tests] [--install]" >&2
      exit 2
      ;;
  esac
done

blocked() {
  echo "BLOCKED $1"
  echo "        Run devops/onboarding.sh to install the game-client toolchain."
  exit 2
}

# --- Toolchain ----------------------------------------------------------------

GODOT_BIN="${GODOT:-}"
if [ -z "$GODOT_BIN" ]; then
  if [ -x "$HOME/.local/bin/godot" ]; then GODOT_BIN="$HOME/.local/bin/godot"; else GODOT_BIN="$(command -v godot || true)"; fi
fi
if [ -z "$GODOT_BIN" ] || [ ! -x "$GODOT_BIN" ]; then blocked "Godot $GODOT_VERSION is not installed."; fi
godot_version="$("$GODOT_BIN" --headless --version 2>/dev/null | tail -n 1)"
case "$godot_version" in
  "$GODOT_VERSION".*) ;;
  *) blocked "Godot $GODOT_VERSION is required; $GODOT_BIN is ${godot_version:-unknown}." ;;
esac
[ -f "$TEMPLATES/android_debug.apk" ] || blocked "Godot's Android export templates for $GODOT_VERSION are not installed."

if [ -z "${JAVA_HOME:-}" ] && command -v javac >/dev/null 2>&1; then
  JAVA_HOME="$(dirname "$(dirname "$(readlink -f "$(command -v javac)")")")"
fi
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/javac" ]; then blocked "JDK $JDK_MAJOR is not installed."; fi
java_version="$("$JAVA_HOME/bin/javac" -version 2>&1 | awk '{print $2}')"
[ "${java_version%%.*}" = "$JDK_MAJOR" ] || blocked "JDK $JDK_MAJOR is required; $JAVA_HOME has ${java_version:-unknown}."
export JAVA_HOME

ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
for part in "platform-tools/adb" "build-tools/$BUILD_TOOLS/apksigner" "platforms/$ANDROID_PLATFORM"; do
  [ -e "$ANDROID_HOME/$part" ] || blocked "The Android SDK in $ANDROID_HOME is missing $part ($ANDROID_PLATFORM, build tools $BUILD_TOOLS)."
done
export ANDROID_HOME

# --- Debug keystore -----------------------------------------------------------

if [ ! -f "$KEYSTORE" ]; then
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -v -keystore "$KEYSTORE" -alias "$KEYSTORE_USER" \
    -storepass "$KEYSTORE_SECRET" -keypass "$KEYSTORE_SECRET" \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" >/dev/null 2>&1 \
    || { echo "FAIL    Could not create the debug keystore at $KEYSTORE."; exit 1; }
  echo "Created Godot's debug keystore at $KEYSTORE."
fi
export GODOT_ANDROID_KEYSTORE_DEBUG_PATH="$KEYSTORE"
export GODOT_ANDROID_KEYSTORE_DEBUG_USER="$KEYSTORE_USER"
export GODOT_ANDROID_KEYSTORE_DEBUG_PASSWORD="$KEYSTORE_SECRET"

# --- Godot editor settings ----------------------------------------------------

# Sets one editor setting, keeping every other line of the file.
set_editor_setting() {
  local key="$1" value="$2" tmp
  mkdir -p "$(dirname "$SETTINGS")"
  if [ ! -f "$SETTINGS" ]; then
    printf '[gd_resource type="EditorSettings" format=3]\n\n[resource]\n' >"$SETTINGS"
  fi
  tmp="$(mktemp)"
  awk -v key="$key" -v line="$key = \"$value\"" '
    index($0, key " = ") == 1 { next }
    { print }
    /^\[resource\]$/ { print line }
  ' "$SETTINGS" >"$tmp" && mv "$tmp" "$SETTINGS"
}

set_editor_setting "export/android/android_sdk_path" "$ANDROID_HOME"
set_editor_setting "export/android/java_sdk_path" "$JAVA_HOME"
set_editor_setting "export/android/debug_keystore" "$KEYSTORE"
set_editor_setting "export/android/debug_keystore_user" "$KEYSTORE_USER"
set_editor_setting "export/android/debug_keystore_pass" "$KEYSTORE_SECRET"

# --- Tests, import, export ----------------------------------------------------

export GODOT="$GODOT_BIN"
if [ "$run_tests" = true ]; then
  echo "Running the client tests…"
  "$REPO_ROOT/tests/FR-00005/client_test.sh" || { echo "FAIL    The client tests failed; no APK was built."; exit 1; }
fi

echo "Exporting $PRESET with Godot $godot_version…"
rm -f "$APK"
mkdir -p "$(dirname "$APK")"
"$GODOT_BIN" --headless --path "$PROJECT" --import >/dev/null 2>&1
"$GODOT_BIN" --headless --path "$PROJECT" --export-debug "$PRESET" "$APK"
if [ ! -s "$APK" ]; then
  echo "FAIL    Godot did not write the APK. Check the export output above."
  exit 1
fi
echo "Built $APK ($(du -h "$APK" | cut -f1))."

# --- Install ------------------------------------------------------------------

[ "$install" = true ] || exit 0
# WSL cannot see USB devices, but Windows' adb.exe can, so prefer it in WSL.
windows_adb() {
  [ -n "${WSL_DISTRO_NAME:-}" ] || return 1
  local path candidate
  if command -v cmd.exe >/dev/null 2>&1; then
    path="$(cmd.exe /c "where adb" 2>/dev/null | tr -d '\r' | head -n 1)"
    [ -n "$path" ] && { wslpath "$path"; return 0; }
  fi
  for candidate in /mnt/c/Users/*/AppData/Local/Android/platform-tools/adb.exe \
    /mnt/c/Users/*/AppData/Local/Android/Sdk/platform-tools/adb.exe /mnt/c/platform-tools/adb.exe; do
    [ -x "$candidate" ] && { echo "$candidate"; return 0; }
  done
  return 1
}
ADB_BIN="${ADB:-}"
if [ -z "$ADB_BIN" ]; then
  ADB_BIN="$(windows_adb || true)"
  [ -n "$ADB_BIN" ] && echo "Using Windows' adb: $ADB_BIN"
fi
ADB_BIN="${ADB_BIN:-$ANDROID_HOME/platform-tools/adb}"
devices="$("$ADB_BIN" devices 2>/dev/null | awk -F'\t' '$2 == "device"' | wc -l)"
if [ "$devices" -ne 1 ]; then
  echo "FAIL    adb sees $devices devices; connect exactly one with USB debugging on."
  if [ -n "${WSL_DISTRO_NAME:-}" ] && [[ "$ADB_BIN" != *.exe ]]; then
    echo "        WSL cannot see USB devices. Unpack Google's platform-tools for Windows into"
    echo "        %LOCALAPPDATA%\\Android\\platform-tools (see devops/README.md)."
  else
    echo "        Check the cable, turn on USB debugging, and allow this computer on the device."
  fi
  echo "        If the device asks \"Allow USB debugging?\", tap Allow and run this again."
  exit 1
fi
apk_arg="$APK"
case "$ADB_BIN" in
  *.exe) apk_arg="$(wslpath -w "$APK")" ;;
esac
"$ADB_BIN" install -r "$apk_arg" || { echo "FAIL    adb could not install the APK."; exit 1; }
echo "Installed on the phone."
