// File: frontend/src/app/shared/models/round.model.ts
// Ensure this file exists and is correctly defined based on backend schema
// (from previous steps, this should be okay)
import { FieldPublic } from './parcel.model'; // Ensure this import is correct

export interface RoundDecisionBase {
  fertilize: boolean;
  pesticide: boolean;
  biological_control: boolean;
  attempt_organic_certification: boolean;
  machine_investment_level: number;
}

export interface RoundBase {
  game_id: string;
  player_id: string;
  round_number: number;
  decisions?: RoundDecisionBase | null; // Optional for initial state
  is_submitted: boolean;
  submitted_at?: string | Date | null; // ISO string or Date
}

export interface RoundCreate extends RoundBase {
  decisions: RoundDecisionBase; // Decisions are mandatory for creation payload (even if defaults)
}

export interface RoundUpdate { // Specific for updating decisions
  decisions: RoundDecisionBase;
  is_submitted: boolean;
}

export interface RoundInDB extends RoundBase {
  id: string; // Firestore document ID
  created_at: string | Date; // ISO string or Date
  updated_at: string | Date; // ISO string or Date
  // Potentially add field_state_id or result_id if linked this way
}

export interface RoundPublic extends RoundInDB {}

// New Schema for component that needs both Round data and Field data
export interface RoundWithFieldPublic extends RoundPublic {
  field_state: FieldPublic;
}