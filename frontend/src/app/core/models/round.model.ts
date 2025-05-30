// File: frontend/src/app/core/models/round.model.ts
import { FieldPublic } from './parcel.model';
import { PlantationType } from './parcel.model';
import { HarvestIncome, TotalExpensesBreakdown } from './financials.model'; // Import financial models

export interface Dict<V> { // Removed unused _K parameter
    [key: string]: V;
}

export interface RoundDecisionBase {
  fertilize: boolean;
  pesticide: boolean;
  biological_control: boolean; 
  attempt_organic_certification: boolean;
  machine_investment_level: number;
}

export interface PlayerRoundSubmission {
  roundDecisions: RoundDecisionBase;
  parcelPlantationChoices: Record<number, PlantationType>; // Changed from Dict<number, PlantationType>
}

export interface RoundBase {
  gameId: string;
  playerId: string;
  roundNumber: number;
  decisions?: RoundDecisionBase | null;
  isSubmitted: boolean;
  submittedAt?: string | Date | null;
}

export interface RoundCreate extends RoundBase {
  decisions: RoundDecisionBase;
}

export interface RoundUpdate { 
  decisions: RoundDecisionBase;
  isSubmitted: boolean;
}

export interface RoundInDB extends RoundBase {
  id: string; 
  createdAt: string | Date;
  updatedAt: string | Date;
  result_id?: string | null; 
  parcelDecisionState?: Record<number, PlantationType>; // Changed from Dict<number, PlantationType>

  // Optional Result fields that might be embedded if a result exists for this round
  // These would come from the backend's ResultPublic schema
  profitOrLoss?: number;
  closingCapital?: number;
  startingCapital?: number; // Capital at the start of this round (after previous round's results)
  achievedOrganicCertification?: boolean;
  weatherEvent?: string; // Weather for THIS round, potentially part of result record
  verminEvent?: string;  // Vermin for THIS round, potentially part of result record
  playerMachineEfficiency?: number; // Machine efficiency at end of this round / start of next
  incomeDetails?: HarvestIncome;
  expenseDetails?: TotalExpensesBreakdown;
  explanations?: Record<string, string>; // Key-value explanations from game logic
  calculatedAt?: string | Date; // When the results were calculated
}

export type RoundPublic = RoundInDB;

export interface RoundWithFieldPublic extends RoundPublic {
  fieldState: FieldPublic;
  // The 'roundData' field previously here for weather/vermin specific to the active round (before results)
  // might be less necessary if these details are consistently part of RoundInDB/RoundPublic when available (e.g., from results).
  // Or, it can still be used for pre-result round-specific events if backend provides them separately.
  // For simplicity now, relying on fields being directly on RoundInDB/RoundPublic when they are known (usually post-result).
  // The `weatherEvent`, `verminEvent` etc. now on RoundInDB will serve this if populated by backend.
}
