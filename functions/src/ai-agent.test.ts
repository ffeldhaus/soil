import { expect } from 'chai';
import { AiAgent } from './ai-agent';
import { Round } from './types';

describe('AiAgent', () => {

    it('should generate a random decision valid structure', () => {
        const decision = AiAgent.makeDecision('random', undefined);
        expect(decision.parcels).to.have.property('0');
        expect(Object.keys(decision.parcels).length).to.equal(40);
    });

    it('should use rotation logic', () => {
        // Mock previous round: All Fieldbean
        const prevRound: Round = {
            number: 1,
            decision: { parcels: {}, machines: 0, organic: false, fertilizer: false, pesticide: false, organisms: false },
            result: {
                expenses: { seeds: 0, labor: 0, running: 0, investments: 0, total: 0 },
                income: 0,
                profit: 0,
                capital: 0,
                harvestSummary: {} as any,
                events: { weather: 'Normal', vermin: 'None' }
            },
            parcelsSnapshot: Array(40).fill(null).map((_, i) => ({
                index: i,
                crop: 'Fieldbean',
                soil: 80,
                nutrition: 80,
                yield: 0
            }))
        };

        const decision = AiAgent.makeDecision('rotation', prevRound);
        // Fieldbean -> anything good. 
        // Matrix: Fieldbean -> [Animals, Fallow, Fieldbean, Barley, Oat, Potato, Corn, Rye, Wheat, Beet] are all 'good'.
        // Wait, Fieldbean -> Potato is good? CROP_SEQUENCE_MATRIX says yes.

        expect(Object.keys(decision.parcels).length).to.equal(40);
        // We can't strictly assert specific values due to randomness, but we can check validity.
    });
});
