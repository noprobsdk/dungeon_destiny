#!/usr/bin/env bash
# FR-00004: read-only queries against Content D1 (dd-dev-content).
#
# Runs a named query, or one SELECT statement, with Wrangler. It never writes:
# data is changed in Content Studio, and structure through numbered
# migrations (doc/08-technical/database-change-management.md). The named
# queries leave out email addresses, because the output is often shared.
#
# Usage, from anywhere in the repository:
#   source ~/.config/dungeon-destiny/cloudflare.env
#   devops/db/query.sh [--local] <query>
#
# Queries:
#   tables        the tables in the database
#   users         users with their status and roles (no email addresses)
#   roles         roles with their number of users and permissions
#   permissions   permissions with their area and the Feature Request that added them
#   audit         the 20 latest audit records (no email addresses)
#   migrations    the migrations not yet applied
#   sql "<SELECT ...>"  one SELECT statement
#
# By default the script reads dd-dev-content in Cloudflare and needs the
# credential file loaded; --local reads the local database used by the tests
# and by wrangler dev, and needs no credentials.
#
# Exit status: Wrangler's, 1 when the query is refused, or 2 for a usage error.

set -u

DATABASE="dd-dev-content"

usage() {
  sed -n 's/^# \{0,1\}//; /^Usage,/,/^Exit status/p' "${BASH_SOURCE[0]}" | sed '$d' >&2
}

refuse() {
  echo "$1" >&2
  exit 1
}

target="--remote"
if [ "${1:-}" = "--local" ]; then
  target="--local"
  shift
fi

query="${1:-}"
sql=""
case "$query" in
  tables)
    sql="SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name" ;;
  users)
    sql="SELECT u.display_name, u.status, COALESCE(GROUP_CONCAT(r.name, ', '), '') AS roles, u.updated_at FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id GROUP BY u.id ORDER BY u.display_name" ;;
  roles)
    sql="SELECT r.name, r.description, (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id) AS users, (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) AS permissions FROM roles r ORDER BY r.name" ;;
  permissions)
    sql="SELECT name, area, added_by, description FROM permissions ORDER BY area, name" ;;
  audit)
    sql="SELECT occurred_at, action, target_type, target_id, request_id FROM audit_events ORDER BY occurred_at DESC LIMIT 20" ;;
  migrations)
    ;;
  sql)
    statement="${2:-}"
    # Trim surrounding whitespace and one trailing semicolon.
    statement="${statement#"${statement%%[![:space:]]*}"}"
    statement="${statement%"${statement##*[![:space:]]}"}"
    statement="${statement%;}"
    statement="${statement%"${statement##*[![:space:]]}"}"
    only_one="Only one SELECT statement is allowed; this script never changes the database."
    [ -n "$statement" ] || refuse "No statement given. $only_one"
    case "$statement" in
      *";"*) refuse "More than one statement given. $only_one" ;;
    esac
    first_word="${statement%%[[:space:]]*}"
    [ "${first_word^^}" = "SELECT" ] || refuse "The statement is not a SELECT. $only_one"
    sql="$statement" ;;
  *)
    usage
    exit 2 ;;
esac

if [ "$target" = "--remote" ]; then
  if [ -z "${CLOUDFLARE_API_KEY:-}" ] || [ -z "${CLOUDFLARE_EMAIL:-}" ] || [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
    refuse "The Cloudflare credentials are not loaded. Load them first, or use --local:
  source ~/.config/dungeon-destiny/cloudflare.env"
  fi
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
cd "$repo_root/apps/studio-api" || exit 1

# Wrangler from PATH, then the workspace's own copy, so pnpm need not be on PATH.
if command -v wrangler >/dev/null 2>&1; then
  wrangler=(wrangler)
elif [ -x "$repo_root/apps/studio-api/node_modules/.bin/wrangler" ]; then
  wrangler=("$repo_root/apps/studio-api/node_modules/.bin/wrangler")
elif [ -x "$repo_root/node_modules/.bin/wrangler" ]; then
  wrangler=("$repo_root/node_modules/.bin/wrangler")
elif command -v pnpm >/dev/null 2>&1; then
  wrangler=(pnpm exec wrangler)
else
  refuse "Wrangler was not found. Install the dependencies first:
  pnpm install --frozen-lockfile"
fi

if [ "$query" = "migrations" ]; then
  exec "${wrangler[@]}" d1 migrations list "$DATABASE" "$target" --env dev
fi
exec "${wrangler[@]}" d1 execute "$DATABASE" "$target" --env dev --command "$sql"
