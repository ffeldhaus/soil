variable "project_id" {
  description = "The GCP project ID."
  type        = string
}

variable "location" {
  description = "The region for the Artifact Registry repository."
  type        = string
}

variable "repository_id" {
  description = "The ID for the Artifact Registry repository (e.g., 'soil-game-repo')."
  type        = string
}
