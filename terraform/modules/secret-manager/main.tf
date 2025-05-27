variable "project_id" { type = string }
variable "secret_id" { type = string }
variable "secret_value" {
  type      = string
  sensitive = true
}
variable "region" { type = string } # Optional, for replication

resource "google_secret_manager_secret" "secret" {
  project = var.project_id
  secret_id = var.secret_id

  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "secret_version" {
  secret      = google_secret_manager_secret.secret.id
  secret_data = var.secret_value
}

# Grant Cloud Build service account access (replace account ID)
data "google_iam_policy" "secret_accessor" {
   binding {
     role = "roles/secretmanager.secretAccessor"
     members = [
       "serviceAccount:YOUR_PROJECT_NUMBER@cloudbuild.gserviceaccount.com" # CHANGE
     ]
   }
}

resource "google_secret_manager_secret_iam_policy" "policy" {
  project   = google_secret_manager_secret.secret.project
  secret_id = google_secret_manager_secret.secret.secret_id
  policy_data = data.google_iam_policy.secret_accessor.policy_data
}
