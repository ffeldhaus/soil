# Changelog

All notable changes to this project will be documented in this file.

## [Unpublished]
### Added
- **7 individuelle Schädlings-Illustrationen** (`oat-rust.jpg`, `nematode.jpg`, `aphid-cereal.jpg`, `pea-moth.jpg`, `corn-borer.jpg`, `pollen-beetle.jpg`, `swine-fever.jpg` in `public/assets/images/pests/` und `src/app/game/board/board.ts`), sodass alle 9 Schädlinge eindeutige Einzelbilder besitzen.
- **MUNDO – Bildungsmediathek der Länder** (`mundo.schule`, SODIX-ID `SODIX-0001172770`) als bestätigte Live-Verlinkung in `marketing/verlinkungen.md` und `KNOWN_BACKLINKS` (`src/app/types.ts`) unter `/admin/super` aufgenommen sowie `checkBacklinkStatus` (`functions/src/backlinks.service.ts`) um optionale `verificationUrl`-Prüfung für öffentliche JSON-Quell-Endpunkte von SPA-Mediatheken erweitert.
- **Aktive Einzelspieler-gegen-KI-Spiele (`≥ 1 Runde`)** unter `/admin/super` (`src/app/shared/telemetry.service.ts`, `src/app/game/engine/local-game.service.ts`, `src/app/landing/landing.ts`, `functions/src/telemetry.service.ts`, `functions/src/index.ts`, `src/app/admin/super-admin/*`): Rein numerische, PII-freie 30-Tage-Aktivitätsberechnung (`quick_game_round_1 - quick_game_finished - quick_game_deleted`), einheitliches `quick_game_started`-Tracking direkt in `LocalGameService.createGame()` sowie kombinierte `Cloud · KI`-Ausweisung im Live-Status-Streifen und unter *Lehrkräfte & System*.

### Changed
- **Spielfeld-, Berater- & Abschluss-UX über alle Gerätekategorien** (`src/app/game/parcel/parcel.html`, `src/app/game/board/*`, `src/app/game/advisor/*`, `src/app/game/round-result-modal/round-result-modal.html`):
  - Qualitative Ertragsverlust-Stufen (`gering`, `mäßig`, `stark`) im **Landwirtschaftlichen Berater** statt Prozentwerten sowie einheitliche Buttons für **Details in Analysen öffnen →** und **Details im Handbuch lesen**.
  - Skalierende Container-Query-Schriftgrößen auf Parzellen (`Fruchtfolge ▼`, Boden/Nährstoffe mit größerem Abstand) und Side-Cards, einheitliche Kategorie-Kopfzeilen (`Wetter`, `Aktive Schädlinge`, `Regionale Aktion`), kompakte `2:1`-Popover-Bilder im Portrait-Modus sowie optimierte Side-Cards auf sehr niedrigen Querformaten (z. B. Samsung Z Fold 8 Cover).
  - Kontextuelle Snackbar-Hinweise mit automatischem Ausblenden, maximal 1 Hinweis pro Runde und dauerhaftem Ausblenden nach Nutzung der jeweiligen Aktion; EU-Bio-Siegel im Rundenergebnis nur noch bei erfüllten Kriterien anzeigen.
  - Neugestaltetes **Spiel beendet!**-Modal mit gemaltem Bauernhof-Banner, persönlicher Hof-Bilanz (**Deine Leistung** inkl. Kapital-Delta, Ø-Bodenqualitäts-Balken und freigeschalteten Hof-Stickern), kompaktem 3er-Podium, hervorgehobener eigener Ranglisten-Zeile und einklappbarem Feedback-Formular.
