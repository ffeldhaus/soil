# Changelog

All notable changes to this project will be documented in this file.

## [3.4.8] - 2026-11-04
### Changed
- Added semantic HTML5 landmarks (`<header>`, `<main>`, `<nav>`, `<aside>`, `<footer>`) with descriptive `aria-label` attributes across all public, authentication, admin, super-admin, and game views (`src/app/app.html`, `src/app/landing/landing.html`, `src/app/manual/manual.html`, `src/app/info/info.html`, `src/app/research/research.html`, `src/app/impressum/impressum.html`, `src/app/privacy/privacy.html`, `src/app/auth/*`, `src/app/admin/*`, `src/app/game/board/*`, `src/app/not-found/not-found.ts`).
- Enabled global footer visibility in portrait orientation across all non-`/game` routes (`[class.portrait:hidden]="isGameRoute()"` in `src/app/app.html`, `src/app/app.ts`), ensured scrollable viewport containers (`h-full overflow-y-auto custom-scrollbar`) with bottom footer clearance on compact screens (`375x667` portrait and `844x390` landscape), and added the `Datenschutz` link with a compact single-row legal link bar to the `/game` mobile side menu (`src/app/game/board/board.html`).

## [3.4.7] - 2026-11-04
### Changed
- Self-hosted the `Noto Sans` variable font locally via `@fontsource-variable/noto-sans` (`src/styles.css`, `package.json`), removed all external Google Fonts and third-party `<link rel="preconnect">` tags from `src/index.html` and `src/sw.js`, documented local asset delivery in `/privacy` (`src/app/privacy/privacy.html`) and `AGENTS.md`, and unified `Brachland (Grünbrache / Blühstreifen)` / `Grünstreifen-Prämie` terminology across `public/llms.txt`, `src/server.ts`, `README.md`, `src/app/game/planting-modal/planting-modal.ts`, `src/app/manual/components/manual-crop-card.ts`, `src/app/game/finance/finance.html`, `src/app/info/info.html`, and `src/app/info/info.ts`.

## [3.4.6] - 2026-11-04
### Added
- Added an OER license and TULLU attribution section (`CC BY 4.0` for educational content, media, and open research data; `Apache License 2.0` for source code; EU organic logo exception notice) to `/impressum` (`src/app/impressum/impressum.html`, `src/app/impressum/impressum.ts`, `src/app/impressum/impressum.spec.ts`), added `license` (`https://creativecommons.org/licenses/by/4.0/`) and `creator` (`Dr. Nina Wolf`, `Florian Feldhaus`) metadata to the Schema.org JSON-LD blocks across `src/app/app.routes.ts`, and updated `README.md` for the public GitHub repository.

## [3.4.5] - 2026-11-04
### Fixed
- Resolved Bing Webmaster Tools SEO/GEO analyzer warnings across all routes (`src/index.html`, `src/app/app.routes.ts`) by tightening `<title>` lengths to `<= 57` characters and `<meta name="description">` lengths to `140–153` characters, adding `<link rel="icon" href="/favicon.ico" sizes="48x48" />` first in `src/index.html`, and replacing all 21 empty `alt=""` image attributes across 16 component templates with descriptive German `alt` text.

## [3.4.4] - 2026-11-04
### Added
- Replaced `public/SOIL-screenshot.jpg` with a lossless `public/SOIL-screenshot.png` (`1920x1377` px, `v3.4.3`, enlarged UI and parcel label typography) across `public/site.webmanifest`, OpenGraph/Twitter meta tags (`src/index.html`), trailer poster (`src/app/landing/landing.html`), and video sitemap metadata (`src/app/app.routes.ts`, `src/server.ts`, `public/sitemap.xml`), hid the HUD logout button for unauthenticated local guest sessions (`src/app/game/board/components/board-hud.html`), and added print-ready DIN A4 biology classroom flyers (dark and light print-friendly variants at `2480x3508` px, 300 DPI) along with automated capture/rendering templates and scripts in `marketing/` (`marketing/flyer-dark.html`, `marketing/flyer-light.html`, `marketing/generate-flyer.mjs`, `marketing/capture-screenshot.mjs`, `marketing/SOIL-screenshot.jpg`).
- Added the Nationale Plattform BNE digital quality criteria compliance notice (`Beschluss vom 9. Dezember 2022`, linking to `bne-portal.de`) to the landing page (`src/app/landing/landing.html`) and background/curriculum page (`src/app/info/info.html`).
- Added IndexNow verification key serving (`public/7f4c9e2a1b8d4f6e9c3a5b7d2e1f8a4c.txt`, `src/server.ts`) and automatic post-deployment IndexNow URL submission in `scripts/deploy.js`.

