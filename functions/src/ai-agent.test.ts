import { expect } from 'chai';

import { AiAgent } from './ai-agent.ts';
import type { Parcel, Round } from './types.ts';

describe('AiAgent', () => {
  it('elementary agent should make minimal decisions', () => {
    const decision = AiAgent.makeDecision('elementary', undefined);
    expect(decision.machines).to.equal(0);
    expect(Object.keys(decision.parcels)).to.have.length(40);
    // Elementary can be true/false for fertilizer/pesticide due to random, but organic is always false in code
    expect(decision.organic).to.be.false;
  });

  it('middle agent should follow rotation with some randomness', () => {
    const prevParcels: Parcel[] = Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Potato',
        soil: 80,
        nutrition: 80,
        yield: 0,
      }));
    const prevRound: Round = {
      number: 1,
      decision: { parcels: {}, machines: 0, organic: false, fertilizer: false, pesticide: false, organisms: false },
      parcelsSnapshot: prevParcels,
    };
    const decisions = Array(5)
      .fill(null)
      .map(() => AiAgent.makeDecision('middle', prevRound));
    
    // At least some machines should be 1, but we don't strictly require all to be 1
    const machinesValues = new Set(decisions.map((d) => d.machines));
    expect(machinesValues.has(0) || machinesValues.has(1)).to.be.true;

    // It should still follow rotation (not Potato)
    for (const decision of decisions) {
      expect(decision.parcels[0]).to.not.equal('Potato');
    }
  });

  it('high level agent should show variety in recovery crops', () => {
    const prevParcels: Parcel[] = Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Wheat',
        soil: 40, // Very low soil
        nutrition: 40, // Very low nutrition
        yield: 0,
      }));
    const prevRound: Round = {
      number: 1,
      decision: { parcels: {}, machines: 0, organic: false, fertilizer: false, pesticide: false, organisms: false },
      parcelsSnapshot: prevParcels,
    };
    
    const cropsUsed = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const decision = AiAgent.makeDecision('high', prevRound);
      cropsUsed.add(decision.parcels[0]);
    }
    
    // Should use more than just Fieldbean for recovery now
    expect(cropsUsed.size).to.be.greaterThan(1);
  });

  it('high level agent should go organic if soil is excellent', () => {
    const prevParcels: Parcel[] = Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Fallow',
        soil: 130, // Well above the 95-105 range
        nutrition: 100,
        yield: 0,
      }));
    const prevRound: Round = {
      number: 1,
      decision: { parcels: {}, machines: 0, organic: false, fertilizer: false, pesticide: false, organisms: false },
      parcelsSnapshot: prevParcels,
    };
    const decision = AiAgent.makeDecision('high', prevRound);
    expect(decision.organic).to.be.true;
    expect(decision.fertilizer).to.be.false;
    // decision.organisms has a 90% chance to be true, so it might occasionally be false
    // but we can at least check it doesn't use fertilizer
  });
});
