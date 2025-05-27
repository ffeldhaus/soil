terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.6"
    }
  }
}

resource "google_storage_bucket" "bucket" {
  # provider = google.impersonated (if called from environment main.tf)
  project                     = var.project_id
  name                        = var.bucket_name
  location                    = var.location
  force_destroy               = false # Set to true with caution in dev if needed
  uniform_bucket_level_access = true  # Recommended

  website {
    main_page_suffix = var.website_config.main_page_suffix
    not_found_page   = var.website_config.not_found_page
  }

  # Optional: CORS configuration if needed for direct API calls from frontend JS
  # cors {
  #   origin          = ["*"] # Or restrict to specific origins
  #   method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
  #   response_header = ["*"]
  #   max_age_seconds = 3600
  # }
}

# IAM binding for public access if configured
resource "google_storage_bucket_iam_member" "public_reader" {
  # provider = google.impersonated (if called from environment main.tf)
  count  = var.public ? 1 : 0
  bucket = google_storage_bucket.bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
