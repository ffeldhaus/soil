# Changelog

All notable changes to this project will be documented in this file.

## [3.2.2] - 2026-10-29
### Added
- Added opt-in / optional contact email capture to `FeedbackModal` (`src/app/admin/components/feedback-modal/feedback-modal.ts`), the game-end feedback form (`src/app/game/board/board.html`, `src/app/game/board/board.ts`), and `submitFeedback` (`functions/src/index.ts`) so logged-in educators can include their email address via toggle and guests can optionally provide an email address for follow-up replies.
- Added the scheduled Cloud Function `weeklyActivityDigest` (`every monday 08:00` `Europe/Berlin`) and `sendWeeklyActivityDigest()` helper in `functions/src/index.ts` to email a 7-day summary of completed research games, active cloud games, pending educator accounts, and recent feedback to super-administrators.
### Changed
- Updated feedback buttons in `src/app/game/board/components/board-hud.html` and `src/app/admin/dashboard/dashboard.html` to use the Material Design feedback icon, and updated `/privacy` (`src/app/privacy/privacy.ts`) and `AGENTS.md` to document optional contact email submission for feedback replies.

## [3.2.1] - 2026-10-29
### Changed
- Added a segmented `SOIL` home logo link (`routerLink="/"`) alongside the history-aware `Zurück` button in `BackButtonComponent` (`src/app/shared/back-button/back-button.ts`).

## [3.2.0] - 2026-10-29
### Added
- Implemented declarative route-driven SEO (`RouteSeoData` in `src/app/app.routes.ts` and `App` in `src/app/app.ts`) with per-route `<title>`, `<meta name="description">`, `<meta name="robots">`, Open Graph / Twitter Card tags, canonical `<link rel="canonical">`, and Schema.org JSON-LD (`SoftwareApplication`, `LearningResource`, `TechArticle`, `AboutPage`, and `Dataset`).
- Added a 1-click **Sofort spielen** button (`data-testid="landing-quick-play"`) on the landing page (`src/app/landing/landing.ts`) that immediately creates and launches a default 10-round local single-player game against 3 AI farms.
- Added a reusable history-aware `BackButtonComponent` (`src/app/shared/back-button/back-button.ts`), header **Drucken** actions on `/manual` and `/info`, and an in-game feedback button (`data-testid="hud-feedback-button"`) in `BoardHudComponent`.
- Added 301 redirects in `src/server.ts` from legacy localized URLs (`/de/*`, `/en/*`, `/en-US/*`) to canonical root paths.
### Changed
- Enabled build-time static prerendering (`"prerender": true` in `angular.json` and `RenderMode.Prerender` in `src/app/app.routes.server.ts`) for `/`, `/manual`, `/info`, `/research`, `/admin`, `/impressum`, and `/privacy`, and removed `@defer (hydrate on viewport)` around `#info-section` on the landing page so full semantic HTML and internal links are immediately crawlable.
- Removed the fixed top `<nav>` bar from all non-HUD views (`/`, `/manual`, `/info`, `/research`, `/impressum`, `/privacy`, `/admin/login`, `/admin/register`, `/game-login`, `/delete-account`) in favor of `BackButtonComponent` inside page headers, and cleaned up legacy `*ngIf`, empty `@defer`, and redundant `<ng-container>` blocks.
- Made feedback text comments optional in `FeedbackModal`, the game-end feedback form (`src/app/game/board/board.html`), and the `submitFeedback` Cloud Function (`functions/src/index.ts`) so players can submit 1-click star ratings at any point during or after a game.
- Refined the landing page `Über das Spiel` and `Nachhaltigkeit` cards (`src/app/landing/landing.ts`) with BNE/subject keywords (`Biologie`, `Geographie`, `Wirtschaft`, `Sekundarstufe I & II`, `Wissens-Handlungs-Lücke`), clear instant single-player vs. verified teacher account explanations, a direct link to `/research`, and fixed the `"dieses concept"` typo.
- Aligned `public/sitemap.xml`, `public/robots.txt`, and `src/server.ts` so `sitemap.xml` lists only indexable public pages (`/`, `/manual`, `/info`, `/research`, `/admin`) while allowing `/impressum` in `robots.txt` so crawlers can process its `<meta name="robots" content="noindex, nofollow">` directive.
### Fixed
- Fixed a sticky `<meta name="robots" content="noindex">` bug when navigating from `/impressum` or `/privacy` back to indexable pages by managing `robots` declaratively on every route navigation.

