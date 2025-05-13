terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.6"
    }
  }
}

# Service Account for Cloud Run Service
resource "google_service_account" "service_account" {
  project      = var.project_id
  account_id   = var.service_account_id
  display_name = "Cloud Run Service Account for ${var.service_name}"
}

# Grant SA necessary roles (e.g., Firestore access) - This should be configured based on backend needs
# Example: Grant Firestore User role
resource "google_project_iam_member" "run_sa_firestore_user" {
  # This assumes the calling environment passes the correct provider alias
  # provider = google.impersonated (if called from environment main.tf)
  project = var.project_id
  role    = "roles/firestore.user"
  member  = "serviceAccount:${google_service_account.service_account.email}"
}
# Add other IAM bindings as needed by the backend

# Cloud Run Service Definition
resource "google_cloud_run_v2_service" "service" {
  # provider = google.impersonated (if called from environment main.tf)
  project  = var.project_id
  location = var.location
  name     = var.service_name

  template {
    service_account = google_service_account.service_account.email
    containers {
      image = var.container_image
      ports {
        container_port = var.container_port
      }
      env {
        # Convert map to the expected structure
        dynamic "vars" {
           for_each = var.env_vars
           content {
              name = vars.key
              value = vars.value
           }
        }
      }
      # Add resources (CPU, memory), startup probe, etc. here
    }
    # Add scaling, VPC access config here if needed
  }
  # Add traffic splitting if needed
}

# IAM policy for invocation (public or specific members)
data "google_iam_policy" "no_auth" {
  # provider = google.impersonated (if called from environment main.tf)
  count = var.allow_unauthenticated ? 1 : 0
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers", # Public access
    ]
  }
}

resource "google_cloud_run_v2_service_iam_policy" "no_auth_policy" {
  # provider = google.impersonated (if called from environment main.tf)
  count    = var.allow_unauthenticated ? 1 : 0
  project  = google_cloud_run_v2_service.service.project
  location = google_cloud_run_v2_service.service.location
  name     = google_cloud_run_v2_service.service.name
  policy_data = data.google_iam_policy.no_auth[0].policy_data
}

# If not allowing unauthenticated, you might grant invoker role to specific SAs or users
# data "google_iam_policy" "authenticated_invokers" { ... }
# resource "google_cloud_run_v2_service_iam_policy" "auth_policy" { ... }
