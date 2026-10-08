# FR-00001: the gateway Worker (DD-017). Terraform owns the Worker and its
# workers.dev address; Wrangler uploads its code versions. The subdomain
# settings must match apps/gateway/wrangler.jsonc (workers_dev, preview_urls).
resource "cloudflare_worker" "gateway" {
  account_id = var.cloudflare_account_id
  name       = "dd-dev-gateway"

  subdomain = {
    enabled          = true
    previews_enabled = false
  }

  # Wrangler sets these tags on every deploy, from the environment name and
  # the top-level Worker name in apps/gateway/wrangler.jsonc. Declaring them
  # here keeps Terraform and Wrangler from undoing each other.
  tags = ["cf:environment=dev", "cf:service=gateway"]
}
