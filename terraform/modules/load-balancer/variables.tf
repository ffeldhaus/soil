variable "project_id" { type = string }
variable "name_prefix" {
    description = "Prefix for Load Balancer resources (e.g., 'soil-lb')."
    type = string
}
variable "domain_name" {
  description = "Optional: Managed domain name for the LB (e.g., dev.soil.example.com). If provided, Managed SSL will be set up."
  type = string
  default = null
}
variable "frontend_bucket_name" {
  description = "Name of the GCS bucket serving the frontend."
  type = string
}
variable "backend_cr_service_name" {
  description = "Name of the Cloud Run backend service."
  type = string
}
 variable "backend_cr_service_location" {
  description = "Location/Region of the Cloud Run backend service."
  type = string
}
