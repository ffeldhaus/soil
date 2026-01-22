# Implementation Plan - PWA & Mobile Restructure (Revised)

## Phase 1: Authentication, Guest Access & Unified Hub [checkpoint: 806f714]
- [x] Task: Implement "Guest" mode for instant access without registration [c00a9f3]
- [x] Task: Expand Authentication to include Google & Apple Sign-In [592ca0d]
- [x] Task: Refactor Landing Page to single "Create and manage games" button [c487d5e]
- [x] Task: Create Unified Game Hub (Refactored Dashboard) [7799a02]
- [x] Task: Update "Create Game" Flow [c4d8929]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Unified Entry & Auth' [806f714] (Protocol in workflow.md)

## Phase 2: Hybrid Game Engine (Frontend/Backend) [checkpoint: 6a36df3]
- [x] Task: Implement Local Frontend Game Engine [ad34634]
- [x] Task: Logic Switcher (Frontend vs Backend) [0ec904f]
- [x] Task: Replace Angular Service Worker with Workbox [9d25d0e]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Hybrid Engine' [6a36df3] (Protocol in workflow.md)

## Phase 3: Single-Player ## Phase 3: Single-Player & AI Improvements [checkpoint: 3b77c0f] AI Improvements [checkpoint: aeef10d]
- [x] Task: Integrate AI players for local execution [d8cc437]
- [x] Task: Progress tracking and cataloging [3b77c0f]
- [x] Task: Conductor - User Manual Verification 'Phase 3: Single-Player & AI' [aeef10d] (Protocol in workflow.md)

## Phase 4: Background Synchronization [checkpoint: 352ea9f]
- [x] Task: Implement background sync for local games [0c19c1c]
    - [x] Sync local state to Firebase when user registers/logs in
    - [x] Handle conflict resolution for offline edits
- [x] Task: Conductor - User Manual Verification 'Phase 4: Background Synchronization' [352ea9f] (Protocol in workflow.md)

## Phase 5: Optimization & Store Readiness
- [~] Task: Audit and optimize for App Store/Play Store requirements
    - [x] Verify accessibility compliance (WCAG) [c74353c]
    - [x] Optimize assets and loading performance [34366e4]
- [x] Task: SEO & Prerendering Optimization [e81d98f]
    - [x] Fix dependency injection issues during static generation
    - [x] Re-enable prerendering for static pages (Landing, Manual, Info)
    - [x] Verify metadata and schema.org markup for SEO
- [x] Task: SEO: Indexing & Canonicalization [e81d98f]
    - [x] Add `noindex` meta tag to Impressum page to prevent indexing
    - [x] Implement canonical URL logic for root path `/` and default locale `/de`
    - [x] Ensure consistent use of canonical tags across all public routes according to Google guidelines
- [x] Task: Final PWA/Mobile UI Polish [2ba1972]
    - [x] Ensure unified aesthetic across all screen sizes
    - [x] Implement Web Share API for sharing logins
    - [x] Implement Badging API for new round notifications
- [x] Task: Conductor - User Manual Verification 'Phase 5: Optimization & Store Readiness' [564f8e6] (Protocol in workflow.md)

## Phase 6: Quality Assurance & Technical Debt
- [x] Task: Code cleanup and architectural refactoring [dba4264]
    - [x] Remove unused components and services
    - [x] Align with project naming conventions and style guides
- [x] Task: Implementation of extensive and meaningful unit tests [2ba1972]
    - [x] Reach >80% coverage for critical modules (Engine, AI, Sync)
    - [x] Test edge cases and error handling in Game and Auth services
- [~] Task: Implementation of comprehensive E2E tests (Cypress)
    - [ ] Full playthrough scenario (creation to finished state)
    - [ ] Verify offline-to-online synchronization flow
- [ ] Task: Conductor - User Manual Verification 'Phase 6: Quality Assurance' (Protocol in workflow.md)