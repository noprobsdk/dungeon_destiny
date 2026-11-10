#!/usr/bin/env bash
# FR-00005: a small, local bridge that lets Claude test the game client on a
# connected Android device. Claude's shell cannot reach USB devices, so the
# project owner starts this in WSL; it watches a folder in the repository and
# runs a fixed set of adb actions requested there.
#
# Requests:  apps/game-client/build/device-bridge/requests/<id>.req  (one line)
# Responses: apps/game-client/build/device-bridge/responses/<id>.out (output
#            and "exit N"), plus <id>.png for a screenshot.
# The folder is under build/, so it is never committed.
#
# Allowed requests, and nothing else:
#   devices          list the connected devices
#   build            build the APK (devops/game-client/build-apk.sh --skip-tests)
#   install          install apps/game-client/build/dungeon-destiny-dev.apk
#   start | stop     start or stop the app (com.dungeondestiny.game.dev)
#   screenshot       save the screen as <id>.png
#   tap X Y          tap the screen at whole-number pixel coordinates
#   back             press the Back button
#   logcat           the app's log (Godot's output); logcat-clear clears it
#   size             the screen size
# The bridge never runs a request through a shell, and never uninstalls,
# deletes, or changes settings on the device.
#
# Usage: devops/game-client/device-bridge.sh [--once]
#   --once  process the waiting requests and exit (used by the tests)
# Stop it with Ctrl+C. ADB chooses the adb to use; in WSL, Windows' adb.exe
# is found automatically, because WSL cannot see USB devices.

set -u

readonly PACKAGE="com.dungeondestiny.game.dev"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$script_dir/../.." && pwd)"
APK="$REPO_ROOT/apps/game-client/build/dungeon-destiny-dev.apk"
BASE="$REPO_ROOT/apps/game-client/build/device-bridge"
REQUESTS="$BASE/requests"
RESPONSES="$BASE/responses"

once=false
case "${1:-}" in
  --once) once=true ;;
  "") ;;
  *) echo "Usage: devops/game-client/device-bridge.sh [--once]" >&2; exit 2 ;;
esac

# The adb to use: $ADB; in WSL, Windows' adb.exe on PATH or in its usual
# folders; otherwise the Android SDK's adb.
find_adb() {
  if [ -n "${ADB:-}" ]; then echo "$ADB"; return; fi
  if [ -n "${WSL_DISTRO_NAME:-}" ]; then
    local path candidate
    if command -v cmd.exe >/dev/null 2>&1; then
      path="$(cmd.exe /c "where adb" 2>/dev/null | tr -d '\r' | head -n 1)"
      [ -n "$path" ] && { wslpath "$path"; return; }
    fi
    for candidate in /mnt/c/Users/*/AppData/Local/Android/platform-tools/adb.exe \
      /mnt/c/Users/*/AppData/Local/Android/Sdk/platform-tools/adb.exe /mnt/c/platform-tools/adb.exe; do
      [ -x "$candidate" ] && { echo "$candidate"; return; }
    done
  fi
  echo "${ANDROID_HOME:-$HOME/Android/Sdk}/platform-tools/adb"
}
ADB_BIN="$(find_adb)"

# A path adb can read: Windows' adb.exe needs a Windows path.
adb_path() {
  case "$ADB_BIN" in *.exe) wslpath -w "$1" ;; *) echo "$1" ;; esac
}

is_int() { [[ "$1" =~ ^[0-9]{1,5}$ ]]; }

# Runs one request. Prints its output; returns 2 for a refused request.
handle() {
  local id="$1" line="$2" verb a b extra
  read -r verb a b extra <<<"$line"
  case "$verb" in
    devices) [ -z "${a:-}" ] || return 2; "$ADB_BIN" devices ;;
    build) [ -z "${a:-}" ] || return 2; "$REPO_ROOT/devops/game-client/build-apk.sh" --skip-tests ;;
    install)
      [ -z "${a:-}" ] || return 2
      [ -s "$APK" ] || { echo "No APK at $APK; request build first."; return 1; }
      "$ADB_BIN" install -r "$(adb_path "$APK")" ;;
    start) [ -z "${a:-}" ] || return 2; "$ADB_BIN" shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 ;;
    stop) [ -z "${a:-}" ] || return 2; "$ADB_BIN" shell am force-stop "$PACKAGE" ;;
    screenshot)
      [ -z "${a:-}" ] || return 2
      "$ADB_BIN" exec-out screencap -p >"$RESPONSES/$id.png" && echo "saved $id.png" ;;
    tap)
      is_int "${a:-}" && is_int "${b:-}" && [ -z "${extra:-}" ] || return 2
      "$ADB_BIN" shell input tap "$a" "$b" ;;
    back) [ -z "${a:-}" ] || return 2; "$ADB_BIN" shell input keyevent 4 ;;
    logcat) [ -z "${a:-}" ] || return 2; "$ADB_BIN" logcat -d -s godot:V | tail -n 300 ;;
    logcat-clear) [ -z "${a:-}" ] || return 2; "$ADB_BIN" logcat -c ;;
    size) [ -z "${a:-}" ] || return 2; "$ADB_BIN" shell wm size ;;
    *) return 2 ;;
  esac
}

process_requests() {
  local file id line output status
  for file in "$REQUESTS"/*.req; do
    [ -e "$file" ] || continue
    id="$(basename "$file" .req)"
    [[ "$id" =~ ^[A-Za-z0-9_-]{1,64}$ ]] || continue
    IFS= read -r line <"$file" || line=""
    rm -f "$file"
    # Only plain words, digits, and spaces: no shell characters at all.
    if [[ ! "$line" =~ ^[A-Za-z0-9\ -]*$ ]]; then
      status=2; output="refused: unsafe characters"
    else
      output="$(handle "$id" "$line" 2>&1)"; status=$?
      [ "$status" -eq 2 ] && output="refused: '$line' is not an allowed request"
    fi
    printf '%s\nexit %d\n' "$output" "$status" >"$RESPONSES/$id.tmp" && mv "$RESPONSES/$id.tmp" "$RESPONSES/$id.out"
    echo "$(date +%H:%M:%S) $id: $line -> exit $status"
  done
}

mkdir -p "$REQUESTS" "$RESPONSES"
if [ "$once" = true ]; then
  process_requests
  exit 0
fi
echo "Device bridge running with $ADB_BIN. Waiting for requests in $REQUESTS"
echo "Stop it with Ctrl+C."
"$ADB_BIN" devices
while true; do
  process_requests
  sleep 0.5
done
