# AGENTS.md – Project Rules & Architectural Invariants

Core invariants for `soil` (Angular 21 + Tailwind CSS v4 + Firebase Cloud Functions v2 / Node.js 24). Task-specific runbooks are stored as on-demand workspace skills in `.agents/skills/`:
- **Release, Changelog & Firebase Deployment**: [`.agents/skills/soil-release-deploy/SKILL.md`](.agents/skills/soil-release-deploy/SKILL.md)
- **Local Emulator, Unit/E2E QA & Balancing Suite**: [`.agents/skills/soil-local-dev-qa/SKILL.md`](.agents/skills/soil-local-dev-qa/SKILL.md)

## 1. Code Structure, Angular 21 & Tailwind CSS v4
- **Component Modularity & File Size Limits**:
  - Keep Angular components modular (templates ideally < 500 lines; stage-checked by `scripts/check-file-size.js` with `128 KB` warning / `256 KB` hard limit).
  - Prefer separate `.html` files whenever a template exceeds 50 lines.
- **External `.scss` with `@reference "tailwindcss";`**:
  - Prefer separate `.scss` files over inline `styles` to prevent Vite/PostCSS `ENAMETOOLONG` virtual filename errors.
  - Always include `@reference "tailwindcss";` at the top of component `.scss` files that use `@apply` or Tailwind utilities.
- **Opaque High-Contrast Surface Hierarchy (No Glassmorphism)**:
  - Use crisp, high-contrast opaque surfaces (`bg-gray-900` / `bg-gray-950`, `border-gray-700` / `border-gray-800`) and a blur-free semi-transparent global footer (`bg-gray-950/85`).
  - Never reintroduce `backdrop-blur`, `backdrop-filter`, or the legacy `PerformanceService` (`perf-tier-*`) classes.
- **Modals, German Typography & Copy ("du")**:
  - Always use custom HTML/CSS modals instead of native browser dialogs (`alert` / `confirm` / `prompt`).
  - All user-facing German copy across the game, manual, legal views, and authentication flows must use informal **"du"** (or neutral phrasing), never formal "Sie". Global prose hyphenation (`hyphens: auto`, `text-wrap: pretty`) is enforced in `src/styles.css`.
- **Formatting & Linting (`biome.json`)**:
  - Enforced via Biome (`npm run lint`, 2-space indent, `120` line width, single quotes, trailing commas). Comments should be sparse and explain *why*, not *what*.

## 2. Hybrid Game Engine, Shared Constants & Ground Truth (`sources.json`)
- **Single Source of Truth & Backend Symlinks**:
  - `src/app/game-constants.ts` and `src/app/types.ts` are the canonical definitions.
  - Cloud Functions access them via symlinks (`functions/src/constants.ts` -> `../../src/app/game-constants.ts`, `functions/src/types.ts` -> `../../src/app/types.ts`; `"preserveSymlinks": true` in `angular.json`).
- **Dual `GameEngine` & `AiAgent` Parity**:
  - `GameEngine` and `AiAgent` exist in both `src/app/game/engine/{game-engine,ai-agent}.ts` (client-side Local Games) and `functions/src/{game-engine,ai-agent}.ts` (authoritative Cloud Games).
  - Any modification to round calculation, soil/nutrition dynamics, weather/vermin events, regional contracts, or AI decision logic **must** be applied identically to both files and verified with both frontend (`npm run test:unit`) and backend (`npm run test:functions`) tests.
- **Scientific Ground Truth Registry (`sources.json`)**:
  - Every constant in `GAME_CONSTANTS` (`src/app/game-constants.ts`) must have a matching `exact` or `range` validation entry in `sources.json` backed by a peer-reviewed or institutional `uri` (and `local_uri` in `docs/references/` where applicable), enforced on every commit via `npm run verify-constants` (`src/app/verify-sources.spec.ts`).
- **User Manual & Info Synchronization**:
  - Whenever game mechanics, crop properties, subsidies, or contracts change, update the User Manual (`src/app/manual/manual.ts`) and background documentation (`src/app/info/info.ts`) in the same task.

## 3. Game Types, Security Rules & GDPR / Data Privacy
- **Local Games (`local-*`) vs. Server/Cloud Games**:
  - **On-Device Local Games**: Single human player (plus optional AI), executed client-side via `LocalGameService` and persisted in `localStorage` (`local-` prefix). Unauthenticated drafts stay strictly local.
  - **Server/Cloud Games**: Multiplayer games executed via Firebase Cloud Functions v2 and stored in Firestore; require Firebase Authentication to save drafts and submit decisions.
- **Zero Direct Client Firestore/Storage Access**:
  - `firestore.rules` and `storage.rules` deny all direct client reads/writes (`allow read, write: if false`). All state mutations, player PIN logins (`crypto.randomInt`), and admin actions must go through authenticated, role-verified (`admin` / `superadmin` / `player`) Callable Cloud Functions in `functions/src/index.ts`.
  - Sanitize origins via `sanitizeOrigin()` (`ALLOWED_ORIGINS`) and escape untrusted HTML via `escapeHtml()` in email/feedback handlers.
- **EU Data Residency & Strict Anonymization**:
  - All Firebase and Vertex AI (`@google/genai`) services must be pinned to **`europe-west4` (EU)**.
  - **Feedback**: Can be submitted completely anonymously without user IDs, names, or email addresses, or optionally with a contact email address (voluntarily entered or via opt-in toggle for logged-in users) solely for replying to feedback.
  - **Research Data (`research_games`)**: Completed games uploaded via `uploadFinishedGame` / `internalAnonymizeAndUploadForResearch` must strip all PII and arbitrary fields, replace player names with generic labels (`Team 1`, `player-<targetId>-<num>`), enforce semantic round/player caps, and reject test/degenerate games via `isTestOrDegenerateGame()` (`isTestEmail()`, 100%-Fallow click-throughs, E2E test names).
- **Legal & SEO Compliance**:
  - Every public view must include footer links to `/impressum` and `/privacy`. Any change to data collection must be reflected in `src/app/privacy/privacy.ts`.
  - Keep `public/sitemap.xml` and `public/robots.txt` updated whenever public routes (`src/app/app.routes.ts`) change.

## 4. Testing, Quality Gates & Git Workflow
- **Automated Pre-Commit Hook (`.husky/pre-commit`)**:
  - Every commit requires an entry under `## [Unpublished]` in `CHANGELOG.md` (do not manually stamp a version header; `npm run deploy` replaces `## [Unpublished]` automatically).
  - Automatically runs `npx biome check --write --staged`, `npm run verify-constants`, `node scripts/check-file-size.js`, `lychee` link checking (`lychee.toml`), conditional frontend Vitest + production build (`npx vitest run`, `ng build`), and conditional backend Vitest (`npm run test --prefix functions`).
- **Pre-Push Hook (`.husky/pre-push`)**:
  - Runs `node scripts/check-changelog.js` and verifies zero outdated dependencies within semver constraints (`npm outdated`) in both root `.` and `functions/`.
- **Commit Discipline**:
  - Inspect `git status` and `git diff` before committing, keep commits atomic per task, and never `git push` or run `npm run deploy` without explicit user instruction.

