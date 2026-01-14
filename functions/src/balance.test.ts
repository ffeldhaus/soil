import { expect } from 'chai';

import { GameEngine } from './game-engine';
import type { CropType, Round, RoundDecision } from './types';

describe('Game Balance Simulation', () => {
  const strategies = [
    {
      name: 'Integrated Farming',
      logic: (round: number, lastRound?: Round) => {
        const avgNutrition = lastRound ? lastRound.parcelsSnapshot.reduce((acc, p) => acc + p.nutrition, 0) / 40 : 80;
        const rotation: CropType[] = ['Fieldbean', 'Wheat', 'Rapeseed', 'Barley', 'Pea', 'Rye'];
        return {
          machines: 1, // Optimized tech
          organic: false,
          fertilizer: avgNutrition < 70,
          pesticide: false,
          organisms: true,
          parcels: Object.fromEntries(
            Array.from({ length: 40 }, (_, i) => [i, rotation[(round + i) % rotation.length]]),
          ),
        };
      },
    },
    {
      name: 'Organic Right',
      logic: (round: number) => {
        // Includes Grass (Animals) for nitrogen fixation and Fallow for recovery
        const rotation: CropType[] = ['Grass', 'Wheat', 'Pea', 'Rye', 'Fallow', 'Oat'];
        return {
          machines: 1, // Balanced tech
          organic: true,
          fertilizer: false,
          pesticide: false,
          organisms: true,
          parcels: Object.fromEntries(
            Array.from({ length: 40 }, (_, i) => [i, rotation[(round + i) % rotation.length]]),
          ),
        };
      },
    },
    {
      name: 'Organic Wrong',
      logic: (round: number) => ({
        machines: 4, // Too much tech, ruins soil
        organic: true,
        fertilizer: false,
        pesticide: false,
        organisms: false, // No biological control
        parcels: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [i, 'Potato' as CropType])), // Poor rotation
      }),
    },
    {
      name: 'Conventional Right',
      logic: (round: number, lastRound?: Round) => {
        const avgNutrition = lastRound ? lastRound.parcelsSnapshot.reduce((acc, p) => acc + p.nutrition, 0) / 40 : 80;
        const rotation: CropType[] = ['Fieldbean', 'Wheat', 'Beet', 'Barley', 'Oat', 'Rye'];
        return {
          machines: 3, // Higher tech for efficiency
          organic: false,
          fertilizer: avgNutrition < 90,
          pesticide: false,
          organisms: false,
          parcels: Object.fromEntries(
            Array.from({ length: 40 }, (_, i) => [i, rotation[(round + i) % rotation.length]]),
          ),
        };
      },
    },
    {
      name: 'Conventional Wrong',
      logic: (round: number) => ({
        machines: 4, // Excessive tech
        organic: false,
        fertilizer: true, // Constant synthetic input
        pesticide: true,
        organisms: false,
        parcels: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [i, 'Wheat' as CropType])), // Monoculture
      }),
    },
    {
      name: 'Resource Miser',
      logic: (round: number) => ({
        machines: 0,
        organic: false,
        fertilizer: false,
        pesticide: false,
        organisms: false,
        parcels: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [i, 'Rye' as CropType])),
      }),
    },
  ];

  const roundCounts = [10, 20, 30, 40, 50];

  roundCounts.forEach((count) => {
    it(`should simulate strategies for ${count} rounds`, () => {
      const results = strategies.map((strat) => {
        let capital = 10000;
        let lastRound: Round | undefined;

        for (let r = 1; r <= count; r++) {
          const decision: RoundDecision = strat.logic(r, lastRound);
          const events = { weather: 'Normal', vermin: [] };
          const round = GameEngine.calculateRound(r, lastRound, decision, events, capital, count, {});
          capital = round.result?.capital || capital;
          lastRound = round;
        }

        const avgSoil =
          lastRound!.parcelsSnapshot.reduce((acc, p) => acc + p.soil, 0) / lastRound!.parcelsSnapshot.length;
        const avgNutrition =
          lastRound!.parcelsSnapshot.reduce((acc, p) => acc + p.nutrition, 0) / lastRound!.parcelsSnapshot.length;

        return {
          Strategy: strat.name,
          Capital: Math.round(capital),
          'Avg Soil': Math.round(avgSoil),
          'Avg Nutr': Math.round(avgNutrition),
        };
      });

      // Sort by capital descending and add rank
      results.sort((a, b) => b.Capital - a.Capital);
      const rankedResults = results.map((res, index) => ({
        Rank: index + 1,
        ...res,
      }));

      // --- Assertions for ALL round counts ---

      const topTwo = [rankedResults[0].Strategy, rankedResults[1].Strategy];
      expect(topTwo, `Top 2 for ${count} rounds should be Integrated/Organic`).to.include('Integrated Farming');
      expect(topTwo, `Top 2 for ${count} rounds should be Integrated/Organic`).to.include('Organic Right');

      // 1. & 2. Integrated and Organic Right should be top 2 and positive
      expect(rankedResults[0].Capital).to.be.greaterThan(0);
      expect(rankedResults[1].Capital).to.be.greaterThan(0);

      // 3. Conventional Right should be positive and Rank 3
      expect(rankedResults[2].Strategy, `Conventional Right should be #3 for ${count} rounds`).to.equal(
        'Conventional Right',
      );
      expect(rankedResults[2].Capital).to.be.greaterThan(0);

      // 4. "Wrong" strategies should be at the bottom
      const convWrong = rankedResults.find((r) => r.Strategy === 'Conventional Wrong');
      const orgWrong = rankedResults.find((r) => r.Strategy === 'Organic Wrong');
      expect(convWrong!.Rank).to.be.greaterThan(3);
      expect(orgWrong!.Rank).to.be.greaterThan(3);

      // 5. Soil Quality: Organic Right should have higher soil than Conventional Right
      const organicRight = rankedResults.find((r) => r.Strategy === 'Organic Right');
      const convRight = rankedResults.find((r) => r.Strategy === 'Conventional Right');
      expect(organicRight!['Avg Soil']).to.be.greaterThan(convRight!['Avg Soil']);
    });
  });
});
