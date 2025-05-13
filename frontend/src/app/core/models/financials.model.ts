// Placeholder for financial models
// Define actual structures based on backend API

export interface TotalIncome {
  // Define properties based on backend
  crop_sales: number;
  organic_premium?: number;
  // ... other income sources
  total: number;
}

export interface TotalExpenses {
  // Define properties based on backend
  seeds: number;
  fertilizer?: number;
  pesticide?: number;
  biological_control?: number;
  machine_costs?: number;
  organic_certification_costs?: number;
  // ... other expenses
  total: number;
}
