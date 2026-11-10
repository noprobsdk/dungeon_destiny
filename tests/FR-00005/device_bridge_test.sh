#!/usr/bin/env bash
# FR-00005 tests for devops/game-client/device-bridge.sh, run with --once and a
# stand-in adb. They need no phone and no network.
#
# Usage: tests/FR-00005/device_bridge_test.sh
# Exit status: 0 when every test passes, 1 when any test fails.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_SCRIPT="$REPO_ROOT/devops/game-client/device-bridge.sh"

passed=0
failed=0
pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }

setup() {
  WORK="$(mktemp -d)"
  FAKE_REPO="$WORK/repo"
  LOG="$WORK/adb.log"
  export LOG
  mkdir -p "$FAKE_REPO/devops/game-client" "$FAKE_REPO/apps/game-client/build"
  cp "$SOURCE_SCRIPT" "$FAKE_REPO/devops/game-client/device-bridge.sh"
  # shellcheck disable=SC2016  # $* and $LOG expand inside the generated script
  printf '#!/usr/bin/env bash\necho "build $*" >>"$LOG"\n' >"$FAKE_REPO/devops/game-client/build-apk.sh"
  chmod +x "$FAKE_REPO/devops/game-client/build-apk.sh"
  echo apk >"$FAKE_REPO/apps/game-client/build/dungeon-destiny-dev.apk"
  cat >"$WORK/adb" <<'STUB'
#!/usr/bin/env bash
echo "adb $*" >>"$LOG"
case "$*" in
  devices) printf 'List of devices attached\nTAB001\tdevice\n' ;;
  "exec-out screencap -p") printf '\x89PNG-fake' ;;
  "logcat -d"*) echo "I godot   : [loading] READY" ;;
  "shell wm size") echo "Physical size: 1600x2560" ;;
esac
STUB
  chmod +x "$WORK/adb"
  export ADB="$WORK/adb"
  REQ="$FAKE_REPO/apps/game-client/build/device-bridge/requests"
  RES="$FAKE_REPO/apps/game-client/build/device-bridge/responses"
  mkdir -p "$REQ"
  : >"$LOG"
}
teardown() { rm -rf "$WORK"; }
request() { printf '%s\n' "$2" >"$REQ/$1.req"; }
process() { bash "$FAKE_REPO/devops/game-client/device-bridge.sh" --once >/dev/null 2>&1; }

setup
name="FR-00005: the bridge installs the built APK and starts the app"
request r1 "install"; request r2 "start"
process
if grep -q "^adb install -r $FAKE_REPO/apps/game-client/build/dungeon-destiny-dev.apk" "$LOG" \
  && grep -q "^adb shell monkey -p com.dungeondestiny.game.dev -c android.intent.category.LAUNCHER 1" "$LOG" \
  && grep -q "^exit 0" "$RES/r1.out" && grep -q "^exit 0" "$RES/r2.out" && [ ! -e "$REQ/r1.req" ]; then
  pass "$name"
else
  fail "$name" "adb: $(cat "$LOG"); r1: $(cat "$RES/r1.out" 2>/dev/null)"
fi
teardown

setup
name="FR-00005: the bridge saves a screenshot as a PNG"
request shot1 "screenshot"
process
if [ -s "$RES/shot1.png" ] && grep -q "^exit 0" "$RES/shot1.out"; then pass "$name"; else fail "$name" "$(ls "$RES" 2>&1)"; fi
teardown

setup
name="FR-00005: the bridge taps at whole-number coordinates only"
request t1 "tap 540 1200"; request t2 "tap 5;rm -rf / 7"; request t3 "tap 1 2 3"
process
if grep -q "^adb shell input tap 540 1200$" "$LOG" && [ "$(grep -c "input tap" "$LOG")" -eq 1 ] \
  && grep -q "^exit 2" "$RES/t2.out" && grep -q "^exit 2" "$RES/t3.out"; then
  pass "$name"
else
  fail "$name" "adb: $(cat "$LOG")"
fi
teardown

setup
name="FR-00005: the bridge refuses unknown commands and never runs a shell"
request x1 "shell rm -rf /sdcard"; request x2 "uninstall com.example"; request x3 'devices; touch /tmp/fr5-pwned'
process
if [ ! -s "$LOG" ] && grep -q "^exit 2" "$RES/x1.out" && grep -q "^exit 2" "$RES/x2.out" && grep -q "^exit 2" "$RES/x3.out" \
  && [ ! -e /tmp/fr5-pwned ]; then
  pass "$name"
else
  fail "$name" "adb: $(cat "$LOG")"
fi
teardown

setup
name="FR-00005: the bridge ignores request files with unsafe names"
printf 'devices\n' >"$REQ/../evil name.req"
printf 'devices\n' >"$REQ/a b.req"
process
if [ ! -s "$LOG" ]; then pass "$name"; else fail "$name" "adb: $(cat "$LOG")"; fi
teardown

setup
name="FR-00005: the bridge reads the app log, builds, stops the app, and reports the screen size"
request l1 "logcat"; request b1 "build"; request s1 "stop"; request w1 "size"
process
if grep -q "READY" "$RES/l1.out" && grep -q "^build --skip-tests" "$LOG" \
  && grep -q "^adb shell am force-stop com.dungeondestiny.game.dev" "$LOG" && grep -q "1600x2560" "$RES/w1.out"; then
  pass "$name"
else
  fail "$name" "adb: $(cat "$LOG")"
fi
teardown

echo
echo "FR-00005 device bridge tests: $passed passed, $failed failed"
[ "$failed" -eq 0 ]
