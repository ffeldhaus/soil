import { expect } from 'chai';
import { AiAgent } from './ai-agent';
import { Round, Parcel } from './types';

describe('AiAgent', () => {

    it('should create an elementary decision', () => {
        const decision = AiAgent.makeDecision('elementary', undefined);
        expect(decision.machines).to.equal(0);
        expect(Object.keys(decision.parcels)).to.have.length(40);
    });

    it('should create a middle decision following rotation', () => {
        const prevParcels: Parcel[] = Array(40).fill(null).map((_, i) => ({
            index: i,
            crop: 'Potato',
            soil: 80,
            nutrition: 80,
            yield: 0
        }));
        const prevRound: Round = {
            number: 1,
            decision: { parcels: {}, machines: 0, organic: false, fertilizer: false, pesticide: false, organisms: false },
            parcelsSnapshot: prevParcels
        };
        const decision = AiAgent.makeDecision('middle', prevRound);
        // Middle strategy avoids bad rotations (Potato -> Potato is bad)
        expect(decision.parcels[0]).to.not.equal('Potato');
    });

    it('should create a high level decision and go organic if soil is high', () => {
        const prevParcels: Parcel[] = Array(40).fill(null).map((_, i) => ({
            index: i,
            crop: 'Wheat',
            soil: 121,
            nutrition: 100,
            yield: 0
        }));
        const prevRound: Round = {
            number: 1,
            decision: { parcels: {}, machines: 0, organic: false, fertilizer: false, pesticide: false, organisms: false },
            parcelsSnapshot: prevParcels
        };
        const decision = AiAgent.makeDecision('high', prevRound);
        expect(decision.organic).to.be.true;
    });
});
