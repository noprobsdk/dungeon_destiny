# FR-00001: the Cloudflare account ID is not stored in the repository. It is
# read from TF_VAR_cloudflare_account_id, which is set from
# CLOUDFLARE_ACCOUNT_ID in the owner's credential file.
variable "cloudflare_account_id" {
  description = "Cloudflare account ID."
  type        = string
  sensitive   = true
}

# FR-00003: the Content Studio SuperAdmin's email address. The repository is
# public, so it is not stored here. It is read from
# TF_VAR_studio_superadmin_email, which is set from STUDIO_SUPERADMIN_EMAIL in
# the owner's credential file.
variable "studio_superadmin_email" {
  description = "Email address of the Content Studio SuperAdmin."
  type        = string
  sensitive   = true
}
