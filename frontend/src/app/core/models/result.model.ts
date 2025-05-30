// File: frontend/src/app/core/models/result.model.ts
import { HarvestIncome, TotalExpensesBreakdown } from './financials.model';
import { Dict } from './round.model'; // For explanations type

export interface ResultBase {
  gameId: string;
  playerId: string;
  roundNumber: number;
  profitOrLoss: number;
  closingCapital: number;
  startingCapital: number;
  achievedOrganicCertification: boolean;
  weatherEvent?: string | null;
  verminEvent?: string | null;
  playerMachineEfficiency?: number | null;
  incomeDetails: HarvestIncome; // Updated from TotalIncome
  expenseDetails: TotalExpensesBreakdown; // Updated from TotalExpenses
  explanations?: Dict<string> | null; // Corrected: Dict<string, string> to Dict<string>
}

export type ResultCreate = ResultBase;

export interface ResultInDB extends ResultBase {
  id: string; // Firestore document ID
  calculatedAt: string | Date; // camelCase
}

export type ResultPublic = ResultInDB;
