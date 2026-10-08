#!/usr/bin/env bash
# FR-00001 test: TypeScript type checking passes in strict mode.
#
# Needs Node.js, pnpm, and the installed project dependencies; it is recorded
# as blocked when they are missing. It needs no network or credentials.
#
# Usage: tests/FR-00001/typecheck_test.sh
# Exit status: 0 when it passes, 1 when it fails, 2 when it is blocked.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NAME="FR-00001: TypeScript type checking passes in strict mode"
PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"

if ! command -v pnpm >/dev/null 2>&1 || [ ! -f "$REPO_ROOT/node_modules/.modules.yaml" ]; then
  echo "BLOCKED $NAME"
  echo "        pnpm or the project dependencies are not installed (run devops/onboarding.sh)."
  exit 2
fi
if [ "$(jq -r '.compilerOptions.strict' "$REPO_ROOT/tsconfig.base.json")" != "true" ]; then
  echo "FAIL    $NAME"
  echo "        tsconfig.base.json does not enable strict mode."
  exit 1
fi
if output="$(cd "$REPO_ROOT" && pnpm run --silent typecheck 2>&1)"; then
  echo "PASS    $NAME"
  exit 0
fi
echo "FAIL    $NAME"
printf '%s\n' "$output" | sed 's/^/        /'
exit 1
