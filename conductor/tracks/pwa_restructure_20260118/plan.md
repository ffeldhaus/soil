# Implementation Plan - PWA & Mobile Restructure

## Phase 1: Authentication & Guest Access
- [x] Task: Implement "Guest" mode for instant access without registration [c00a9f3]
    - [ ] Write unit tests for anonymous/guest session management
    - [ ] Implement local-only guest session logic
- [x] Task: Expand Authentication to include Google - [~] Task: Expand Authentication to include Google & Apple Sign-In Apple Sign-In [592ca0d]
    - [ ] Write tests for multi-provider auth service
    - [ ] Implement Google and Apple sign-in flows
- [x] Task: Implement Email/Password authentication with verification [422b2d1]
    - [ ] Write tests for email verification flow
    - [ ] Implement registration, login, and verification screens
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Authentication & Guest Access' (Protocol in workflow.md)

## Phase 2: PWA Foundations & Workbox Integration
- [ ] Task: Replace Angular Service Worker with Workbox
    - [ ] Configure Workbox for asset caching and offline fallback
    - [ ] Implement service worker registration and update notification
- [ ] Task: Define Offline-First data schemas
    - [ ] Create local storage / IndexedDB schemas for game state
    - [ ] Write tests for local data persistence
- [ ] Task: Conductor - User Manual Verification 'Phase 2: PWA Foundations & Workbox Integration' (Protocol in workflow.md)

## Phase 3: Single-Player Offline Mode
- [ ] Task: Implement Single-Player game engine logic
    - [ ] Write tests for local game creation and state management
    - [ ] Refactor game engine to support local execution
- [ ] Task: Integrate AI players for offline mode
    - [ ] Adapt existing AI logic for local execution
    - [ ] Write tests for AI decision making in offline games
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Single-Player Offline Mode' (Protocol in workflow.md)

## Phase 4: Background Synchronization
- [ ] Task: Implement background sync for game states
    - [ ] Write tests for synchronization queue and conflict resolution
    - [ ] Implement Firebase background sync logic
- [ ] Task: Game cataloging and improvement analysis
    - [ ] Create backend functions to aggregate and analyze synced game data
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Background Synchronization' (Protocol in workflow.md)

## Phase 5: Optimization & Store Readiness
- [ ] Task: Audit and optimize for App Store/Play Store requirements
    - [ ] Verify accessibility compliance (WCAG)
    - [ ] Optimize assets and loading performance
- [ ] Task: Final PWA/Mobile UI Polish
    - [ ] Ensure unified aesthetic across all screen sizes
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Optimization & Store Readiness' (Protocol in workflow.md)
