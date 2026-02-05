import { describe, expect, it } from 'vitest';
import type { Round, RoundDecision } from '../../types';
import { GameEngine } from './game-engine';

describe('GameEngine Consistency (Frontend)', () => {
  it('should produce identical results for a standard round', () => {
    const decision: RoundDecision = {
      machines: 1,
      organic: false,
      fertilizer: true,
      pesticide: false,
      organisms: false,
      parcels: { 0: 'Wheat', 1: 'Corn', 2: 'Potato' },
    };
    const events = { weather: 'Normal', vermin: [] };

    // Create a stable initial state
    const prevParcels = GameEngine.createInitialParcels();
    const prevRound: Round = {
      number: 0,
      parcelsSnapshot: prevParcels,
      avgSoil: 100,
      avgNutrition: 100,
      decision: { parcels: {} } as any,
      result: {
        profit: 0,
        capital: 100000,
        harvestSummary: {} as any,
        expenses: { seeds: 0, labor: 0, running: 0, investments: 0, total: 0 },
        income: 0,
        subsidies: 0,
        marketPrices: {},
        events: { weather: 'Normal', vermin: [] },
        bioSiegel: false,
        machineRealLevel: 0,
      },
    };

    const round = GameEngine.calculateRound(1, prevRound, decision, events, 100000);

    // Basic consistency checks
    expect(round.number).toBe(1);
    expect(round.parcelsSnapshot).toHaveLength(40);

    // Check specific parcel calculations
    const wheatParcel = round.parcelsSnapshot[0];
    expect(wheatParcel.crop).toBe('Wheat');
    // Fallow -> Wheat rotation bonus (+0.5), Wheat impact (-0.2), Machine 1 impact (-0.2)
    // Soil: 100 + 0.5 - 0.2 - 0.2 = 100.1 -> 100
    expect(wheatParcel.soil).toBe(100);

    // Wheat yield calculation
    // Base 85, Soil Effect 1.0, Nutrition Effect 1.0, Weather Normal 1.0, Pest 1.0
    // yield = 85
    expect(wheatParcel.yield).toBe(85);

    // Finance check
    expect(round.result?.income).toBeGreaterThan(0);
    expect(round.result?.expenses.total).toBeGreaterThan(0);
  });

  it('should handle abnormal weather consistently with backend', () => {
    const decision: RoundDecision = {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: { 0: 'Beet' },
    };
    const events = { weather: 'Flood', vermin: [] };
    const prevParcels = GameEngine.createInitialParcels();
    const prevRound: Round = {
      number: 0,
      parcelsSnapshot: prevParcels,
      avgSoil: 100,
      avgNutrition: 100,
      decision: { parcels: {} } as any,
      result: {
        profit: 0,
        capital: 100000,
        harvestSummary: {} as any,
        expenses: { seeds: 0, labor: 0, running: 0, investments: 0, total: 0 },
        income: 0,
        subsidies: 0,
        marketPrices: {},
        events: { weather: 'Normal', vermin: [] },
        bioSiegel: false,
        machineRealLevel: 0,
      },
    };

    const round = GameEngine.calculateRound(1, prevRound, decision, events, 100000);

    // Beet is 'Stark' (Strong) sensitive to Flood.
    // Flood yield multiplier: 0.7
    // Penalty: 1.0 - 0.7 = 0.3
    // Sensitivity Multiplier for 'Stark': 1.0
    // Final Weather Yield Effect: 1.0 - 0.3 * 1.0 = 0.7
    // Yield: 95 (base for Beet) * 0.7 = 66.5
    // Wait, Beet base yield is actually 720.
    // Yield: 720 * 0.7 = 504.
    expect(round.parcelsSnapshot[0].yield).toBe(504);

    // Flood soil impact: -2.0
    // Fallow -> Beet rotation bonus: 'good' (+0.5)
    // Beet impact: +0.2 (gain) and -0.2 (loss) -> 0
    // Soil: 100 + 0.5 - 2.0 = 98.5 -> 99
    expect(round.parcelsSnapshot[0].soil).toBe(99);
  });
});
