# Shared provider configuration. Specific environment configurations
# like the GCS backend and impersonation are handled within each
# environment's directory.

terraform {
  required_version = ">= 1.3" # Use a recent version

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.6" # Use a specific compatible version range
    }
    random = {
      source = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "google" {
  # Authentication is handled by gcloud CLI impersonation or CI/CD environment.
  # Project ID will be set within each environment's main.tf or via GOOGLE_PROJECT env var.
}