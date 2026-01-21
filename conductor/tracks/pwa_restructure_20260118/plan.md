# Implementation Plan - PWA & Mobile Restructure (Revised)

## Phase 1: Authentication, Guest Access & Unified Hub
- [x] Task: Implement "Guest" mode for instant access without registration [c00a9f3]
- [x] Task: Expand Authentication to include Google & Apple Sign-In [592ca0d]
- [x] Task: Refactor Landing Page to single "Create and manage games" button [c487d5e]
- [x] Task: Create Unified Game Hub (Refactored Dashboard) [7799a02]
- [x] Task: Update "Create Game" Flow [c4d8929]
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Unified Entry & Auth' (Protocol in workflow.md)

## Phase 2: Hybrid Game Engine (Frontend/Backend)
- [ ] Task: Implement Local Frontend Game Engine
    - [ ] Port core game logic to run in-browser for single-player/Guest games
    - [ ] Create state management for local games (IndexedDB/Workbox)
- [ ] Task: Logic Switcher (Frontend vs Backend)
    - [ ] Detect if game has multiple human players
    - [ ] Route game actions to local engine or Firebase Functions accordingly
- [ ] Task: Replace Angular Service Worker with Workbox
    - [ ] Configure Workbox for asset caching and offline fallback
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Hybrid Engine' (Protocol in workflow.md)

## Phase 3: Single-Player & AI Improvements
- [ ] Task: Integrate AI players for local execution
    - [ ] Adapt existing AI logic for local execution
- [ ] Task: Progress tracking and cataloging
    - [ ] Unify progress tracking for local and cloud games
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Single-Player & AI' (Protocol in workflow.md)

## Phase 4: Background Synchronization
- [ ] Task: Implement background sync for local games
    - [ ] Sync local state to Firebase when user registers/logs in
    - [ ] Handle conflict resolution for offline edits
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Background Synchronization' (Protocol in workflow.md)

## Phase 5: Optimization & Store Readiness
- [ ] Task: Audit and optimize for App Store/Play Store requirements
    - [ ] Verify accessibility compliance (WCAG)
    - [ ] Optimize assets and loading performance
- [ ] Task: Final PWA/Mobile UI Polish
    - [ ] Ensure unified aesthetic across all screen sizes
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Optimization & Store Readiness' (Protocol in workflow.md)