"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngine = void 0;
const constants_1 = require("./constants");
class GameEngine {
    static calculateRound(currentRoundNumber, previousRound, decision, events, currentCapital) {
        const previousParcels = previousRound ? previousRound.parcelsSnapshot : this.createInitialParcels();
        const parcelupdates = [];
        const harvestSummary = {};
        Object.keys(constants_1.HARVEST_YIELD).forEach(k => harvestSummary[k] = 0);
        // -- 1. Pre-calculate global factors --
        const numParcels = previousParcels.length;
        const animalParcels = Object.values(decision.parcels).filter(c => c === 'Grass').length;
        const machineLevel = Math.min(4, Math.max(0, decision.machines || 0));
        // Organic status: Bio-Siegel is lost if synthetic fertilizer or pesticide is used
        const bioSiegel = decision.organic && !decision.fertilizer && !decision.pesticide;
        // Weather and Vermin factors
        const weather = constants_1.WEATHER_EFFECTS[events.weather] || constants_1.WEATHER_EFFECTS['Normal'];
        const vermin = constants_1.VERMIN_EFFECTS[events.vermin] || constants_1.VERMIN_EFFECTS['None'];
        // Machine factors
        const machineYieldBonus = constants_1.MACHINE_FACTORS.YIELD_BONUS[machineLevel];
        const machineSoilImpact = constants_1.SOIL.MACHINE_IMPACT[machineLevel];
        // -- 2. Calculate Parcel Updates --
        previousParcels.forEach((prevParcel, index) => {
            var _a;
            const newCrop = decision.parcels[index] || 'Fallow';
            const cropKey = newCrop;
            let newSoil = prevParcel.soil;
            let newNutrition = prevParcel.nutrition;
            // A. SOIL CALCULATION
            let soilFactor = 0;
            // Base crop impact
            if (constants_1.SOIL.PLANTATION_GAINS[cropKey])
                soilFactor += constants_1.SOIL.PLANTATION_GAINS[cropKey];
            if (constants_1.SOIL.PLANTATION_LOSSES[cropKey])
                soilFactor += constants_1.SOIL.PLANTATION_LOSSES[cropKey];
            // Fallow recovery
            if (cropKey === 'Fallow') {
                const diff = Math.max(constants_1.SOIL.START - prevParcel.soil, 0);
                soilFactor += (diff / constants_1.SOIL.START) * constants_1.SOIL.FALLOW_RECOVERY;
            }
            // Crop Sequence
            const prevCrop = prevParcel.crop;
            const sequenceQuality = ((_a = constants_1.CROP_SEQUENCE_MATRIX[prevCrop]) === null || _a === void 0 ? void 0 : _a[newCrop]) || 'ok';
            if (sequenceQuality === 'good')
                soilFactor += constants_1.SOIL.CROP_ROTATION_BONUS;
            if (sequenceQuality === 'bad')
                soilFactor += constants_1.SOIL.CROP_ROTATION_PENALTY;
            // Monoculture penalty (same crop twice)
            if (prevCrop === newCrop && newCrop !== 'Fallow' && newCrop !== 'Grass') {
                soilFactor += constants_1.SOIL.MONOCULTURE_PENALTY;
            }
            // Inputs impact
            if (decision.fertilizer)
                soilFactor += constants_1.SOIL.FERTILIZER_SYNTHETIC_IMPACT;
            if (decision.pesticide)
                soilFactor += constants_1.SOIL.PESTICIDE_IMPACT;
            // Machines impact
            soilFactor += machineSoilImpact;
            // Weather impact on soil
            soilFactor += weather.soil;
            // Apply soil change (compounding factor)
            newSoil = prevParcel.soil * (1 + soilFactor);
            // B. NUTRITION CALCULATION
            let nutritionGain = 0;
            if (decision.fertilizer) {
                nutritionGain += constants_1.NUTRITION.FERTILIZER_SYNTHETIC;
            }
            // Organic nutrition from animals
            if (decision.organic) {
                // Manure contribution scaled by number of animal parcels
                const animalRatio = animalParcels / numParcels;
                const organicGain = constants_1.NUTRITION.FERTILIZER_ORGANIC * (animalRatio / constants_1.NUTRITION.ANIMALS_REQUIRED_RATIO);
                nutritionGain += organicGain;
            }
            if (cropKey === 'Fieldbean') {
                nutritionGain += constants_1.NUTRITION.FIELDBEAN_BONUS;
            }
            // Base nutrition uptake/loss
            if (cropKey === 'Fallow' || cropKey === 'Grass') {
                // Natural stabilization
                if (newNutrition > constants_1.NUTRITION.START) {
                    newNutrition = newNutrition * 0.9 + constants_1.NUTRITION.START * 0.1;
                }
                else {
                    newNutrition += 5; // Slight recovery
                }
            }
            else {
                // Scale gain by soil quality (better soil = better nutrient uptake)
                const uptakeEfficiency = Math.max(0.2, Math.min(1.2, newSoil / constants_1.SOIL.START));
                newNutrition += nutritionGain * uptakeEfficiency;
            }
            // C. HARVEST CALCULATION
            let yieldAmount = 0;
            if (cropKey !== 'Fallow' && cropKey !== 'Grass') {
                const base = constants_1.HARVEST_YIELD[cropKey];
                // Yield depends on Soil and Nutrition
                const soilEffect = Math.pow(Math.max(0, newSoil) / constants_1.SOIL.START, constants_1.HARVEST_SOIL_SENSITIVITY[cropKey] || 1);
                const nutritionEffect = Math.pow(Math.max(0, newNutrition) / constants_1.NUTRITION.START, constants_1.HARVEST_NUTRITION_SENSITIVITY[cropKey] || 1);
                // Weather & Vermin
                let pestImpact = 1.0;
                if (events.vermin === 'Pests') {
                    if (decision.pesticide) {
                        pestImpact = 0.95; // Small loss even with pesticide
                    }
                    else if (decision.organisms) {
                        pestImpact = 0.85; // Organic protection is less effective
                    }
                    else {
                        pestImpact = vermin.yield;
                    }
                }
                yieldAmount = base * soilEffect * nutritionEffect * weather.yield * pestImpact * (1 + machineYieldBonus);
                // Organic yields are generally lower but higher quality/price
                if (decision.organic) {
                    yieldAmount *= 0.8;
                }
                // Nutrition decline due to harvest
                const harvestIntensity = yieldAmount / base;
                newNutrition -= harvestIntensity * constants_1.NUTRITION.BASE_DECLINE * constants_1.NUTRITION.START;
                harvestSummary[cropKey] += Math.round(yieldAmount);
            }
            parcelupdates.push({
                index: index,
                crop: newCrop,
                soil: Math.round(Math.max(0, Math.min(300, newSoil))),
                nutrition: Math.round(Math.max(0, Math.min(constants_1.NUTRITION.MAX, newNutrition))),
                yield: Math.round(yieldAmount)
            });
        });
        // -- 3. Financials --
        let seedCost = 0;
        parcelupdates.forEach(p => {
            if (p.crop && p.crop !== 'Fallow' && p.crop !== 'Grass') {
                const crop = p.crop;
                if (constants_1.EXPENSES.SEEDS[crop]) {
                    const cost = decision.organic ? constants_1.EXPENSES.SEEDS[crop].organic : constants_1.EXPENSES.SEEDS[crop].conventional;
                    seedCost += cost;
                }
            }
        });
        // Labor cost: Base - reduction by machines
        const laborCost = constants_1.MACHINE_FACTORS.BASE_LABOR_COST * constants_1.MACHINE_FACTORS.LABOR_COST_REDUCTION[machineLevel];
        // Machine investment/running costs
        const machineInvestment = constants_1.MACHINE_FACTORS.INVESTMENT_COST[machineLevel];
        const runningCost = (decision.organic ? constants_1.EXPENSES.RUNNING.BASE_ORGANIC : constants_1.EXPENSES.RUNNING.BASE_CONVENTIONAL) +
            (decision.organic ? constants_1.EXPENSES.RUNNING.ORGANIC_CONTROL : 0);
        const animalMaintenance = animalParcels * constants_1.EXPENSES.RUNNING.ANIMALS;
        const suppliesCost = (decision.fertilizer ? numParcels * constants_1.EXPENSES.RUNNING.FERTILIZE : 0) +
            (decision.pesticide ? numParcels * constants_1.EXPENSES.RUNNING.PESTICIDE : 0) +
            (decision.organisms ? numParcels * constants_1.EXPENSES.RUNNING.ORGANISMS : 0);
        const totalExpenses = seedCost + laborCost + machineInvestment + runningCost + animalMaintenance + suppliesCost;
        // Income
        let income = 0;
        Object.entries(harvestSummary).forEach(([cropKey, amount]) => {
            const crop = cropKey;
            if (constants_1.PRICES[crop]) {
                const price = decision.organic ? constants_1.PRICES[crop].organic : constants_1.PRICES[crop].conventional;
                income += amount * price;
            }
        });
        const profit = income - totalExpenses;
        const result = {
            profit,
            capital: currentCapital + profit,
            harvestSummary: harvestSummary,
            expenses: {
                seeds: seedCost,
                labor: laborCost,
                running: runningCost + animalMaintenance,
                investments: machineInvestment + suppliesCost,
                total: totalExpenses
            },
            income,
            events,
            bioSiegel
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