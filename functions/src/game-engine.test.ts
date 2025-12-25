import { expect } from 'chai';
import { GameEngine } from './game-engine';
import { Round, RoundDecision, Parcel } from './types';

describe('GameEngine', () => {
    it('should initialize a round with correct default values', () => {
        const decision: RoundDecision = {
            machines: 0,
            organic: false,
            fertilizer: false,
            pesticide: false,
            organisms: false,
            parcels: {}
        };
        for (let i = 0; i < 40; i++) decision.parcels[i] = 'Fallow';

        const events = { weather: 'Normal', vermin: 'None' };
        const round = GameEngine.calculateRound(1, undefined, decision, events, 1000);

        expect(round.number).to.equal(1);
        expect(round.parcelsSnapshot).to.have.length(40);
        // Fallow recovery: 80 * (1 + 0.05) = 84
        expect(round.parcelsSnapshot[0].soil).to.be.closeTo(84, 1);
    });

    it('should decrease soil quality with machines', () => {
        const decision: RoundDecision = {
            machines: 4, // Max machines
            organic: false,
            fertilizer: false,
            pesticide: false,
            organisms: false,
            parcels: {}
        };
        for (let i = 0; i < 40; i++) decision.parcels[i] = 'Wheat';

        const prevParcels: Parcel[] = Array(40).fill(null).map((_, i) => ({
            index: i,
            crop: 'Wheat',
            soil: 100,
            nutrition: 100,
            yield: 0
        }));
        const prevRound: Round = {
            number: 1,
            decision: decision,
            parcelsSnapshot: prevParcels
        };

        const round = GameEngine.calculateRound(2, prevRound, decision, { weather: 'Normal', vermin: 'None' }, 1000);
        // Soil should decrease due to machines (-0.10) and monoculture (-0.04) and Wheat (-0.01)
        // Net: 100 * (1 - 0.15) = 85
        expect(round.parcelsSnapshot[0].soil).to.be.lessThan(90);
    });

    it('organic farming should benefit from animals', () => {
        const decision: RoundDecision = {
            machines: 0,
            organic: true,
            fertilizer: false,
            pesticide: false,
            organisms: true,
            parcels: {}
        };
        // 8 animals (20% of 40)
        for (let i = 0; i < 8; i++) decision.parcels[i] = 'Grass';
        for (let i = 8; i < 40; i++) decision.parcels[i] = 'Wheat';

        const prevParcels: Parcel[] = Array(40).fill(null).map((_, i) => ({
            index: i,
            crop: 'Fallow',
            soil: 80,
            nutrition: 50,
            yield: 0
        }));
        const prevRound: Round = {
            number: 1,
            decision: decision,
            parcelsSnapshot: prevParcels
        };

        const round = GameEngine.calculateRound(2, prevRound, decision, { weather: 'Normal', vermin: 'None' }, 1000);
        // Nutrition should increase due to animals
        expect(round.parcelsSnapshot[8].nutrition).to.be.greaterThan(50);
        expect(round.result?.bioSiegel).to.be.true;
    });
});
