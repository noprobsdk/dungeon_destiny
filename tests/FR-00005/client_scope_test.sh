#!/usr/bin/env bash
# FR-00005 scope and secret checks for the Godot client. They read files only.
#
# - The client contains no image textures or imported 3D models, apart from
#   the GUT add-on's own files (DD-022: no 3D content in FR-00005).
# - No client file is a copy of a POC file (DD-020). Needs the POC folder,
#   given by $POC_DIR or found at /mnt/e/claude_poc_dungeon_run; blocked
#   otherwise.
# - No keystore, export credentials, or environment file is in the repository.
# - GUT is pinned to 9.6.1 and keeps its licence.
#
# Usage: tests/FR-00005/client_scope_test.sh
# Exit status: 0 when every test passes, 1 when any test fails, 2 when no test
# fails but at least one is blocked.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CLIENT="$REPO_ROOT/apps/game-client"

passed=0
failed=0
blocked=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }
block() { blocked=$((blocked + 1)); echo "BLOCKED $1"; echo "        $2"; }

# Client files that belong to the project, not to GUT or Godot's cache.
client_files() {
  find "$CLIENT" -type f -not -path "$CLIENT/addons/gut/*" -not -path "$CLIENT/.godot/*" -not -path "$CLIENT/build/*"
}

name="FR-00005: the client contains no image textures or 3D models"
found="$(client_files | grep -Ei '\.(png|jpe?g|webp|tga|exr|hdr|glb|gltf|fbx|obj|blend|dae)$' || true)"
if [ -z "$found" ]; then pass "$name"; else fail "$name" "$(printf '%s' "$found" | tr '\n' ' ')"; fi

name="FR-00005: no client file is a copy of a POC file"
poc="${POC_DIR:-/mnt/e/claude_poc_dungeon_run}"
if [ ! -d "$poc" ]; then
  block "$name" "The POC folder $poc is not available. Set POC_DIR to check."
else
  poc_hashes="$(find "$poc" -type f -not -path '*/.git/*' -not -path '*/node_modules/*' -not -path '*/.godot/*' -size -5M -print0 2>/dev/null \
    | xargs -0 sha256sum 2>/dev/null | awk '{print $1}' | sort -u)"
  copies=""
  while IFS= read -r file; do
    [ -s "$file" ] || continue
    hash="$(sha256sum "$file" | awk '{print $1}')"
    if printf '%s\n' "$poc_hashes" | grep -qx "$hash"; then copies="$copies ${file#"$REPO_ROOT"/}"; fi
  done < <(client_files)
  if [ -z "$copies" ]; then pass "$name"; else fail "$name" "Copied from the POC:$copies"; fi
fi

name="FR-00005: no keystore, export credentials, or environment file is in the repository"
secrets="$( { git -C "$REPO_ROOT" ls-files; git -C "$REPO_ROOT" ls-files --others --exclude-standard; } \
  | grep -Ei '(\.keystore|\.jks|export_credentials\.cfg|(^|/)\.env(\.|$))' | grep -v '\.env\.example$' || true)"
if [ -z "$secrets" ]; then pass "$name"; else fail "$name" "$secrets"; fi

name="FR-00005: GUT is pinned to 9.6.1 and keeps its licence"
if grep -q '^version="9.6.1"' "$CLIENT/addons/gut/plugin.cfg" 2>/dev/null && [ -s "$CLIENT/addons/gut/LICENSE.md" ]; then
  pass "$name"
else
  fail "$name" "addons/gut/plugin.cfg is not version 9.6.1, or LICENSE.md is missing."
fi

echo
echo "FR-00005 client scope tests: $passed passed, $failed failed, $blocked blocked"
[ "$failed" -gt 0 ] && exit 1
[ "$blocked" -gt 0 ] && exit 2
exit 0