### Changed
- Aligned `<title>`, `<meta name="description">`, Schema.org JSON-LD (`SoftwareApplication` & `LearningResource` `alternateName`, `learningResourceType`, and `keywords`), `<h1>`/`<h2>` headings, and visible copy across `src/index.html`, `src/app/app.routes.ts`, `src/app/landing/landing.html`, `public/llms.txt`, and `src/server.ts` around educator search queries (`Planspiel BNE`, `Planspiel BNE online`, `Online-Planspiel`, and `Simulation` / `Landwirtschaftssimulation`).
- Implemented a tiered `Cache-Control` strategy in `src/server.ts` (edge-cached crawler metadata for `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/.well-known/*`, and IndexNow; `max-age=0, s-maxage=300, stale-while-revalidate=3600, must-revalidate` for HTML documents; 1-year `immutable` for hashed bundles; 1-day/7-day CDN for non-hashed media; `no-store` for `/sw.js` and `.webmanifest`).

## [3.4.3] - 2026-11-01
### Fixed
- Fixed mobile touch responsiveness across `Anbau-Auswahl` (`src/app/game/planting-modal/planting-modal.html`, `src/app/game/planting-modal/planting-modal.ts`), board touch selection (`src/app/game/board/board.html`, `src/app/game/board/board.ts`), and guided tour modal steps (`src/app/game/tour.service.ts`) by adding direct `touchend` tap handlers with synthetic-click deduplication and explicit `ChangeDetectorRef.detectChanges()`, replacing invalid nested `<button>` elements with accessible sibling controls, and removing duplicate `.game-grid` touch listeners.
- Fixed mobile PWA / Service Worker cache invalidation (`src/server.ts`, `src/sw.js`, `src/main.ts`, `src/index.html`) so `/sw.js`, `.html`, and `.webmanifest` responses always carry `Cache-Control: no-cache, no-store, must-revalidate`, SPA navigations use network-first (`cache: 'no-store'`) with Workbox `matchPrecache('/index.csr.html')` offline fallback, and new deployments activate immediately via `skipWaiting()`, `clientsClaim()`, and `cleanupOutdatedCaches()`.

## [3.4.2] - 2026-11-01
### Fixed
- Fixed mobile touch interactions inside the `Anbau-Auswahl` planting modal and board overlays (`src/app/game/board/board.html`, `src/app/game/board/board.ts`, `src/app/game/planting-modal/planting-modal.html`) by moving overlay modals outside `.board-container` and guarding `onTouchStart`/`onTouchMove`/`onTouchEnd`/`onMouseUp` with `isAnyOverlayModalOpen()` and `isInteractiveOrDialogTarget()` so `event.preventDefault()` on field drag-selection no longer suppresses tap/click events or re-opens the planting modal on iOS/Android.

## [3.4.1] - 2026-11-01
### Changed
- Added horizon-adaptive weather grace period (`getGraceRoundsForLimit`: `1` round for `5–7`-round sprints, `2` rounds for `>= 8` rounds), earlier regional contract activation (`Round 2` for `5–7`-round sprints, `Round 3` for `>= 8` rounds), and progressive multi-year root-crop soil exhaustion (`consecutiveYears >= 2` adds `-1.5 * (consecutiveYears - 1)` extra soil loss per consecutive year for potato and sugar beet) across `src/app/game/engine/game-engine.ts`, `functions/src/game-engine.ts`, `src/app/game/board/board.ts`, `src/app/info/info.html`, `src/app/manual/manual.ts`, and the multi-horizon Monte Carlo suite (`functions/src/balance.test.ts`).

