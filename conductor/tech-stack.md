# Tech Stack: Soil

## Frontend
- **Framework:** Angular (v21)
- **Styling:** TailwindCSS (v4)
- **Reactive Programming:** RxJS
- **State Management:** Component-based state and RxJS services
- **PWA Support:** Workbox-powered PWA with integration of Web Share API and App Badging API for enhanced mobile experience.

## Backend & Cloud Services (Firebase)
- **Functions:** Firebase Cloud Functions (v2, Node.js 24)
- **Database:** Cloud Firestore (Real-time NoSQL)
- **Authentication:** Firebase Auth (Supporting Google, Apple, and Email/Password with Guest-to-Registered migration).
- **Synchronization:** Custom `SyncService` for authoritative background state reconciliation.
- **Storage:** Firebase Cloud Storage (For assets and scientific data)

## Testing
- **Frontend Unit Tests:** Vitest (Primary test runner with v8 coverage)
- **Backend Unit Tests:** Mocha (Functions)
- **E2E Testing:** Cypress (Covering full playthrough and migration scenarios)
- **Quality Checks:** Husky (Pre-commit/Pre-push hooks), custom file size checks, and lychee for link checking.
