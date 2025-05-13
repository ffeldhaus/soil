# Soil Educational Game - Full Stack Application

This project contains the frontend (Angular) and backend (Python/FastAPI) for the Soil educational game.

## Project Structure

```
.
├── backend/           # FastAPI backend application
├── frontend/          # Angular frontend application
├── terraform/         # Terraform Infrastructure as Code
│   ├── environments/  # Environment-specific configurations (dev, staging, prod)
│   │   ├── dev/
│   │   ├── staging/
│   │   └── prod/
│   ├── modules/       # Reusable Terraform modules (cloud-run, firebase, etc.)
│   └── templates/     # Template files (e.g., for backend Dockerfile)
├── .gitignore
├── cloudbuild.yaml    # Google Cloud Build configuration
└── README.md          # This file
```

## Prerequisites

*   Google Cloud SDK (`gcloud`) installed and configured.
*   Terraform CLI installed.
*   Git installed.
*   Node.js (LTS) and npm (for frontend).
*   Python 3.10+ and Poetry (for backend).
*   Access to a Google Cloud Organization.
*   A Google Cloud Billing Account.

## Setup and Deployment Workflow

This project uses Terraform to manage Google Cloud infrastructure and Cloud Build for CI/CD. Deployment follows these general steps:

1.  **One-Time Project Setup (First Deployment Only):**
    *   Define a unique Project ID Prefix (e.g., `soil-game`). Terraform will append a UUID.
    *   Create Terraform variable files (`terraform.tfvars`) for each environment.
    *   Create required GCS buckets for Terraform state manually.
    *   Run Terraform to create the GCP Project and foundational resources (including the Terraform Service Account).
    *   Grant necessary permissions to the user/group running subsequent Terraform applies.

2.  **Infrastructure Provisioning (Terraform):**
    *   Run `terraform apply` within each `terraform/environments/{env}` directory to create or update resources (Cloud Run, Firestore, GCS, Load Balancer, Secrets, etc.) for that environment. Terraform impersonates a dedicated Service Account for applying changes.

3.  **Application Deployment (Cloud Build CI/CD):**
    *   Pushing code to specific branches (`develop`, `staging`, `main`/`tags`) triggers Cloud Build.
    *   Cloud Build builds backend/frontend Docker images (or static files).
    *   Injects environment-specific configurations (API URLs, Firebase keys fetched from Secret Manager) into the frontend build.
    *   Pushes images to Artifact Registry.
    *   Deploys the backend to Cloud Run and the frontend to a GCS bucket behind a Load Balancer.

## Detailed Deployment Steps

### 1. Initial Cloud Setup (Manual Steps)

These steps are performed **once** by a user with Organization-level permissions (`roles/resourcemanager.projectCreator`, `roles/billing.user`).

a.  **Clone the Repository:**
    ```bash
    git clone <your-repo-url>
    cd <your-repo-root>
    ```

