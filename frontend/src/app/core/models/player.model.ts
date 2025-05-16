// File: frontend/src/app/core/models/player.model.ts
import { UserRole } from './user.model'; // Assuming UserRole is defined in user.model.ts

// Public representation of a player, often part of Game details
// Corresponds to backend schemas.player.PlayerPublic
export interface PlayerPublic {
  uid: string; // Firebase UID, primary identifier
  email: string | null; // Player's email
  username?: string | null; // Player's display name or username
  gameId: string; // ID of the game the player belongs to
  playerNumber?: number; // Ordinal number of the player within the game (e.g., 1, 2, 3)
  isAi: boolean; // Flag indicating if the player is AI-controlled
  userType: UserRole; // Should be UserRole.PLAYER
  // Statistics or other player-specific info from backend can be added here
  // e.g., current_capital, total_score, if backend sends them as part of PlayerPublic
  currentCapital?: number;
  // ai_strategy if it needs to be exposed and is_ai is true
  aiStrategy?: string;
}

// If you have a more detailed internal Player model for frontend state, define it here
// export interface Player extends PlayerPublic {
//   // additional frontend-specific state if needed
//   hasSubmittedRound?: boolean;
// }
