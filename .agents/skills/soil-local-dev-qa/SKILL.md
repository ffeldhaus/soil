---
name: soil-local-dev-qa
description: >-
  Run and troubleshoot the SOIL local development environment, Firebase Emulator
  Suite, frontend/backend Vitest suites, agronomic balance simulations, and
  Cypress E2E tests. Activate this skill when starting emulators, running E2E
  or balance tests, or performing QA checks across landing, admin, super-admin,
  and player flows.
---

# SOIL Local Development, Emulators, Balancing & QA Runbook

## 1. Local Development & Firebase Emulator Suite

- **Prerequisites**: Node.js v24 (`.nvmrc`), Java (for Firebase Emulators), `firebase-tools`, and `lychee` (link checker).
- **UI-Only Dev Server (`http://localhost:4200`)**:
  ```bash
  npm start
  ```
- **Full Stack with Firebase Emulators (`http://localhost:5005`)**:
  Builds the Angular app (including the Workbox service worker via `scripts/build-sw.js`) and starts Firebase Auth, Firestore, Functions, Hosting (`:5005`), and Storage emulators:
  ```bash
  npm run start:emulators
  ```

## 2. Automated Test Suites & Static Verification

- **Linting, Formatting & File Size Check**:
  ```bash
  npm run lint
  npm run lint:fix
  node scripts/check-file-size.js
  ```
- **Scientific Ground Truth Verification (`sources.json` <-> `GAME_CONSTANTS`)**:
  ```bash
  npm run verify-constants
  ```
- **Frontend Unit Tests (Vitest)**:
  ```bash
  npm run test:unit
  npm run test:unit:coverage
  ```
- **Backend Cloud Functions & Agronomic Balance Simulations (Vitest in `functions/`)**:
  Runs unit tests for engine parity (`game-engine.test.ts`), AI variety (`ai-variety.test.ts`), crop rotation viability (`crop-viability.test.ts`), strategy archetype rankings across difficulties (`balance.test.ts`, `balance-check.test.ts`), and research anonymization (`sync.test.ts`, `upload.test.ts`):
  ```bash
  npm run test:functions
  npm run test:functions:coverage
  ```
- **End-to-End Cypress Suite (via Firebase Emulators on `:5005`)**:
  ```bash
  npm run test:e2e
  ```
- **Full CI Gate**:
  ```bash
  npm run test:ci
  ```

## 3. Manual QA Flows & Mock Mode Reference

For detailed manual test cases across Landing Page, Admin Console (`/admin`), Super Admin Console (`/admin/super`), Player Board (`/game`), and Email Notifications, consult [`QA.md`](../../../QA.md) and [`SETUP.md`](../../../SETUP.md).

