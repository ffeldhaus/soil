# Changelog

All notable changes to this project will be documented in this file.

## [Unpublished]
### Added
- Exposed the public read-only Research REST/CSV API (`https://soil.app/api/research`, `https://soil.app/api/research?format=csv`) and JSON-RPC 2.0 MCP Server (`https://soil.app/api/mcp` and `https://soil.app/mcp`) directly on `soil.app` via SSR Express reverse-proxy routes (`src/server.ts`) and Firebase Hosting rewrites (`firebase.json`).
### Changed
- Updated the `/research` view (`src/app/research/research.ts`) to display and copy the canonical first-party `https://soil.app/api/research` and `https://soil.app/api/mcp` endpoints.
- Configured `lychee.toml` to accept HTTP `403` status codes (`accept = ["100..=103", "200..=299", "403"]`) and `exclude_all_private = true` instead of excluding external URLs that block automated link checkers.

## [3.1.0] - 2026-10-28
### Added
- Added the public **Offene Forschungsdaten** view (`/research`), a rate-limited read-only REST/CSV endpoint (`researchApi`), and a stateless JSON-RPC 2.0 Model Context Protocol server (`researchMcp`) exposing strictly anonymized `research_games` trajectories, summary metrics, crop/input distributions, and empirical strategy clusters (#19).
- Enabled unauthenticated read-only board replay on `/game?gameId=research_...&playerUid=...&viewOnly=true` so educators and researchers can inspect anonymized round-by-round field states without logging in.
- Implemented ecological pest outbreak intensity scaling (`GAME_CONSTANTS.PEST_INTENSITY`) in `GameEngine.calculateYield` and `sources.json` (grounded in Dainese et al., 2019 *Science Advances* & ISIP), dampening pest yield losses in diverse crop rotations (`≤ 20 %` crop share) relative to monocultures (`≥ 50 %` crop share) (#21).
### Changed
- Consolidated agent rules into `AGENTS.md` and on-demand workspace skills in `.agents/skills/` (`soil-release-deploy`, `soil-local-dev-qa`).
- Refactored `GameEngine`, `AiAgent`, Cloud Functions (`functions/src/index.ts`, `functions/src/research.service.ts`), and frontend services/components to reduce cognitive complexity across all 181 files below 15 (`maxAllowedComplexity: 15` in `biome.json`) and enabled Biome's HTML linter (`html.linter.enabled: true`) across all Angular templates (#16, #17).

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

