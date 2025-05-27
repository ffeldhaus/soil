output "service_url" {
  description = "The URL of the deployed Cloud Run service."
  value       = google_cloud_run_v2_service.service.uri
}

output "service_name" {
    description = "Name of the Cloud Run service."
    value = google_cloud_run_v2_service.service.name
}

output "service_account_email" {
  description = "Email of the service account created for this Cloud Run service."
  value       = google_service_account.service_account.email
}
