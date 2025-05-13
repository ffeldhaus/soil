terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.6"
    }
     google-beta = { # Needed for serverless NEG
       source  = "hashicorp/google-beta"
       version = "~> 5.6"
     }
  }
}

# --- Backend Configuration (Serverless NEG for Cloud Run) ---
resource "google_compute_region_network_endpoint_group" "backend_serverless_neg" {
  # Use google-beta provider
  provider              = google-beta.impersonated # Assume called with alias
  project               = var.project_id
  name                  = "${var.name_prefix}-backend-neg"
  region                = var.backend_cr_service_location
  network_endpoint_type = "SERVERLESS"
  cloud_run {
    service = var.backend_cr_service_name
  }
}

resource "google_compute_backend_service" "backend_service" {
  # provider = google.impersonated # Assume called with alias
  project             = var.project_id
  name                = "${var.name_prefix}-backend-svc"
  protocol            = "HTTP" # Cloud Run uses HTTP internally
  port_name           = "http" # Must match port_name if set, default is 'http'
  load_balancing_scheme = "EXTERNAL_MANAGED" # For Global LB
  timeout_sec         = 30
  enable_cdn          = false # Typically not needed for API backend

  backend {
    group = google_compute_region_network_endpoint_group.backend_serverless_neg.id
  }
  # Add health checks, IAP, logging settings as needed
}


# --- Frontend Configuration (GCS Bucket Backend) ---
resource "google_compute_backend_bucket" "frontend_bucket" {
  # provider = google.impersonated # Assume called with alias
  project     = var.project_id
  name        = "${var.name_prefix}-frontend-bucket"
  description = "Serves frontend static files"
  bucket_name = var.frontend_bucket_name
  enable_cdn  = true # Enable Cloud CDN for frontend assets
}

# --- URL Map ---
resource "google_compute_url_map" "url_map" {
  # provider = google.impersonated # Assume called with alias
  project         = var.project_id
  name            = "${var.name_prefix}-url-map"
  default_service = google_compute_backend_bucket.frontend_bucket.id # Serve frontend by default

  host_rule {
    # Use domain name if provided, otherwise wildcard
    hosts        = var.domain_name != null ? [var.domain_name] : ["*"]
    path_matcher = "allpaths"
  }

  path_matcher {
    name            = "allpaths"
    default_service = google_compute_backend_bucket.frontend_bucket.id

    # Route /api/v1/* to the backend service
    path_rule {
      paths   = ["/api/v1/*"] # Match backend API path
      service = google_compute_backend_service.backend_service.id
    }
     # Add other path rules if needed
  }
}

# --- SSL Certificate (Managed) ---
resource "google_compute_managed_ssl_certificate" "ssl_certificate" {
  # provider = google.impersonated # Assume called with alias
  count    = var.domain_name != null ? 1 : 0
  project  = var.project_id
  name     = "${var.name_prefix}-ssl-cert"
  managed {
    domains = [var.domain_name]
  }
}

# --- Target HTTPS Proxy ---
resource "google_compute_target_https_proxy" "https_proxy" {
  # provider = google.impersonated # Assume called with alias
  project = var.project_id
  name    = "${var.name_prefix}-https-proxy"
  url_map = google_compute_url_map.url_map.id
  ssl_certificates = var.domain_name != null ? [google_compute_managed_ssl_certificate.ssl_certificate[0].id] : []
   # For non-managed certs: ssl_policy = ...
}

# --- Global Forwarding Rule (IP Address) ---
resource "google_compute_global_address" "ip_address" {
  # provider = google.impersonated # Assume called with alias
  project = var.project_id
  name    = "${var.name_prefix}-ip"
}

resource "google_compute_global_forwarding_rule" "forwarding_rule" {
  # provider = google.impersonated # Assume called with alias
  project               = var.project_id
  name                  = "${var.name_prefix}-https-fwd-rule"
  ip_protocol           = "TCP"
  port_range            = "443" # HTTPS
  target                = google_compute_target_https_proxy.https_proxy.id
  ip_address            = google_compute_global_address.ip_address.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# Optional: HTTP to HTTPS Redirect (requires separate HTTP LB setup)
# ... (google_compute_target_http_proxy, google_compute_global_forwarding_rule for port 80) ...
