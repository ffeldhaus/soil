// File: frontend/src/app/core/models/player.model.ts
import { User, UserRole } from './user.model';

// Public representation of a player, often part of Game details
export interface PlayerPublic {
  uid: string;
  email: string | null;
  username?: string | null;
  game_id: string; // From backend schema (snake_case), matches Firebase claim and Firestore field
  player_number?: number;
  is_ai: boolean; // From backend schema
  user_type: UserRole; // From backend schema
  // Add any other fields backend PlayerPublic might return
}
