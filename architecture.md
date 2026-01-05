# Architecture Documentation - Soil

## Overview

Soil is a web-based agricultural simulation game built on the Firebase platform. It features a real-time multiplayer environment where players manage parcels of land, plant crops, and compete or cooperate.

## System Architecture

### Frontend (Client)

- **Framework**: Angular (v21.0.0)
- **Styling**: TailwindCSS (v4.1.18) + PostCSS
- **State Management**: RxJS (Services with Observables)
- **Routing**: Angular Router
- **Hosting**: Firebase Hosting

#### Key Components

- **`Board`** (`src/app/game/board`): The main game interface. Handles grid selection, drag-to-select, and user interactions.
- **`PlantingModal`**: UI for selecting crops to plant on selected parcels.
- **`Dashboard`** (`src/app/admin/dashboard`): Admin interface for managing games and players.
- **`AuthService`**: Manages Google Sign-In and anonymous player login using custom tokens.
- **`GameService`**: Handles game state synchronization with Firestore.

### Backend (Serverless)

- **Runtime**: Firebase Cloud Functions (2nd Gen, Node.js 24)
- **Language**: TypeScript
- **Database**: Cloud Firestore

#### Core Functions (`functions/src/index.ts`)

- **`createGame`**: Initializes a new game, sets up the host, and creates the initial round (Planning Phase).
- **`playerLogin`**: Authenticates a player using a Game ID and Password, issuing a Firebase Custom Token with claims (`role: player`, `gameId`, `playerNumber`).
- **`calculateNextRound`**: The game loop trigger. Calculates the outcome of the current round based on player decisions and random events (Weather, Vermin).
- **`triggerAiTurn`**: Executed by cron or admin trigger to process AI player moves.

### Data Model (Firestore)

#### `games/{gameId}`

Stores global game state.

- `status`: 'waiting' | 'active' | 'finished'
- `currentRoundNumber`: Integer
- `players`: Map of player data (Capital, specific state).
- `config`: Game configuration (numPlayers, etc.).

#### `games/{gameId}/rounds/{roundId}`

Stores historical and current round data.

- `number`: Round index.
- `parcelsSnapshot`: State of all parcels at the start of this round.
- `decision`: Aggregated player decisions for this round.
- `outcome`: Results of the round (yield, profits).

### Authentication & Security

- **Admins**: Identified by `role: admin` custom claim.
- **Players**: Identified by `role: player` custom claim, scoped to a specific `gameId`.
- **Role-based Access Control (RBAC)**: Firestore rules ensure players can only access their game and admins can manage their own games.
- **Player Access**: Admins can generate and share login URLs/QR codes for players.

## Game Logic / Engine

- **`GameEngine`** (`functions/src/game-engine.ts`): Pure logic for calculating crop yields, soil degradation, and event impacts.
- **`AiAgent`** (`functions/src/ai-agent.ts`): Logic for AI players to make decisions based on current game state.

## Testing Strategy

- **Unit Tests**:
  - Backend: Mocha + Chai (`functions/src/**/*.test.ts`)
  - Frontend: Jasmine + Vitest (Angular default)
- **E2E Tests**: Cypress (`cypress/e2e/*.cy.ts`)
