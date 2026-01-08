import { CommonModule } from '@angular/common';
import { Component, Input, type OnChanges } from '@angular/core';

import { GAME_CONSTANTS } from '../../game-constants';
import type { Game, Round, RoundResult } from '../../types';

interface DetailedExpenses {
  seeds: Record<string, number>;
  investments: {
    machines: number;
    animals: number;
  };
  running: {
    organic_control: number;
    fertilize: number;
    pesticide: number;
    organisms: number;
    animals: number;
    base: number;
  };
  total: number;
}

interface DetailedIncome {
  harvest: Record<string, number>;
  total: number;
}

interface PlayerFinanceData {
  uid: string;
  name: string;
  decision?: {
    fertilizer: boolean;
    pesticide: boolean;
    organisms: boolean;
    machines: number;
    organic: boolean;
  };
  result?: RoundResult;
  prevResult?: RoundResult;
  detailedExpenses?: DetailedExpenses;
  detailedIncome?: DetailedIncome;
  capitalHistory: number[];
}

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './finance.html',
})
export class Finance implements OnChanges {
  t(key: string): string {
    const translations: Record<string, string> = {
      'crop.wheat': $localize`:@@crop.wheat:Weizen`,
      'crop.corn': $localize`:@@crop.corn:Mais`,
      'crop.potato': $localize`:@@crop.potato:Kartoffel`,
      'crop.beet': $localize`:@@crop.beet:Zuckerrübe`,
      'crop.barley': $localize`:@@crop.barley:Gerste`,
      'crop.oat': $localize`:@@crop.oat:Hafer`,
      'crop.rye': $localize`:@@crop.rye:Roggen`,
      'crop.fieldbean': $localize`:@@crop.fieldbean:Ackerbohne`,
      'crop.animals': $localize`:@@crop.animals:Tiere`,
      'crop.fallow': $localize`:@@crop.fallow:Brachland`,
    };
    return translations[key] || key;
  }
  @Input() game!: Game;
  @Input() viewingRound = 0;
  @Input() playerUid = '';

  players: PlayerFinanceData[] = [];
  isRoundOne = false;
  currentViewingRound = 0;
  availableRounds: number[] = [];

  ngOnChanges() {
    if (!this.game) return;

    if (this.currentViewingRound === 0 || this.currentViewingRound > this.game.currentRoundNumber) {
      this.currentViewingRound = this.viewingRound || this.game.currentRoundNumber;
    }

    this.updateAvailableRounds();
    this.processPlayerData();
  }

  private updateAvailableRounds() {
    this.availableRounds = Array.from({ length: this.game.currentRoundNumber }, (_, i) => i + 1);
  }

  setRound(round: number) {
    this.currentViewingRound = round;
    this.processPlayerData();
  }

  private processPlayerData() {
    this.isRoundOne = this.currentViewingRound === 1;

    this.players = Object.values(this.game.players)
      .map((player) => {
        const data: PlayerFinanceData = {
          uid: player.uid,
          name: player.displayName || `Player ${player.uid.substring(0, 4)}`,
          capitalHistory: player.history.map((r) => r.result?.capital || 0),
        };

        // Current viewing round result
        const currentRound = player.history.find((r) => r.number === this.currentViewingRound);
        if (currentRound) {
          data.result = currentRound.result;
          this.calculateDetails(data, currentRound);
        }

        // Previous round decision/result (for comparison)
        if (this.currentViewingRound > 1) {
          const prevRound = player.history.find((r) => r.number === this.currentViewingRound - 1);
          if (prevRound) {
            data.decision = {
              fertilizer: prevRound.decision.fertilizer,
              pesticide: prevRound.decision.pesticide,
              organisms: prevRound.decision.organisms,
              machines: prevRound.decision.machines,
              organic: prevRound.decision.organic,
            };
            data.prevResult = prevRound.result;
          }
        }

        return data;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private calculateDetails(data: PlayerFinanceData, round: Round) {
    const decision = round.decision;
    const result = round.result;
    if (!result) return;

    // Calculate detailed seeds
    const seeds: Record<string, number> = {};
    Object.entries(decision.parcels).forEach(([_, crop]) => {
      if (crop !== 'Fallow' && crop !== 'Grass' && GAME_CONSTANTS.CROPS[crop]) {
        const cost = decision.organic
          ? GAME_CONSTANTS.CROPS[crop].seedPrice.organic
          : GAME_CONSTANTS.CROPS[crop].seedPrice.conventional;
        seeds[crop] = (seeds[crop] || 0) + cost;
      }
    });

    // Calculate detailed income
    const harvestIncome: Record<string, number> = {};
    Object.entries(result.harvestSummary).forEach(([crop, amount]) => {
      if (crop !== 'Fallow' && crop !== 'Grass' && GAME_CONSTANTS.CROPS[crop]) {
        const price = decision.organic
          ? GAME_CONSTANTS.CROPS[crop].marketValue.organic
          : GAME_CONSTANTS.CROPS[crop].marketValue.conventional;
        harvestIncome[crop] = (harvestIncome[crop] || 0) + amount * price;
      }
    });

    data.detailedExpenses = {
      seeds,
      investments: {
        machines: result.expenses.investments || 0, // In current engine, investments is mostly machines
        animals: 0, // Placeholder if animals are added later
      },
      running: {
        organic_control: decision.organic ? GAME_CONSTANTS.EXPENSES.RUNNING.ORGANIC_CONTROL : 0,
        fertilize: decision.fertilizer ? 40 * GAME_CONSTANTS.EXPENSES.RUNNING.FERTILIZE : 0,
        pesticide: decision.pesticide ? 40 * GAME_CONSTANTS.EXPENSES.RUNNING.PESTICIDE : 0,
        organisms: decision.organisms ? 40 * GAME_CONSTANTS.EXPENSES.RUNNING.ORGANISMS : 0,
        animals: 0,
        base: decision.organic
          ? GAME_CONSTANTS.EXPENSES.RUNNING.BASE_ORGANIC
          : GAME_CONSTANTS.EXPENSES.RUNNING.BASE_CONVENTIONAL,
      },
      total: result.expenses.total,
    };

    data.detailedIncome = {
      harvest: harvestIncome,
      total: result.income,
    };
  }

  getChartHeight(capital: number, max: number): string {
    if (max === 0) return '0%';
    // Use a base height and scale
    const height = Math.max(10, (capital / max) * 100);
    return `${height}%`;
  }

  getMaxCapital(): number {
    let max = 0;
    this.players.forEach((p) => {
      p.capitalHistory.forEach((c) => {
        if (c > max) max = c;
      });
    });
    return max || 1000;
  }
}
