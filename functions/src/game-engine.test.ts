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
    const events = { weather: 'Normal', vermin: [] };
    const round = GameEngine.calculateRound(1, undefined, decision, events, 100000);

    expect(round.number).to.equal(1);
    expect(round.parcelsSnapshot).to.have.length(40);
    // Initial soil is 100. Fallow recovery: (100-100)/100 * 2 * 10 = 0.
    // Soil gain from Fallow: 0. New soil: 100.
    expect(round.parcelsSnapshot[0].soil).to.be.closeTo(100, 2);
    // Nutrition gain from fallow recovery: 5. prev (100) + 5 = 105.
    expect(round.parcelsSnapshot[0].nutrition).to.be.closeTo(105, 2);
  });

  it('should apply rotation and machine impact', () => {
    const decision: RoundDecision = {
      machines: 4, // Max impact
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: { 0: 'Wheat' },
    };
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
      decision: { parcels: {} } as any,
      parcelsSnapshot: prevParcels,
      avgSoil: 100,
      avgNutrition: 100,
      result: { machineRealLevel: 0 } as any,
    };

    const round = GameEngine.calculateRound(2, prevRound, decision, { weather: 'Normal', vermin: [] }, 100000, 20);

    // Fallow -> Wheat rotation bonus (+0.5), Wheat impact (-0.2), Machine Level 1 impact (-0.2)
    // 100 + 0.5 - 0.2 - 0.2 = 100.1 -> 100
    expect(round.parcelsSnapshot[0].soil).to.be.closeTo(100, 2);
  });

  it('should calculate yields correctly based on soil and nutrition', () => {
    const decision: RoundDecision = {
      machines: 0,
      organic: true, // 0.4 multiplier
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: { 8: 'Wheat' },
    };
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
      decision: { parcels: {} } as any,
      parcelsSnapshot: prevParcels,
    };

    const round = GameEngine.calculateRound(2, prevRound, decision, { weather: 'Normal', vermin: [] }, 100000);

    // Starting soil 100. Soil effect: (100/100)^1.4 = 1.0.
    // Starting nutrition 100. Nutr effect: (100/100)^1.1 = 1.0.
    // Wheat base yield 85. Organic 0.4.
    // Yield = 85 * 1.0 * 1.0 * 0.4 = 34.
    expect(round.parcelsSnapshot[8].yield).to.equal(34);
    expect(round.result?.bioSiegel).to.be.true;
  });

  it('should apply weather effects on yield and soil', () => {
    const decision: RoundDecision = {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: { 0: 'Wheat' },
    };
    const prevParcels: Parcel[] = Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Fallow',
        soil: 100,
        nutrition: 100,
        yield: 0,
      }));
    const prevRound: Round = { number: 1, decision, parcelsSnapshot: prevParcels };

    // Test Drought
    const roundDrought = GameEngine.calculateRound(2, prevRound, decision, { weather: 'Drought', vermin: [] }, 100000);
    // Wheat base yield is 85. Drought base factor is 0.75 (Penalty 0.25).
    // Wheat weather sensitivity to drought: Mäßig (multiplier 0.6)
    // Yield Effect: 1.0 - 0.25 * 0.6 = 0.85
    // Yield = 85 * 1.0 * 1.0 * 0.85 = 72.25 -> 72
    expect(roundDrought.parcelsSnapshot[0].yield).to.be.closeTo(72, 2);
    // Drought soil impact: -0.8
    // Fallow->Wheat (+0.5), Wheat (-0.2), Drought (-0.8). Net -0.5.
    // 100 - 0.5 = 99.5 -> 100
    expect(roundDrought.parcelsSnapshot[0].soil).to.be.closeTo(100, 2);
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
        soil: 100,
        nutrition: 100,
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
    // Potato yield 450. Pests penalty 0.6 (multiplier 0.4).
    // Yield = 450 * 1.0 * 1.0 * 0.4 = 180.
    expect(roundPests.parcelsSnapshot[0].yield).to.be.closeTo(180, 20);

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
    // Yield = 400 * 0.95 = 380
    expect(roundPesticide.parcelsSnapshot[0].yield).to.be.greaterThan(370);
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
        soil: 100,
        nutrition: 100,
        yield: 0,
      }));
    const prevRound: Round = { number: 1, decision, parcelsSnapshot: prevParcels };

    const round = GameEngine.calculateRound(2, prevRound, decision, { weather: 'Normal', vermin: [] }, 100000);

    // Total Labor Hours: 40 parcels * 10 hours = 400
    // Efficiency Factor (40 parcels): 0.7
    // Total Efficient Hours: 400 * 0.7 = 280
    // Labor Cost: 12000 (personnel) + 280 * 25 (hourly) = 19000
    expect(round.result?.expenses.labor).to.equal(19000);
    // Wheat base yield is 85. Income ~ 85 * 40 * 21 = 71400
    expect(round.result?.income).to.be.closeTo(71400, 1000);
    expect(round.result?.capital).to.be.greaterThan(150000);
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
        soil: 100,
        nutrition: 100,
        yield: 0,
      }));
    const prevRound: Round = { number: 1, decision, parcelsSnapshot: prevParcels };

    const round = GameEngine.calculateRound(2, prevRound, decision, { weather: 'Normal', vermin: [] }, 10000, 20, {});

    expect(round.result?.bioSiegel).to.be.false;
    // 40 parcels * 220 (BASE) = 8800
    expect(round.result?.subsidies).to.equal(8800);
    // Wheat yield: 85 * 0.4 = 34 per parcel. Total: 40 * 34 = 1360.
    // Value: 1360 * 21 = 28560
    expect(round.result?.income).to.be.closeTo(28560, 1000);
  });

  it('should apply Green Strip subsidies for up to 5 fallow or grass fields', () => {
    const decision: RoundDecision = {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: { 0: 'Fallow', 1: 'Grass', 2: 'Fallow', 3: 'Grass', 4: 'Fallow' },
    };
    const prevParcels: Parcel[] = Array(40)
      .fill(null)
      .map((_, i) => ({ index: i, crop: 'Wheat', soil: 100, nutrition: 100, yield: 0 }));
    const round = GameEngine.calculateRound(
      2,
      { number: 1, decision: {} as any, parcelsSnapshot: prevParcels },
      decision,
      { weather: 'Normal', vermin: [] },
      100000,
    );

    // 5 Green Strip Parcels (Fallow/Grass) * 1200 = 6000
    // 35 Regular Parcels * 220 = 7700
    // Total = 13700
    expect(round.result?.subsidies).to.equal(13700);
  });
});
