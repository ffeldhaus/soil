# Add required variables from providers.tf and for project creation
variable "terraform_service_account" {
  description = "The email of the Terraform Admin Service Account to impersonate."
  type        = string
  sensitive   = true # Good practice, although email isn't strictly secret
}

variable "gcp_organization_id" {
  description = "Google Cloud Organization ID."
  type        = string
}

variable "gcp_billing_account_id" {
  description = "Google Cloud Billing Account ID."
  type        = string
}

variable "project_id_prefix" {
  description = "Prefix for the project ID (e.g., 'soil')."
  type        = string
  default     = "soil"
}

variable "region" {
  description = "The GCP region for resources."
  type        = string
  default     = "us-central1"
}
