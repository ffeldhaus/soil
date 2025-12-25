export type CropType = 'Fieldbean' | 'Barley' | 'Oat' | 'Potato' | 'Corn' | 'Rye' | 'Wheat' | 'Beet' | 'Fallow' | 'Grass';
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
    bioSiegel: boolean;
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
    submittedRound?: number; // Tracks last round submitted
    pendingDecisions?: RoundDecision; // Draft decisions for the next round
    history: Round[]; // Store full history
}

export interface GameSettings {
    length: number; // Number of rounds
    difficulty: 'easy' | 'normal' | 'hard';
}

import * as admin from 'firebase-admin';

export type GameStatus = 'waiting' | 'in_progress' | 'finished' | 'deleted' | 'expired';

export interface GameConfig {
    numPlayers: number;
    numRounds: number;
    numAi: number;
}

export interface Game {
    id: string;
    name: string;
    password?: string;
    hostUid: string;
    status: GameStatus;
    settings: GameSettings;
    config: GameConfig;
    players: Record<string, PlayerState>;
    currentRoundNumber: number;
    createdAt: admin.firestore.Timestamp;
    retentionDays?: number; // Default 90, Max 365
    deletedAt?: admin.firestore.Timestamp | null; // Soft delete timestamp
    playerSecrets?: Record<string, { password: string }>; // Key is playerNumber (1, 2...), Value is secret
    roundDeadlines?: Record<number, admin.firestore.Timestamp>;
}

export interface UserData {
    uid: string;
    email: string;
    displayName?: string;
    role: 'pending' | 'admin' | 'superadmin' | 'player';
    status: 'active' | 'rejected' | 'pending';
    quota: number;
    gameCount: number;
    onboarding?: {
        explanation: string;
        institution: string;
        institutionLink: string;
        submittedAt: admin.firestore.Timestamp;
    };
    createdAt: admin.firestore.Timestamp;
}
