"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const game_engine_1 = require("./game-engine");
describe('GameEngine', () => {
    it('should initialize a round with correct default values', () => {
        const decision = {
            machines: 0,
            organic: false,
            fertilizer: false,
            pesticide: false,
            organisms: false,
            parcels: {}
        };
        // Default all fallow
        for (let i = 0; i < 40; i++)
            decision.parcels[i] = 'Fallow';
        const events = { weather: 'Normal', vermin: 'None' };
        const round = game_engine_1.GameEngine.calculateRound(1, undefined, decision, events);
        (0, chai_1.expect)(round.number).to.equal(1);
        (0, chai_1.expect)(round.parcelsSnapshot).to.have.length(40);
        (0, chai_1.expect)(round.parcelsSnapshot[0].soil).to.be.closeTo(82.4, 0.1);
    });
    it('should decrease soil quality for heavy crops', () => {
        const decision = {
            machines: 0,
            organic: false,
            fertilizer: false,
            pesticide: false,
            organisms: false,
            parcels: {}
        };
        for (let i = 0; i < 40; i++)
            decision.parcels[i] = 'Wheat'; // Wheat degrades soil
        const events = { weather: 'Normal', vermin: 'None' };
        // Initial round to set baseline
        const prevParcels = Array(40).fill(null).map((_, i) => ({
            index: i,
            crop: 'Fallow',
            soil: 80,
            nutrition: 80,
            yield: 0
        }));
        const prevRound = {
            number: 1,
            decision: decision,
            parcelsSnapshot: prevParcels,
            result: undefined
        };
        const round = game_engine_1.GameEngine.calculateRound(2, prevRound, decision, events);
        // Wheat degrades soil (-0.02) but Sequence Fallow->Wheat is good (+0.03). Net +0.01.
        // 80 + 80 * 0.01 = 80.8
        (0, chai_1.expect)(round.parcelsSnapshot[0].soil).to.be.closeTo(80.8, 0.1);
    });
});
//# sourceMappingURL=game-engine.test.js.map