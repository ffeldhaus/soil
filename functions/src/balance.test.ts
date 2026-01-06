import { expect } from 'chai';

import { GameEngine } from './game-engine';
import { CropType, Round, RoundDecision } from './types';

describe('Game Balance Simulation', () => {
  const strategies = [
    {
      name: 'Integrated Farming',
      logic: (round: number, lastRound?: Round) => {
        const avgNutrition = lastRound ? lastRound.parcelsSnapshot.reduce((acc, p) => acc + p.nutrition, 0) / 40 : 80;
        const rotation: CropType[] = ['Fieldbean', 'Wheat', 'Beet', 'Barley', 'Oat', 'Rye'];
        return {
          machines: 2,
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
        const rotation: CropType[] = ['Fallow', 'Wheat', 'Fieldbean', 'Rye', 'Beet', 'Oat'];
        return {
          machines: 0, // Low tech for soil preservation
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
      console.log(`\n--- Simulation Results for ${count} Rounds ---`);
      const results = strategies.map((strat) => {
        let capital = 10000;
        let lastRound: Round | undefined = undefined;

        for (let r = 1; r <= count; r++) {
          const decision: RoundDecision = strat.logic(r, lastRound);
          const events = { weather: 'Normal', vermin: 'None' };
          const round = GameEngine.calculateRound(r, lastRound, decision, events, capital, count);
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

      console.table(rankedResults);

      if (count === 50) {
        // Assertions for 50 rounds
        // 1. Integrated Farming (Rank #1)
        expect(rankedResults[0].Strategy).to.equal('Integrated Farming');

        // 2. Conventional Right (Rank #2)
        expect(rankedResults[1].Strategy).to.equal('Conventional Right');

        // 3. Organic Right (Rank #3) - check high soil
        expect(rankedResults[2].Strategy).to.equal('Organic Right');
        expect(rankedResults[2]['Avg Soil']).to.be.greaterThan(60); // High soil check (adjusted)
        expect(rankedResults[1]['Avg Soil']).to.be.lessThan(rankedResults[2]['Avg Soil']); // Conventional has lower soil

        // 4. Conventional Wrong (Rank #4)
        // Allow for Resource Miser to potentially intervene, but usually ConvWrong is 4 or 5
        const convWrong = rankedResults.find((r) => r.Strategy === 'Conventional Wrong');
        expect(convWrong).to.exist;
        expect(convWrong!['Avg Soil']).to.be.lessThan(60); // Low soil check
        expect(convWrong!.Rank).to.be.greaterThan(3); // Should be lower rank

        // 5. Organic Wrong
        const orgWrong = rankedResults.find((r) => r.Strategy === 'Organic Wrong');
        expect(orgWrong).to.exist;
        expect(orgWrong!.Rank).to.be.greaterThan(3);
      }
    });
  });
});
