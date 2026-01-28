import { expect } from 'chai';

import { GameEngine } from './game-engine';
import type { CropType, Round, RoundDecision } from './types';

describe('Game Balance Simulation', () => {
  const strategies = [
    {
      name: 'Integrated Farming',
      logic: (round: number, lastRound?: Round) => {
        const avgNutrition = lastRound ? lastRound.parcelsSnapshot.reduce((acc, p) => acc + p.nutrition, 0) / 40 : 80;
        const rotation: CropType[] = ['Fieldbean', 'Wheat', 'Pea', 'Barley', 'Rapeseed', 'Rye'];
        return {
          machines: 1, // Cap investment
          organic: false,
          fertilizer: avgNutrition < 70,
          pesticide: round % 4 === 0,
          organisms: true,
          parcels: Object.fromEntries(
            Array.from({ length: 40 }, (_, i) => [i, rotation[(round + i) % rotation.length]]),
          ),
        };
      },
    },
    {
      name: 'Organic Right',
      logic: (round: number, lastRound?: Round) => {
        const avgNutrition = lastRound ? lastRound.parcelsSnapshot.reduce((acc, p) => acc + p.nutrition, 0) / 40 : 80;
        const rotation: CropType[] = ['Fieldbean', 'Wheat', 'Pea', 'Grass', 'Rye', 'Fallow'];
        return {
          machines: 1,
          organic: true,
          fertilizer: avgNutrition < 60,
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
        const avgNutrition = lastRound ? lastRound.parcelsSnapshot.reduce((acc, p) => acc + p.nutrition, 0) / 40 : 80;
        const rotation: CropType[] = ['Fieldbean', 'Wheat', 'Beet', 'Barley', 'Oat', 'Rye'];
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

      // 1. & 2. Integrated or Organic Right should be in top 2
      // In short games (10-20 rounds), Conventional Right might still be #1 or #2
      // because soil degradation hasn't fully impacted yields yet.
      const topTwo = [rankedResults[0].Strategy, rankedResults[1].Strategy];
      if (count >= 40) {
        expect(topTwo, `Top 2 for ${count} rounds should be Integrated/Organic`).to.include('Integrated Farming');
        // Organic Right might be lower due to high labor costs and very conservative rotation in tests
        const hasGoodStrategy = topTwo.includes('Integrated Farming') || topTwo.includes('Organic Right');
        expect(hasGoodStrategy, `At least one good strategy should be in Top 2 for ${count} rounds`).to.be.true;
      } else {
        // In shorter games, at least one of the "good" strategies must be in top 2
        const hasGoodStrategy =
          topTwo.includes('Integrated Farming') ||
          topTwo.includes('Organic Right') ||
          topTwo.includes('Conventional Right');
        expect(hasGoodStrategy, `At least one good strategy should be in Top 2 for ${count} rounds`).to.be.true;
      }

      // The top strategy should always be profitable (ending capital > start capital)
      expect(rankedResults[0].Capital).to.be.greaterThan(100000);

      // 3. Either Integrated, Organic Right or Conventional Right should be in top 3
      const topThree = [rankedResults[0].Strategy, rankedResults[1].Strategy, rankedResults[2].Strategy];
      const hasAnyRightStrategy =
        topThree.includes('Integrated Farming') ||
        topThree.includes('Organic Right') ||
        topThree.includes('Conventional Right');
      expect(hasAnyRightStrategy, `At least one "Right" strategy should be in Top 3 for ${count} rounds`).to.be.true;

      // 4. "Wrong" strategies should be at the bottom
      const convWrong = rankedResults.find((r) => r.Strategy === 'Conventional Wrong');
      const orgWrong = rankedResults.find((r) => r.Strategy === 'Organic Wrong');
      expect(convWrong!.Rank).to.be.greaterThan(3);
      expect(orgWrong!.Rank).to.be.greaterThan(3);

      // 5. Soil Quality: Organic Right should have reasonable soil
      if (count >= 20) {
        const organicRightRes = rankedResults.find((r) => r.Strategy === 'Organic Right');
        expect(organicRightRes!['Avg Soil']).to.be.greaterThan(60);
      }
    });
  });
});
