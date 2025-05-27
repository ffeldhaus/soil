# Ensure the provider alias is passed if needed when calling the module
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.6"
    }
  }
}

resource "google_artifact_registry_repository" "repository" {
  project       = var.project_id
  location      = var.location
  repository_id = var.repository_id
  description   = "Docker repository for ${var.repository_id}"
  format        = "DOCKER"
}
