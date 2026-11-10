#!/usr/bin/env bash
# FR-00005: shows the last gateway log lines from Workers Logs.
#
# Reads the request log lines that dd-dev-gateway wrote in the last 3 days,
# through Cloudflare's Workers Observability query API, and prints the last
# ones, oldest first, as tab-separated columns. It only reads. It prints only
# the gateway's own log fields: never Cloudflare's metadata, such as IP
# addresses, and never the credentials.
#
# Usage, from anywhere in the repository:
#   source ~/.config/dungeon-destiny/cloudflare.env
#   devops/logs/tail.sh [-n lines]
#
# -n is the number of lines, a whole number from 1 to 100; the default is 10.
# Times are in UTC. For live lines, use wrangler tail (devops/README.md).
#
# Exit status: 0 on success, 1 when Cloudflare refuses the query, or 2 for a
# usage error or missing credentials.

set -u

WORKER="dd-dev-gateway"
API="https://api.cloudflare.com/client/v4"

usage() {
  sed -n 's/^# \{0,1\}//; /^Usage,/,/^Exit status/p' "${BASH_SOURCE[0]}" | sed '$d' >&2
}

count=10
if [ $# -gt 0 ]; then
  if [ "$1" != "-n" ] || [ $# -ne 2 ]; then
    usage
    exit 2
  fi
  count="$2"
fi
if ! [[ "$count" =~ ^[0-9]{1,3}$ ]] || [ "$count" -lt 1 ] || [ "$count" -gt 100 ]; then
  usage
  exit 2
fi

if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ] || [ -z "${CLOUDFLARE_EMAIL:-}" ] || [ -z "${CLOUDFLARE_API_KEY:-}" ]; then
  echo "Load the credentials first: source ~/.config/dungeon-destiny/cloudflare.env" >&2
  exit 2
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
chmod 700 "$work"

# The credentials go to curl in a file, not on its command line, so they do
# not show in the process list.
printf 'X-Auth-Email: %s\nX-Auth-Key: %s\nContent-Type: application/json\n' \
  "$CLOUDFLARE_EMAIL" "$CLOUDFLARE_API_KEY" >"$work/headers"

# Cloudflare's own invocation events count towards the limit too, so ask for
# four times as many events as lines.
now=$(($(date +%s) * 1000))
jq -n --arg worker "$WORKER" --argjson limit $((count * 4)) \
  --argjson from $((now - 3 * 24 * 3600 * 1000)) --argjson to "$now" '{
    queryId: "dd-gateway-log-tail",
    view: "events",
    limit: $limit,
    timeframe: {from: $from, to: $to},
    parameters: {filters: [{key: "$metadata.service", operation: "eq", type: "string", value: $worker}]}
  }' |
  curl -sS -X POST "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/observability/telemetry/query" \
    -H "@$work/headers" --data @- >"$work/answer.json"

if [ "$(jq -r '.success' "$work/answer.json" 2>/dev/null)" != "true" ]; then
  echo "Cloudflare refused the query: $(jq -r '[.errors[]?.message] | join("; ")' "$work/answer.json" 2>/dev/null)" >&2
  exit 1
fi

printf 'time (UTC)\tmethod\tpath\tstatus\tcode\tplatform\tbuild\tversionCheck\trequestId\n'
jq -r '.result.events.events // []
  | map(select(.source.event? == "request"))
  | sort_by(.timestamp)
  | .[]
  | [(.timestamp / 1000 | floor | strftime("%Y-%m-%d %H:%M:%S")), .source.method, .source.path,
     (.source.status | tostring), (.source.code // "-"), (.source.platform // "-"),
     (.source.build // "-" | tostring), (.source.versionCheck // "-"), .source.requestId]
  | @tsv' "$work/answer.json" | tail -n "$count"
