# Changelog

All notable changes to this project will be documented in this file.

## [Unpublished]
### Changed
- Improved the responsive layout of the landing page info sections to stack vertically below 860px and expand to full width in portrait mode, matching the layout of other informational pages.
### Fixed
- Fixed an issue where custom scrollbars were invisible on several pages (like Manual, Info, Dashboard) by removing `-webkit-scrollbar` overrides and replacing them with standard CSS `scrollbar-width` and `scrollbar-color`. Adjusted z-indices of background images and removed conflicting background colors from root containers.
- Fixed text boxes displaying a bluish semi-transparent background on performance tier 1 by forcing all Tailwind dark backgrounds (`bg-gray-900`, `bg-gray-950`, `bg-black`) to solid `#000000` with full opacity.

## [2.6.22] - 2026-02-23
### Changed
- Optimized site metadata for SEO by updating the title, description, and keywords with educational and agricultural terminology.
- Updated Open Graph and Twitter card tags for better social sharing.
- Updated the Web App Manifest (site.webmanifest) name and description for consistency with SEO improvements.

## [2.6.21] - 2026-02-23
### Added
- Registered Play Store verification user (`no-reply@example.com`) in Firestore and verified their email to facilitate app store approval.
### Changed
- Replaced the misleading gear icon for "Delete Account" in the Admin Dashboard HUD with a "user-circle-off" icon for better clarity.
- Updated terminology from "Lehrkräfte" (Teachers) to "Administratoren" (Administrators) across the application and documentation for a more universal administrative context.
- Improved contrast and feedback for the delete-account link.
- Removed sensitive `auth_users.json` export file from the repository.

## [2.6.20] - 2026-02-23
### Changed
- Unified modal background styling (Round Settings, Round Result, Financial Report) with the standard glassmorphism look (bg-gray-900/80 + backdrop-blur-md).
- Improved readability in HUD and mobile menus by switching low-contrast text to white.
- Standardized parcel names to be enabled by default on the game board.
- Replaced linter-incompatible opacity text classes with standard Tailwind equivalents.
### Fixed
- Fixed "Namen" (Labels) toggle in the game view which was previously unresponsive.
### Added
- Improved readability across the entire application by replacing low-contrast grey text with white or light grey.
- Updated footer links and version number to black for better contrast against semi-transparent backgrounds.
- Unified primary container styles with modern glassmorphism (bg-gray-900/80 + backdrop-blur-md) across Admin and Game sections.
- Finalized UI consistency by standardizing container backgrounds and alignments across all informational and administrative pages.
### Fixed
- Fixed 404 error for `/.well-known/assetlinks.json` by adding an explicit route in the server and allowing dotfiles in static serving.

## [2.6.17] - 2026-02-23
### Changed
- Standardized container background styling across Admin Dashboard and Game components (Finance, Planting Modal) to use glassmorphism (bg-gray-900/80 + backdrop-blur-md) for UI consistency.
### Fixed
- Fixed internal Table of Contents links on Info and Manual pages by implementing robust manual fragment scrolling logic in `AfterViewInit`.

## [2.6.15] - 2026-02-23
### Added
- Added a Table of Contents sidebar to the "Info" page for better navigation.
### Changed
- Standardized heading styles and alignment across Manual, Info, Impressum, Privacy, and Error pages (all are now left-aligned).
- Standardized subtitle font size (text-xl) and color (white) across Manual, Info, Impressum, and Privacy pages.
- Standardized container width and layout between Manual and Info pages.
- Refined Impressum page by removing the redundant "Verantwortlich" section.
### Fixed
- Fixed inconsistent top gap on the Manual page by standardizing navigation bar behavior.
- Fixed alignment of the Table of Contents on the Manual page to match the header.

## [2.6.14] - 2026-02-23
### Added
- Added a link to the version number in the footer of all pages pointing to the Changelog on GitHub.
- Added unit tests for the 404 "Not Found" page.
### Changed
- Standardized font usage to exclusively use Sans Serif across the entire application, removing all serif font declarations.
### Fixed
- Fixed 404 page layout to prevent overlapping of the "404" text and "Seite nicht gefunden" heading.
- Removed redundant "SOIL" text from the bottom of the 404 page.

## [2.6.13] - 2026-02-23
### Added
- Added a dedicated 404 "Not Found" page for invalid routes.
- Added dedicated "Delete Account" page at `/delete-account` with data purging logic.
- Implemented `deleteAccount` Cloud Function to purge user profile, hosted games, and auth data.
- Added logic to clear `localStorage` for guest users and all data (local & remote) for authenticated users.
- Added Cypress E2E tests for account and data deletion flows.
- Added a pre-commit check to ensure `CHANGELOG.md` is updated before every commit.
### Changed
- Refactored project to remove `@angular/fire` and migrate to the native Firebase SDK.
- Optimized release process: `npm run deploy` now handles `CHANGELOG.md` versioning automatically.
- Updated `GEMINI.md` with instructions for minor version consolidation and mandatory changelog updates.
### Fixed
- Fixed vertical alignment of the "Abbrechen" button on the account deletion page.
- Improved data deletion descriptions to clarify status-based purging.

## [2.6.0] to [2.6.12] - 2026-02-22 to 2026-02-23
### Added
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
