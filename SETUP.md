# Setup Guide

This document describes how to set up the SOIL project, including Firebase, Google Cloud Platform (GCP) APIs, and the Email Service.

## 1. Firebase Project Setup

1. Create a new Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable the following Firebase services:
   - **Authentication**: Enable Google Sign-In and Anonymous providers.
   - **Firestore Database**: Create a database in native mode (Region: `europe-west4` recommended).
   - **Cloud Functions**: Upgrade to the Blaze plan to use Cloud Functions.
   - **Firebase Hosting**.
   - **Cloud Storage**.

## 2. Google Cloud Platform (GCP) Configuration

### APIs and Services
Ensure the following APIs are enabled in your GCP project:
- **Cloud Firestore API**
- **Cloud Functions API**
- **Cloud Run Admin API**
- **Gmail API** (for the email service)
- **Identity and Access Management (IAM) API**

### IAM and Service Accounts
1. In the [GCP Console IAM & Admin](https://console.cloud.google.com/iam-admin/serviceaccounts), find the App Hosting or Cloud Functions service account.
2. Ensure it has the following roles:
   - `Firebase Admin`
   - `Cloud Functions Admin`
   - `Service Account Token Creator` (essential for Domain-Wide Delegation)

## 3. Email Service Setup (Gmail API)

The application uses a Google Service Account with Domain-Wide Delegation (DWD) to send emails via Gmail.

### Step 1: Create/Configure Service Account
1. Create a dedicated Service Account in the [GCP Console](https://console.cloud.google.com/iam-admin/serviceaccounts).
2. Note the **Unique ID (Client ID)** of the Service Account. You will need this for the Workspace delegation.
3. Grant the `Service Account Token Creator` role to the account that will be running the functions (usually the App Hosting service account).

### Step 2: Google Workspace Domain-Wide Delegation
1. Go to the [Google Workspace Admin Console](https://admin.google.com/) -> **Security** -> **Access and data control** -> **API controls**.
2. Click **Manage Domain Wide Delegation**.
3. Add a new API client using the **Client ID** of your Service Account.
4. Add the following scopes:
   - `https://mail.google.com/`
   - `https://www.googleapis.com/auth/gmail.send`

### Step 3: Set Firebase Secrets
Configure the Cloud Functions to use the Service Account and the user to impersonate:

```bash
# The Service Account Email
firebase functions:secrets:set GMAIL_SERVICE_ACCOUNT_EMAIL --data "your-service-account@your-project.iam.gserviceaccount.com"

# The Google Workspace user to send emails as (e.g., no-reply@yourdomain.com)
firebase functions:secrets:set GMAIL_IMPERSONATED_USER --data "user-to-impersonate@yourdomain.com"
```

### Step 4: Google Workspace User Requirements
The account specified in `GMAIL_IMPERSONATED_USER` must:
1. Have an **Active License** (Business Starter or higher).
2. Have the **Gmail service enabled**.
3. Have a **fully provisioned and active mailbox**.

## 4. Local Environment

1. Install dependencies:
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```
2. Set up Firebase CLI:
   ```bash
   firebase login
   firebase use <your-project-id>
   ```
