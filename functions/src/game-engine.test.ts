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
        // Default all fallow
        for (let i = 0; i < 40; i++) decision.parcels[i] = 'Fallow';

        const events = { weather: 'Normal', vermin: 'None' };
        const round = GameEngine.calculateRound(1, undefined, decision, events, 1000);

        expect(round.number).to.equal(1);
        expect(round.parcelsSnapshot).to.have.length(40);
        expect(round.parcelsSnapshot[0].soil).to.equal(82);
    });

    it('should decrease soil quality for heavy crops', () => {
        const decision: RoundDecision = {
            machines: 0,
            organic: false,
            fertilizer: false,
            pesticide: false,
            organisms: false,
            parcels: {}
        };
        for (let i = 0; i < 40; i++) decision.parcels[i] = 'Wheat'; // Wheat degrades soil

        const events = { weather: 'Normal', vermin: 'None' };

        // Initial round to set baseline
        const prevParcels: Parcel[] = Array(40).fill(null).map((_, i) => ({
            index: i,
            crop: 'Fallow',
            soil: 80,
            nutrition: 80,
            yield: 0
        }));
        const prevRound: Round = {
            number: 1,
            decision: decision,
            parcelsSnapshot: prevParcels,
            result: undefined as any
        };

        const round = GameEngine.calculateRound(2, prevRound, decision, events, 1000);

        // Wheat degrades soil (-0.02) but Sequence Fallow->Wheat is good (+0.03). Net +0.01.
        // 80 + 80 * 0.01 = 80.8
        expect(round.parcelsSnapshot[0].soil).to.equal(81);
    });
});