- **Einzelspieler-Funnel (Mensch gegen KI) & Super-Admin-Übersicht** unter `/admin/super` (`src/app/admin/super-admin/components/super-admin-stats.*`, `super-admin-users.html`, `super-admin.html`): Funnel ab `R1 = 100%` inkl. `[12, 15, 20]`-Meilensteinen, aktivem Zeitraum-Label neben `Gestartet`, `Gelöscht`-Anzeige, 1-zeiligem Hinweis auf variable Klassenrundenlängen (`5–6` / `10–20`), Datenqualitäts-Warnbanner bei unplausibler Zählerdifferenz sowie `30-Tage-Fenster`-Tooltip auf den aktiven Spielen.
- Frontend-Abhängigkeiten (`autoprefixer`, `firebase-tools`) innerhalb der Semver-Grenzen aktualisiert (`package-lock.json`).

### Fixed
- **Lokale Spiel-Migration & `migrateLocalGame`-Stabilität** (`src/app/game/sync.service.ts`, `src/app/game/engine/local-game.service.ts`, `functions/src/index.ts`): Aktiv gespielte `in_progress`-Lokalspiele werden bei `saveDraft`/Runden-Updates nicht mehr vorzeitig migriert oder gelöscht; Migrations-Löschungen unterdrücken `quick_game_deleted`-Telemetrie, setzen den aktiven `LocalGameService`-State bei Hard-Delete auf `null` (verhindert Wiederherstellung in `localStorage`) und `migrateLocalGame` läuft nun mit `512MiB` Speicher sowie deterministischen Dokument-IDs + Transaktions-Idempotenz gegen parallele Doppel-Aufrufe.
- **Klassenzimmer-taugliche Telemetrie-Bündelung & `429`-Retry** (`src/app/shared/telemetry.service.ts`, `functions/src/telemetry.service.ts`): Client-Events werden über ein `2,5s`-Debounce-Fenster (mit Sofort-Flush bei `pagehide`/`visibilitychange`) zu einzelnen POSTs gebündelt, bei `HTTP 429`/`5xx`/Netzwerkfehler in RAM wiederhergestellt und mit begrenztem exponentiellem Backoff wiederholt; das serverseitige IP-Limit für `/api/telemetry` wurde für geteilte Schul-NAT-IPs von `60` auf `300` Anfragen/Minute erhöht.

## [3.5.4] - 2026-11-19
### Changed
- **Sofort-Spiel-Funnel** unter `/admin/super` (`src/app/admin/super-admin/components/super-admin-stats.*`) von der 13-zeiligen Liste auf ein kompaktes vertikales Säulendiagramm mit `Erste Aussaat`-/Abschlussrate, Hover-Details und `Unbekannt`-Anzeige für historische Zeiträume ohne Runden-Tracking (vor `v3.5.3`) umgestellt.

## [3.5.3] - 2026-11-19
### Added
- Anonymen, UUID-freien Sofort-Spiel-Funnel (`quick_game_first_plant`, `quick_game_round_1` bis `quick_game_round_20`, `quick_game_finished`) in `TelemetryService` (`src/app/shared/telemetry.service.ts`, `functions/src/telemetry.service.ts`), `BoardComponent`, `LocalGameService` und `/privacy` (`src/app/privacy/privacy.html`) sowie eine eigene Funnel-Auswertung im Super-Admin-Dashboard (`src/app/admin/super-admin/components/super-admin-stats.*`) ergänzt.
- Positives Berater-Feedback (`Starke Artenvielfalt`, `Ausgewogene Nährstoffbilanz`) sowie eine Sicherheitsabfrage bei komplett unbepflanztem Acker (*„Noch nichts angebaut“*) ergänzt.

### Changed
- Einstieg und Spielfeld-Bedienung im Sofort-Spiel überarbeitet (`src/app/game/board/*`, `src/app/game/planting-modal/planting-modal.html`): Bodenqualität und Nährstoffe direkt eingeblendet, kontextuelle `localStorage`-Snackbars für Erstschritte ergänzt, Runde 0 als `Ausgangslage` (und Folgerunden als `Jahr X von Y`) benannt, mobilen `Weiter`-Button und 360px-Kopfleiste (Galaxy A-Series) ohne Überlauf angepasst sowie Crop-Namen im Pflanzen-Modal auf schmalen Smartphones lesbar gehalten.
- Rundenergebnis-Modal (`src/app/game/round-result-modal/*`) entschlackt: **Landwirtschaftlichen Berater** nach oben gezogen, gleichartige Ertragsverlust-Meldungen im `AdvisorService` (`src/app/game/advisor/advisor.service.ts`) zu jeweils einer kompakten Karte gebündelt, Berater auf `hard` deaktiviert, Einnahmen/Ausgaben durch direkten Link **Details in Analysen öffnen →** ersetzt, *Ursachen-Analyse* auf `normal` eingeklappt und mobiles Leaderboard ohne `+1`/`-1`-Badges formatiert.

