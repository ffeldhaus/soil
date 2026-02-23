# Changelog

All notable changes to this project will be documented in this file.

## [2.6.12] - 2026-02-23

## [2.6.0] to [2.6.11] - 2026-02-22 to 2026-02-23
### Added
- Feat: implement dedicated "Delete Account" page at `/delete-account` with data purging logic.
- Feat: implement `deleteAccount` Cloud Function to purge user profile, hosted games, and auth data.
- Feat: add dedicated 404 "Not Found" page for invalid routes.
- Feat: implement game advisor and guided tour with comprehensive tests.
- Feat: implement GDPR-compliant privacy policy and anonymized user data handling.
- Feat: improve advisor insights, dialog layout, and crop selection UI.
- Feat: add automated `CHANGELOG.md` versioning and pre-push verification.
- Feat: add privacy and impressum pages to sitemap.
- Docs: add instructions to `GEMINI.md` for consolidating changelog entries on every minor version release.
### Changed
- Style: refine manual layout and crop card designs (removed NPK/labor icons).
- Refactor: move advisor styles to separate file and update performance tiers.
- Perf: optimize animations (fireworks) and rendering tiers.
- Build: refined `scripts/deploy.js` to automate changelog management during releases.
### Fixed
- Fix: resolve manual scrolling issues and footer link behavior.
- Fix: remove duplicate footers and ensure assetlinks.json is served correctly.
- Fix: align "Abbrechen" button and improve data deletion descriptions.

## [2.5.0] to [2.5.15] - 2026-02-05 to 2026-02-16
### Added
- Feat: integrate feedback form directly into game end modal.
- Feat: improve research data view with game expansion and player details.
- Feat: add quick start, update game defaults, and refine terminology to 'Lernende'.
- Feat: implement super-admin game review, local game sync, and AI strategy clustering.
- Test: implement comprehensive game playthrough scenarios and unit tests for sync logic.
### Fixed
- Fix: resolve unauthenticated errors in local game upload and improve sanitization.
- Fix: align crop constants with real-world data and implement range-based verification.
- Fix: rebalance economy, increase pest impact, and improve AI strategy.

## [2.1.0] to [2.4.1] - 2026-01-24 to 2026-01-30
### Added
- Feat: implement high EU subventions for fallow fields (Grünstreifen).
- Feat: add direct earnings for livestock and increase costs.
- Feat: optimize PWA manifest and service worker for store submission.
### Changed
- Refactor: remove multi-language support and simplify to single German package.
- Refactor: centralize constants, balance weather impact, and align game engines.
- UI: refine select dropdown styling and improve accessibility.

## [2.0.0] to [2.0.8] - 2026-01-23
### Added
- Feat: implement Hybrid Architecture (Local & Cloud Games).
- Feat: port game engine and AI agent to frontend for offline-capable local games.
- Feat: replace Angular Service Worker with Workbox for better PWA control.
- Feat: implement background sync for local games and guest user migration.
- Feat: implement Web Share and Badging APIs.
- Feat: enable SSR (Server-Side Rendering) with client hydration and prerendering.
### Changed
- Refactor: architectural cleanup and code refactoring for PWA standards.

## [1.1.0] to [1.11.14] - 2026-01-03 to 2026-01-16
### Added
- Feat: migrate to Firebase App Hosting and purge legacy data structures.
- Feat: implement Internationalization (I18n) using Transloco.
- Feat: implement game end celebration and finance summaries.
- Feat: add round timers and dashboard enhancements.
- Chore: implement dynamic versioning from git tags and build IDs.
### Fixed
- Fix: resolve critical I18n runtime errors and Service Worker caching issues.

## [0.2.2] to [0.2.7] - 2025-12-15
### Initial Development
- Initial project setup and prototype of the game engine.
- Setup Firebase project structure (Auth, Firestore, Functions).
