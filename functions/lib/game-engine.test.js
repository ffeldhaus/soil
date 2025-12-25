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
        for (let i = 0; i < 40; i++)
            decision.parcels[i] = 'Fallow';
        const events = { weather: 'Normal', vermin: 'None' };
        const round = game_engine_1.GameEngine.calculateRound(1, undefined, decision, events, 1000);
        (0, chai_1.expect)(round.number).to.equal(1);
        (0, chai_1.expect)(round.parcelsSnapshot).to.have.length(40);
        // Fallow recovery: 80 * (1 + 0.05) = 84
        (0, chai_1.expect)(round.parcelsSnapshot[0].soil).to.be.closeTo(84, 1);
    });
    it('should decrease soil quality with machines', () => {
        const decision = {
            machines: 4,
            organic: false,
            fertilizer: false,
            pesticide: false,
            organisms: false,
            parcels: {}
        };
        for (let i = 0; i < 40; i++)
            decision.parcels[i] = 'Wheat';
        const prevParcels = Array(40).fill(null).map((_, i) => ({
            index: i,
            crop: 'Wheat',
            soil: 100,
            nutrition: 100,
            yield: 0
        }));
        const prevRound = {
            number: 1,
            decision: decision,
            parcelsSnapshot: prevParcels
        };
        const round = game_engine_1.GameEngine.calculateRound(2, prevRound, decision, { weather: 'Normal', vermin: 'None' }, 1000);
        // Soil should decrease due to machines (-0.10) and monoculture (-0.04) and Wheat (-0.01)
        // Net: 100 * (1 - 0.15) = 85
        (0, chai_1.expect)(round.parcelsSnapshot[0].soil).to.be.lessThan(90);
    });
    it('organic farming should benefit from animals', () => {
        var _a;
        const decision = {
            machines: 0,
            organic: true,
            fertilizer: false,
            pesticide: false,
            organisms: true,
            parcels: {}
        };
        // 8 animals (20% of 40)
        for (let i = 0; i < 8; i++)
            decision.parcels[i] = 'Grass';
        for (let i = 8; i < 40; i++)
            decision.parcels[i] = 'Wheat';
        const prevParcels = Array(40).fill(null).map((_, i) => ({
            index: i,
            crop: 'Fallow',
            soil: 80,
            nutrition: 50,
            yield: 0
        }));
        const prevRound = {
            number: 1,
            decision: decision,
            parcelsSnapshot: prevParcels
        };
        const round = game_engine_1.GameEngine.calculateRound(2, prevRound, decision, { weather: 'Normal', vermin: 'None' }, 1000);
        // Nutrition should increase due to animals
        (0, chai_1.expect)(round.parcelsSnapshot[8].nutrition).to.be.greaterThan(50);
        (0, chai_1.expect)((_a = round.result) === null || _a === void 0 ? void 0 : _a.bioSiegel).to.be.true;
    });
});
//# sourceMappingURL=game-engine.test.js.map