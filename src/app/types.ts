export type CropType =
  | 'Fieldbean'
  | 'Barley'
  | 'Oat'
  | 'Potato'
  | 'Corn'
  | 'Rye'
  | 'Wheat'
  | 'Beet'
  | 'Rapeseed'
  | 'Pea'
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
  priceFixing?: Record<string, boolean>; // Map CropType to boolean
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
  subsidies?: number;
  marketPrices?: Record<string, number>;
  events: {
    weather: string;
    vermin: string[];
  };
  bioSiegel?: boolean;
  machineRealLevel?: number;
}

export interface Round {
  number: number;
  decision: RoundDecision;
  result?: RoundResult;
  parcelsSnapshot: Parcel[]; // State of parcels AFTER the round calculation
  avgSoil?: number;
  avgNutrition?: number;
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
  avgSoil?: number;
  avgNutrition?: number;
  playerNumber?: number;
}

export type GameStatus = 'waiting' | 'in_progress' | 'finished' | 'deleted' | 'expired';

export interface GameSettings {
  length: number; // Number of rounds
  difficulty: 'easy' | 'normal' | 'hard';
  playerLabel?: string; // e.g. 'Player', 'Team', 'Farmers'
}

export interface GameConfig {
  numPlayers: number;
  numRounds: number;
  numAi: number;
  advancedPricingEnabled?: boolean;
  analyticsEnabled?: boolean;
  advisorEnabled?: boolean;
}

export interface GameEvaluation {
  playStyle: string;
  analysis: string;
  improvements: string[];
  evaluatedAt: { seconds: number; nanoseconds: number } | Date;
}

export interface Game {
  id: string;
  name: string;
  password?: string;
  hostUid: string;
  status: GameStatus;
  settings: GameSettings;
  config: GameConfig;
  players: Record<string, PlayerState>; // Keyed by UID
  currentRoundNumber: number;
  createdAt: { seconds: number; nanoseconds: number } | Date; // Firestore Timestamp or Date
  updatedAt?: { seconds: number; nanoseconds: number } | Date;
  deletedAt?: { seconds: number; nanoseconds: number } | Date | null;
  uploadedAt?: { seconds: number; nanoseconds: number } | Date | null;
  playerSecrets?: Record<string, { password: string }>;
  roundDeadlines?: Record<number, { seconds: number; nanoseconds: number } | Date>;
  evaluations?: Record<string, GameEvaluation>;
}

export interface UserStatus {
  uid: string;
  role: 'admin' | 'superadmin' | 'player' | 'new' | 'banned';
  status: 'active' | 'banned';
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  onboarding?: {
    explanation: string;
    institution: string;
    institutionLink: string;
  };
}

export interface Feedback {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  category: 'interface' | 'mechanics' | 'improvements' | 'suggestions' | 'documentation' | 'other';
  rating: number; // 0-5
  comment: string;
  aiAnalysis?: {
    summary: string;
    suggestedActions: string[];
    sentiment: string;
  };
  status: 'new' | 'replied' | 'resolved' | 'rejected';
  adminResponse?: string;
  externalReference?: string; // e.g. GitHub issue link
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
}

export interface SystemStats {
  games: {
    total: number;
    active: number;
    deleted: number;
  };
  users: {
    total: number;
    admins: number;
    banned: number;
  };
}
