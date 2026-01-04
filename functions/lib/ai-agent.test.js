"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ai_agent_1 = require("./ai-agent");
describe('AiAgent', () => {
    it('elementary agent should make minimal decisions', () => {
        const decision = ai_agent_1.AiAgent.makeDecision('elementary', undefined);
        (0, chai_1.expect)(decision.machines).to.equal(0);
        (0, chai_1.expect)(Object.keys(decision.parcels)).to.have.length(40);
        // Elementary can be true/false for fertilizer/pesticide due to random, but organic is always false in code
        (0, chai_1.expect)(decision.organic).to.be.false;
    });
    it('middle agent should follow rotation', () => {
        const prevParcels = Array(40).fill(null).map((_, i) => ({
            index: i,
            crop: 'Potato',
            soil: 80,
            nutrition: 80,
            yield: 0
        }));
        const prevRound = {
            number: 1,
            decision: { parcels: {}, machines: 0, organic: false, fertilizer: false, pesticide: false, organisms: false },
            parcelsSnapshot: prevParcels
        };
        const decision = ai_agent_1.AiAgent.makeDecision('middle', prevRound);
        (0, chai_1.expect)(decision.machines).to.equal(1);
        (0, chai_1.expect)(decision.parcels[0]).to.not.equal('Potato');
    });
    it('high level agent should go organic if soil is excellent', () => {
        const prevParcels = Array(40).fill(null).map((_, i) => ({
            index: i, crop: 'Fallow', soil: 130, nutrition: 100, yield: 0
        }));
        const prevRound = {
            number: 1,
            decision: { parcels: {}, machines: 0, organic: false, fertilizer: false, pesticide: false, organisms: false },
            parcelsSnapshot: prevParcels
        };
        const decision = ai_agent_1.AiAgent.makeDecision('high', prevRound);
        (0, chai_1.expect)(decision.organic).to.be.true;
        (0, chai_1.expect)(decision.fertilizer).to.be.false;
        (0, chai_1.expect)(decision.organisms).to.be.true;
    });
});
//# sourceMappingURL=ai-agent.test.js.map