## [3.5.2] - 2026-11-18
### Added
- Kuratiertes Backlink- und OER-Verzeichnis (`marketing/verlinkungen.md`) sowie die Status-Übersicht **Bekannte Verlinkungen & Bildungsportale** (`SuperAdminBacklinksComponent` in `src/app/admin/super-admin/components/super-admin-backlinks.*`) inklusive serverseitiger On-Demand-Linkprüfung (`checkBacklinkStatus` in `functions/src/backlinks.service.ts` und `functions/src/index.ts`, `src/app/types.ts`, `src/app/game/game.service.ts`) unter `/admin/super` ergänzt: dokumentiert bestätigte Live-Verlinkungen (`bpb.de`, `globaleslernen.de`, `hubbs.schule`, `github.com`, `youtube.com`), laufende Prüfungen (`bne-portal.de`) und offene OER-Potenziale samt SEO-Wirkung, Referrer-Verhalten (`noreferrer` vs. sichtbarer Referrer) und direkter HTTP-/Zielverweis-Verifikation.

### Changed
- SEO-/GEO-Metadaten und sichtbare `<h1>`-Hierarchie aller indexierbaren Routen auf Google- und Bing-Richtwerte geschärft (`src/app/app.routes.ts`, `src/index.html`, `public/site.webmanifest`, `src/app/landing/landing.html`, `src/app/manual/manual.ts`, `src/app/admin/dashboard/dashboard.html`, `src/app/app.html`, `src/app/seo-consistency.spec.ts`): `<title>`-Längen auf `49–59` Zeichen (`<= 60`) und `<meta name="description">`-Texte auf `148–155` Zeichen (`145–160`) vereinheitlicht sowie `.sr-only`-`<h1>`-Elemente auf `/`, `/manual` und `/admin` durch durchgängig sichtbare, sprechende `<h1>`-Überschriften (`<= 140` Zeichen) ersetzt.
- Firebase-Auth-Client (`FIREBASE_AUTH` in `src/app/app.config.ts` und `src/app/auth/auth.service.ts`) auf `initializeAuth` ohne vorab registrierten `popupRedirectResolver` umgestellt (`browserPopupRedirectResolver` wird erst bei explizitem Google-/Apple-Popup-Login übergeben), sodass das versteckte OAuth-Hilfs-Iframe (`firebaseapp.com/__/auth/iframe`) auf öffentlichen Seiten wie `/` und `/game` entfällt.
- Wöchentlichen Super-Admin-Aktivitätsbericht (`weeklyActivityDigest` / `sendWeeklyActivityDigest` / `buildWeeklyDigestEmail`) in `functions/src/digest-feedback.helpers.ts` und `functions/src/index.ts` (inklusive Unit-Tests in `functions/src/digest-feedback.helpers.test.ts`) um **Zugriffe & Interaktionen (Letzte 7 Tage)** erweitert: 7-Tage-Seitenaufrufe inklusive Vorwochen-Vergleich (`Trend`), Kanal-Split (`Web` vs. `PWA`) und Gesamtzähler, ausgelöste Interaktionen (`Sofort-Spiele`, `Trailer`, `Forschungs-Exporte`), Top-5 meistbesuchte Seiten, Top-6 Referrer sowie direkter Konsolen-Link auf `/admin/super`.

