"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAgent = void 0;
const constants_1 = require("./constants");
class AiAgent {
    static makeDecision(level, previousRound) {
        const decision = {
            machines: 0,
            organic: false,
            fertilizer: false,
            pesticide: false,
            organisms: false,
            parcels: {}
        };
        const crops = ['Fieldbean', 'Barley', 'Oat', 'Potato', 'Corn', 'Rye', 'Wheat', 'Beet', 'Fallow', 'Grass'];
        const mainCrops = ['Wheat', 'Barley', 'Potato', 'Corn', 'Beet'];
        // 1. Level Specific Strategy
        if (level === 'elementary') {
            // Elementary: Simple conventional farming, random main crops, no machines.
            decision.machines = 0;
            decision.fertilizer = Math.random() > 0.3; // Often fertilize
            decision.pesticide = Math.random() > 0.5;
            for (let i = 0; i < 40; i++) {
                decision.parcels[i] = mainCrops[Math.floor(Math.random() * mainCrops.length)];
            }
        }
        else if (level === 'middle') {
            // Middle: Follows rotation, basic machine usage, mostly conventional.
            decision.machines = 1;
            decision.fertilizer = true;
            decision.pesticide = true;
            for (let i = 0; i < 40; i++) {
                if (!previousRound) {
                    decision.parcels[i] = mainCrops[i % mainCrops.length];
                }
                else {
                    const prevCrop = previousRound.parcelsSnapshot[i].crop;
                    const goodNext = crops.filter(c => { var _a; return ((_a = constants_1.CROP_SEQUENCE_MATRIX[prevCrop]) === null || _a === void 0 ? void 0 : _a[c]) === 'good' && c !== 'Fallow' && c !== 'Grass'; });
                    decision.parcels[i] = goodNext.length > 0 ? goodNext[0] : 'Wheat';
                }
            }
        }
        else if (level === 'high') {
            // High: Strategic. Uses rotation, optimizes machines, considers organic if soil allows.
            const averageSoil = previousRound
                ? previousRound.parcelsSnapshot.reduce((acc, p) => acc + p.soil, 0) / 40
                : 80;
            decision.organic = averageSoil > 100; // Go organic if soil is excellent
            decision.machines = averageSoil > 90 ? 2 : 1;
            if (!decision.organic) {
                decision.fertilizer = averageSoil < 120; // Only fertilize if soil needs boost
                decision.pesticide = true;
            }
            else {
                decision.organisms = true;
            }
            for (let i = 0; i < 40; i++) {
                const prevParcel = previousRound ? previousRound.parcelsSnapshot[i] : { soil: 80, nutrition: 80, crop: 'Fallow' };
                const prevCrop = prevParcel.crop;
                if (prevParcel.soil < 70 || prevParcel.nutrition < 60) {
                    decision.parcels[i] = 'Fieldbean'; // Recovery
                }
                else if (decision.organic && i < 8) {
                    decision.parcels[i] = 'Grass'; // Needed for organic nutrition
                }
                else {
                    const goodNext = mainCrops.filter(c => { var _a; return ((_a = constants_1.CROP_SEQUENCE_MATRIX[prevCrop]) === null || _a === void 0 ? void 0 : _a[c]) === 'good'; });
                    if (goodNext.length > 0) {
                        decision.parcels[i] = goodNext[Math.floor(Math.random() * goodNext.length)];
                    }
                    else {
                        decision.parcels[i] = 'Oat'; // Neutral
                    }
                }
            }
        }
        return decision;
    }
}
exports.AiAgent = AiAgent;
//# sourceMappingURL=ai-agent.js.map