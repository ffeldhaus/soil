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
    personnel: number;
    maintenance: number;
  };
  total: number;
}

interface DetailedIncome {
  harvest: Record<string, number>;
  subsidies: number;
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
  capitalHistory: number[]; // History up to currentViewingRound
  profitMargin: number;
  isCurrentPlayer: boolean;
}

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './finance.html',
})
export class Finance implements OnChanges {
  readonly GAME_CONSTANTS = GAME_CONSTANTS;
  t(key: string): string {
    const translations: Record<string, string> = {
      'crop.wheat': 'Weizen',
      'crop.corn': 'Mais',
      'crop.potato': 'Kartoffel',
      'crop.beet': 'Zuckerrübe',
      'crop.barley': 'Gerste',
      'crop.oat': 'Hafer',
      'crop.rye': 'Roggen',
      'crop.fieldbean': 'Ackerbohne',
      'crop.animals': 'Tiere',
      'crop.fallow': 'Brachland',
      'crop.grass': 'Tiere',
    };
    return translations[key] || key;
  }
  @Input() game!: Game;
  @Input() viewingRound = 0;
  @Input() playerUid = '';

  players: PlayerFinanceData[] = [];
  currentViewingRound = 0;
  availableRounds: number[] = [];
  expandedSections: Record<string, boolean> = {
    decisions: false,
    seeds: false,
    investments: false,
    running: false,
    harvest: false,
  };

  ngOnChanges() {
    if (!this.game) return;

    this.currentViewingRound = this.viewingRound || this.game.currentRoundNumber;

    this.updateAvailableRounds();
    this.processPlayerData();
  }

