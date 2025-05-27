variable "_id" { type = string }
variable "location" { type = string }
variable "service_name" { type = string }
variable "service_account_id" { type = string }
variable "container_image" {
  description = "The Docker image URL (usually from Artifact Registry)."
  type        = string
}
variable "container_port" {
  description = "The port the container listens on."
  type        = number
  default     = 8000 # Default for FastAPI example
}
variable "allow_unauthenticated" {
  description = "Allow public access to the Cloud Run service."
  type        = bool
  default     = true # Change to false if frontend auth handles everything via backend API calls
}
variable "env_vars" {
  description = "Map of environment variables for the container."
  type        = map(string)
  default     = {}
}
# Add other variables as needed (CPU, memory, scaling, VPC connector, etc.)
