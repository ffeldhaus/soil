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

// File: frontend/src/app/core/models/game.model.ts
import { PlayerPublic } from './player.model';

// Payload for creating a game by an Admin (maps to backend GameCreate)
export interface GameCreateAdminPayload {
  name: string;
  number_of_rounds: number;
  max_players: number;
  requested_player_slots: number;
  ai_player_count?: number;
}

// For listing games in Admin dashboard (maps to backend GameSimple)
export interface GameAdminListItem {
  id: string;
  name: string;
  current_round_number: number;
  game_status: string;
  admin_id: string;
  max_players: number;
  // player_count can be derived if players array or player_uids are sent
}

// For detailed game view for Admin or Player (maps to backend GamePublic)
export interface GameDetailsView {
  id: string;
  name: string;
  number_of_rounds: number;
  max_players: number;
  current_round_number: number;
  game_status: string;
  admin_id: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  weather_sequence: string[];
  vermin_sequence: string[];
  player_uids: string[];
  ai_player_strategies?: Record<string, string>; // UID -> strategy_name
  players: PlayerPublic[]; // List of player details
}