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
              expenses: { seeds: 142, labor: 0, running: 1000, investments: 2000, total: 3142 },
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
    expect(player?.detailedExpenses?.seeds.Potato).toBe(2200); // Potato organic
  });

  it('should calculate detailed income correctly for Round 1', () => {
    component.currentViewingRound = 1;
    (component as any).processPlayerData();
    const player = component.players.find((p) => p.uid === 'player1');
    // Wheat: 100 * 30 (Conv) = 3000
    // Corn: 200 * 35 (Conv) = 7000
    expect(player?.detailedIncome?.harvest.Wheat).toBe(3000);
    expect(player?.detailedIncome?.harvest.Corn).toBe(7000);
  });

  it('should calculate detailed investments correctly', () => {
    component.currentViewingRound = 1;
    (component as any).processPlayerData();
    const player = component.players.find((p) => p.uid === 'player1');
    // Machine Level 1 Cost: 2000
    // Note: Finance component currently maps total investments (including supplies) to machines in the breakdown,
    // or has a discrepancy. For this test, we just check what's defined.
    // In GameEngine, investments = machine + supplies. In Round 1, supplies=0 (no fert/pest/org).
    // So investments = 2000.
    expect(player?.detailedExpenses?.investments?.machines).toBe(2000);
  });

  it('should calculate detailed running costs correctly', () => {
    component.currentViewingRound = 1;
    (component as any).processPlayerData();
    const player = component.players.find((p) => p.uid === 'player1');
    // Fertilizer: 40 * 100 = 4000
    // Personnel: 5000 + (TotalLabor * 25)
    // Labor: Wheat (10h) + Corn (15h) = 25h
    // Cost: 5000 + (25 * 25) = 5625
    expect(player?.detailedExpenses?.running?.fertilize).toBe(4000);
    expect(player?.detailedExpenses?.running?.organic_control).toBe(0);
    expect(player?.detailedExpenses?.running?.personnel).toBe(5625);
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
    expect(component.getMaxCapital()).toBe(16000);
  });
});
