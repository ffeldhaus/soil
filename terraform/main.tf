# This root main.tf is primarily for resources shared across all environments
# or foundational resources like the project itself if not managed per-env.
# In this setup, the project is created per environment, so this file
# mainly holds the random_uuid resource configuration.

# Generate UUID once and store it in state to keep project ID consistent
resource "random_uuid" "project_suffix" {}

# Keeper to ensure the UUID doesn't change on every apply after the first one
resource "terraform_data" "project_suffix_keeper" {
  input = random_uuid.project_suffix.result
}

# Output the generated suffix (used by environment main.tf files)
output "project_id_uuid_suffix" {
  description = "The generated UUID suffix for project IDs."
  value       = terraform_data.project_suffix_keeper.input # Use the keeper's output
}
