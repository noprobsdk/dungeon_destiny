# FR-00003: Content Studio's Workers and the Cloudflare Access setup in front
# of it (DD-017, DD-020). Terraform owns the Workers and Access; Wrangler
# uploads the Workers' code versions. The subdomain settings must match
# apps/studio-api/wrangler.jsonc and apps/studio-web/wrangler.jsonc.

# studio-api has no public address; studio-web reaches it through a service
# binding.
resource "cloudflare_worker" "studio_api" {
  account_id = var.cloudflare_account_id
  name       = "dd-dev-studio-api"

  subdomain = {
    enabled          = false
    previews_enabled = false
  }

  # Set by Wrangler on every deploy; declared so Terraform does not undo them.
  tags = ["cf:environment=dev", "cf:service=studio-api"]
}

resource "cloudflare_worker" "studio_web" {
  account_id = var.cloudflare_account_id
  name       = "dd-dev-studio-web"

  subdomain = {
    enabled          = true
    previews_enabled = false
  }

  # Set by Wrangler on every deploy; declared so Terraform does not undo them.
  tags = ["cf:environment=dev", "cf:service=studio-web"]
}

# Staff sign in with a one-time PIN sent by email.
resource "cloudflare_zero_trust_access_identity_provider" "one_time_pin" {
  account_id = var.cloudflare_account_id
  name       = "One-time PIN"
  type       = "onetimepin"
  config     = {}
}

resource "cloudflare_zero_trust_access_application" "studio_web" {
  account_id                = var.cloudflare_account_id
  name                      = "Content Studio (dev)"
  type                      = "self_hosted"
  domain                    = "dd-dev-studio-web.hj-d8e.workers.dev"
  session_duration          = "24h"
  allowed_idps              = [cloudflare_zero_trust_access_identity_provider.one_time_pin.id]
  auto_redirect_to_identity = true

  # Until the staff-users Feature Request, only the SuperAdmin may request a
  # PIN. The policy is defined here, exclusive to this application, because
  # the separate reusable-policy resource shows a change on every plan.
  policies = [
    {
      name       = "Content Studio SuperAdmin"
      decision   = "allow"
      precedence = 1
      include    = [{ email = { email = var.studio_superadmin_email } }]
    },
  ]
}

# The AUD tag studio-web checks tokens against. Not a secret: it is in every
# Access token. Copied into apps/studio-web/wrangler.jsonc after apply.
output "studio_web_access_aud" {
  description = "Audience (AUD) tag of the Content Studio Access application."
  value       = cloudflare_zero_trust_access_application.studio_web.aud
}
