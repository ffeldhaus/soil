import { expect } from 'chai';

import { GameEngine } from './game-engine';
import type { Parcel, Round, RoundDecision } from './types';

describe('GameEngine', () => {
  it('should initialize a round with correct default values', () => {
    const decision: RoundDecision = {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: {},
    };
    for (let i = 0; i < 40; i++) decision.parcels[i] = 'Fallow';

    const events = { weather: 'Normal', vermin: [] };
    const round = GameEngine.calculateRound(1, undefined, decision, events, 1000);

    expect(round.number).to.equal(1);
    expect(round.parcelsSnapshot).to.have.length(40);
    // Soil gain: Fallow Recovery (Force 20 * (80-80)/80 = 0) + Rotation Bonus (Fallow -> Fallow is 'good' = 0.5)
    // 80 + 0.5 = 80.5 -> 81
    expect(round.parcelsSnapshot[0].soil).to.equal(81);
  });

  it('should decrease soil quality with machines', () => {
    const decision: RoundDecision = {
      machines: 4,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: {},
    };
    for (let i = 0; i < 40; i++) decision.parcels[i] = 'Wheat';

    const prevParcels: Parcel[] = Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Fallow',
        soil: 100,
        nutrition: 100,
        yield: 0,
      }));
    const prevRound: Round = {
      number: 1,
      decision: { ...decision, machines: 4 },
      parcelsSnapshot: prevParcels,
      result: { machineRealLevel: 4 } as any, // Inject persistent machine state
    };

    const round = GameEngine.calculateRound(2, prevRound, decision, { weather: 'Normal', vermin: [] }, 1000, 20);
    // Fallow -> Wheat is 'good' (+0.5). Machines level 4 (-5.0). Wheat loss (-0.2).
    // Net: 100 + 0.5 - 5.0 - 0.2 = 95.3 -> 95.
    expect(round.parcelsSnapshot[0].soil).to.equal(95);
  });

  it('organic farming should benefit from animals', () => {
    const decision: RoundDecision = {
      machines: 0,
      organic: true,
      fertilizer: false,
      pesticide: false,
      organisms: true,
      parcels: {},
    };
    // 8 animals (20% of 40)
    for (let i = 0; i < 8; i++) decision.parcels[i] = 'Grass';
    for (let i = 8; i < 40; i++) decision.parcels[i] = 'Wheat';

    const prevParcels: Parcel[] = Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Fallow',
        soil: 80,
        nutrition: 50,
        yield: 0,
      }));
    const prevRound: Round = {
      number: 1,
      decision: decision,
      parcelsSnapshot: prevParcels,
    };

    const round = GameEngine.calculateRound(2, prevRound, decision, { weather: 'Normal', vermin: [] }, 1000);
    // Nutrition should increase due to animals
    expect(round.parcelsSnapshot[8].nutrition).to.be.greaterThan(50);
    expect(round.result?.bioSiegel).to.be.true;
  });

  it('should apply weather effects on yield and soil', () => {
    const decision: RoundDecision = {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: {},
    };
    for (let i = 0; i < 40; i++) decision.parcels[i] = 'Wheat';

    const prevParcels: Parcel[] = Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Fallow',
        soil: 80,
        nutrition: 80,
        yield: 0,
      }));
    const prevRound: Round = { number: 1, decision, parcelsSnapshot: prevParcels };

    // Test Drought
    const roundDrought = GameEngine.calculateRound(2, prevRound, decision, { weather: 'Drought', vermin: [] }, 1000);
    // Wheat base yield is 110. Drought multiplier is 0.55.
    // Soil effect: (80.5/80)^1.4 = 1.006^1.4 = 1.008
    // Nutr effect: 1.0
    // 110 * 1.008 * 1.0 * 0.55 = 60.9 -> 61
    expect(roundDrought.parcelsSnapshot[0].yield).to.be.closeTo(61, 5);
    // Drought soil impact: Fallow->Wheat (+0.5), Wheat (-0.2), Drought (-1.2). Net -0.9.
    // 80 - 0.9 = 79.1 -> 79
    expect(roundDrought.parcelsSnapshot[0].soil).to.equal(79);
  });

  it('should apply vermin effects and pest control', () => {
    const decisionNoPestControl: RoundDecision = {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: {},
    };
    for (let i = 0; i < 40; i++) decisionNoPestControl.parcels[i] = 'Potato';

    const prevParcels: Parcel[] = Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Fallow',
        soil: 80,
        nutrition: 80,
        yield: 0,
      }));
    const prevRound: Round = { number: 1, decision: decisionNoPestControl, parcelsSnapshot: prevParcels };

    // Pests without control
    const roundPests = GameEngine.calculateRound(
      2,
      prevRound,
      decisionNoPestControl,
      { weather: 'Normal', vermin: ['potato-beetle'] },
      1000,
    );
    // Potato yield 450. Pests penalty 0.6 (multiplier 0.4). Fallow->Potato is 'good' (+0.5).
    // Soil effect: (80.5/80)^1.5 = 1.006^1.5 = 1.009
    // Nutr effect: 1.0
    // 450 * 1.009 * 1.0 * 0.4 = 181.6 -> 182
    expect(roundPests.parcelsSnapshot[0].yield).to.be.closeTo(182, 20);

    // Pests with pesticide
    const decisionPesticide = { ...decisionNoPestControl, pesticide: true };
    const roundPesticide = GameEngine.calculateRound(
      2,
      prevRound,
      decisionPesticide,
      { weather: 'Normal', vermin: ['potato-beetle'] },
      1000,
    );
    // Pesticide should mitigate pests (multiplier 0.95).
    expect(roundPesticide.parcelsSnapshot[0].yield).to.be.greaterThan(400);
  });

  it('should calculate finances correctly', () => {
    const decision: RoundDecision = {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: {},
    };
    for (let i = 0; i < 40; i++) decision.parcels[i] = 'Wheat';

    const prevParcels: Parcel[] = Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Fallow',
        soil: 80,
        nutrition: 80,
        yield: 0,
      }));
    const prevRound: Round = { number: 1, decision, parcelsSnapshot: prevParcels };

    const round = GameEngine.calculateRound(2, prevRound, decision, { weather: 'Normal', vermin: [] }, 100000);

    // Total Labor Hours: 40 parcels * 10 hours = 400
    // Efficiency Factor (40 parcels): 0.7
    // Total Efficient Hours: 400 * 0.7 = 280
    // Labor Cost: 12000 (personnel) + 280 * 25 (hourly) = 19000
    expect(round.result?.expenses.labor).to.equal(19000);
    // Wheat base yield is 110. Soil effect 1.008. Income ~ 110.8 * 40 * 30 = 132960
    expect(round.result?.income).to.be.greaterThan(130000);
    expect(round.result?.capital).to.be.greaterThan(200000);
  });

  it('should lose Bio Siegel and benefits if synthetic inputs are used', () => {
    const decision: RoundDecision = {
      machines: 0,
      organic: true,
      fertilizer: true, // This should break Bio Siegel
      pesticide: false,
      organisms: false,
      parcels: {},
    };
    for (let i = 0; i < 40; i++) decision.parcels[i] = 'Wheat';

    const prevParcels: Parcel[] = Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Fallow',
        soil: 80,
        nutrition: 80,
        yield: 0,
      }));
    const prevRound: Round = { number: 1, decision, parcelsSnapshot: prevParcels };

    const round = GameEngine.calculateRound(2, prevRound, decision, { weather: 'Normal', vermin: [] }, 10000, 20, {});

    expect(round.result?.bioSiegel).to.be.false;
    expect(round.result?.subsidies).to.equal(8800);

    // Income should use conventional prices
    const wheatConvPrice = 30; // from constants
    const totalYield = Object.values(round.result!.harvestSummary).reduce((a, b) => a + b, 0);
    expect(round.result?.income).to.equal(totalYield * wheatConvPrice);
    // Yield ~53 * 40 * 30 = 63600
    expect(round.result?.income).to.be.closeTo(63000, 10000);
  });
});
