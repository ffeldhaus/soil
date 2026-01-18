# Tech Stack: Soil

## Frontend
- **Framework:** Angular (v21)
- **Styling:** TailwindCSS (v4)
- **Reactive Programming:** RxJS
- **State Management:** Component-based state and RxJS services
- **PWA Support:** Workbox (Replacing Angular Service Worker for advanced caching, offline capabilities, and deep PWA feature support)

## Backend & Cloud Services (Firebase)
- **Functions:** Firebase Cloud Functions (v2, Node.js 24)
- **Database:** Cloud Firestore (Real-time NoSQL)
- **Authentication:** Firebase Auth (Expanding to support Google, Apple, and Email/Password)
- **Storage:** Firebase Cloud Storage (For assets and scientific data)
- **Messaging:** Firebase Cloud Messaging (FCM) - (Planned for push notifications)
- **Hosting:** Firebase App Hosting (Automated GitHub-integrated deployment)

## Mobile Strategy
- **Distribution:** Apple App Store & Google Play Store
- **Platform:** Progressive Web App (PWA) with potential native wrappers (e.g., Capacitor or similar) to ensure deep platform integration while maintaining a unified web aesthetic.

## Development & DevOps
- **Local Development:** Firebase Emulator Suite (Firestore, Functions, Auth, Hosting, Storage)
- **Linting & Formatting:** Biome
- **Package Manager:** npm
- **Version Control:** Git

## Testing
- **Frontend Unit Tests:** Vitest / Jasmine
- **Backend Unit Tests:** Mocha (Functions)
- **E2E Testing:** Cypress
- **Quality Checks:** Husky (Pre-commit/Pre-push hooks), custom file size checks, and lychee for link checking.
