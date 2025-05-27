// File: frontend/src/app/features/game/components/result/result.component.ts
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { RoundWithFieldPublic, RoundPublic } from '../../../../core/models/round.model';
import { HarvestIncome, TotalExpensesBreakdown } from '../../../../core/models/financials.model';
// Import other necessary models and pipes, e.g., for displaying explanations or parcel details if needed.

// Define a more specific type for what ResultComponent expects, if possible
export type ResultData = (RoundWithFieldPublic | RoundPublic) & {
  // Assuming result details like income/expenses are part of the round object passed
  // or fetched separately. For now, let's assume they are on 'selectedRoundDetailsSignal' output
  // which will have fields from backend's ResultPublic model via RoundPublic.
  incomeDetails?: HarvestIncome;
  expenseDetails?: TotalExpensesBreakdown;
  profitOrLoss?: number;
  closingCapital?: number;
  achievedOrganicCertification?: boolean;
  weatherEvent?: string;
  verminEvent?: string;
  playerMachineEfficiency?: number;
  explanations?: Record<string, string>;
};

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [
    CommonModule, 
    JsonPipe, 
    MatCardModule
    // TODO: Add imports for pipes to display currency, numbers, etc.
  ],
  templateUrl: './result.component.html',
  styleUrls: ['./result.component.scss']
})
export class ResultComponent implements OnChanges {
  @Input() roundData: ResultData | null = null;

  // Parsed financial details for easier template access
  income?: HarvestIncome;
  expenses?: TotalExpensesBreakdown;
  profit?: number;
  capital?: number;
  explanationsList: {key: string, value: string}[] = [];

  constructor() {
    // console.log("ResultComponent instantiated");
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['roundData'] && this.roundData) {
      // console.log('ResultComponent received roundData:', this.roundData);
      // Attempt to map fields if they are directly on roundData (from ResultPublic mixin)
      this.income = this.roundData.incomeDetails;
      this.expenses = this.roundData.expenseDetails;
      this.profit = this.roundData.profitOrLoss;
      this.capital = this.roundData.closingCapital;
      if (this.roundData.explanations) {
        this.explanationsList = Object.entries(this.roundData.explanations).map(([key, value]) => ({ key, value }));
      }
      // If incomeDetails/expenseDetails are not directly on roundData but need to be fetched via result_id,
      // that logic would go here or in a resolver/service.
    }
  }
}
