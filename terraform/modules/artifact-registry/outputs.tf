output "repository_url" {
  description = "The full URL for the Artifact Registry repository."
  value       = "${var.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repository.repository_id}"
}

output "repository_name" {
    description = "The full name of the repository resource."
    value = google_artifact_registry_repository.repository.name
}
