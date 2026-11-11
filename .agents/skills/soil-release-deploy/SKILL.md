---
name: soil-release-deploy
description: >-
  Manage SOIL semantic versioning, CHANGELOG.md maintenance (including minor-version
  patch consolidation), automated Firebase / Cloud Build web deployment
  (scripts/deploy.js, scripts/check-changelog.js), and native Capacitor 8 releases
  for Google Play (app.soil.twa) and Apple App Store / Xcode Cloud (app.soil).
  Activate this skill whenever the user asks to prepare a release, consolidate the
  changelog, bump versions, deploy SOIL to production, or submit Android / iOS store updates.
---

# SOIL Release, Changelog & Multi-Platform Deployment Workflow

SOIL uses semantic versioning tracked in `package.json`, `angular.json`, `src/index.html` (`<meta name="app-version">`), `ios/App/App.xcodeproj/project.pbxproj`, and `android/app/build.gradle`, with automated release tagging and Firebase deployment via `scripts/deploy.js`.

For **Android (Google Play `app.soil.twa`)** and **iOS (Apple App Store / Xcode Cloud `app.soil`)** store submissions, signing credentials, review demo accounts, screenshot dimensions, and policy pitfalls, read [`references/app-stores.md`](references/app-stores.md).

## 1. Changelog Maintenance (`CHANGELOG.md`)

1. **Working Tree Invariant (`## [Unpublished]`)**:
   - Every normal commit must record its user-visible or architectural changes under `## [Unpublished]` at the top of `CHANGELOG.md` (enforced by `.husky/pre-commit`).
   - Do **not** manually replace `## [Unpublished]` with a version number before running `npm run deploy`; `scripts/deploy.js` automatically stamps `## [<version>] - YYYY-MM-DD`.
2. **No Duplication**:
   - Verify that items under `## [Unpublished]` do not duplicate entries already documented in prior releases.
3. **Minor-Release Consolidation**:
   - On every **minor version release** (e.g., `v2.7.0` or `v3.1.0`), consolidate previous patch release sections (e.g., `v2.6.1` through `v2.6.31`) into a single range summary heading (e.g., `## [2.6.0] to [2.6.31] - YYYY-MM-DD to YYYY-MM-DD`) categorized under `### Security`, `### Added`, `### Changed`, and `### Fixed`.
4. **High-Level Focus**:
   - Keep entries focused on user-facing milestones, gameplay/balancing changes, security hardening, and architectural improvements rather than raw commit log mirrors.

## 2. Automated Web Release & iOS CI Trigger (`npm run deploy`)

Ensure the working tree is clean (except for `CHANGELOG.md` if staging release notes) and `main` is up to date, then run:

```bash
npm run deploy [patch | minor | major | <explicit-version>]
```

### What `scripts/deploy.js` Executes:
1. Verifies no uncommitted changes exist outside `CHANGELOG.md`.
2. Updates the version in `package.json`, `angular.json` (`import.meta.env.APP_VERSION`), `src/index.html` (`<meta name="app-version">`), and `ios/App/App.xcodeproj/project.pbxproj` (`MARKETING_VERSION` and integer `CURRENT_PROJECT_VERSION` = `Major*100000 + Minor*1000 + Patch*10`).
3. Replaces `## [Unpublished]` in `CHANGELOG.md` with `## [<newVersion>] - <YYYY-MM-DD>` and updates `<lastmod>` in `public/sitemap.xml` and `src/server.ts`.
4. Commits with message `v<newVersion>`, creates annotated tag `v<newVersion>`, and pushes `main --tags` to GitHub (triggering `.husky/pre-push` checks **and** automatically starting Xcode Cloud's `Default` -> `Archive - iOS` workflow for TestFlight / App Store Connect).
5. Deploys backend rules and functions via `./node_modules/.bin/firebase deploy --only functions,firestore,storage` (region `europe-west4`).
6. Streams the triggered **Firebase App Hosting / Cloud Build** log in `europe-west4` via `gcloud builds list` / `gcloud beta builds log` and notifies IndexNow.

## 3. Native Store Releases (Summary — Full Details in `references/app-stores.md`)

- **Android (`app.soil.twa`)**: After `npm run deploy`, run `npm run cap:bundle:android` (auto-restores `android/signing.keystore` from macOS Keychain if absent, runs `cap sync`, and builds the R8-minified `android/app/build/outputs/bundle/release/app-release.aab` with embedded `proguard.map`) and upload to Google Play Console -> Produktion.
- **iOS (`app.soil`)**: Wait for the Xcode Cloud `Archive - iOS` build triggered by `npm run deploy` to finish TestFlight processing (`ios/App/ci_scripts/ci_post_clone.sh` runs `npm ci && npm run build && npx cap sync ios` in the cloud), attach the build to the new version in App Store Connect, and submit for review.

## 4. Manual / Targeted Verification Commands

- **Validate `CHANGELOG.md` header for current version**:
  ```bash
  node scripts/check-changelog.js
  ```
- **Check for updatable dependencies (enforced by `.husky/pre-push`)**:
  ```bash
  npm outdated
  npm outdated --prefix functions
  ```