## [3.1.0] to [3.1.1] - 2026-10-28 to 2026-10-29
### Added
- Added the public **Offene Forschungsdaten** view (`/research`), a rate-limited read-only REST/CSV endpoint (`researchApi`), and a stateless JSON-RPC 2.0 Model Context Protocol server (`researchMcp`) exposing strictly anonymized `research_games` trajectories, summary metrics, crop/input distributions, and empirical strategy clusters (#19), served directly under `https://soil.app/api/research` and `https://soil.app/api/mcp` via SSR Express reverse-proxy routes (`src/server.ts`) and Firebase Hosting rewrites (`firebase.json`).
- Enabled unauthenticated read-only board replay on `/game?gameId=research_...&playerUid=...&viewOnly=true` so educators and researchers can inspect anonymized round-by-round field states without logging in.
- Implemented ecological pest outbreak intensity scaling (`GAME_CONSTANTS.PEST_INTENSITY`) in `GameEngine.calculateYield` and `sources.json` (grounded in Dainese et al., 2019 *Science Advances* & ISIP), dampening pest yield losses in diverse crop rotations (`≤ 20 %` crop share) relative to monocultures (`≥ 50 %` crop share) (#21).
### Changed
- Consolidated agent rules into `AGENTS.md` and on-demand workspace skills in `.agents/skills/` (`soil-release-deploy`, `soil-local-dev-qa`).
- Refactored `GameEngine`, `AiAgent`, Cloud Functions (`functions/src/index.ts`, `functions/src/research.service.ts`), and frontend services/components to reduce cognitive complexity across all 181 files below 15 (`maxAllowedComplexity: 15` in `biome.json`) and enabled Biome's HTML linter (`html.linter.enabled: true`) across all Angular templates (#16, #17).
- Configured `lychee.toml` to accept HTTP `403` status codes (`accept = ["100..=103", "200..=299", "403"]`) and `exclude_all_private = true`, and updated `firebase-tools` (`15.34.2`).

## [3.0.0] to [3.0.1] - 2026-10-27
### Added
- Added Audience & Difficulty presets (`Einsteiger / Unterstufe`, `Standard / Mittelstufe`, `Profi / Oberstufe`) to the game creation UI and backend/local game initialization, configuring 5-zone starting field distributions, weather forecast precision, overdraft interest (`0 %` / `6 %` / `10 %`), and insolvency limits.
- Implemented a 2-round weather grace period at game start, full-sentence seasonal weather forecasts (`Prognose`), late-game climate escalation on `hard` difficulty, and the `Hitzewelle` (`HeatWave`) weather event.
- Added scientifically and policy-grounded 3-round Regional Contracts (`Leguminosen-Initiative`, `Humus-Pakt`, `Brotgetreide-Vertrag`, `Öko-Pionier`) starting in Round 3, modeled after German GAP 2024/2025 Eco-Schemes (`ÖR 1a`, `ÖR 2`, `ÖR 6`) and peer-reviewed agronomy literature (`sources.json`).
- Introduced the unified **Zukunftsfähiger Hof** (Sustainability & Viability) primary score combining financial health and living soil (`avgSoil`), accompanied by an animated round leaderboard (also accessible live in the `Team & Hof-Auszeichnungen` modal), 8 collectible **Hof-Sticker** milestones, and custom square artwork across weather, pests, contracts, and stickers.
- Added an accessible pre-decision crop rotation (`Fruchtfolge`), soil impact, and requirement preview inside the planting modal (shown when selected parcels share a uniform previous crop), as well as `Fruchtfolge ▼` warnings and `dt` harvest units on board parcels.
### Changed
- Replaced glassmorphism (`backdrop-blur`, `backdrop-filter`, `rounded-3xl`, and dynamic `PerformanceService` tiering) across the entire application with a crisp, high-contrast, opaque surface hierarchy (`bg-gray-900` / `bg-gray-950`) and a semi-transparent blur-free global footer (`bg-gray-950/85`).
- Redesigned `/manual` (`Handbuch`) and `/info` (`Hintergrund`) with a responsive 2-column Table of Contents layout, external crop rotation flow arrows (`→ [ Kultur ] →`), combined **Zentrale Forschungsarbeit & Publikationen** (`#research` & `#publications`) at the top of `/info` with direct links to Dr. Nina Wolf's 2014 dissertation and public references, and global German auto-hyphenation (`hyphens: auto`, `text-wrap: pretty`).
- Standardized all user-facing copy across the game, manual, legal pages, and authentication flows to use informal `"du"` or neutral phrasing instead of formal `"Sie"`.
- Conditionally hid inactive Pest and Challenge side cards on the game board so only active round events and the Weather + Prognose card are displayed.
- Updated and expanded frontend unit tests (`Vitest`), backend & balancing tests (`functions`), and all 12 Cypress E2E test suites (`cypress/e2e/`).
- Updated frontend dependencies within semver constraints (`@angular/cli`, `@angular/build`, `@angular/ssr`, `@analogjs/*`, `firebase-tools`, `postcss`, `autoprefixer`).
### Fixed
- Fixed text clipping on compound weather labels such as `Starkregen/Hochwasser` in the game board weather card and HUD popover by allowing line breaks after slashes (`/\u200B`) with `break-words`.

## [2.6.0] to [2.6.31] - 2026-02-22 to 2026-10-20
### Security
- Locked down `firestore.rules` and `storage.rules` (`allow read, write: if false`) so all data access goes through authenticated Cloud Functions.
- Enforced strict role and caller authorization across `setAdminRole`, `calculateNextRound`, `triggerAiTurn`, and `saveDraft`, added HTML escaping and origin validation across email/feedback functions, and replaced `Math.random()` with `crypto.randomInt()` for PIN generation.
### Added
- Implemented the agricultural advisor (`GameAdvisorComponent`), interactive Shepherd.js guided tour (`TourService`), GDPR-compliant privacy policy (`/privacy`), account and local data deletion (`/delete-account`), 404 Not Found page, Android TWA `assetlinks.json` verification route, and comprehensive unit/E2E test suites with coverage thresholds.
### Changed
- Migrated from `@angular/fire` to the native Firebase SDK and unified Cloud Functions tests under Vitest.
- Standardized navigation headers, SEO metadata, and `SOIL` branding across all views.
### Fixed
- Made `uploadGameForResearch` idempotent (`research_<gameId>`), prevented test games/accounts from polluting research analytics, archived active multiplayer games prior to deletion, and excluded static SEO/TWA files from Service Worker navigation fallbacks.

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

