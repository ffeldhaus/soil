"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ai_agent_1 = require("./ai-agent");
describe('AiAgent', () => {
    it('should create an elementary decision', () => {
        const decision = ai_agent_1.AiAgent.makeDecision('elementary', undefined);
        (0, chai_1.expect)(decision.machines).to.equal(0);
        (0, chai_1.expect)(Object.keys(decision.parcels)).to.have.length(40);
    });
    it('should create a middle decision following rotation', () => {
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
        // Middle strategy avoids bad rotations (Potato -> Potato is bad)
        (0, chai_1.expect)(decision.parcels[0]).to.not.equal('Potato');
    });
    it('should create a high level decision and go organic if soil is high', () => {
        const prevParcels = Array(40).fill(null).map((_, i) => ({
            index: i,
            crop: 'Wheat',
            soil: 121,
            nutrition: 100,
            yield: 0
        }));
        const prevRound = {
            number: 1,
            decision: { parcels: {}, machines: 0, organic: false, fertilizer: false, pesticide: false, organisms: false },
            parcelsSnapshot: prevParcels
        };
        const decision = ai_agent_1.AiAgent.makeDecision('high', prevRound);
        (0, chai_1.expect)(decision.organic).to.be.true;
    });
});
//# sourceMappingURL=ai-agent.test.js.map