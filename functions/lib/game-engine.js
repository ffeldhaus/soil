"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngine = void 0;
const constants_1 = require("./constants");
class GameEngine {
    static calculateRound(currentRoundNumber, previousRound, decision, events) {
        var _a;
        // Initialize parcels for the new round
        const parcelupdates = [];
        // We need to know the state of parcels from the previous round
        // If it's the first round, we assume default values
        const previousParcels = previousRound ? previousRound.parcelsSnapshot : this.createInitialParcels();
        // 1. Calculate Parcel Updates (Soil, Nutrition, Harvest)
        const harvestSummary = {};
        Object.keys(constants_1.HARVEST_YIELD).forEach(k => harvestSummary[k] = 0);
        previousParcels.forEach((prevParcel, index) => {
            var _a;
            const newCrop = decision.parcels[index];
            // Type safe crop
            const cropKey = newCrop;
            let newSoil = prevParcel.soil;
            let newNutrition = prevParcel.nutrition;
            // -- SOIL CALCULATION --
            let soilChange = 0;
            // Crop effect
            // Original logic has specific modifiers per crop group
            // Simplified mapping based on logic:
            if (['Fieldbean', 'Oat', 'Rye', 'Beet'].includes(cropKey)) {
                soilChange += constants_1.SOIL.PLANTATION;
            }
            else if (['Barley', 'Potato', 'Corn', 'Wheat'].includes(cropKey)) {
                soilChange -= constants_1.SOIL.PLANTATION;
            }
            else if (cropKey === 'Fallow') {
                const diff = Math.max(constants_1.SOIL.START - prevParcel.soil, 0);
                soilChange += 0.01 * diff * constants_1.SOIL.FALLOW;
            }
            // Fertilize
            if (decision.fertilizer)
                soilChange -= constants_1.SOIL.FERTILIZE;
            // Pesticide
            if (decision.pesticide)
                soilChange -= constants_1.SOIL.PESTICIDE;
            // Machines (simplified aging model for now, assume max machine usage impact)
            // soilChange -= ... 
            // Crop Sequence
            // Check previous crop
            const prevCrop = prevParcel.crop;
            const sequenceQuality = ((_a = constants_1.CROP_SEQUENCE_MATRIX[prevCrop]) === null || _a === void 0 ? void 0 : _a[newCrop]) || 'ok';
            if (sequenceQuality === 'good')
                soilChange += constants_1.SOIL.CROPSEQUENCE;
            if (sequenceQuality === 'bad')
                soilChange -= constants_1.SOIL.CROPSEQUENCE;
            // Apply Soil Change
            // soilChange is a percentage factor in original? "new_parcel.soil += current_parcel.soil * soil_factor"
            // Yes, it's a factor.
            newSoil += prevParcel.soil * soilChange;
            // -- NUTRITION CALCULATION --
            let nutritionChangeFactor = 0;
            if (decision.fertilizer)
                nutritionChangeFactor += constants_1.NUTRITION.FERTILIZE;
            if (cropKey === 'Fieldbean')
                nutritionChangeFactor += constants_1.NUTRITION.FIELDBEAN;
            // Start with recovering base nutrition if Fallow?
            if (cropKey === 'Fallow' || cropKey === 'Grass') {
                if (prevParcel.nutrition > constants_1.NUTRITION.START) {
                    newNutrition = constants_1.NUTRITION.START;
                }
                // Else no change? or manual increase? Original: "new_parcel.nutrition = NUTRITION if current_parcel.nutrition > NUTRITION"
            }
            else {
                // Nutrition uptake/block logic
                // nutrition_factor *= 0.01 * current_parcel.soil * (1 - 0.01 * current_parcel.nutrition) ???
                // Simplified:
                const intakeEfficiency = (prevParcel.soil / 100) * (1 - prevParcel.nutrition / 200); // Heuristic
                nutritionChangeFactor *= intakeEfficiency;
                newNutrition += prevParcel.nutrition * nutritionChangeFactor;
            }
            // -- HARVEST CALCULATION --
            let yieldAmount = 0;
            if (cropKey !== 'Fallow' && cropKey !== 'Grass') {
                const base = constants_1.HARVEST_YIELD[cropKey];
                const soilFactor = Math.pow(newSoil / constants_1.SOIL.START, constants_1.HARVEST_SOIL_SENSITIVITY[cropKey]);
                const nutritionFactor = Math.pow(newNutrition / constants_1.NUTRITION.START, constants_1.HARVEST_NUTRITION_SENSITIVITY[cropKey]);
                // Weather & Vermin (Placeholder for full matrix)
                const weatherFactor = events.weather === 'Normal' ? 1.0 : 0.8;
                yieldAmount = base * soilFactor * nutritionFactor * weatherFactor;
                // Decline nutrition due to harvest
                // new_parcel.nutrition -= (harvest/HARVEST) * current_parcel.nutrition * NUTRITION_DECLINE
                const ratio = yieldAmount / base;
                newNutrition -= ratio * prevParcel.nutrition * constants_1.NUTRITION.DECLINE;
                harvestSummary[cropKey] += Math.floor(yieldAmount);
            }
            parcelupdates.push({
                index: index,
                crop: newCrop,
                soil: Math.max(0, Math.min(200, newSoil)),
                nutrition: Math.max(0, Math.min(200, newNutrition)),
                yield: Math.floor(yieldAmount)
            });
        });
        // 2. Financials
        // Expenses
        let seedCost = 0;
        parcelupdates.forEach(p => {
            if (p.crop && p.crop !== 'Fallow' && p.crop !== 'Grass') {
                // Narrowing type for indexing
                const crop = p.crop;
                if (!constants_1.EXPENSES.SEEDS[crop])
                    return;
                const cost = decision.organic ? constants_1.EXPENSES.SEEDS[crop].organic : constants_1.EXPENSES.SEEDS[crop].conventional;
                seedCost += cost;
            }
        });
        const runningCost = decision.organic ? constants_1.EXPENSES.RUNNING.BASE_ORGANIC : constants_1.EXPENSES.RUNNING.BASE_CONVENTIONAL;
        const maintenance = (decision.fertilizer ? 40 * constants_1.EXPENSES.RUNNING.FERTILIZE : 0) +
            (decision.pesticide ? 40 * constants_1.EXPENSES.RUNNING.PESTICIDE : 0);
        const totalExpenses = seedCost + runningCost + maintenance;
        // Income
        let income = 0;
        Object.entries(harvestSummary).forEach(([cropKey, amount]) => {
            // Type assertion or check
            if (cropKey && cropKey !== 'Fallow' && cropKey !== 'Grass') {
                const crop = cropKey;
                if (!constants_1.PRICES[crop])
                    return;
                const price = decision.organic ? constants_1.PRICES[crop].organic : constants_1.PRICES[crop].conventional;
                income += amount * price;
            }
        });
        const profit = income - totalExpenses;
        const prevCapital = ((_a = previousRound === null || previousRound === void 0 ? void 0 : previousRound.result) === null || _a === void 0 ? void 0 : _a.capital) || 0; // Or passed from player state
        const result = {
            profit,
            capital: prevCapital + profit,
            harvestSummary: harvestSummary,
            expenses: {
                seeds: seedCost,
                labor: 0,
                running: runningCost,
                investments: maintenance,
                total: totalExpenses
            },
            income,
            events
        };
        return {
            number: currentRoundNumber,
            decision,
            result,
            parcelsSnapshot: parcelupdates
        };
    }
    static createInitialParcels() {
        return Array(40).fill(null).map((_, i) => ({
            index: i,
            crop: 'Fallow',
            soil: constants_1.SOIL.START,
            nutrition: constants_1.NUTRITION.START,
            yield: 0
        }));
    }
}
exports.GameEngine = GameEngine;
//# sourceMappingURL=game-engine.js.map