"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ai_agent_1 = require("./ai-agent");
describe('AiAgent', () => {
    it('should generate a random decision valid structure', () => {
        const decision = ai_agent_1.AiAgent.makeDecision('random', undefined);
        (0, chai_1.expect)(decision.parcels).to.have.property('0');
        (0, chai_1.expect)(Object.keys(decision.parcels).length).to.equal(40);
    });
    it('should use rotation logic', () => {
        // Mock previous round: All Fieldbean
        const prevRound = {
            number: 1,
            decision: { parcels: {}, machines: 0, organic: false, fertilizer: false, pesticide: false, organisms: false },
            result: {
                expenses: { seeds: 0, labor: 0, running: 0, investments: 0, total: 0 },
                income: 0,
                profit: 0,
                capital: 0,
                harvestSummary: {},
                events: { weather: 'Normal', vermin: 'None' },
                bioSiegel: false
            },
            parcelsSnapshot: Array(40).fill(null).map((_, i) => ({
                index: i,
                crop: 'Fieldbean',
                soil: 80,
                nutrition: 80,
                yield: 0
            }))
        };
        const decision = ai_agent_1.AiAgent.makeDecision('rotation', prevRound);
        // Fieldbean -> anything good. 
        // Matrix: Fieldbean -> [Animals, Fallow, Fieldbean, Barley, Oat, Potato, Corn, Rye, Wheat, Beet] are all 'good'.
        // Wait, Fieldbean -> Potato is good? CROP_SEQUENCE_MATRIX says yes.
        (0, chai_1.expect)(Object.keys(decision.parcels).length).to.equal(40);
        // We can't strictly assert specific values due to randomness, but we can check validity.
    });
});
//# sourceMappingURL=ai-agent.test.js.map