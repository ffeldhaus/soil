import { expect } from 'chai';

import { AiAgent } from './ai-agent';
import { Parcel, Round } from './types';

describe('AiAgent', () => {
  it('elementary agent should make minimal decisions', () => {
    const decision = AiAgent.makeDecision('elementary', undefined);
    expect(decision.machines).to.equal(0);
    expect(Object.keys(decision.parcels)).to.have.length(40);
    // Elementary can be true/false for fertilizer/pesticide due to random, but organic is always false in code
    expect(decision.organic).to.be.false;
  });

  it('middle agent should follow rotation', () => {
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
    const decision = AiAgent.makeDecision('middle', prevRound);
    expect(decision.machines).to.equal(1);
    expect(decision.parcels[0]).to.not.equal('Potato');
  });

  it('high level agent should go organic if soil is excellent', () => {
    const prevParcels: Parcel[] = Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Fallow',
        soil: 130,
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
    expect(decision.organisms).to.be.true;
  });
});
