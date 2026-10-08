# FR-00001: the Cloudflare account ID is not stored in the repository. It is
# read from TF_VAR_cloudflare_account_id, which is set from
# CLOUDFLARE_ACCOUNT_ID in the owner's credential file.
variable "cloudflare_account_id" {
  description = "Cloudflare account ID."
  type        = string
  sensitive   = true
}
