# Environment-specific provider configuration for impersonation

variable "terraform_service_account" {
  description = "The email of the Terraform Admin Service Account to impersonate."
  type        = string
}

provider "google" {
  alias               = "impersonated"
  scopes = [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/userinfo.email",
  ]
  impersonate_service_account = var.terraform_service_account
  # Project ID is set in the main.tf for this environment
}

provider "google-beta" {
  alias               = "impersonated"
   scopes = [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/userinfo.email",
  ]
  impersonate_service_account = var.terraform_service_account
  # Project ID is set in the main.tf for this environment
}
