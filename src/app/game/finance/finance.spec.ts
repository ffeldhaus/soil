import type { CropType, Game } from '../../types';
import { Finance } from './finance';

describe('Finance Component Logic', () => {
  let component: Finance;

  const mockGame: Game = {
    id: 'test-game',
    name: 'Test Game',
    hostUid: 'admin',
    status: 'in_progress',
    currentRoundNumber: 2,
    settings: { length: 10, difficulty: 'normal' },
    createdAt: Date.now(),
    players: {
      player1: {
        uid: 'player1',
        displayName: 'Player One',
        isAi: false,
        capital: 15000,
        currentRound: 2,
        history: [
          {
            number: 1,
            decision: {
              organic: false,
              fertilizer: true,
              pesticide: false,
              organisms: false,
              machines: 1,
              parcels: { 0: 'Wheat', 1: 'Corn' } as Record<number, CropType>,
            },
            result: {
              profit: 1000,
              capital: 11000,
              harvestSummary: { Wheat: 100, Corn: 200 } as any,
              expenses: { seeds: 142, labor: 0, running: 1000, investments: 0, total: 1142 },
              income: 4500, // Corrected to match PRICING if possible, but doesn't matter for detailed breakdwon calculation which uses harvestSummary
              events: { weather: 'Sunny', vermin: 'None' },
              bioSiegel: false,
            },
            parcelsSnapshot: [],
          },
          {
            number: 2,
            decision: {
              organic: true,
              fertilizer: false,
              pesticide: false,
              organisms: true,
              machines: 2,
              parcels: { 2: 'Potato' } as Record<number, CropType>,
            },
            result: {
              profit: 2000,
              capital: 13000,
              harvestSummary: { Potato: 500 } as any,
              expenses: { seeds: 133, labor: 0, running: 1500, investments: 0, total: 1633 },
              income: 2500,
              events: { weather: 'Rainy', vermin: 'Lice' },
              bioSiegel: true,
            },
            parcelsSnapshot: [],
          },
        ],
      },
    },
  };

  beforeEach(() => {
    component = new Finance();
    component.game = JSON.parse(JSON.stringify(mockGame)); // Fresh copy
    component.playerUid = 'player1';
    component.viewingRound = 2;
    component.ngOnChanges(); // Trigger initial logic
  });

  it('should calculate detailed seeds correctly for Round 1', () => {
    component.currentViewingRound = 1;
    (component as any).processPlayerData();
    const player = component.players.find((p) => p.uid === 'player1');
    expect(player).toBeTruthy();
    expect(player?.detailedExpenses?.seeds.Wheat).toBe(100); // Wheat conv
    expect(player?.detailedExpenses?.seeds.Corn).toBe(100); // Corn conv
  });

  it('should calculate detailed seeds correctly for Round 2 (Organic)', () => {
    component.currentViewingRound = 2;
    (component as any).processPlayerData();
    const player = component.players.find((p) => p.uid === 'player1');
    expect(player).toBeTruthy();
    expect(player?.detailedExpenses?.seeds.Potato).toBe(1000); // Potato organic
  });

  it('should calculate detailed income correctly for Round 1', () => {
    component.currentViewingRound = 1;
    (component as any).processPlayerData();
    const player = component.players.find((p) => p.uid === 'player1');
    // Wheat: 100 * 25 (Conv) = 2500
    // Corn: 200 * 25 (Conv) = 5000
    expect(player?.detailedIncome?.harvest.Wheat).toBe(2500);
    expect(player?.detailedIncome?.harvest.Corn).toBe(5000);
  });

  it('should calculate detailed investments correctly', () => {
    component.currentViewingRound = 2;
    (component as any).processPlayerData();
    const player = component.players.find((p) => p.uid === 'player1');
    expect(player?.detailedExpenses?.investments?.machines).toBe(0); // in mock it was 0

    // Let's test with a non-zero investment
    mockGame.players.player1.history[1].result!.expenses.investments = 500;
    component.game = JSON.parse(JSON.stringify(mockGame));
    (component as any).processPlayerData();
    const p2 = component.players.find((p) => p.uid === 'player1');
    expect(p2?.detailedExpenses?.investments?.machines).toBe(500);
  });

  it('should calculate detailed running costs correctly', () => {
    component.currentViewingRound = 1;
    (component as any).processPlayerData();
    const player = component.players.find((p) => p.uid === 'player1');
    // Round 1: fertilizer true, organic false
    // Scale: 10 rounds / 20 = 0.5
    // Fertilizer: 40 * 100 * 0.5 = 2000
    // Base: 2500 * 0.5 = 1250
    expect(player?.detailedExpenses?.running?.fertilize).toBe(2000);
    expect(player?.detailedExpenses?.running?.organic_control).toBe(0);
    expect(player?.detailedExpenses?.running?.base).toBe(1250);
  });

  it('should calculate capital history correctly', () => {
    (component as any).processPlayerData();
    const player = component.players.find((p) => p.uid === 'player1');
    expect(player?.capitalHistory).toEqual([1000, 11000, 13000]);
  });

  it('should update currentViewingRound in ngOnChanges', () => {
    component.currentViewingRound = 0;
    component.viewingRound = 1;
    component.ngOnChanges();
    expect(component.currentViewingRound).toBe(1);
  });

  it('should calculate max capital correctly for chart', () => {
    (component as any).processPlayerData();
    expect(component.getMaxCapital()).toBe(13000);
  });
});
