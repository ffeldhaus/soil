export type CropType =
  | 'Fieldbean'
  | 'Barley'
  | 'Oat'
  | 'Potato'
  | 'Corn'
  | 'Rye'
  | 'Wheat'
  | 'Beet'
  | 'Fallow'
  | 'Grass';
// Grass corresponds to 'Tiere' (Animals) usage in original game or similar fallow with animals.
// Original map: 'Ackerbohne' -> Fieldbean, 'Gerste' -> Barley, 'Hafer' -> Oat, 'Kartoffel' -> Potato, 'Mais' -> Corn, 'Roggen' -> Rye, 'Weizen' -> Wheat, 'Zuckerruebe' -> Beet. 'Brachland' -> Fallow. 'Tiere' -> Animals (Grass).

export interface Parcel {
  index: number; // 0-39
  crop: CropType;
  soil: number; // 0-100? approx 80 start
  nutrition: number; // 0-100? approx 80 start
  yield?: number; // Result of the harvest
  harvestRating?: 'very_high' | 'high' | 'moderate' | 'low' | 'very_low' | 'none';
}

export interface RoundDecision {
  machines: number; // Investment or usage level
  organic: boolean;
  fertilizer: boolean;
  pesticide: boolean;
  organisms: boolean; // Beneficial organisms
  parcels: Record<number, CropType>; // Map parcel index to chosen crop
}

export interface RoundResult {
  profit: number;
  capital: number;
  harvestSummary: Record<CropType, number>; // Total yield per crop
  expenses: {
    seeds: number;
    labor: number; // mechanical/machines
    running: number;
    investments: number;
    total: number;
  };
  income: number;
  events: {
    weather: string;
    vermin: string;
  };
  bioSiegel?: boolean;
  machineRealLevel?: number;
}

export interface Round {
  number: number;
  decision: RoundDecision;
  result?: RoundResult;
  parcelsSnapshot: Parcel[]; // State of parcels AFTER the round calculation
}

export interface PlayerState {
  uid: string;
  displayName: string;
  isAi: boolean;
  aiLevel?: 'elementary' | 'middle' | 'high';
  capital: number;
  currentRound: number;
  submittedRound?: number; // Last round submitted by this player
  pendingDecisions?: RoundDecision;
  history: Round[]; // Store full history
}

export interface GameSettings {
  length: number; // Number of rounds
  difficulty: 'easy' | 'normal' | 'hard';
  playerLabel?: string; // e.g. 'Player', 'Team', 'Farmers'
}

export interface Game {
  id: string;
  name: string;
  hostUid: string;
  status: 'waiting' | 'in_progress' | 'finished';
  settings: GameSettings;
  players: Record<string, PlayerState>; // Keyed by UID
  currentRoundNumber: number;
  createdAt: number; // Timestamp
  roundDeadlines?: Record<number, any>;
}

export interface UserStatus {
  uid?: string;
  role?: string;
  status?: string; // 'pending', 'active'
  email?: string;
}
