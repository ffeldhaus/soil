variable "project_id" { type = string }
variable "firebase_project_id" { type = string } # Usually same as project_id
variable "web_app_display_name" { type = string } # e.g., "Soil Game Web App (Dev)"

# Link GCP project to Firebase
resource "google_firebase_project" "default" {
  project = var.project_id
}

# Enable necessary APIs (example)
resource "google_project_service" "firebase_apis" {
  for_each = toset([
    "firebase.googleapis.com",
    "identitytoolkit.googleapis.com" # Firebase Auth
    # Add others like firestore.googleapis.com if not enabled elsewhere
  ])
  project                    = var.project_id
  service                    = each.key
  disable_dependency_handling = false
  disable_on_destroy         = false
  depends_on = [google_firebase_project.default]
}

# Create/Get the Firebase Web App
resource "google_firebase_web_app" "default" {
  project      = google_firebase_project.default.project
  display_name = var.web_app_display_name
  depends_on = [google_project_service.firebase_apis]
}

# Get the config for the web app
data "google_firebase_web_app_config" "default" {
  project     = google_firebase_web_app.default.project
  web_app_id  = google_firebase_web_app.default.app_id
}
