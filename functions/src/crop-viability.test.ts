import { expect } from 'chai';
import { GAME_CONSTANTS } from './constants';
import { AiAgent } from './ai-agent';
import { GameEngine } from './game-engine';
import type { CropType, Round, RoundDecision } from './types';

describe('Crop Viability and Balance', () => {
  const crops = Object.keys(GAME_CONSTANTS.CROPS) as CropType[];

  it('every crop should have at least one good predecessor in the rotation matrix', () => {
    crops.forEach(crop => {
      if (crop === 'Fallow' || crop === 'Grass') return; // Special cases
      
      const goodPredecessors = crops.filter(prev => 
        GAME_CONSTANTS.ROTATION_MATRIX[prev]?.[crop] === 'good'
      );
      
      expect(goodPredecessors.length, `Crop ${crop} should have at least one good predecessor`).to.be.at.least(1);
    });
  });

  it('every crop should be a good predecessor for at least one other crop', () => {
    crops.forEach(prevCrop => {
      if (prevCrop === 'Fallow' || prevCrop === 'Grass') return; // Special cases

      const goodSuccessors = crops.filter(next => 
        GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[next] === 'good'
      );
      
      expect(goodSuccessors.length, `Crop ${prevCrop} should be a good predecessor for at least one crop`).to.be.at.least(1);
    });
  });

  it('every crop should have a reason to exist (high yield, low cost, or soil benefit)', () => {
    crops.forEach(cropKey => {
      const crop = GAME_CONSTANTS.CROPS[cropKey];
      if (cropKey === 'Grass') {
          // Animals have their own logic (subsidies/organic fert)
          return;
      }

      const hasHighYield = (crop.baseYield * crop.marketValue.conventional) > 2000;
      const hasLowLabor = crop.laborHours <= 10;
      const hasSoilBenefit = (GAME_CONSTANTS.SOIL.PLANTATION_GAINS[cropKey] || 0) > 0;
      const isHardy = crop.soilSensitivity <= 1.0;

      const hasAdvantage = hasHighYield || hasLowLabor || hasSoilBenefit || isHardy;
      
      expect(hasAdvantage, `Crop ${cropKey} should have at least one clear advantage (Yield: ${hasHighYield}, Labor: ${hasLowLabor}, Soil: ${hasSoilBenefit}, Hardy: ${isHardy})`).to.be.true;
    });
  });

  it('Perfect AI should pick a variety of crops over a long simulation', function() {
    this.timeout(10000);
    let lastRound: Round | undefined;
    let capital = 100000;
    const pickedCrops = new Set<string>();

    // Run for 100 rounds to see variety
    for (let r = 1; r <= 100; r++) {
      const decision = AiAgent.makeDecision('perfect', lastRound, 'viability-test');
      Object.values(decision.parcels).forEach(c => pickedCrops.add(c));
      
      const events = { weather: 'Normal', vermin: [] };
      const round = GameEngine.calculateRound(r, lastRound, decision, events, capital, 100);
      capital = round.result!.capital;
      lastRound = round;
    }

    console.log('Crops picked by Perfect AI over 100 rounds:', Array.from(pickedCrops));
    
    // Perfect AI should at least pick 5+ different crops including recovery crops
    expect(pickedCrops.size).to.be.at.least(5);
    expect(pickedCrops.has('Fieldbean') || pickedCrops.has('Pea'), 'Should pick legumes for recovery').to.be.true;
  });
});
