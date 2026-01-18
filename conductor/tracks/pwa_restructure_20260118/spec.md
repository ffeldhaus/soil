# Track Specification: PWA & Mobile Restructure

## Goal
Transform Soil into a cross-platform PWA and native mobile app (iOS/Android) with an offline-first architecture.

## Key Requirements
1. **Expanded Authentication:**
   - Support for Google Sign-In, Apple Sign-In, and Email/Password (with verification).
   - "Guest" mode for instant access without mandatory registration.
2. **Offline-First Architecture:**
   - Single-player mode with local state.
   - Background synchronization to Firebase backend when connectivity returns.
   - Workbox integration for robust caching and PWA features.
3. **Multi-Platform Support:**
   - Unified Web Aesthetic (consistent UI across platforms).
   - Optimized for Apple App Store and Google Play Store submission.
4. **Gameplay:**
   - Optional AI players for single-player offline games.
   - Progress tracking and cataloging for all game types (online/offline).

## Success Criteria
- App passes PWA audit (Lighthouse).
- Offline gameplay is functional and syncs correctly upon reconnection.
- User can sign in via Google, Apple, or Email.
- App is installable on iOS and Android with a consistent UI.
