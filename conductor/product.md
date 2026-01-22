# Initial Concept
Transform Soil into a true cross-platform Progressive Web App (PWA) and native mobile application (Apple App Store & Google Play Store). Introduce a single-player offline mode with optional AI players and background synchronization to the Firebase backend. Expand authentication to include Google, Apple, and Email/Password sign-ins, while maintaining a no-registration "guest" entry to maximize accessibility and simplify app store approvals.

# Product Definition: Soil

## Vision
Soil is an immersive, educational agricultural simulation that empowers players to explore the delicate balance between resource management, agricultural productivity, and environmental sustainability. It bridges the gap between casual strategy gaming and classroom-ready educational tools.

## Target Audience
- **Educational Institutions:** Schools and universities using the simulation to teach resource management, ecology, and agricultural science.
- **Casual Gamers:** Strategy and simulation enthusiasts looking for a cooperative, meaningful gameplay experience.

## Core Gameplay Pillars
- **Ecological Responsibility:** Primary focus on understanding and mastering complex agricultural systems and their environmental impacts.
- **Cooperative Strategy:** Encouraging players to work together to overcome challenges and achieve sustainable growth.
- **Accessibility First:** Low-friction entry with no mandatory registration, supporting offline play, and a seamless experience across web and mobile platforms.

## Key Features
- **Cross-Platform PWA/Mobile:** A unified experience installable from the web or app stores (iOS/Android) using advanced PWA features like Web Share and App Badging.
- **Hybrid Game Engine:** Dual execution logic (Local Frontend vs Cloud Backend) ensures seamless offline play while maintaining authoritative multiplayer states.
- **Single-Player Offline Mode:** Playable without internet connectivity using local state and AI players, with background syncing to the backend via SyncService.
- **Flexible Authentication:** Supporting Google Sign-In, Apple Sign-In, and traditional Email/Password (verified), while allowing guest play with easy migration to registered accounts.
- **Environmental Impact Tracking:** Real-time feedback and data visualization on how farming decisions affect biodiversity, soil health, and water quality.
- **Multiplayer Hub:** Create and share game IDs for real-time human-to-human interaction.

## Visual & Interaction Aesthetic
- **Unified Web Aesthetic:** A consistent, custom-designed interface that provides an identical high-quality experience across all devices and platforms.
