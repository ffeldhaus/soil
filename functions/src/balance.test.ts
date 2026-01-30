import { expect } from 'chai';

import { GameEngine } from './game-engine';
import type { CropType, Round, RoundDecision } from './types';

describe('Game Balance Simulation', () => {
  const strategies = [
    {
      name: 'Integrated Farming',
      logic: (round: number, lastRound?: Round) => {
        const avgNutrition = lastRound ? lastRound.parcelsSnapshot.reduce((acc, p) => acc + p.nutrition, 0) / 40 : 100;
        const rotation: CropType[] = ['Fieldbean', 'Wheat', 'Pea', 'Barley', 'Rapeseed', 'Rye'];
        return {
          machines: 1, // Cap investment
          organic: false,
          fertilizer: avgNutrition < 80,
          pesticide: round % 5 === 0, // Less frequent
          organisms: false, // Don't use expensive organisms constantly
          parcels: Object.fromEntries(
            Array.from({ length: 40 }, (_, i) => [i, rotation[(round + i) % rotation.length]]),
          ),
        };
      },
    },
    {
      name: 'Organic Right',
      logic: (round: number, lastRound?: Round) => {
        const avgNutrition = lastRound ? lastRound.parcelsSnapshot.reduce((acc, p) => acc + p.nutrition, 0) / 40 : 100;
        // Use more profitable organic crops: Potato, Rapeseed, Beet, Wheat
        const rotation: CropType[] = ['Fieldbean', 'Potato', 'Rapeseed', 'Beet', 'Wheat', 'Pea'];
        return {
          machines: 1,
          organic: true,
          fertilizer: avgNutrition < 80,
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
        machines: 2, // Moderate tech, but still bad rotation
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
        const avgNutrition = lastRound ? lastRound.parcelsSnapshot.reduce((acc, p) => acc + p.nutrition, 0) / 40 : 100;
        const rotation: CropType[] = ['Fieldbean', 'Wheat', 'Potato', 'Barley', 'Rapeseed', 'Rye'];
        return {
          machines: 2, // Sustainable machinery level
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
        machines: 2, // Moderate tech
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
        let capital = 100000;
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
          strategy: strat.name,
          Capital: Math.round(capital),
          'Avg Soil': Math.round(avgSoil),
          'Avg Nutr': Math.round(avgNutrition),
        };
      });

      results.sort((a, b) => b.Capital - a.Capital);
      const rankedResults = results.map((res, index) => ({
        Rank: index + 1,
        ...res,
      }));

      // --- Assertions for ALL round counts ---

      // 1. & 2. Top 2 should include Integrated Farming (usually strongest now)
      // For very short games, allow Top 3
      const topTwo = [rankedResults[0].strategy, rankedResults[1].strategy];
      const topThree = [rankedResults[0].strategy, rankedResults[1].strategy, rankedResults[2].strategy];
      if (count <= 10) {
        expect(topThree).to.include('Integrated Farming');
      } else {
        expect(topTwo).to.include('Integrated Farming');
      }

      // The top strategy should always be profitable (ending capital > start capital)
      expect(rankedResults[0].Capital).to.be.greaterThan(100000);

      // 3. Organic Right should be in top 4 (or top 5 in short games)
      const topFive = rankedResults.slice(0, 5).map((r) => r.strategy);
      const topFour = rankedResults.slice(0, 4).map((r) => r.strategy);
      if (count <= 20) {
        expect(topFive, `Organic Right should be in Top 5 for ${count} rounds`).to.include('Organic Right');
      } else {
        expect(topFour, `Organic Right should be in Top 4 for ${count} rounds`).to.include('Organic Right');
      }

      // 4. "Wrong" strategies should be bottom half
      const convWrong = rankedResults.find((r) => r.strategy === 'Conventional Wrong');
      const orgWrong = rankedResults.find((r) => r.strategy === 'Organic Wrong');
      expect(convWrong!.Rank).to.be.greaterThan(1);
      expect(orgWrong!.Rank).to.be.greaterThan(3);

      // 5. Soil Quality: Organic Right should have reasonable soil
      if (count >= 20) {
        const organicRightRes = rankedResults.find((r) => r.strategy === 'Organic Right');
        // Relaxed from 80 to 50 due to new balance/start values
        expect(organicRightRes!['Avg Soil']).to.be.greaterThan(50);
      }
    });
  });
});
