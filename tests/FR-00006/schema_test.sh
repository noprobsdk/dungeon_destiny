#!/usr/bin/env bash
# FR-00006 tests that Player D1's migrations match apps/player/src/db/schema.ts
# (doc/08-technical/database-change-management.md).
#
# drizzle-kit compares the schema with a copy of the migrations in a temporary
# folder, so the real migrations are never changed. Needs the workspace
# dependencies (pnpm install); needs no credentials and no network.
#
# Usage: tests/FR-00006/schema_test.sh
# Exit status: 0 when every test passes, 1 when any test fails, 2 when no test
# fails but at least one is blocked.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PLAYER_DIR="$REPO_ROOT/apps/player"

passed=0
failed=0
blocked=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }
block() { blocked=$((blocked + 1)); echo "BLOCKED $1"; echo "        $2"; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

test_migrations_match_schema() {
  local name="FR-00006: Player D1's migrations match schema.ts"
  if ! command -v pnpm >/dev/null 2>&1 || [ ! -x "$PLAYER_DIR/node_modules/.bin/drizzle-kit" ]; then
    block "$name" "pnpm or drizzle-kit is missing; run pnpm install."
    return
  fi
  cp -R "$PLAYER_DIR/migrations" "$WORK/migrations"
  # drizzle-kit puts "./" in front of --out, so it must be a relative path.
  local out before after output
  out="$(realpath --relative-to="$PLAYER_DIR" "$WORK/migrations")"
  before="$(find "$WORK/migrations" -type f | sort)"
  output="$(cd "$PLAYER_DIR" && pnpm exec drizzle-kit generate --dialect sqlite --schema ./src/db/schema.ts --out "$out" 2>&1)"
  after="$(find "$WORK/migrations" -type f | sort)"
  if [ "$before" != "$after" ]; then
    fail "$name" "schema.ts has changes without a migration; generate one with drizzle-kit."
  elif ! printf '%s' "$output" | grep -q "No schema changes"; then
    # drizzle-kit can fail with exit status 0, so only its own answer counts.
    fail "$name" "drizzle-kit did not confirm the schema: $(printf '%s' "$output" | tail -1)"
  else
    pass "$name"
  fi
}

# FR-00006: proves the check above can fail: a schema with one more column
# must be reported as a change. Uses a copy of the schema next to the real one,
# removed afterwards.
test_drift_is_detected() {
  local name="FR-00006: the schema check reports a column that has no migration"
  if ! command -v pnpm >/dev/null 2>&1 || [ ! -x "$PLAYER_DIR/node_modules/.bin/drizzle-kit" ]; then
    block "$name" "pnpm or drizzle-kit is missing; run pnpm install."
    return
  fi
  local probe="$PLAYER_DIR/src/db/schema.drift-probe.ts"
  mkdir -p "$WORK/drift"
  cp -R "$PLAYER_DIR/migrations" "$WORK/drift/migrations"
  sed '0,/  createdAt: text("created_at").notNull(),/s//  createdAt: text("created_at").notNull(),\n  driftProbe: text("drift_probe"),/' \
    "$PLAYER_DIR/src/db/schema.ts" >"$probe"
  local out before after
  out="$(realpath --relative-to="$PLAYER_DIR" "$WORK/drift/migrations")"
  before="$(find "$WORK/drift/migrations" -type f | sort)"
  (cd "$PLAYER_DIR" && pnpm exec drizzle-kit generate --dialect sqlite --schema ./src/db/schema.drift-probe.ts --out "$out" >/dev/null 2>&1)
  rm -f "$probe"
  after="$(find "$WORK/drift/migrations" -type f | sort)"
  if [ "$before" = "$after" ]; then
    fail "$name" "drizzle-kit wrote no migration for the extra column."
  elif ! grep -rq "drift_probe" "$WORK/drift/migrations"; then
    fail "$name" "The new migration does not add the extra column."
  else
    pass "$name"
  fi
}

test_first_migration() {
  local name="FR-00006: the first Player D1 migration is 0000_accounts.sql and creates the three Account tables"
  local file="$PLAYER_DIR/migrations/0000_accounts.sql"
  if [ ! -f "$file" ]; then
    fail "$name" "No $file."
    return
  fi
  local table
  for table in accounts account_sign_ins refresh_tokens; do
    if ! grep -q "CREATE TABLE \`$table\`" "$file"; then
      fail "$name" "It does not create $table."
      return
    fi
  done
  pass "$name"
}

test_additive_only() {
  local name="FR-00006: Player D1's migrations only add; none drops or renames"
  if grep -Eiq 'DROP (TABLE|COLUMN|INDEX)|RENAME (TO|COLUMN)' "$PLAYER_DIR"/migrations/*.sql; then
    fail "$name" "A migration drops or renames something."
  else
    pass "$name"
  fi
}

test_migrations_match_schema
test_drift_is_detected
test_first_migration
test_additive_only

echo
echo "Passed: $passed  Failed: $failed  Blocked: $blocked"
if [ "$failed" -gt 0 ]; then exit 1; fi
if [ "$blocked" -gt 0 ]; then exit 2; fi
exit 0
