# ... (Existing locals, project, apis, iam, firebase, firestore) ...

# --- Artifact Registry ---
module "artifact_registry" {
  source = "../../modules/artifact-registry"
  providers = {
    google = google.impersonated # Pass the impersonated provider
  }
  project_id    = google_project.project.project_id
  location      = var.region
  repository_id = "soil-game-${local.env}-repo" # Unique repo ID
  depends_on = [google_project_service.apis]
}

# --- Cloud Run Service (Backend) ---
module "backend_service" {
  source = "../../modules/cloud-run"
   providers = {
     google = google.impersonated # Pass the impersonated provider
   }
  project_id           = google_project.project.project_id
  location             = var.region
  service_name         = "soil-backend-${local.env}"
  service_account_id   = "sa-soil-backend-${local.env}"
  container_image      = "placeholder-image" # Will be updated by Cloud Build
  container_port       = 8000
  allow_unauthenticated = true # Adjust as needed
  # Example Env Vars - Fetch sensitive values from Secret Manager or pass directly
  env_vars = {
    # FIRESTORE_DATABASE = "(default)" # Example
    # OTHER_CONFIG = "value"
    # If secrets are needed at runtime, use Cloud Run's secret mounting feature
  }
  depends_on = [
    google_project_service.apis,
    module.artifact_registry # Ensure repo exists (though image comes later)
    # Add dependency on Firestore if backend needs it immediately
    google_firestore_database.database
  ]
}

# --- GCS Bucket (Frontend) ---
module "frontend_bucket" {
  source = "../../modules/gcs-bucket"
  providers = {
    google = google.impersonated # Pass the impersonated provider
  }
  project_id  = google_project.project.project_id
  bucket_name = "soil-frontend-${local.env}-${google_project.project.project_id}" # Globally unique
  location    = var.region # Or specific location like US
  public      = true # If using LB, public access might not be strictly needed on bucket directly
  website_config = {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }
  depends_on = [google_project_service.apis]
}

# --- Load Balancer ---
module "load_balancer" {
  source = "../../modules/load-balancer"
  providers = {
    google = google.impersonated
    google-beta = google-beta.impersonated
  }
  project_id                  = google_project.project.project_id
  name_prefix                 = "soil-${local.env}-lb"
  # domain_name               = "dev.soil.example.com" # Set in tfvars if using custom domain
  frontend_bucket_name        = module.frontend_bucket.bucket_name
  backend_cr_service_name     = module.backend_service.service_name
  backend_cr_service_location = var.region
  depends_on = [
     module.frontend_bucket,
     module.backend_service
  ]
}

# --- Secrets for CI/CD ---
# Store Firebase config and the *Load Balancer IP* or *Domain Name* as the API URL
locals {
    # Determine the API URL based on LB config (use IP if no domain)
    # Note: Cloud Run URL (module.backend_service.service_url) is usually not directly exposed
    frontend_api_base_url = module.load_balancer.load_balancer_ip_address # Or use var.domain_name if set
    frontend_api_url = "https://${local.frontend_api_base_url}/api/v1" # Assuming LB handles HTTPS
}

module "secret_firebase_api_key" {
  source        = "../../modules/secret-manager"
  providers = { google = google.impersonated }
  project_id    = google_project.project.project_id
  secret_id     = "firebase-api-key-${local.env}"
  secret_value  = module.firebase.api_key
  depends_on = [module.firebase]
}
module "secret_firebase_auth_domain" {
   source        = "../../modules/secret-manager"
   providers = { google = google.impersonated }
   project_id    = google_project.project.project_id
   secret_id     = "firebase-auth-domain-${local.env}"
   secret_value  = module.firebase.auth_domain
   depends_on = [module.firebase]
}
module "secret_firebase_project_id" {
   source        = "../../modules/secret-manager"
   providers = { google = google.impersonated }
   project_id    = google_project.project.project_id
   secret_id     = "firebase-project-id-${local.env}"
   secret_value  = module.firebase.project_id
   depends_on = [module.firebase]
}
 module "secret_firebase_storage_bucket" {
   source        = "../../modules/secret-manager"
   providers = { google = google.impersonated }
   project_id    = google_project.project.project_id
   secret_id     = "firebase-storage-bucket-${local.env}"
   secret_value  = module.firebase.storage_bucket
   depends_on = [module.firebase]
}
 module "secret_firebase_messaging_id" {
   source        = "../../modules/secret-manager"
   providers = { google = google.impersonated }
   project_id    = google_project.project.project_id
   secret_id     = "firebase-messaging-id-${local.env}"
   secret_value  = module.firebase.messaging_sender_id
   depends_on = [module.firebase]
}
 module "secret_firebase_app_id" {
   source        = "../../modules/secret-manager"
   providers = { google = google.impersonated }
   project_id    = google_project.project.project_id
   secret_id     = "firebase-app-id-${local.env}"
   secret_value  = module.firebase.app_id
   depends_on = [module.firebase]
}
 module "secret_firebase_measurement_id" {
   source        = "../../modules/secret-manager"
   providers = { google = google.impersonated }
   project_id    = google_project.project.project_id
   secret_id     = "firebase-measurement-id-${local.env}"
   secret_value  = module.firebase.measurement_id != "" ? module.firebase.measurement_id : "DISABLED" # Handle potential empty value
   depends_on = [module.firebase]
}

module "secret_api_url" {
  source        = "../../modules/secret-manager"
  providers = { google = google.impersonated }
  project_id    = google_project.project.project_id
  secret_id     = "frontend-api-url-${local.env}"
  secret_value  = local.frontend_api_url
   depends_on = [module.load_balancer]
}

# --- Update Outputs ---
# ... (existing project_id, project_number, cloud_build_service_account) ...

output "backend_cloud_run_service_name" {
  value = module.backend_service.service_name
}
 output "frontend_gcs_bucket_name" {
  value = module.frontend_bucket.bucket_name
}
output "load_balancer_ip" {
    value = module.load_balancer.load_balancer_ip_address
}
output "deployed_frontend_api_url_secret" {
    description = "API URL stored in Secret Manager for frontend CI/CD."
    value = local.frontend_api_url
}
output "firebase_web_app_config" {
    description = "Firebase Web App Configuration details."
    value = module.firebase # Output all firebase details
    sensitive = true
}
