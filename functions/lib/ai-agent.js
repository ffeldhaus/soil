"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAgent = void 0;
const constants_1 = require("./constants");
class AiAgent {
    static makeDecision(level, previousRound) {
        // Default decision
        const decision = {
            machines: 0,
            organic: false,
            fertilizer: false,
            pesticide: false,
            organisms: false,
            parcels: {}
        };
        const crops = ['Fieldbean', 'Barley', 'Oat', 'Potato', 'Corn', 'Rye', 'Wheat', 'Beet', 'Fallow', 'Grass'];
        for (let i = 0; i < 40; i++) {
            let chosenCrop = 'Fallow';
            if (level === 'random') {
                chosenCrop = crops[Math.floor(Math.random() * crops.length)];
            }
            else if (level === 'rotation') {
                if (!previousRound) {
                    chosenCrop = crops[Math.floor(Math.random() * crops.length)];
                }
                else {
                    const prevParcel = previousRound.parcelsSnapshot[i];
                    const prevCrop = prevParcel.crop;
                    // Find a 'good' crop in sequence
                    const goodCrops = crops.filter(c => { var _a; return ((_a = constants_1.CROP_SEQUENCE_MATRIX[prevCrop]) === null || _a === void 0 ? void 0 : _a[c]) === 'good'; });
                    if (goodCrops.length > 0) {
                        chosenCrop = goodCrops[Math.floor(Math.random() * goodCrops.length)];
                    }
                    else {
                        chosenCrop = 'Fallow';
                    }
                }
            }
            else if (level === 'optimizer') {
                // Simple heuristic optimizer: Prioritize high value crops if soil/nutrition is good
                // Simplified: Just pick Wheat or Potato if soil is high, else Fallow/Beans
                const prevParcel = previousRound ? previousRound.parcelsSnapshot[i] : { soil: 80, nutrition: 80, crop: 'Fallow' };
                if (prevParcel.soil > 90 && prevParcel.nutrition > 90) {
                    chosenCrop = 'Beet'; // High value, high cost
                }
                else if (prevParcel.soil > 70) {
                    chosenCrop = 'Wheat';
                }
                else {
                    chosenCrop = 'Fieldbean'; // Recover
                }
            }
            decision.parcels[i] = chosenCrop;
        }
        return decision;
    }
}
exports.AiAgent = AiAgent;
//# sourceMappingURL=ai-agent.js.map