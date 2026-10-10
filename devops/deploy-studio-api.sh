#!/usr/bin/env bash
# FR-00003: deploys the studio-api Worker to dd-dev-studio-api with a
# dev-YYYYMMDD-HHMMSS tag, passing the Content Studio SuperAdmin email address
# as the SUPERADMIN_EMAIL variable. The address is kept only in the owner's
# credential file, because the repository is public, so it is read from
# STUDIO_SUPERADMIN_EMAIL and masked in Wrangler's output.
#
# Usage, from the repository root:
#   source ~/.config/dungeon-destiny/cloudflare.env
#   pnpm --filter @dungeon-destiny/studio-api run deploy:dev
# FR-00004: the Cloudflare account ID, which studio-api needs to update the
# Access group, is passed the same way as CF_ACCOUNT_ID and masked too.
#
# Exit status: Wrangler's, or 1 when STUDIO_SUPERADMIN_EMAIL or
# CLOUDFLARE_ACCOUNT_ID is not set.

set -u

if [ -z "${STUDIO_SUPERADMIN_EMAIL:-}" ]; then
  echo "STUDIO_SUPERADMIN_EMAIL is not set. Load the credential file first:" >&2
  echo "  source ~/.config/dungeon-destiny/cloudflare.env" >&2
  echo "Without it, nobody could sign in to Content Studio, so nothing was deployed." >&2
  exit 1
fi

if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  echo "CLOUDFLARE_ACCOUNT_ID is not set. Load the credential file first:" >&2
  echo "  source ~/.config/dungeon-destiny/cloudflare.env" >&2
  echo "Without it, studio-api could not keep Cloudflare Access in step, so nothing was deployed." >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$script_dir/../apps/studio-api" || exit 1

tag="dev-$(date -u +%Y%m%d-%H%M%S)"
wrangler deploy --env dev --tag "$tag" \
  --var "SUPERADMIN_EMAIL:$STUDIO_SUPERADMIN_EMAIL" \
  --var "CF_ACCOUNT_ID:$CLOUDFLARE_ACCOUNT_ID" 2>&1 |
  while IFS= read -r line; do
    line="${line//"$STUDIO_SUPERADMIN_EMAIL"/***}"
    printf '%s\n' "${line//"$CLOUDFLARE_ACCOUNT_ID"/***}"
  done
exit "${PIPESTATUS[0]}"
