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

interface DetailedSubsidies {
  base: number;
  bio: number;
  greenStrip: number;
  total: number;
}

interface DetailedIncome {
  harvest: Record<string, number>;
  subsidies: DetailedSubsidies;
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
  readonly INITIAL_CAPITAL = 100000;
  readonly ALL_ARABLE_CROPS = [
    'Wheat',
    'Corn',
    'Potato',
    'Beet',
    'Barley',
    'Oat',
    'Rye',
    'Fieldbean',
    'Rapeseed',
    'Pea',
  ];
  readonly OTHER_PLAYER_COLORS = ['#38bdf8', '#f59e0b', '#a855f7', '#f43f5e', '#14b8a6'];

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
      'crop.rapeseed': 'Raps',
      'crop.pea': 'Erbse',
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
        // Capital history represents capital at the START of each round:
        // history[0] = starting capital (start of round 1 = 100.000 €)
        // history[1] = result of round 1 (start of round 2)
        // ...
        // history[N] = result of round N (start of round N+1)
        const historyData = [this.INITIAL_CAPITAL];
        player.history.forEach((r) => {
          if (r.result) {
            historyData.push(r.result.capital);
          }
        });

        const prevRound = player.history.find((r) => r.number === this.currentViewingRound - 1);

        const data: PlayerFinanceData = {
          uid: player.uid,
          name: player.displayName || `Player ${player.uid.substring(0, 4)}`,
          capitalHistory: historyData,
          profitMargin: 0,
          isCurrentPlayer: player.uid === this.playerUid,
          prevResult: prevRound?.result,
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

    // Calculate detailed subsidies
    const greenParcels = Object.values(decision.parcels).filter((c) => c === 'Fallow' || c === 'Grass').length;
    const greenStripParcels = Math.min(greenParcels, GAME_CONSTANTS.SUBSIDIES.GREEN_STRIP_MAX_PARCELS);
    const numParcels = Object.keys(decision.parcels).length || 40;
    const regularParcels = numParcels - greenStripParcels;
    const bioEligibleParcels = Object.values(decision.parcels).filter((c) => c !== 'Fallow').length || numParcels;

    const baseSubsidy = regularParcels * GAME_CONSTANTS.SUBSIDIES.BASE;
    const greenStripSubsidy = greenStripParcels * GAME_CONSTANTS.SUBSIDIES.GREEN_STRIP;
    const bioSubsidy = result.bioSiegel ? bioEligibleParcels * GAME_CONSTANTS.SUBSIDIES.BIO : 0;

    data.detailedIncome = {
      harvest: harvestIncome,
      subsidies: {
        base: baseSubsidy,
        greenStrip: greenStripSubsidy,
        bio: bioSubsidy,
        total: result.subsidies || 0,
      },
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

  getPlayerColor(player: PlayerFinanceData, index: number): string {
    if (player.isCurrentPlayer) return '#10b981';
    return this.OTHER_PLAYER_COLORS[index % this.OTHER_PLAYER_COLORS.length];
  }

  getActiveSeedCrops(): string[] {
    return this.ALL_ARABLE_CROPS.filter((crop) =>
      this.players.some((p) => (p.detailedExpenses?.seeds?.[crop] || 0) > 0),
    );
  }

  getActiveHarvestCrops(): string[] {
    return this.ALL_ARABLE_CROPS.filter((crop) =>
      this.players.some((p) => (p.detailedIncome?.harvest?.[crop] || 0) > 0),
    );
  }

  hasAnyOverdraftInterest(): boolean {
    return this.players.some((p) => (p.result?.expenses?.overdraftInterest || p.result?.overdraftInterest || 0) > 0);
  }

  hasAnyContractBonus(): boolean {
    return this.players.some((p) => (p.result?.contractBonus || 0) > 0);
  }

  // --- Graph Helpers ---

  readonly VIEWBOX_WIDTH = 1000;
  readonly VIEWBOX_HEIGHT = 240;
  readonly GRAPH_MARGIN = { top: 20, right: 32, bottom: 38, left: 105 };

  getMinCapital(): number {
    let min = this.INITIAL_CAPITAL;
    this.players.forEach((p) => {
      p.capitalHistory.forEach((c) => {
        if (c < min) min = c;
      });
    });
    const padded = min >= 0 ? Math.round(min * 0.9) : Math.round(min * 1.1);
    const rounded = Math.floor(padded / 10000) * 10000;
    return min >= 0 ? Math.max(0, rounded) : rounded;
  }

  getMaxCapital(): number {
    let max = this.INITIAL_CAPITAL;
    this.players.forEach((p) => {
      p.capitalHistory.forEach((c) => {
        if (c > max) max = c;
      });
    });
    const padded = max >= 0 ? Math.round(max * 1.1) : Math.round(max * 0.9);
    const rounded = Math.ceil(padded / 10000) * 10000;
    const minCap = this.getMinCapital();
    return Math.max(minCap + 20000, rounded);
  }

  getGridCapital(linePercent: number): number {
    const minCap = this.getMinCapital();
    const maxCap = this.getMaxCapital();
    return minCap + ((100 - linePercent) / 100) * (maxCap - minCap);
  }

  getYForCapital(cap: number): number {
    const minCap = this.getMinCapital();
    const maxCap = this.getMaxCapital();
    const range = Math.max(1, maxCap - minCap);
    const ratio = (cap - minCap) / range;
    return (
      this.GRAPH_MARGIN.top + (1 - ratio) * (this.VIEWBOX_HEIGHT - this.GRAPH_MARGIN.top - this.GRAPH_MARGIN.bottom)
    );
  }

  getGraphPath(history: number[]): string {
    if (history.length < 2) return '';
    const maxRound = this.availableRounds.length || 1;

    return history
      .map((cap, roundIdx) => {
        const x =
          this.GRAPH_MARGIN.left +
          (roundIdx / maxRound) * (this.VIEWBOX_WIDTH - this.GRAPH_MARGIN.left - this.GRAPH_MARGIN.right);
        const y = this.getYForCapital(cap);
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
    const maxRound = this.availableRounds.length || 1;
    return history.map((cap, roundIdx) => ({
      x:
        this.GRAPH_MARGIN.left +
        (roundIdx / maxRound) * (this.VIEWBOX_WIDTH - this.GRAPH_MARGIN.left - this.GRAPH_MARGIN.right),
      y: this.getYForCapital(cap),
      val: cap,
      round: roundIdx === 0 ? 1 : Math.min(roundIdx, maxRound),
      labelRound: roundIdx + 1,
    }));
  }
}
