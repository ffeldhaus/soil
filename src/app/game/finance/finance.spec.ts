import { CropType, Game } from '../../types';
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
    // component.ngOnChanges(); // Trigger initial logic
  });

  it('should calculate detailed seeds correctly for Round 1', () => {
    component.currentViewingRound = 1;
    (component as any).processPlayerData();
    const player = component.players.find((p) => p.uid === 'player1');
    expect(player).toBeTruthy();
    expect(player?.detailedExpenses?.seeds['Wheat']).toBe(72); // Wheat conv
    expect(player?.detailedExpenses?.seeds['Corn']).toBe(70); // Corn conv
  });

  it('should calculate detailed seeds correctly for Round 2 (Organic)', () => {
    component.currentViewingRound = 2;
    (component as any).processPlayerData();
    const player = component.players.find((p) => p.uid === 'player1');
    expect(player).toBeTruthy();
    expect(player?.detailedExpenses?.seeds['Potato']).toBe(133); // Potato organic
  });

  it('should calculate detailed income correctly for Round 1', () => {
    component.currentViewingRound = 1;
    (component as any).processPlayerData();
    const player = component.players.find((p) => p.uid === 'player1');
    // Wheat: 100 * 17 (Conv) = 1700
    // Corn: 200 * 17 (Conv) = 3400
    expect(player?.detailedIncome?.harvest['Wheat']).toBe(1700);
    expect(player?.detailedIncome?.harvest['Corn']).toBe(3400);
  });

  it('should calculate detailed investments correctly', () => {
    component.currentViewingRound = 2;
    (component as any).processPlayerData();
    const player = component.players.find((p) => p.uid === 'player1');
    expect(player?.detailedExpenses?.investments?.machines).toBe(0); // in mock it was 0

    // Let's test with a non-zero investment
    mockGame.players['player1'].history[1].result!.expenses.investments = 500;
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
    expect(player?.detailedExpenses?.running?.fertilize).toBe(40 * 50); // 2000
    expect(player?.detailedExpenses?.running?.organic_control).toBe(0);
    expect(player?.detailedExpenses?.running?.base).toBe(500); // Conventional base
  });

  it('should calculate capital history correctly', () => {
    (component as any).processPlayerData();
    const player = component.players.find((p) => p.uid === 'player1');
    expect(player?.capitalHistory).toEqual([11000, 13000]);
  });

  it('should update currentViewingRound in ngOnChanges', () => {
    component.viewingRound = 1;
    component.ngOnChanges();
    expect(component.currentViewingRound).toBe(1);
  });

  it('should calculate max capital correctly for chart', () => {
    (component as any).processPlayerData();
    expect(component.getMaxCapital()).toBe(13000);
  });
});
