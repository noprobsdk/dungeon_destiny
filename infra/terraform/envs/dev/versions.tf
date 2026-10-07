# FR-00000: Terraform and provider versions, and the R2 state backend for dev.
#
# The R2 address (it contains the Cloudflare account ID) is not stored here.
# It is read from AWS_ENDPOINT_URL_S3, and the R2 access key pair from
# AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY. See doc/howto-cloudflare-setup.md.

terraform {
  required_version = ">= 1.11, < 2.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket       = "dd-terraform-state"
    key          = "dev/terraform.tfstate"
    region       = "auto"
    use_lockfile = true

    # R2 is S3-compatible but does not provide these AWS services.
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}