## [3.5.1] - 2026-11-16
### Added
- Stundengenaue `24 Std.`-Zeitreihenansicht (analog zur Google Search Console) unter `/admin/super` ergänzt (`src/app/admin/super-admin/components/super-admin-stats.*`, `functions/src/telemetry.service.ts`, `functions/src/index.ts`, `src/app/types.ts`, `src/app/privacy/privacy.html`): Atomare Stunden-Aggregation in `telemetry_hourly` mit automatischer 72-Stunden-Bereinigung im täglichen Wartungslauf (`dailyGamePurge`), 24-Stunden-Verlaufsdiagramm in lokaler Uhrzeit inklusive Stunden-Tooltip sowie zeitraumsynchronisierten Metrik-Kacheln und Aufschlüsselungen für Seiten, Aktionen und Referrer.

## [3.5.0] - 2026-11-16
### Security
- Cloud Logging in `soil-602ea` auf EU-Datenhaltung und strikte Datenminimierung gehärtet: `_Default`-Sink auf einen dedizierten `europe-west4`-Bucket (`eu-operational-logs`) mit `7` Tagen Aufbewahrungsfrist umgestellt, reguläre `2xx`/`3xx`-HTTP-Zugriffsprotokolle (`run.googleapis.com/requests`) per Exclusion-Filter vollständig von der Speicherung ausgeschlossen und die Vorhaltezeit des Alt-Buckets `global/_Default` auf das Minimum von `1` Tag reduziert.
- Query-Strings (`req.originalUrl` -> `req.path`) sowie die Anfrageprotokollierung pro Seitenaufruf aus `src/server.ts` und personenbezogene Lehrkräfte-/Admin-E-Mail-Adressen aus Warn- und Fehlerprotokollen in `functions/src/index.ts` entfernt; Abschnitt `4. Hosting und Infrastruktur` in `/privacy` (`src/app/privacy/privacy.html`) entsprechend präzisiert.

### Added
- Konfigurierbare Zeitreihen-Analyse (analog zur Google Search Console) und modulare Tab-Oberfläche unter `/admin/super` ergänzt (`src/app/admin/super-admin/*`, `functions/src/telemetry.service.ts`, `src/app/types.ts`): 400-Tage-Zeitreihe (`dailySeries`) mit Schnellfiltern (`7 Tage`, `28 Tage`, `3 Monate`, `12 Monate`, `Gesamt`, `Benutzerdefiniert` via Von/Bis-Datumsauswahl), umschaltbaren Metrik-Reihen (`Aufrufe gesamt`, `Web-Browser`, `PWA / App`, `Interaktionen`), interaktivem Tages-Tooltip sowie zeitraumsynchronisierten Aufschlüsselungen für Seiten (inklusive `/trailer`), Aktionen und Referrer.

### Changed
- SEO- und OER-Sichtbarkeit für deutschsprachige Fach-Suchanfragen ausgebaut (`src/app/app.routes.ts`, `src/index.html`, `public/site.webmanifest`, `src/app/landing/landing.html`, `src/app/info/*`, `src/app/manual/manual.ts`, `public/sitemap.xml`, `public/llms.txt`, `src/server.ts`): Titel, Meta-Descriptions, Überschriften und `LearningResource`/`FAQPage`-Strukturdaten gezielt um `Unterrichtsmaterial (OER)` für `Biologie`, `Erdkunde`, `Geografie` und `Wirtschaft` (BNE) ergänzt, `INFO_FAQ_ITEMS` als einzige FAQ-Quelle in `InfoComponent` verdrahtet und alle 16 Bundesländer-Lehrpläne über `hidden="until-found"` vollständig indexierbar und per Browser-Suche auffindbar gemacht.
- Routen-, SSR- und SEO-Basis bereinigt (`src/app/app.routes.ts`, `src/app/app.routes.server.ts`, `src/app/app.config.server.ts`, `src/app/app.config.ts`): Gemeinsame `INFO_FAQ_ITEMS` ohne starre Rundenzahlen oder Jahrgangsschranken, vereinheitlichtes Schema.org-Markup (`WebSite`, `operatingSystem: 'Web, iOS, Android'`, `educationalLevel`), explizite Client-Routen für `auth/action`-Pfade sowie `null`-Stubs für Firebase-Client-Tokens im SSR-Kontext.
- Service-Worker-Bootstrap in `src/main.ts` optimiert: `workbox-window` wird erst nach dem App-Bootstrap dynamisch nachgeladen, und automatische Update-Reloads werden zusätzlich bei `/auth/action`, offenen Dialogen und fokussierten Formularfeldern sicher zurückgehalten.
- `@fileoverview`-Header-Konvention für zentrale Einstiegs-, Service- und Engine-Dateien in `AGENTS.md` dokumentiert.
- Frontend-Abhängigkeiten innerhalb der Semver-Grenzen aktualisiert (`package-lock.json`).