## [3.4.0] - 2026-11-01
### Security
- Enforced strict caller authorization on `getGameState(targetUid)` and stripped other players' unsubmitted `pendingDecisions` from non-host responses (`functions/src/index.ts`) to prevent cross-team inspection during active rounds.
- Added sliding-window IP/UID rate limiting (`checkRateLimit` in `functions/src/research.service.ts`) to `playerLogin`, `submitFeedback`, `uploadFinishedGame`, `sendVerificationEmail`, and `sendPasswordResetEmail`, lazy-initialized the Vertex AI `GoogleGenAI` client on cold starts, fixed Firestore batch re-instantiation past 500 operations in `deleteGames`/`undeleteGames`, and ensured `cascadeDeleteAdminUser` and `deleteAccount` clean up orphaned `player-*` Firebase Auth accounts.

### Added
- Added per-parcel causal attribution (`ParcelRoundFactors` in `src/app/types.ts`, `src/app/game/engine/game-engine.ts`, and `functions/src/game-engine.ts`) recording yield multipliers (`baseYield`, `soilFactor`, `nutritionFactor`, `weatherFactor`, `pestFactor`, `machineBonus`, `organicFactor`) and additive soil/nutrition deltas (`soilDelta`, `nutritionDelta`) on every parcel snapshot, and preserved `factors` in anonymized `research_games` exports (`functions/src/research.service.ts`).
- Added causal harvest & soil balance transparency cards to the round result modal (`src/app/game/round-result-modal/`) and parcel inspection strip (`src/app/game/planting-modal/`), an in-place crop manual detail overlay (`selectedInfoCropId`) and quantitative agronomy & cost badges across crop tiles and round settings (`src/app/game/round-settings-modal/`), and dynamic root-cause diagnosis in `AdvisorService` (`src/app/game/advisor/advisor.service.ts`).
- Expanded the finance view (`src/app/game/finance/`) into a 4-metric **Analysen & Finanzbericht** trajectory chart supporting single-select metric tabs for `Finanzen` (`Kapital (€)`), `Nachhaltigkeit` (`Zukunftsfähiger Hof`), `Bodenqualität Ø (%)`, and `Nährstoffe Ø (%)` across all teams.
- Added a host-only `forceAdvanceRound` callable Cloud Function (`functions/src/index.ts`, `src/app/game/game.service.ts`) and teacher dashboard controls (`src/app/admin/dashboard/components/dashboard-game-detail.ts`) with default continuation decisions for unsubmitted teams, masked team PIN toggles (`PINs anzeigen` / `PINs ausblenden`) for classroom projection safety, and 1-click lesson duration presets (`5 Runden · 45 Min.`, `8 Runden · 60 Min.`, `10 Runden · 90 Min.`) in the game creation form (`src/app/admin/dashboard/components/dashboard-create-game.html`).
- Added custom vector SVG action icons and a responsive portrait mobile dropdown menu (`Menü`) in `BoardHudComponent` (`src/app/game/board/components/board-hud.html`, `src/app/game/board/components/board-hud.ts`) so HUD controls never overlap the round progress bar on narrow screens.

### Changed
- Rebalanced short- and medium-horizon classroom sessions (`src/app/game-constants.ts`, `src/app/game/engine/game-engine.ts`, `functions/src/game-engine.ts`, `src/app/manual/manual.ts`): introduced horizon-scaled starting soil quality (`getStartingSoilForRoundLimit`: `-8 %` for 5–7 rounds, `-5 %` for 8–9 rounds), increased potato (`-5.5 %`) and sugar beet (`-4.5 %`) soil degradation to reflect intensive root-crop tillage, and raised the organic market price multiplier (`BIO_MARKET_MULTIPLIER: 1.45`) so regenerative crop rotations and organic conversion amortize within 8–10 rounds.
- Lowered the minimum configurable game length from 10 to 5 rounds (`5–50` rounds) across `createGame` (`functions/src/index.ts`) and the teacher game creation form (`src/app/admin/dashboard/components/dashboard-create-game.html`) to support 45-minute single-lesson school sessions.
- Replaced all 16 native browser `alert()` / `prompt()` dialogs across `board`, `dashboard`, `super-admin`, `admin-login`, `admin-register`, and `delete-account` with custom inline status banners and modal confirmation flows.
- Externalized 7 inline Angular component templates >50 lines (`landing.html`, `admin-login.html`, `privacy.html`, `auth-action.html`, `feedback-modal.html`, `player-login.html`, `delete-account.html`), extracted weekly digest and feedback helpers (`functions/src/digest-feedback.helpers.ts`), added `takeUntilDestroyed()` subscription cleanup across `dashboard.ts`, `super-admin.ts`, `research.ts`, and `manual.ts`, added full keyboard accessibility (`tabindex="0"`, `role="button"`, `Enter`/`Space` activation) to farm parcels (`src/app/game/parcel/`), and removed decorative UI emojis, gradient text, neon glows, and `hover:scale-105` transforms in favor of crisp SVG icons and neutral surfaces.

