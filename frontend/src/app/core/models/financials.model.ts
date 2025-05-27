// File: frontend/src/app/core/models/financials.model.ts
// Based on backend schemas: SeedCosts, InvestmentCosts, RunningCosts, HarvestIncome

// Corresponds to backend app.schemas.financials.SeedCosts
export interface SeedCosts {
  fieldBean?: number;
  barley?: number;
  oat?: number;
  potato?: number;
  corn?: number;
  rye?: number;
  wheat?: number;
  sugarBeet?: number;
  total: number;
}

// Corresponds to backend app.schemas.financials.InvestmentCosts
export interface InvestmentCosts {
  animals?: number;
  machines?: number;
  total: number;
}

// Corresponds to backend app.schemas.financials.RunningCosts
export interface RunningCosts {
  fertilizer?: number;
  pesticide?: number;
  biologicalControl?: number;
  animalFeedVet?: number; // For existing animal parcels
  organicCertificationControl?: number;
  baseOperationalCosts?: number;
  total: number;
}

// Corresponds to backend app.schemas.financials.HarvestIncome
export interface HarvestIncome {
  fieldBean?: number;
  barley?: number;
  oat?: number;
  potato?: number;
  corn?: number;
  rye?: number;
  wheat?: number;
  sugarBeet?: number;
  animalProducts?: number; // Income from established animal parcels
  total: number;
}

// Overall financial summary for a round, often part of the Result model
// This replaces the previous placeholder TotalIncome and TotalExpenses

export interface TotalExpensesBreakdown {
  seedCosts: SeedCosts;
  investmentCosts: InvestmentCosts;
  runningCosts: RunningCosts;
  grandTotal: number; // Sum of all expense totals
}

// The Result model on the frontend would then have:
// incomeDetails: HarvestIncome;
// expenseDetails: TotalExpensesBreakdown;