### Fixed
- Ladezustand, Cold-Reload-Authentifizierung und Lokalisierung unter `/admin/super` sowie Referrer-Telemetrie repariert (`src/app/auth/auth.service.ts`, `src/app/admin/super-admin/*`, `src/app/shared/telemetry.service.ts`): Schwarzes `bg-gray-950`-Vollflächen-Overlay und `32px`-Header-Sprung durch passgenaue Skeleton-Karten (`0px` CLS) ersetzt, vorzeitigen Login-Redirect beim Seiten-Reload über `authStateReady$` behoben, fehlenden Avatar-Fallback im HUD sowie englische Resttexte bereinigt und Doppelzählungen identischer Referrer bei Tab-Reloads und Zurück/Vor-Navigationen speicherfrei über `PerformanceNavigationTiming` (ohne `localStorage` oder `sessionStorage`) verhindert.
- Express-Edge-Gateway in `src/server.ts` (inklusive Regressionstests in `src/server.spec.ts`) gehärtet: Basis-Security-Header (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, Deaktivierung von `x-powered-by`), `/__/auth/action`-Auslieferung, `405`-Abweisung für fremde Nicht-`GET`/`HEAD`-Requests ohne Starten der SSR-Engine, Proxy-Timeout (`15s`), UTF-8-Charset für `robots.txt`/`sitemap.xml`, verlängertes Cloud-CDN-SWR-Fenster sowie horizontale Safe-Areas und `:focus-visible` auf der 404-Seite.

## [3.4.0] to [3.4.21] - 2026-11-01 to 2026-11-12
### Security
- Enforced strict caller authorization on `getGameState(targetUid)` and stripped other players' unsubmitted `pendingDecisions` from non-host responses (`functions/src/index.ts`) to prevent cross-team inspection during active rounds.
- Added sliding-window IP/UID rate limiting (`checkRateLimit` in `functions/src/research.service.ts`) to `playerLogin`, `submitFeedback`, `uploadFinishedGame`, `sendVerificationEmail`, and `sendPasswordResetEmail`, lazy-initialized the Vertex AI `GoogleGenAI` client, chunked Firestore batches past 500 operations in `deleteGames`/`undeleteGames`, and cleaned up orphaned `player-*` Firebase Auth accounts on account deletion.
- Self-hosted the `Noto Sans` variable font locally via `@fontsource-variable/noto-sans`, removed all external Google Fonts and third-party `<link rel="preconnect">` tags (`src/index.html`, `src/sw.js`), and enforced automatic `Do Not Track (DNT)` and `Global Privacy Control (GPC)` opt-out across client telemetry, SSR proxy headers, and `recordTelemetry`.