## [3.3.0] to [3.3.14] - 2026-10-29 to 2026-10-31
### Added
- Added a landing page trailer modal (`data-testid="landing-watch-trailer"`, `data-testid="trailer-modal"` in `src/app/landing/landing.ts`) with a direct faststart MP4 binary (`public/assets/video/soil-trailer.mp4`), German subtitle tracks (`.srt`/`.vtt`), fullscreen autoplay, `VideoObject` structured data in `src/app/app.routes.ts`, and `<video:video>` + `<lastmod>` sitemap metadata in `public/sitemap.xml` and `scripts/deploy.js`.
- Added a comprehensive German school curriculum mapping section (`#curriculum`, covering spiral progression across grades 5–13, difficulty presets, a Bundesland selector, and mandatory curriculum anchors for BNE, Biologie, Geographie / Erdkunde, and Wirtschaft across all 16 Bundesländer) and a collapsible educator FAQ section (`#faq`) with `FAQPage` + `AboutPage` Schema.org JSON-LD to `/info` (`src/app/info/info.html`, `src/app/info/info.ts`, `src/app/app.routes.ts`).
- Added Lighthouse Agentic Browsing discovery support with `/llms.txt` (`public/llms.txt`), Agent Resource Discovery manifests (`public/.well-known/ard.json` and `public/.well-known/ai-catalog.json`), `<link rel="ard" href="/.well-known/ard.json" />` in `src/index.html`, and explicit Express handlers plus a `404` catch-all for unknown `/.well-known/*` probes in `src/server.ts`.

### Changed
- Redesigned `Finanzbericht` (`src/app/game/finance/finance.ts`, `src/app/game/finance/finance.html`) with `100.000 €` initial capital in the chart history, dynamic Y-axis scaling (`getMinCapital()` / `getMaxCapital()`), distinct team colors, a header round switcher (`R1`…`RN`), always-visible strategy badges (`Entscheidungen`), active-crop filtering (`getActiveSeedCrops()` / `getActiveHarvestCrops()`), and full breakdown rows for mineral fertilizer, overdraft interest, and regional contract bonuses.
- Unified the nutrition terminology from `Mineralstoffe` to `Nährstoffe` across the HUD, board modals, advisor service, manual crop cards, game constants, and landing page trailer video.
- Compacted `Hof-Auszeichnungen` in the sticker album modal (`src/app/game/board/board.html`) and round result modal (`src/app/game/round-result-modal/round-result-modal.html`) into horizontal thumbnail badges, promoted weather and pest conditions to a top-of-modal status strip (`data-testid="round-conditions-strip"`), and updated the harvest overlay (`src/app/game/parcel/`) to display `Weidehaltung` and `Grünbrache` with neutral green tinting instead of `0 dt (0%)`.
- Aligned the layout width (`max-w-6xl`), header, and section card styling of `/impressum` (`src/app/impressum/impressum.ts`) and `/privacy` (`src/app/privacy/privacy.ts`) with `/manual`, `/info`, and `/research`, and standardized German typography across `/info`, `/manual`, and `/privacy`.

### Fixed
- Excluded `/assets/video/**` from `src/ngsw-config.json` so HTTP `206 Range` video streaming works reliably on Firebase App Hosting, updated `/sitemap.xml` and prerendered `<route>/index.html` serving in `src/server.ts`, allowed crawlers in `public/robots.txt` to read `noindex, nofollow` meta tags on auth and legal routes, and resolved Google Search Console Rich Result metadata warnings on `/` and `/research`.
- Fixed HUD header button overlap at narrow desktop widths (`src/app/game/board/components/board-hud.html`) and immediate change detection when switching `?gameId=...` on a mounted `Board` (`src/app/game/board/board.ts`).

