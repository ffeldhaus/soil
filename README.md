# Soil - Multiplayer Resource Management

Soil is a web-based agricultural simulation game built on the Firebase platform. It features a real-time multiplayer environment where players manage parcels of land, plant crops, and compete or cooperate.

## ✨ Features

- **Real-time Multiplayer**: Synchronized game state across all players using Firestore.
- **Agricultural Simulation**: Manage parcels of land, select crops, and deal with environmental factors like weather and vermin.
- **Admin Dashboard**: Create and manage games, monitor player progress, and trigger game events.
- **Localization**: Supports multiple languages (currently English and German).
- **AI Players**: Automated players that make decisions based on the current game state.

## 🚀 Tech Stack

- **Frontend**: Angular (v21), TailwindCSS (v4), RxJS
- **Backend**: Firebase Cloud Functions (v2, Node.js 24)
- **Database**: Cloud Firestore
- **Authentication**: Firebase Auth (Anonymous & Google Sign-In)
- **Testing**: Jasmine + Vitest (Unit), Cypress (E2E)

## 🛠️ Getting Started

### Prerequisites

- Node.js (v24 LTS)
- Firebase CLI (`npm install -g firebase-tools`)
- Angular CLI (`npm install -g @angular/cli`)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd soil
   ```

2. Install dependencies:
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

### Local Development

1. Start the Angular development server:

   ```bash
   npm start
   ```

   Open `http://localhost:4200/` in your browser.

2. Run Firebase emulators for backend development:
   ```bash
   firebase emulators:start
   ```

### Building

To build the project for production:

```bash
npm run build
```

This will compile the Angular app and store the artifacts in the `dist/` directory.

### Testing

#### Unit Tests (Frontend)

```bash
npm test
```

#### E2E Tests (Cypress)

```bash
ng e2e
```

## 🏗️ Deployment

The project is configured for deployment to Firebase:

```bash
npm run deploy
```

This script handles the build process and deployment to Firebase Hosting and Functions.

## 📧 Email Service Setup

The application uses a Google Service Account with Domain-Wide Delegation (DWD) to send emails via Gmail.

### 1. Enable Gmail API
Ensure the Gmail API is enabled for your project in the [Google Cloud Console](https://console.cloud.google.com/apis/library/gmail.googleapis.com).

### 2. Configure Service Account
1. Create a Service Account in the [Google Cloud IAM Console](https://console.cloud.google.com/iam-admin/serviceaccounts).
2. Note the **Client ID** (Unique ID) of the Service Account.
3. Ensure the Service Account has the "Service Account Token Creator" role.

### 3. Google Workspace Domain-Wide Delegation
1. Go to the [Google Workspace Admin Console](https://admin.google.com/) -> Security -> Access and data control -> API controls.
2. Click **Manage Domain Wide Delegation**.
3. Add a new API client using the **Client ID** of your Service Account.
4. Add the following scopes:
   - `https://mail.google.com/`
   - `https://www.googleapis.com/auth/gmail.send`

### 4. Set Firebase Secrets
Configure the Cloud Functions to use the Service Account and the user to impersonate:

```bash
# The Service Account Email
firebase functions:secrets:set GMAIL_SERVICE_ACCOUNT_EMAIL --data "your-service-account@your-project.iam.gserviceaccount.com"

# The Google Workspace user to send emails as
firebase functions:secrets:set GMAIL_IMPERSONATED_USER --data "no-reply@yourdomain.com"
```

### 5. Google Workspace User Requirements
The account specified in `GMAIL_IMPERSONATED_USER` (e.g., `no-reply@yourdomain.com`) must meet the following criteria:
1. **Active License**: The user must be assigned a Google Workspace license (e.g., Business Starter or higher).
2. **Gmail Enabled**: The Gmail service must be enabled for this user in the Google Workspace Admin Console.
3. **Inbox Ready**: The user's mailbox must be fully provisioned and active before it can send emails via the API.

## 📄 License

[Define License Here]
