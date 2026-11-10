#!/usr/bin/env bash
# FR-00005: runs the Godot client's GUT tests headless.
#
# Uses the Godot 4.6 binary named by $GODOT, or `godot` on PATH. The project is
# imported first, so Godot knows every class_name before the tests load.
#
# Usage: tests/FR-00005/client_test.sh
# Exit status: 0 when every test passes, 1 when any test fails, 2 when Godot is
# not available.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT="$REPO_ROOT/apps/game-client"
GODOT_BIN="${GODOT:-$(command -v godot || true)}"

if [ -z "$GODOT_BIN" ] || [ ! -x "$GODOT_BIN" ]; then
  echo "BLOCKED FR-00005: Godot client tests"
  echo "        Godot is not installed. Set GODOT or put godot on PATH (see devops/README.md)."
  exit 2
fi

case "$("$GODOT_BIN" --headless --version 2>/dev/null)" in
  4.6.*) ;;
  *)
    echo "BLOCKED FR-00005: Godot client tests"
    echo "        $GODOT_BIN is not Godot 4.6."
    exit 2
    ;;
esac

"$GODOT_BIN" --headless --path "$PROJECT" --import >/dev/null 2>&1
"$GODOT_BIN" --headless --path "$PROJECT" -s addons/gut/gut_cmdln.gd -gconfig=res://.gutconfig.json