  toggleSection(section: string) {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  private updateAvailableRounds() {
    // Show all rounds that have been completed (have a result)
    this.availableRounds = Array.from({ length: this.game.currentRoundNumber }, (_, i) => i + 1);
  }

  setRound(round: number) {
    this.currentViewingRound = round;
    this.processPlayerData();
  }

  get selectedRoundPestsData(): { icon: string; name: string }[] {
    for (const player of Object.values(this.game.players)) {
      const round = player.history.find((r) => r.number === this.currentViewingRound);
      if (round?.result?.events?.vermin) {
        const pests = round.result.events.vermin;
        if (pests.length > 0) {
          const iconMap: Record<string, string> = {
            'potato-beetle': '🪲',
            'corn-borer': '🦋',
            'aphid-black': '🐜',
            'aphid-cereal': '🦟',
            'pollen-beetle': '✨',
            nematode: '🐍',
            'pea-moth': '🐛',
            'oat-rust': '🍄',
            'swine-fever': '🐖',
          };
          return pests.map((p) => ({
            name: GAME_CONSTANTS.VERMIN_EFFECTS[p as keyof typeof GAME_CONSTANTS.VERMIN_EFFECTS]?.name || p,
            icon: iconMap[p] || '🐛',
          }));
        }
      }
    }
    return [];
  }
  private processPlayerData() {
    this.players = Object.values(this.game.players)
      .map((player) => {
        // Capital history should represent capital at the START of each round
        // history[0] = starting capital (start of round 1)
        // history[1] = result of round 1 (start of round 2)
        // ...
        // history[N] = result of round N (start of round N+1)
        const historyData = [1000];
        player.history.forEach((r) => {
          if (r.result) {
            historyData.push(r.result.capital);
          }
        });

        const data: PlayerFinanceData = {
          uid: player.uid,
          name: player.displayName || `Player ${player.uid.substring(0, 4)}`,
          capitalHistory: historyData,
          profitMargin: 0,
          isCurrentPlayer: player.uid === this.playerUid,
        };

        // Current viewing round result
        const currentRound = player.history.find((r) => r.number === this.currentViewingRound);
        if (currentRound) {
          data.result = currentRound.result;
          data.decision = {
            fertilizer: currentRound.decision.fertilizer,
            pesticide: currentRound.decision.pesticide,
            organisms: currentRound.decision.organisms,
            machines: currentRound.decision.machines,
            organic: currentRound.decision.organic,
          };
          this.calculateDetails(data, currentRound);
        }

        return data;
      })
      .sort((a, b) => {
        // Current player first, then alphabetical
        if (a.isCurrentPlayer) return -1;
        if (b.isCurrentPlayer) return 1;
        return a.name.localeCompare(b.name);
      });
  }

  private calculateDetails(data: PlayerFinanceData, round: Round) {
    const decision = round.decision;
    const result = round.result;
    if (!result) return;

    // Calculate detailed seeds and labor hours
    const seeds: Record<string, number> = {};
    let animalCount = 0;
    let totalLaborHours = 0;
    Object.entries(decision.parcels).forEach(([_, crop]) => {
      if (crop === 'Grass') {
        animalCount++;
        totalLaborHours += GAME_CONSTANTS.CROPS.Grass.laborHours || 0;
      } else if (crop === 'Fallow') {
        totalLaborHours += 2;
      } else if (GAME_CONSTANTS.CROPS[crop]) {
        const cost = decision.organic
          ? GAME_CONSTANTS.CROPS[crop].seedPrice.organic
          : GAME_CONSTANTS.CROPS[crop].seedPrice.conventional;
        seeds[crop] = (seeds[crop] || 0) + cost;
        totalLaborHours += GAME_CONSTANTS.CROPS[crop].laborHours || 0;
      }
    });

    // Calculate detailed income
    const harvestIncome: Record<string, number> = {};
    Object.entries(result.harvestSummary).forEach(([crop, amount]) => {
      if (crop !== 'Fallow' && crop !== 'Grass' && GAME_CONSTANTS.CROPS[crop]) {
        let price = result.marketPrices?.[crop];
        if (price === undefined) {
          price = decision.organic
            ? GAME_CONSTANTS.CROPS[crop].marketValue.organic
            : GAME_CONSTANTS.CROPS[crop].marketValue.conventional;
        }
        harvestIncome[crop] = (harvestIncome[crop] || 0) + amount * price;
      }
    });

    const machineLevel = Math.min(4, Math.max(0, Math.round(result.machineRealLevel ?? 0)));
    const personnelCost =
      GAME_CONSTANTS.MACHINE_FACTORS.PERSONNEL_COST +
      totalLaborHours * GAME_CONSTANTS.MACHINE_FACTORS.LABOR_COST_PER_HOUR;
    const maintenanceCost = GAME_CONSTANTS.MACHINE_FACTORS.MAINTENANCE_COST[machineLevel];

    data.detailedExpenses = {
      seeds,
      investments: {
        machines: result.expenses.investments || 0,
        animals: 0, // In current engine, livestock is not a one-time investment but a running cost per parcel
      },
      running: {
        organic_control: decision.organic ? GAME_CONSTANTS.EXPENSES.RUNNING.ORGANIC_CONTROL : 0,
        fertilize: decision.fertilizer ? 40 * GAME_CONSTANTS.EXPENSES.RUNNING.FERTILIZE : 0,
        pesticide: decision.pesticide ? 40 * GAME_CONSTANTS.EXPENSES.RUNNING.PESTICIDE : 0,
        organisms: decision.organisms ? 40 * GAME_CONSTANTS.EXPENSES.RUNNING.ORGANISMS : 0,
        animals: animalCount * GAME_CONSTANTS.EXPENSES.RUNNING.ANIMALS,
        personnel: personnelCost,
        maintenance: maintenanceCost,
      },
      total: result.expenses.total,
    };

    data.detailedIncome = {
      harvest: harvestIncome,
      subsidies: result.subsidies || 0,
      total: result.income + (result.subsidies || 0),
    };

    if (result.income > 0) {
      data.profitMargin = (result.profit / result.income) * 100;
    } else if (result.profit < 0) {
      data.profitMargin = -100;
    } else {
      data.profitMargin = 0;
    }
  }

  // --- Graph Helpers ---

  readonly VIEWBOX_WIDTH = 1000;
  readonly VIEWBOX_HEIGHT = 300;
  readonly GRAPH_MARGIN = { top: 30, right: 40, bottom: 60, left: 120 };

  getMaxCapital(): number {
    let max = 1000;
    this.players.forEach((p) => {
      p.capitalHistory.forEach((c) => {
        if (c > max) max = c;
      });
    });
    // Add 20% headroom
    max = max * 1.2;
    return Math.ceil(max / 500) * 500; // Round to nearest 500
  }

  getGraphPath(history: number[]): string {
    if (history.length < 2) return '';
    const maxCap = this.getMaxCapital();
    const maxRound = this.availableRounds.length || 1;

    return history
      .map((cap, roundIdx) => {
        const x =
          this.GRAPH_MARGIN.left +
          (roundIdx / maxRound) * (this.VIEWBOX_WIDTH - this.GRAPH_MARGIN.left - this.GRAPH_MARGIN.right);
        const y =
          this.GRAPH_MARGIN.top +
          (1 - cap / maxCap) * (this.VIEWBOX_HEIGHT - this.GRAPH_MARGIN.top - this.GRAPH_MARGIN.bottom);
        return `${roundIdx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }

  getGraphAreaPath(history: number[]): string {
    const linePath = this.getGraphPath(history);
    if (!linePath) return '';

    const maxRound = this.availableRounds.length || 1;
    const xEnd =
      this.GRAPH_MARGIN.left +
      ((history.length - 1) / maxRound) * (this.VIEWBOX_WIDTH - this.GRAPH_MARGIN.left - this.GRAPH_MARGIN.right);
    const yBottom = this.VIEWBOX_HEIGHT - this.GRAPH_MARGIN.bottom;

    return `${linePath} L ${xEnd} ${yBottom} L ${this.GRAPH_MARGIN.left} ${yBottom} Z`;
  }

  getGraphPoints(history: number[]) {
    const maxCap = this.getMaxCapital();
    const maxRound = this.availableRounds.length || 1;
    return history.map((cap, roundIdx) => ({
      x:
        this.GRAPH_MARGIN.left +
        (roundIdx / maxRound) * (this.VIEWBOX_WIDTH - this.GRAPH_MARGIN.left - this.GRAPH_MARGIN.right),
      y:
        this.GRAPH_MARGIN.top +
        (1 - cap / maxCap) * (this.VIEWBOX_HEIGHT - this.GRAPH_MARGIN.top - this.GRAPH_MARGIN.bottom),
      val: cap,
      round: roundIdx + 1,
    }));
  }
}