b.  **Create Terraform Service Account and GCS State Buckets:**

    *   **Choose:**
        *   `GCP_ORGANIZATION_ID`: Your Google Cloud Organization ID.
        *   `GCP_BILLING_ACCOUNT_ID`: Your Google Cloud Billing Account ID.
        *   `UNIQUE_PROJECT_ID_PREFIX`: A short, unique prefix for your projects (e.g., `soil`).
        *   `TF_ADMIN_PROJECT_ID`: A *separate, existing* GCP project where the Terraform Admin SA and potentially the state buckets will reside (or you can create one manually first). This helps manage permissions centrally.

    *   **Create Terraform Admin Service Account (in the admin project):**
        ```bash
        gcloud config set project $TF_ADMIN_PROJECT_ID

        gcloud iam service-accounts create terraform-admin \
          --display-name="Terraform Admin Service Account"

        TF_ADMIN_SA_EMAIL="terraform-admin@${TF_ADMIN_PROJECT_ID}.iam.gserviceaccount.com"
        echo "Terraform Admin SA: ${TF_ADMIN_SA_EMAIL}"
        ```

    *   **Grant Initial Permissions to Terraform Admin SA:**
        ```bash
        # Permissions needed to create projects and manage resources within them
        gcloud organizations add-iam-policy-binding $GCP_ORGANIZATION_ID \
          --member="serviceAccount:${TF_ADMIN_SA_EMAIL}" \
          --role="roles/resourcemanager.projectCreator"

        gcloud organizations add-iam-policy-binding $GCP_ORGANIZATION_ID \
          --member="serviceAccount:${TF_ADMIN_SA_EMAIL}" \
          --role="roles/billing.user" # To link projects to billing account

        gcloud organizations add-iam-policy-binding $GCP_ORGANIZATION_ID \
          --member="serviceAccount:${TF_ADMIN_SA_EMAIL}" \
          --role="roles/serviceusage.serviceUsageAdmin" # To enable APIs

        gcloud organizations add-iam-policy-binding $GCP_ORGANIZATION_ID \
          --member="serviceAccount:${TF_ADMIN_SA_EMAIL}" \
          --role="roles/iam.serviceAccountAdmin" # To create other SAs

        gcloud organizations add-iam-policy-binding $GCP_ORGANIZATION_ID \
          --member="serviceAccount:${TF_ADMIN_SA_EMAIL}" \
          --role="roles/compute.networkAdmin" # For VPC, LB etc.

        gcloud organizations add-iam-policy-binding $GCP_ORGANIZATION_ID \
          --member="serviceAccount:${TF_ADMIN_SA_EMAIL}" \
          --role="roles/firebase.admin" # For Firebase project linking/config

         # Add other roles as needed based on resources managed by Terraform (e.g., roles/cloudsql.admin)
        ```

    *   **Create GCS Buckets for Terraform State (in the admin project):**
        ```bash
        # Create unique names for your state buckets
        DEV_STATE_BUCKET="tfstate-soil-dev-${TF_ADMIN_PROJECT_ID}"
        STAGING_STATE_BUCKET="tfstate-soil-staging-${TF_ADMIN_PROJECT_ID}"
        PROD_STATE_BUCKET="tfstate-soil-prod-${TF_ADMIN_PROJECT_ID}"

        gcloud storage buckets create gs://${DEV_STATE_BUCKET} --project=${TF_ADMIN_PROJECT_ID} --location=US --uniform-bucket-level-access
        gcloud storage buckets create gs://${STAGING_STATE_BUCKET} --project=${TF_ADMIN_PROJECT_ID} --location=US --uniform-bucket-level-access
        gcloud storage buckets create gs://${PROD_STATE_BUCKET} --project=${TF_ADMIN_PROJECT_ID} --location=US --uniform-bucket-level-access

        # Enable versioning on state buckets (recommended)
        gcloud storage buckets update gs://${DEV_STATE_BUCKET} --versioning
        gcloud storage buckets update gs://${STAGING_STATE_BUCKET} --versioning
        gcloud storage buckets update gs://${PROD_STATE_BUCKET} --versioning
        ```
    *   **Grant Terraform Admin SA access to State Buckets:**
        ```bash
        gcloud storage buckets add-iam-policy-binding gs://${DEV_STATE_BUCKET} \
            --member="serviceAccount:${TF_ADMIN_SA_EMAIL}" \
            --role="roles/storage.objectAdmin"
        # Repeat for staging and prod buckets
        gcloud storage buckets add-iam-policy-binding gs://${STAGING_STATE_BUCKET} \
             --member="serviceAccount:${TF_ADMIN_SA_EMAIL}" \
             --role="roles/storage.objectAdmin"
        gcloud storage buckets add-iam-policy-binding gs://${PROD_STATE_BUCKET} \
             --member="serviceAccount:${TF_ADMIN_SA_EMAIL}" \
             --role="roles/storage.objectAdmin"

        ```

c.  **Create `terraform.tfvars` Files (DO NOT COMMIT):**

    Create these files within *each* environment directory (`terraform/environments/{dev,staging,prod}/terraform.tfvars`).

    *   **Example `terraform/environments/dev/terraform.tfvars`:**
        ```hcl
        # --- DO NOT COMMIT THIS FILE ---
        gcp_organization_id       = "YOUR_ORG_ID" # From step 1b
        gcp_billing_account_id    = "YOUR_BILLING_ACCOUNT_ID" # From step 1b
        terraform_service_account = "terraform-admin@<TF_ADMIN_PROJECT_ID>.iam.gserviceaccount.com" # From step 1b
        region                    = "us-central1" # Or your preferred region
        project_id_prefix         = "soil" # Your chosen prefix from step 1b
        # Add any other env-specific variables here (e.g., instance sizes)
        ```
    *   Adapt the values for `staging` and `prod` environments in their respective `terraform.tfvars` files.

