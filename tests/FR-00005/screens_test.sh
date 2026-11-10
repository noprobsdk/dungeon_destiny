#!/usr/bin/env bash
# FR-00005 screen test: renders every loading-screen state at phone and tablet
# sizes under a virtual display (Xvfb), saves the screenshots, and fails when
# any visible text or button lies outside the window.
#
# Screenshots: apps/game-client/build/screens/<size>-<state>.png (not
# committed). Needs Godot 4.6 ($GODOT or godot on PATH) and xvfb-run.
#
# Usage: tests/FR-00005/screens_test.sh
# Exit status: 0 when every size passes, 1 when any fails, 2 when Godot or
# xvfb-run is not available.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT="$REPO_ROOT/apps/game-client"
OUT="$PROJECT/build/screens"
GODOT_BIN="${GODOT:-$(command -v godot || true)}"

# name width height: a 9:16 phone, a 9:20 phone, and a 3:4 tablet.
SIZES=("phone 720 1280" "phone-tall 720 1600" "tablet 1200 1600")

if [ -z "$GODOT_BIN" ] || [ ! -x "$GODOT_BIN" ]; then
  echo "BLOCKED FR-00005: screen test"; echo "        Godot is not installed."; exit 2
fi
if ! command -v xvfb-run >/dev/null 2>&1; then
  echo "BLOCKED FR-00005: screen test"; echo "        xvfb-run is not installed (sudo apt-get install -y xvfb)."; exit 2
fi

mkdir -p "$OUT"
rm -f "$OUT"/*.png
"$GODOT_BIN" --headless --path "$PROJECT" --import >/dev/null 2>&1
failed=0
for size in "${SIZES[@]}"; do
  read -r name width height <<<"$size"
  log="$(xvfb-run -a -s "-screen 0 2000x2000x24" "$GODOT_BIN" --audio-driver Dummy \
    --rendering-method gl_compatibility --rendering-driver opengl3 \
    --resolution "${width}x${height}" --path "$PROJECT" \
    -s res://tests/FR-00005/screens/capture_screens.gd -- "$OUT" "$name" 2>&1)"
  status=$?
  printf '%s\n' "$log" | grep -E '^(LAYOUT|FR-00005)'
  shots="$(find "$OUT" -name "$name-*.png" | wc -l)"
  if [ "$status" -eq 0 ] && [ "$shots" -eq 6 ]; then
    echo "PASS    FR-00005: $name ${width}x${height}: 6 states fit the window"
  else
    echo "FAIL    FR-00005: $name ${width}x${height} (exit $status, $shots screenshots)"
    failed=1
  fi
done
echo "Screenshots: $OUT"
[ "$failed" -eq 0 ]