## [3.2.0] to [3.2.3] - 2026-10-29
### Added
- Implemented declarative route-driven SEO (`RouteSeoData` in `src/app/app.routes.ts` and `App` in `src/app/app.ts`) with per-route `<title>`, `<meta name="description">`, `<meta name="robots">`, Open Graph / Twitter Card tags, canonical `<link rel="canonical">`, and Schema.org JSON-LD (`SoftwareApplication`, `LearningResource`, `TechArticle`, `AboutPage`, and `Dataset`).
- Added a 1-click **Sofort spielen** button (`data-testid="landing-quick-play"`) on the landing page (`src/app/landing/landing.ts`) that immediately creates and launches a default 10-round local single-player game against 3 AI farms.
- Added deterministic weather and pest seed support (`GameEngine.seededRandom`, `GameEngine.rollWeather`, `GameEngine.rollRoundEvents` in `src/app/game/engine/game-engine.ts` and `functions/src/game-engine.ts`, and `LocalGameService` in `src/app/game/engine/local-game.service.ts`) so local games and friend challenges replay identical weather and pest trajectories.
- Added a shareable end-of-game scorecard and friend challenge link (`data-testid="share-scorecard-btn"` and `data-testid="challenge-result-banner"` in `src/app/game/board/board.html` and `src/app/game/board/board.ts`) plus challenge banner & launch support on the landing page (`data-testid="challenge-banner"` in `src/app/landing/landing.ts`).
- Added a reusable history-aware `BackButtonComponent` (`src/app/shared/back-button/back-button.ts`) with a segmented `SOIL` home logo link (`routerLink="/"`), header **Drucken** actions on `/manual` and `/info`, and an in-game feedback button (`data-testid="hud-feedback-button"`) in `BoardHudComponent`.
- Added opt-in / optional contact email capture to `FeedbackModal` (`src/app/admin/components/feedback-modal/feedback-modal.ts`), the game-end feedback form (`src/app/game/board/board.html`, `src/app/game/board/board.ts`), and `submitFeedback` (`functions/src/index.ts`) so logged-in educators can include their email address via toggle and guests can optionally provide an email address for follow-up replies.
- Added the scheduled Cloud Function `weeklyActivityDigest` (`every monday 08:00` `Europe/Berlin`) and `sendWeeklyActivityDigest()` helper in `functions/src/index.ts` to email a 7-day summary of completed research games, active cloud games, pending educator accounts, and recent feedback to super-administrators.
- Added 301 redirects in `src/server.ts` from legacy localized URLs (`/de/*`, `/en/*`, `/en-US/*`) to canonical root paths.
### Changed
- Enabled build-time static prerendering (`"prerender": true` in `angular.json` and `RenderMode.Prerender` in `src/app/app.routes.server.ts`) for `/`, `/manual`, `/info`, `/research`, `/admin`, `/impressum`, and `/privacy`, and removed `@defer (hydrate on viewport)` around `#info-section` on the landing page so full semantic HTML and internal links are immediately crawlable.
- Removed the fixed top `<nav>` bar from all non-HUD views (`/`, `/manual`, `/info`, `/research`, `/impressum`, `/privacy`, `/admin/login`, `/admin/register`, `/game-login`, `/delete-account`) in favor of `BackButtonComponent` inside page headers, and cleaned up legacy `*ngIf`, empty `@defer`, and redundant `<ng-container>` blocks.
- Made feedback text comments optional in `FeedbackModal`, the game-end feedback form (`src/app/game/board/board.html`), and the `submitFeedback` Cloud Function (`functions/src/index.ts`) so players can submit 1-click star ratings at any point during or after a game, and updated feedback buttons to use the Material Design feedback icon.
- Refined the landing page `Über das Spiel` and `Nachhaltigkeit` cards (`src/app/landing/landing.ts`) with BNE/subject keywords (`Biologie`, `Geographie`, `Wirtschaft`, `Sekundarstufe I & II`, `Wissens-Handlungs-Lücke`), clear instant single-player vs. verified teacher account explanations, a direct link to `/research`, and updated `/privacy` (`src/app/privacy/privacy.ts`) to document optional contact email submission for feedback replies.
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

