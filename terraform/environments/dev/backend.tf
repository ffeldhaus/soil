# Environment-specific backend configuration
terraform {
  backend "gcs" {
    # Bucket name needs to match the one manually created in the initial setup
    # Example: tfstate-soil-dev-<TF_ADMIN_PROJECT_ID>
    # This should be provided via tfvars or explicitly set here if static.
    # Using a variable requires partial configuration during init.
    # For simplicity here, we'll use the static name matching the README.
    bucket = "tfstate-soil-dev-<YOUR_TF_ADMIN_PROJECT_ID>" # <-- *** REPLACE WITH YOUR ADMIN PROJECT ID ***
    prefix = "terraform/dev"
  }
}
