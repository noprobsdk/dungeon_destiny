# FR-00006: the player Worker and Player D1 (DD-017, DD-024). Terraform owns
# the Worker and the database; Wrangler uploads the Worker's code versions and
# applies the migrations. The subdomain settings must match
# apps/player/wrangler.jsonc. The gateway reaches player through the PLAYER
# service binding in apps/gateway/wrangler.jsonc.

# player has no public address; only gateway calls it.
resource "cloudflare_worker" "player" {
  account_id = var.cloudflare_account_id
  name       = "dd-dev-player"

  subdomain = {
    enabled          = false
    previews_enabled = false
  }

  # Set by Wrangler on every deploy; declared so Terraform does not undo them.
  tags = ["cf:environment=dev", "cf:service=player"]

  # Workers Logs, for player's error lines, which never contain Account data.
  # apps/player/wrangler.jsonc declares the same setting, so neither undoes
  # the other.
  observability = {
    enabled = true
  }
}

# Player D1, owned by player. EU jurisdiction keeps the Account data, which is
# personal data, inside the EU; it cannot be changed later.
resource "cloudflare_d1_database" "player" {
  account_id   = var.cloudflare_account_id
  name         = "dd-dev-player"
  jurisdiction = "eu"

  # Cloudflare's default, stated so Terraform matches what Cloudflare returns.
  read_replication = {
    mode = "disabled"
  }
}

# Not a secret; copied into apps/player/wrangler.jsonc after apply.
output "player_d1_id" {
  description = "ID of the dd-dev-player D1 database."
  value       = cloudflare_d1_database.player.id
}
