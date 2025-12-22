import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game, PlayerState, Round, RoundResult, CropType, RoundDecision } from '../../types';

const EXPENSES = {
    SEEDS: {
        Fieldbean: { organic: 144, conventional: 120 },
        Barley: { organic: 85, conventional: 68 },
        Oat: { organic: 75, conventional: 60 },
        Potato: { organic: 133, conventional: 110 },
        Corn: { organic: 84, conventional: 70 },
        Rye: { organic: 95, conventional: 76 },
        Wheat: { organic: 90, conventional: 72 },
        Beet: { organic: 144, conventional: 120 },
    } as Record<string, { organic: number, conventional: number }>,
    RUNNING: {
        ORGANIC_CONTROL: 200,
        FERTILIZE: 50,
        PESTICIDE: 50,
        ORGANISMS: 100,
        BASE_CONVENTIONAL: 500,
        BASE_ORGANIC: 700,
    }
};

const PRICES = {
    Fieldbean: { organic: 21, conventional: 18 },
    Barley: { organic: 14.5, conventional: 13 },
    Oat: { organic: 14, conventional: 12 },
    Potato: { organic: 5, conventional: 4 },
    Corn: { organic: 17, conventional: 15 },
    Rye: { organic: 14.5, conventional: 13 },
    Wheat: { organic: 17, conventional: 15 },
    Beet: { organic: 2.5, conventional: 2 },
} as Record<string, { organic: number, conventional: number }>;

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
    templateUrl: './finance.html'
})
export class Finance implements OnChanges {
    @Input() game!: Game;
    @Input() viewingRound: number = 0;
    @Input() playerUid: string = '';

    players: PlayerFinanceData[] = [];
    isRoundOne: boolean = false;
    currentViewingRound: number = 0;
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

        this.players = Object.values(this.game.players).map(player => {
            const data: PlayerFinanceData = {
                uid: player.uid,
                name: player.displayName || `Player ${player.uid.substring(0, 4)}`,
                capitalHistory: player.history.map(r => r.result?.capital || 0)
            };

            // Current viewing round result
            const currentRound = player.history.find(r => r.number === this.currentViewingRound);
            if (currentRound) {
                data.result = currentRound.result;
                this.calculateDetails(data, currentRound);
            }

            // Previous round decision/result (for comparison)
            if (this.currentViewingRound > 1) {
                const prevRound = player.history.find(r => r.number === this.currentViewingRound - 1);
                if (prevRound) {
                    data.decision = {
                        fertilizer: prevRound.decision.fertilizer,
                        pesticide: prevRound.decision.pesticide,
                        organisms: prevRound.decision.organisms,
                        machines: prevRound.decision.machines,
                        organic: prevRound.decision.organic
                    };
                    data.prevResult = prevRound.result;
                }
            }

            return data;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }

    private calculateDetails(data: PlayerFinanceData, round: Round) {
        const decision = round.decision;
        const result = round.result;
        if (!result) return;

        // Calculate detailed seeds
        const seeds: Record<string, number> = {};
        Object.entries(decision.parcels).forEach(([_, crop]) => {
            if (crop !== 'Fallow' && crop !== 'Grass' && EXPENSES.SEEDS[crop]) {
                const cost = decision.organic ? EXPENSES.SEEDS[crop].organic : EXPENSES.SEEDS[crop].conventional;
                seeds[crop] = (seeds[crop] || 0) + cost;
            }
        });

        // Calculate detailed income
        const harvestIncome: Record<string, number> = {};
        Object.entries(result.harvestSummary).forEach(([crop, amount]) => {
            if (crop !== 'Fallow' && crop !== 'Grass' && PRICES[crop]) {
                const price = decision.organic ? PRICES[crop].organic : PRICES[crop].conventional;
                harvestIncome[crop] = (harvestIncome[crop] || 0) + (amount * price);
            }
        });

        data.detailedExpenses = {
            seeds,
            investments: {
                machines: result.expenses.investments || 0, // In current engine, investments is mostly machines
                animals: 0 // Placeholder if animals are added later
            },
            running: {
                organic_control: decision.organic ? EXPENSES.RUNNING.ORGANIC_CONTROL : 0,
                fertilize: decision.fertilizer ? 40 * EXPENSES.RUNNING.FERTILIZE : 0,
                pesticide: decision.pesticide ? 40 * EXPENSES.RUNNING.PESTICIDE : 0,
                organisms: decision.organisms ? 40 * EXPENSES.RUNNING.ORGANISMS : 0,
                animals: 0,
                base: decision.organic ? EXPENSES.RUNNING.BASE_ORGANIC : EXPENSES.RUNNING.BASE_CONVENTIONAL
            },
            total: result.expenses.total
        };

        data.detailedIncome = {
            harvest: harvestIncome,
            total: result.income
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
        this.players.forEach(p => {
            p.capitalHistory.forEach(c => {
                if (c > max) max = c;
            });
        });
        return max || 1000;
    }
}
