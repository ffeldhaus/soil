// File: frontend/src/app/shared/models/result.model.ts
// Ensure this file exists and is correctly defined based on backend schema
import { TotalIncome, TotalExpenses } from './financials.model';

export interface ResultBase {
  game_id: string;
  player_id: string;
  round_number: number;
  profit_or_loss: number;
  closing_capital: number;
  starting_capital: number;
  achieved_organic_certification: boolean;
  weather_event?: string | null;
  vermin_event?: string | null;
  player_machine_efficiency?: number | null;
  income_details: TotalIncome;
  expense_details: TotalExpenses;
  explanations?: Record<string, string> | null;
}

export interface ResultCreate extends ResultBase {}

export interface ResultInDB extends ResultBase {
  id: string; // Firestore document ID
  calculated_at: string | Date;
}

export interface ResultPublic extends ResultInDB {}