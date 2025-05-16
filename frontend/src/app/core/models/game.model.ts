// File: frontend/src/app/core/models/game.model.ts
import { PlayerPublic } from './player.model'; // Correct: Imports from player.model

// Game status enum, mirroring backend if available, or defined for frontend use
export enum GameStatus {
  PENDING = "pending", // Game created but not started (e.g., round 0)
  ACTIVE = "active",   // Game is ongoing
  FINISHED = "finished", // Game has completed all rounds
  ARCHIVED = "archived" // Game is finished and archived (optional status)
}

// Payload for creating a game by an Admin (maps to backend GameCreate)
export interface GameCreateAdminPayload {
  name: string;
  numberOfRounds: number;
  maxPlayers: number;
  requestedPlayerSlots: number;
  aiPlayerCount?: number;
}

// For listing games in Admin dashboard (maps to backend GameSimple or a custom admin list view)
export interface GameAdminListItem {
  id: string;
  name: string;
  currentRoundNumber: number;
  gameStatus: GameStatus | string; // Use enum if possible, or string if backend sends raw string
  adminId: string;
  maxPlayers: number;
  playerCount?: number; // Often derived or sent by backend
  createdAt: string | Date; // ISO date string or Date object
}

// For detailed game view for Admin or Player (maps to backend GamePublic)
// This is what the frontend usually works with when displaying game details.
export interface GamePublic {
  id: string;
  name: string;
  numberOfRounds: number;
  maxPlayers: number;
  currentRoundNumber: number;
  gameStatus: GameStatus | string; // Use enum if possible
  adminId: string;
  createdAt: string | Date; // ISO date string or Date object
  updatedAt: string | Date; // ISO date string or Date object
  weatherSequence?: string[]; // Optional as it might not always be sent
  verminSequence?: string[];  // Optional
  playerUids: string[];
  aiPlayerStrategies?: Record<string, string>; // UID -> strategy_name
  players?: PlayerPublic[]; // List of player details, optional as it might be a separate fetch or included
  currentRoundStartAt?: string | Date | null; // When the current round officially began
  lastRoundProcessedAt?: string | Date | null; // When the last round's results were finalized
}
