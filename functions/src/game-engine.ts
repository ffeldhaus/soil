import { Round, RoundDecision, Parcel, RoundResult, CropType } from './types';
import {
    SOIL, NUTRITION, HARVEST_YIELD, HARVEST_SOIL_SENSITIVITY,
    HARVEST_NUTRITION_SENSITIVITY, CROP_SEQUENCE_MATRIX, EXPENSES, PRICES
} from './constants';

export class GameEngine {

    static calculateRound(
        currentRoundNumber: number,
        previousRound: Round | undefined,
        decision: RoundDecision,
        events: { weather: string, vermin: string },
        currentCapital: number
    ): Round {

        // Initialize parcels for the new round
        const parcelupdates: Parcel[] = [];

        // We need to know the state of parcels from the previous round
        // If it's the first round, we assume default values
        const previousParcels = previousRound ? previousRound.parcelsSnapshot : this.createInitialParcels();

        // 1. Calculate Parcel Updates (Soil, Nutrition, Harvest)
        const harvestSummary: Record<string, number> = {};
        Object.keys(HARVEST_YIELD).forEach(k => harvestSummary[k] = 0);

        previousParcels.forEach((prevParcel, index) => {
            const newCrop = decision.parcels[index];
            // Type safe crop
            const cropKey = newCrop as CropType;

            let newSoil = prevParcel.soil;
            let newNutrition = prevParcel.nutrition;

            // -- SOIL CALCULATION --
            let soilChange = 0;

            // Crop effect
            // Original logic has specific modifiers per crop group
            // Simplified mapping based on logic:
            if (['Fieldbean', 'Oat', 'Rye', 'Beet'].includes(cropKey)) {
                soilChange += SOIL.PLANTATION;
            } else if (['Barley', 'Potato', 'Corn', 'Wheat'].includes(cropKey)) {
                soilChange -= SOIL.PLANTATION;
            } else if (cropKey === 'Fallow') {
                const diff = Math.max(SOIL.START - prevParcel.soil, 0);
                soilChange += 0.01 * diff * SOIL.FALLOW;
            }

            // Fertilize
            if (decision.fertilizer) soilChange -= SOIL.FERTILIZE;

            // Pesticide
            if (decision.pesticide) soilChange -= SOIL.PESTICIDE;

            // Machines (simplified aging model for now, assume max machine usage impact)
            // soilChange -= ... 

            // Crop Sequence
            // Check previous crop
            const prevCrop = prevParcel.crop;
            const sequenceQuality = CROP_SEQUENCE_MATRIX[prevCrop]?.[newCrop] || 'ok';
            if (sequenceQuality === 'good') soilChange += SOIL.CROPSEQUENCE;
            if (sequenceQuality === 'bad') soilChange -= SOIL.CROPSEQUENCE;

            // Apply Soil Change
            // soilChange is a percentage factor in original? "new_parcel.soil += current_parcel.soil * soil_factor"
            // Yes, it's a factor.
            newSoil += prevParcel.soil * soilChange;


            // -- NUTRITION CALCULATION --
            let nutritionChangeFactor = 0;
            if (decision.fertilizer) nutritionChangeFactor += NUTRITION.FERTILIZE;
            if (cropKey === 'Fieldbean') nutritionChangeFactor += NUTRITION.FIELDBEAN;

            // Start with recovering base nutrition if Fallow?
            if (cropKey === 'Fallow' || cropKey === 'Grass') {
                if (prevParcel.nutrition > NUTRITION.START) {
                    newNutrition = NUTRITION.START;
                }
                // Else no change? or manual increase? Original: "new_parcel.nutrition = NUTRITION if current_parcel.nutrition > NUTRITION"
            } else {
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
                const base = HARVEST_YIELD[cropKey];
                const soilFactor = Math.pow(newSoil / SOIL.START, HARVEST_SOIL_SENSITIVITY[cropKey]);
                const nutritionFactor = Math.pow(newNutrition / NUTRITION.START, HARVEST_NUTRITION_SENSITIVITY[cropKey]);

                // Weather & Vermin (Placeholder for full matrix)
                const weatherFactor = events.weather === 'Normal' ? 1.0 : 0.8;

                yieldAmount = base * soilFactor * nutritionFactor * weatherFactor;

                // Decline nutrition due to harvest
                // new_parcel.nutrition -= (harvest/HARVEST) * current_parcel.nutrition * NUTRITION_DECLINE
                const ratio = yieldAmount / base;
                newNutrition -= ratio * prevParcel.nutrition * NUTRITION.DECLINE;

                harvestSummary[cropKey] += Math.floor(yieldAmount);
            }

            parcelupdates.push({
                index: index,
                crop: newCrop,
                soil: Math.round(Math.max(0, Math.min(200, newSoil))),
                nutrition: Math.round(Math.max(0, Math.min(200, newNutrition))),
                yield: Math.round(yieldAmount)
            });
        });


        // 2. Financials
        // Expenses
        let seedCost = 0;
        parcelupdates.forEach(p => {
            if (p.crop && p.crop !== 'Fallow' && p.crop !== 'Grass') {
                // Narrowing type for indexing
                const crop = p.crop as Exclude<CropType, 'Fallow' | 'Grass'>;
                if (!EXPENSES.SEEDS[crop]) return;

                const cost = decision.organic ? EXPENSES.SEEDS[crop].organic : EXPENSES.SEEDS[crop].conventional;
                seedCost += cost;
            }
        });

        const runningCost = decision.organic ? EXPENSES.RUNNING.BASE_ORGANIC : EXPENSES.RUNNING.BASE_CONVENTIONAL;
        const maintenance = (decision.fertilizer ? 40 * EXPENSES.RUNNING.FERTILIZE : 0) +
            (decision.pesticide ? 40 * EXPENSES.RUNNING.PESTICIDE : 0);

        const totalExpenses = seedCost + runningCost + maintenance;

        // Income
        let income = 0;
        Object.entries(harvestSummary).forEach(([cropKey, amount]) => {
            // Type assertion or check
            if (cropKey && cropKey !== 'Fallow' && cropKey !== 'Grass') {
                const crop = cropKey as Exclude<CropType, 'Fallow' | 'Grass'>;
                if (!PRICES[crop]) return;
                const price = decision.organic ? PRICES[crop].organic : PRICES[crop].conventional;
                income += amount * price;
            }
        });

        const profit = income - totalExpenses;
        const result: RoundResult = {
            profit,
            capital: currentCapital + profit,
            harvestSummary: harvestSummary as Record<CropType, number>,
            expenses: {
                seeds: seedCost,
                labor: 0,
                running: runningCost,
                investments: maintenance,
                total: totalExpenses
            },
            income,
            events,
            bioSiegel: decision.organic && !decision.fertilizer && !decision.pesticide
        };

        return {
            number: currentRoundNumber,
            decision,
            result,
            parcelsSnapshot: parcelupdates
        };
    }

    static createInitialParcels(): Parcel[] {
        return Array(40).fill(null).map((_, i) => ({
            index: i,
            crop: 'Fallow',
            soil: SOIL.START,
            nutrition: NUTRITION.START,
            yield: 0
        }));
    }
}