### Added
- Added native Capacitor 8 apps for iOS/iPadOS (`app.soil`, including versioned `ios/App/App.xcodeproj`, Xcode Cloud `ci_post_clone.sh`, and automated `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` sync in `scripts/deploy.js`) and Android (`app.soil.twa`, macOS Keychain keystore restoration), complete with native Sign in with Apple (`SignInWithApplePlugin`), Universal Links & Android App Links (`public/.well-known/*`), maskable/high-res PWA icons, multi-device visual/geometrical QA (`npm run test:devices`), and store release documentation (`.agents/skills/soil-release-deploy/`).
- Added a GDPR/TDDDG-compliant, zero-cookie, zero-PII aggregated telemetry system (`functions/src/telemetry.service.ts`, `/api/telemetry`, `src/app/shared/telemetry.service.ts`) counting daily and total pageviews across the 9 public views, key actions (`quick_game_started`, `trailer_opened`, `research_export`), Web vs. PWA usage, and sanitized external referrers in `europe-west4`, surfaced in a redesigned Super-Admin console (`/admin/super`) alongside administrator registration timestamps (`createdAt`).
- Added a dedicated prerendered `/trailer` video watch page with SSR `<video>` markup and self-hosted `VideoObject` structured data, lossless `public/SOIL-screenshot.png` (`1920x1377`), print-ready DIN A4 classroom flyers (`marketing/`), the Nationale Plattform BNE digital quality criteria compliance notice, OER/TULLU licensing (`CC BY 4.0` / `Apache-2.0`) on `/impressum`, `CITATION.cff` & `codemeta.json` repository metadata, and automatic post-deployment IndexNow URL submission.
- Added per-parcel causal attribution (`ParcelRoundFactors`), causal harvest & soil balance transparency cards (`round-result-modal`, `planting-modal`), an in-place crop manual detail overlay, a 4-metric **Analysen & Finanzbericht** trajectory chart (`Finanzen`, `Nachhaltigkeit`, `Bodenqualität Ø`, `Nährstoffe Ø`), host `forceAdvanceRound` controls, masked classroom PIN toggles, 1-click lesson duration presets (`5` / `8` / `10` rounds), and compact portrait `BoardHudComponent` SVG controls.

### Changed
- Rebalanced short- and medium-horizon classroom sessions (`5–50` rounds) across both `GameEngine` implementations: horizon-scaled starting soil quality (`getStartingSoilForRoundLimit`), horizon-adaptive weather grace period (`getGraceRoundsForLimit`) and regional contract start round, intensive root-crop tillage soil loss (`-5.5 %` potato, `-4.5 %` sugar beet) with progressive multi-year exhaustion, and `BIO_MARKET_MULTIPLIER: 1.45`.
- Migrated the Service Worker to Workbox (`src/sw.js`, `scripts/build-sw.js`), implemented tiered `Cache-Control` headers in `src/server.ts`, removed OS auto-fullscreen jumps on `/trailer`, aligned educator SEO metadata around `Planspiel BNE` and `Brachland (Grünbrache / Blühstreifen)`, externalized >50-line component templates, replaced all native `alert()`/`prompt()` dialogs with custom modals, and added semantic HTML5 landmarks, keyboard-accessible parcels, safe-area insets, and portrait global footer visibility across all routes.

### Fixed
- Resolved Google Search Console and Bing Webmaster Tools indexing and SEO diagnostics (`src/server.ts`, `src/app/app.routes.ts`, `src/app/seo-consistency.spec.ts`): direct HTTP `404` responses without redirect hops for `/en/*` and unknown paths, single-hop `301` canonical redirects, `X-Robots-Tag: noindex, nofollow` on utility/CSR/404 routes, self-hosted `contentUrl` video metadata (`https://soil.app/assets/video/soil-trailer.mp4` without external YouTube `embedUrl`), semantic `<h1>` headings on `/admin`, `/game-login`, and `/admin/super`, descriptive German `alt` attributes, and SSR host-header handling for CSR routes.
- Fixed Apple OAuth (`apple.com` / `privaterelay.appleid.com`) educator onboarding and native Capacitor Firebase Auth API key routing (`src/app/app.config.ts`), `getAllAdmins` timestamp serialization, per-game `Hof-Auszeichnungen` scoping (`syncCollectedStickers()`), mobile touch tap responsiveness inside `Anbau-Auswahl` and board overlays, and immediate PWA Service Worker cache invalidation.

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

