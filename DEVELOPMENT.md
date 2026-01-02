# Development Guide

This document outlines the local development and testing strategy for the project.

## Prerequisites

-   Node.js (v24 recommended)
-   npm
-   Firebase CLI (`npm install -g firebase-tools`)
-   Java (required for Firebase Emulators)

## Local Development Environment

We use the **Firebase Emulator Suite** to mirror the production environment locally. This ensures that our local testing is accurate and safe (no risk of affecting production data).

### Starting the Environment

To start the full local development environment, including Angular and Firebase Emulators:

```bash
npm run start:emulators
```

This will:
1.  Build the Angular application in watch mode.
2.  Start the Firebase Emulators (Auth, Firestore, Functions, Hosting, Storage).
3.  Serve the application at `http://localhost:5005` (Hosting Emulator port).

_Note: You can also use `ng serve` for rapid UI-only development, but it will not have full backend emulation unless configured to connect to emulators._

## Testing Strategy

We follow a rigorous testing strategy to ensure high code quality and reliability.

### 1. Unit Tests

Unit tests are fast and isolate specific logic.

*   **Frontend (Angular):**
    Run unit tests for the Angular application (using Vitest):
    ```bash
    npm run test:unit
    ```
    This ensures that components, services, and logic in the frontend work as expected.

*   **Backend (Firebase Functions):**
    Run unit tests for Cloud Functions:
    ```bash
    npm run test:functions
    ```
    This verifies the logic of your backend functions.

### 2. End-to-End (E2E) Tests

E2E tests verify the complete flow of the application from the user's perspective, running against the local emulators.

*   **Run E2E Tests:**
    ```bash
    npm run test:e2e
    ```
    This command will:
    1.  Build the Angular app.
    2.  Start the Firebase Emulators.
    3.  Run Cypress tests against the emulated environment.
    4.  Shut down the environment.

    **Interactive Mode:**
    To run Cypress interactively (with the GUI):
    ```bash
    npm run test:e2e:open
    ```

### 3. Continuous Integration (CI)

Before committing code, ensure all tests pass. Our CI pipeline mirrors the `npm run test:ci` command:

```bash
npm run test:ci
```
This runs all unit tests and E2E tests.

## Deployment

Deployments are handled automatically via CI/CD (Firebase App Hosting) when merging to `main`.
**Do not deploy manually** unless fixing a critical production outage that CI/CD cannot handle.
