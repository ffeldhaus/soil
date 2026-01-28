import { expect } from 'chai';
import { GAME_CONSTANTS } from './constants';
import { GameEngine } from './game-engine';
import type { CropType, Round, RoundDecision } from './types';

describe('Balance Exhaustive Check', () => {
  const MAX_PROFITS = {
    CONVENTIONAL: 130000,
    ORGANIC: 130000,
  };

  const crops = Object.keys(GAME_CONSTANTS.CROPS) as CropType[];
  const numParcels = 40;

  function runSimulation(decisionMaker: (r: number, last: Round | undefined) => RoundDecision, rounds = 10) {
    let capital = 100000;
    let lastRound: Round | undefined;
    const roundResults: Round[] = [];

    for (let r = 1; r <= rounds; r++) {
      const decision = decisionMaker(r, lastRound);
      const events = { weather: 'Normal', vermin: [] };
      const round = GameEngine.calculateRound(r, lastRound, decision, events, capital, 20, {});
      capital = round.result?.capital || capital;
      lastRound = round;
      roundResults.push(round);
    }
    return roundResults;
  }

  it('should check all monocultures for extreme profits', () => {
    const extremes: any[] = [];

    crops.forEach((crop) => {
      // Conventional Max Tech
      const resultsConv = runSimulation(
        (r) => ({
          machines: 4,
          organic: false,
          fertilizer: true,
          pesticide: true,
          organisms: false,
          parcels: Object.fromEntries(Array.from({ length: numParcels }, (_, i) => [i, crop])),
        }),
        5,
      );

      const maxProfitConv = Math.max(...resultsConv.map((r) => r.result?.profit || 0));
      if (maxProfitConv > MAX_PROFITS.CONVENTIONAL) {
        extremes.push({ crop, type: 'Conventional', profit: maxProfitConv });
      }

      // Organic Max Tech
      const resultsOrg = runSimulation(
        (r) => ({
          machines: 4,
          organic: true,
          fertilizer: false,
          pesticide: false,
          organisms: true,
          parcels: Object.fromEntries(Array.from({ length: numParcels }, (_, i) => [i, crop])),
        }),
        5,
      );

      const maxProfitOrg = Math.max(...resultsOrg.map((r) => r.result?.profit || 0));
      if (maxProfitOrg > MAX_PROFITS.ORGANIC) {
        extremes.push({ crop, type: 'Organic', profit: maxProfitOrg });
      }
    });

    expect(extremes, `Extremely high profits found: ${JSON.stringify(extremes)}`).to.be.empty;
  });

  it('should check Potato/Fieldbean rotation for extreme profits', () => {
    const results = runSimulation((r) => {
      const crop = r % 2 === 1 ? 'Fieldbean' : 'Potato';
      return {
        machines: 2,
        organic: false,
        fertilizer: false,
        pesticide: true,
        organisms: true,
        parcels: Object.fromEntries(Array.from({ length: numParcels }, (_, i) => [i, crop])),
      };
    }, 10);

    const profits = results.map((r) => r.result?.profit || 0);
    const maxProfit = Math.max(...profits);

    expect(maxProfit, `Potato/Fieldbean rotation profit too high: ${maxProfit}`).to.be.below(MAX_PROFITS.CONVENTIONAL);
  });

  it('should check Beet/Pea rotation for extreme profits', () => {
    const results = runSimulation((r) => {
      const crop = r % 2 === 1 ? 'Pea' : 'Beet';
      return {
        machines: 2,
        organic: false,
        fertilizer: false,
        pesticide: true,
        organisms: true,
        parcels: Object.fromEntries(Array.from({ length: numParcels }, (_, i) => [i, crop])),
      };
    }, 10);

    const maxProfit = Math.max(...results.map((r) => r.result?.profit || 0));
    expect(maxProfit, `Beet/Pea rotation profit too high: ${maxProfit}`).to.be.below(MAX_PROFITS.CONVENTIONAL);
  });

  it('should check long-term profit with maxed soil and nutrition (Saturated State)', () => {
    const results = runSimulation((r) => {
      return {
        machines: 2,
        organic: false,
        fertilizer: true,
        pesticide: true,
        organisms: true,
        parcels: Object.fromEntries(Array.from({ length: numParcels }, (_, i) => [i, 'Fieldbean'])),
      };
    }, 40);

    const lastRound = results[results.length - 1];

    // Now switch to Potatoes in this "super soil"
    const harvestResult = GameEngine.calculateRound(
      41,
      lastRound,
      {
        machines: 2,
        organic: false,
        fertilizer: false,
        pesticide: true,
        organisms: true,
        parcels: Object.fromEntries(Array.from({ length: numParcels }, (_, i) => [i, 'Potato'])),
      },
      { weather: 'Normal', vermin: [] },
      lastRound.result!.capital,
    );

    expect(
      harvestResult.result?.profit,
      `Saturated state profit too high: ${harvestResult.result?.profit}`,
    ).to.be.below(MAX_PROFITS.CONVENTIONAL);
  });
});