### 2. Provision Infrastructure with Terraform

a.  **Authenticate gcloud CLI:**
    *   **Locally:** Run `gcloud auth application-default login --impersonate-service-account=$TF_ADMIN_SA_EMAIL`.
    *   **In CI/CD (for Terraform apply):** Use Workload Identity Federation or Service Account keys carefully. The provided `cloudbuild.yaml` focuses on application deployment; running Terraform apply via Cloud Build requires additional setup (e.g., a dedicated builder image with Terraform, granting the Cloud Build SA the ability to impersonate the Terraform Admin SA). *For now, we assume Terraform apply is run locally or via a separate secured pipeline.*

b.  **Navigate to Environment Directory:**
    ```bash
    cd terraform/environments/dev
    ```

c.  **Initialize Terraform:**
    ```bash
    terraform init
    ```
    This will configure the GCS backend using the bucket name defined in `backend.tf` (which you'll create next).

d.  **Plan and Apply:**
    ```bash
    terraform plan # Review the planned changes
    terraform apply # Apply the changes
    ```

e.  **Repeat** steps 2b-2d for `staging` and `prod` environments.

### 3. CI/CD Setup (Cloud Build)

a.  **Enable Required APIs in Each Project:** Terraform should handle enabling APIs like Cloud Build, Artifact Registry, Secret Manager, etc., within each target project (`soil-<prefix>-<uuid>-{dev,staging,prod}`).

b.  **Grant Cloud Build SA Permissions:** Terraform should grant the Cloud Build Service Account (`<project_number>@cloudbuild.gserviceaccount.com`) of *each* target project the necessary roles *within that project* (e.g., Cloud Run Admin, Artifact Registry Writer, Storage Object Admin, Secret Manager Secret Accessor). This is typically done using `google_project_iam_member` resources in the environment's `main.tf`.

c.  **Create Cloud Build Triggers:** Follow the steps outlined previously in the Google Cloud Console to create triggers linked to your Git repository branches (`develop`, `staging`, `main`/`tags`) using the `cloudbuild.yaml` file and setting the correct substitution variables for each trigger (`_ENV`, `_PROJECT_ID`, `_REGION`, `_BACKEND_SERVICE_NAME`, `_FRONTEND_BUCKET_NAME`).

### 4. Deploy Application

Pushing code to the configured branches will automatically trigger the CI/CD pipeline defined in `cloudbuild.yaml`, deploying the applications.

## Terraform Service Account Permissions (Minimum Required)

The Terraform Service Account (`terraform-admin@...`) needs the following roles **at the Organization level** for the initial project creation and setup:

*   `roles/resourcemanager.projectCreator`: To create new GCP projects.
*   `roles/billing.user`: To associate new projects with the billing account.
*   `roles/serviceusage.serviceUsageAdmin`: To enable necessary APIs within the new projects.
*   `roles/iam.serviceAccountAdmin`: To create other service accounts (e.g., for Cloud Run).
*   `roles/compute.networkAdmin`: For VPC, Load Balancer, Firewall rules.
*   `roles/firebase.admin`: To link Firebase projects and manage Firebase resources.
*   `roles/storage.objectAdmin`: To manage the Terraform state buckets (granted specifically on the buckets).

Within **each created project** (`soil-<prefix>-<uuid>-{dev,staging,prod}`), this service account implicitly gets `roles/owner` during project creation, which is sufficient to manage all resources within that project. However, for least privilege *after* project creation, you could potentially refine permissions *within* the projects if needed, although `owner` is common for the main Terraform SA managing the entire project's infra.

## Cleanup

To destroy the infrastructure, run `terraform destroy` within each environment's directory, starting from the least critical (dev) and moving upwards. You may need to manually delete the GCP projects afterwards if required, or configure Terraform to do so. Remember to delete the GCS state buckets manually if they are no longer needed.
