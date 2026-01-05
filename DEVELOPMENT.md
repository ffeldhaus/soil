---
trigger: always_on
---

# Development Guide & Rules

This document outlines the local development strategy, testing procedures, and core mandates for both human and AI programmers.

## Core Mandates

- **Conventions**: Rigorously adhere to existing project conventions. Analyze surrounding code, tests, and configuration before modifying.
- **Style & Structure**: Mimic the style (formatting, naming), structure, and architectural patterns of existing code.
- **Idiomatic Changes**: Ensure changes integrate naturally and idiomatically within the local context.
- **Comments**: Add comments sparingly, focusing on _why_ something is done rather than _what_.
- **Dependencies**: Verify established usage in `package.json` before employing new libraries. Prefer stable versions.
- **Modals**: Consistently use HTML/CSS modals instead of native browser dialogs (alert/confirm/prompt).
- **Manual**: Ensure the User Manual (`src/app/manual/manual.ts`) is kept up to date whenever game logic or crop properties change.
- **Sitemap & SEO**: Ensure the Sitemap (`public/sitemap.xml`) and `public/robots.txt` are kept up to date whenever public routes are added or changed.
- **Compliance**: All public pages and views must include a link to the Impressum page.

## Prerequisites

- Node.js (v24 recommended)
- npm
- Firebase CLI (`npm install -g firebase-tools`)
- Java (required for Firebase Emulators)

## Local Development Environment

We use the **Firebase Emulator Suite** to mirror the production environment locally. This ensures that our local testing is accurate and safe.

### Starting the Environment

To start the full local development environment, including Angular and Firebase Emulators:

```bash
npm run start:emulators
```

This will:

1. Build the Angular application in watch mode.
2. Start the Firebase Emulators (Auth, Firestore, Functions, Hosting, Storage).
3. Serve the application at `http://localhost:5005` (Hosting Emulator port).

_Note: You can also use `ng serve` for rapid UI-only development, but it will not have full backend emulation unless configured to connect to emulators._

## Development Workflow

1. **Understand**: Thoroughly understand the codebase context before proposing changes.
2. **Plan**: Formulate a clear, grounded plan and share a concise summary before implementation.
3. **Implement**: Follow the plan iteratively. Write unit tests alongside feature code.
4. **Verify**: Run tests and linting as described in the Testing Strategy.
5. **Finalize**: Only after all verifications pass should the task be considered complete.

## Testing Strategy

All changes must include relevant unit tests and, for critical flows, E2E tests.

### 1. Unit Tests

Unit tests are fast and isolate specific logic.

- **Frontend (Angular)**: `npm run test:unit`
- **Backend (Firebase Functions)**: `npm run test:functions`

### 2. End-to-End (E2E) Tests

E2E tests verify the complete flow of the application from the user's perspective.

- **Run E2E Tests**: `npm run test:e2e`
- **Interactive Mode**: `npm run test:e2e:open`

### 3. Continuous Integration (CI) & Standards

Before committing code, ensure all tests pass and linting is clean.

- **Full Test Suite**: `npm run test:ci`
- **Linting (Functions)**: `npm run lint --prefix functions`

## Performance, SEO & Accessibility

- **Performance**: Ensure fast load times and smooth interactions.
- **Accessibility**: Adhere to WCAG standards using semantic HTML and ARIA labels.
- **SEO**: Optimize metadata and semantic structure following Google Search best practices.
- **Lighthouse**: Regularly run audits. Aim for high scores in Performance, Accessibility, Best Practices, and SEO.

## Versioning & Diagnostics

- **Manual Versioning**: Increment the version in `package.json` for significant changes.
- **Consistency**: Ensure the `app-version` meta tag in `src/index.html` matches `package.json`.
- **Diagnostics**: Print the current application version to the developer console on first load.
- **Dynamic Versioning**: The application picks up the version automatically during the build process using `git describe` and build IDs.

## Git & Commits

- **Review**: Always run `git status` and `git diff` before committing.
- **Messages**: Propose clear, concise commit messages focusing on "why". Match existing project style.
- **Success**: Confirm successful commits with `git status`. Never push without explicit instruction.

## Release Process

We use semantic versioning managed in `package.json` and tagged in Git.

1. Ensure `main` is up to date.
2. Run `npm version [patch | minor | major]`.
3. Push changes and tags: `git push origin main --tags`.

## CI/CD & Deployment

- **Firebase App Hosting**: Deployment is automated via GitHub merges to `main`.
- **Localization**: Builds are automatically performed with localization as per `apphosting.yaml`.
- **Regional Constraints**: Use Firebase services exclusively in **EU (europe-west4)**.
- **Cloud Build**: Monitor CI/CD builds for success; fix errors and address warnings promptly.
- **Post-Deployment**: Verify the live version matches the intended `package.json` version.
- **Manual Deployment**: Do not deploy manually unless fixing a critical production outage that CI/CD cannot handle.

## Localization Check

Periodically run `ng extract-i18n` to update `messages.xlf` and `messages.de.xlf`.
