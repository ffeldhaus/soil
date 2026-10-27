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

  it('should create balanced heterogeneous starting parcels with exact 100.0 averages', () => {
    const easyParcels = GameEngine.createInitialParcels('easy', 0);
    expect(easyParcels.every((p) => p.soil === 100 && p.nutrition === 100)).toBe(true);

    const normalP0 = GameEngine.createInitialParcels('normal', 0);
    const normalP1 = GameEngine.createInitialParcels('normal', 1);
    const avgSoilNormal = normalP0.reduce((s, p) => s + p.soil, 0) / 40;
    const avgNutrNormal = normalP0.reduce((s, p) => s + p.nutrition, 0) / 40;
    expect(avgSoilNormal).toBe(100);
    expect(avgNutrNormal).toBe(100);
    expect(normalP0[0].soil).not.toBe(normalP1[0].soil);

    const hardP0 = GameEngine.createInitialParcels('hard', 0);
    const avgSoilHard = hardP0.reduce((s, p) => s + p.soil, 0) / 40;
    const avgNutrHard = hardP0.reduce((s, p) => s + p.nutrition, 0) / 40;
    expect(avgSoilHard).toBe(100);
    expect(avgNutrHard).toBe(100);
    expect(Math.min(...hardP0.map((p) => p.soil))).toBe(76);
    expect(Math.max(...hardP0.map((p) => p.soil))).toBe(124);
  });

  it('should enforce 2 grace rounds, roll HeatWave, and apply hard climate escalation', () => {
    const r1 = GameEngine.rollRoundEvents(1, 20, 'hard');
    const r2 = GameEngine.rollRoundEvents(2, 20, 'hard');
    expect(r1).toEqual({ weather: 'Normal', vermin: [] });
    expect(r2).toEqual({ weather: 'Normal', vermin: [] });

    // HeatWave rolls in middle bucket for round 3+
    const heatWave = GameEngine.rollWeather(5, 20, 'normal', 0.6);
    expect(heatWave).toBe('HeatWave');

    // Climate escalation on hard in later rounds intensifies yield loss
    const prevRound: Round = {
      number: 19,
      parcelsSnapshot: GameEngine.createInitialParcels('easy'),
      avgSoil: 100,
      avgNutrition: 100,
      decision: { parcels: {} } as any,
    };
    const decision: RoundDecision = {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: { 0: 'Beet' },
    };
    const normalDiffRound = GameEngine.calculateRound(
      20,
      prevRound,
      decision,
      { weather: 'Flood', vermin: [] },
      100000,
      20,
      { difficulty: 'normal' },
    );
    const hardDiffRound = GameEngine.calculateRound(
      20,
      prevRound,
      decision,
      { weather: 'Flood', vermin: [] },
      100000,
      20,
      { difficulty: 'hard' },
    );
    expect(hardDiffRound.parcelsSnapshot[0].yield!).toBeLessThan(normalDiffRound.parcelsSnapshot[0].yield!);
  });

  it('should calculate overdraft interest, regional contracts, sustainability score, and stickers', () => {
    const prevParcels = GameEngine.createInitialParcels('easy').map((p) => ({
      ...p,
      soil: 106,
      crop: 'Grass' as const,
    }));
    const prevRound: Round = {
      number: 2,
      parcelsSnapshot: prevParcels,
      avgSoil: 106,
      avgNutrition: 100,
      decision: { parcels: {} } as any,
    };
    const parcels: Record<number, any> = {};
    for (let i = 0; i < 30; i++) parcels[i] = 'Fieldbean';
    for (let i = 30; i < 40; i++) parcels[i] = 'Wheat';

    const decision: RoundDecision = {
      machines: 0,
      organic: true,
      fertilizer: false,
      pesticide: false,
      organisms: true,
      parcels,
    };

    const round = GameEngine.calculateRound(
      2,
      prevRound,
      decision,
      { weather: 'Drought', vermin: ['aphid-black'] },
      -60000,
      20,
      { difficulty: 'hard' },
    );

    // Overdraft interest on -60,000 at 10% (hard) = 6,000
    expect(round.result?.overdraftInterest).toBe(6000);
    expect(round.result?.expenses.overdraftInterest).toBe(6000);
    // Legume contract fulfilled in round 2 (+3,500)
    expect(round.result?.contractBonus).toBe(3500);
    expect(round.result?.unlockedStickers).toContain('humus-pionier');
    expect(round.result?.unlockedStickers).toContain('fruchtfolge-meister');
    expect(round.result?.unlockedStickers).toContain('vertrags-partner');
    expect(round.result?.unlockedStickers).toContain('nuetzlings-allianz');
    expect(typeof round.result?.sustainabilityScore).toBe('number');
  });

  it('should evaluate all 4 regional contracts accurately', () => {
    const baseDecision = {
      machines: 1,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: {} as Record<number, any>,
    };

    const makeParcels = (crops: string[]) =>
      Array.from({ length: 40 }, (_, i) => ({
        index: i,
        crop: (crops[i] || 'Fallow') as any,
        soil: 100,
        nutrition: 100,
        yield: 0,
      }));

    // 1. legume-initiative: >= 6 Fieldbean or Pea
    expect(
      GameEngine.evaluateContractFulfillment('legume-initiative', makeParcels(Array(6).fill('Pea')), baseDecision, 90),
    ).toBe(true);
    expect(
      GameEngine.evaluateContractFulfillment('legume-initiative', makeParcels(Array(5).fill('Pea')), baseDecision, 100),
    ).toBe(false);

    // 2. humus-steward: avgSoil >= 100 and >= 5 Grass or Fallow
    expect(
      GameEngine.evaluateContractFulfillment('humus-steward', makeParcels(Array(35).fill('Wheat')), baseDecision, 100),
    ).toBe(true);
    expect(
      GameEngine.evaluateContractFulfillment('humus-steward', makeParcels(Array(35).fill('Wheat')), baseDecision, 99),
    ).toBe(false);

    // 3. regional-grain: >= 12 grain parcels across >= 2 grain species and avgSoil >= 95
    expect(
      GameEngine.evaluateContractFulfillment(
        'regional-grain',
        makeParcels([...Array(6).fill('Wheat'), ...Array(6).fill('Rye')]),
        baseDecision,
        95,
      ),
    ).toBe(true);
    // Fails if only 1 grain species (monoculture windfall guard)
    expect(
      GameEngine.evaluateContractFulfillment('regional-grain', makeParcels(Array(15).fill('Wheat')), baseDecision, 100),
    ).toBe(false);

    // 4. eco-pioneer: !pesticide, >= 30 cultivated parcels, avgSoil >= 95
    expect(
      GameEngine.evaluateContractFulfillment(
        'eco-pioneer',
        makeParcels(Array(30).fill('Wheat')),
        { ...baseDecision, pesticide: false },
        95,
      ),
    ).toBe(true);
    expect(
      GameEngine.evaluateContractFulfillment(
        'eco-pioneer',
        makeParcels(Array(29).fill('Wheat')),
        { ...baseDecision, pesticide: false },
        95,
      ),
    ).toBe(false);
    expect(
      GameEngine.evaluateContractFulfillment(
        'eco-pioneer',
        makeParcels(Array(35).fill('Wheat')),
        { ...baseDecision, pesticide: true },
        100,
      ),
    ).toBe(false);
  });
});
