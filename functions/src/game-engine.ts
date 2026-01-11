import { GAME_CONSTANTS } from './constants';
import type { CropType, Parcel, Round, RoundDecision, RoundResult } from './types';

export class GameEngine {
  static calculateRound(
    currentRoundNumber: number,
    previousRound: Round | undefined,
    decision: RoundDecision,
    events: { weather: string; vermin: string },
    currentCapital: number,
    totalRounds = 20, // Default to 20
    options?: {
      marketPrices?: Record<string, { organic: number; conventional: number }>;
      subsidiesEnabled?: boolean;
    },
  ): Round {
    const previousParcels = previousRound ? previousRound.parcelsSnapshot : GameEngine.createInitialParcels();
    const parcelupdates: Parcel[] = [];
    const harvestSummary: Record<string, number> = {};

    // Initialize harvest summary for all crops
    Object.keys(GAME_CONSTANTS.CROPS).forEach((cropId) => {
      harvestSummary[cropId] = 0;
    });

    // -- 1. Pre-calculate global factors --
    const numParcels = previousParcels.length;
    const animalParcels = Object.values(decision.parcels).filter((c) => c === 'Grass').length;

    // Machine Decay & Growth Logic
    const prevMachineLevel = previousRound?.result?.machineRealLevel ?? 0;
    const investment = Math.min(4, Math.max(0, decision.machines || 0));

    const decayRate = 0.1 + (prevMachineLevel / 4) * 0.15;
    const decayAmount = prevMachineLevel * decayRate;

    const investmentEfficiency = 0.25;
    const investmentGain = investment * investmentEfficiency;

    let currentMachineLevel = prevMachineLevel - decayAmount + investmentGain;
    currentMachineLevel = Math.max(0, Math.min(4, currentMachineLevel));

    const effectiveMachineLevel = Math.min(4, Math.max(0, Math.round(currentMachineLevel)));
    const machineLevel = effectiveMachineLevel;

    const timeScale = 20 / totalRounds;
    const costScale = totalRounds / 20;

    const bioSiegel = decision.organic && !decision.fertilizer && !decision.pesticide;

    const weather = GAME_CONSTANTS.WEATHER_EFFECTS[events.weather] || GAME_CONSTANTS.WEATHER_EFFECTS.Normal;
    const vermin = GAME_CONSTANTS.VERMIN_EFFECTS[events.vermin] || GAME_CONSTANTS.VERMIN_EFFECTS.None;

    const machineYieldBonus = GAME_CONSTANTS.MACHINE_FACTORS.YIELD_BONUS[machineLevel];
    const machineSoilImpact = GAME_CONSTANTS.SOIL.MACHINE_IMPACT[machineLevel] * timeScale ** 0.5;

    // -- 2. Calculate Parcel Updates --
    previousParcels.forEach((prevParcel, index) => {
      const newCrop = decision.parcels[index] || 'Fallow';
      const cropKey = newCrop as CropType;
      const cropConfig = GAME_CONSTANTS.CROPS[cropKey];

      let newSoil = prevParcel.soil;
      let newNutrition = prevParcel.nutrition;

      // A. SOIL CALCULATION
      let soilFactor = 0;

      if (GAME_CONSTANTS.SOIL.PLANTATION_GAINS[cropKey])
        soilFactor += GAME_CONSTANTS.SOIL.PLANTATION_GAINS[cropKey] * timeScale;
      if (GAME_CONSTANTS.SOIL.PLANTATION_LOSSES[cropKey])
        soilFactor += GAME_CONSTANTS.SOIL.PLANTATION_LOSSES[cropKey] * timeScale;

      if (cropKey === 'Fallow') {
        const diff = Math.max(GAME_CONSTANTS.SOIL.START - prevParcel.soil, 0);
        soilFactor += (diff / GAME_CONSTANTS.SOIL.START) * GAME_CONSTANTS.SOIL.FALLOW_RECOVERY * timeScale;
      }

      const prevCrop = prevParcel.crop;
      const sequenceQuality = GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[newCrop] || 'ok';
      if (sequenceQuality === 'good') soilFactor += GAME_CONSTANTS.SOIL.CROP_ROTATION_BONUS * timeScale;
      if (sequenceQuality === 'bad') soilFactor += GAME_CONSTANTS.SOIL.CROP_ROTATION_PENALTY * timeScale;

      if (prevCrop === newCrop && newCrop !== 'Fallow' && newCrop !== 'Grass') {
        soilFactor += GAME_CONSTANTS.SOIL.MONOCULTURE_PENALTY * timeScale;
      }

      if (decision.fertilizer) soilFactor += GAME_CONSTANTS.SOIL.FERTILIZER_SYNTHETIC_IMPACT * timeScale ** 0.7;
      if (decision.pesticide) soilFactor += GAME_CONSTANTS.SOIL.PESTICIDE_IMPACT * timeScale ** 0.7;

      soilFactor += machineSoilImpact;
      soilFactor += weather.soil * timeScale;

      if (prevParcel.nutrition > GAME_CONSTANTS.SOIL.NUTRITION_OVER_PENALTY_START) {
        soilFactor +=
          (prevParcel.nutrition - GAME_CONSTANTS.SOIL.NUTRITION_OVER_PENALTY_START) *
          GAME_CONSTANTS.SOIL.NUTRITION_OVER_PENALTY_FACTOR *
          timeScale;
      }

      if (decision.fertilizer && prevParcel.nutrition > GAME_CONSTANTS.SOIL.SYNTHETIC_BURN_THRESHOLD) {
        soilFactor += GAME_CONSTANTS.SOIL.SYNTHETIC_BURN_PENALTY * timeScale;
      }

      if (decision.organisms) {
        soilFactor += GAME_CONSTANTS.SOIL.ORGANISMS_SOIL_BONUS * timeScale;
      }

      newSoil = prevParcel.soil * (1 + soilFactor);

      // B. NUTRITION CALCULATION
      let nutritionGain = 0;
      if (decision.fertilizer) {
        nutritionGain += GAME_CONSTANTS.NUTRITION.FERTILIZER_SYNTHETIC;
      }

      if (decision.organic) {
        const animalRatio = animalParcels / numParcels;
        const organicGain =
          GAME_CONSTANTS.NUTRITION.FERTILIZER_ORGANIC * (animalRatio / GAME_CONSTANTS.NUTRITION.ANIMALS_REQUIRED_RATIO);
        nutritionGain += organicGain;
      }

      if (cropKey === 'Fieldbean') {
        nutritionGain += GAME_CONSTANTS.NUTRITION.FIELDBEAN_BONUS;
      }

      if (cropKey === 'Fallow' || cropKey === 'Grass') {
        if (newNutrition > GAME_CONSTANTS.NUTRITION.START) {
          newNutrition = newNutrition * 0.9 + GAME_CONSTANTS.NUTRITION.START * 0.1;
        } else {
          newNutrition += 5;
        }
      } else {
        const uptakeEfficiency = Math.max(0.2, Math.min(1.2, newSoil / GAME_CONSTANTS.SOIL.START));
        newNutrition += nutritionGain * uptakeEfficiency;
      }

      // C. HARVEST CALCULATION
      let yieldAmount = 0;
      if (cropKey !== 'Fallow' && cropKey !== 'Grass' && cropConfig) {
        const base = cropConfig.baseYield;

        const soilEffect = (Math.max(0, newSoil) / GAME_CONSTANTS.SOIL.START) ** (cropConfig.soilSensitivity || 1);
        const nutritionEffect =
          (Math.max(0, newNutrition) / GAME_CONSTANTS.NUTRITION.START) ** (cropConfig.nutritionSensitivity || 1);

        let pestImpact = 1.0;
        if (events.vermin === 'Pests') {
          if (decision.pesticide) {
            pestImpact = 0.95;
          } else if (decision.organisms) {
            pestImpact = 0.85;
          } else {
            pestImpact = vermin.yield;
          }
        }

        yieldAmount = base * soilEffect * nutritionEffect * weather.yield * pestImpact * (1 + machineYieldBonus);

        if (decision.organic) {
          yieldAmount *= 0.8;
        }

        const harvestIntensity = yieldAmount / base;
        newNutrition -= harvestIntensity * GAME_CONSTANTS.NUTRITION.BASE_DECLINE * GAME_CONSTANTS.NUTRITION.START;

        harvestSummary[cropKey] += Math.round(yieldAmount);
      }

      parcelupdates.push({
        index: index,
        crop: newCrop,
        soil: Math.round(Math.max(0, Math.min(300, newSoil))),
        nutrition: Math.round(Math.max(0, Math.min(GAME_CONSTANTS.NUTRITION.MAX, newNutrition))),
        yield: Math.round(yieldAmount),
      });
    });

    // -- 3. Financials --
    let seedCost = 0;
    parcelupdates.forEach((p) => {
      if (p.crop && p.crop !== 'Fallow' && p.crop !== 'Grass') {
        const cropConfig = GAME_CONSTANTS.CROPS[p.crop];
        if (cropConfig) {
          const cost = decision.organic ? cropConfig.seedPrice.organic : cropConfig.seedPrice.conventional;
          seedCost += cost;
        }
      }
    });

    const laborCost =
      GAME_CONSTANTS.MACHINE_FACTORS.BASE_LABOR_COST *
      GAME_CONSTANTS.MACHINE_FACTORS.LABOR_COST_REDUCTION[machineLevel];
    const investmentLevel = Math.round(investment);
    const machineInvestment = GAME_CONSTANTS.MACHINE_FACTORS.INVESTMENT_COST[investmentLevel] * costScale;

    const runningCost =
      (decision.organic
        ? GAME_CONSTANTS.EXPENSES.RUNNING.BASE_ORGANIC
        : GAME_CONSTANTS.EXPENSES.RUNNING.BASE_CONVENTIONAL) +
      (decision.organic ? GAME_CONSTANTS.EXPENSES.RUNNING.ORGANIC_CONTROL : 0);

    const animalMaintenance = animalParcels * GAME_CONSTANTS.EXPENSES.RUNNING.ANIMALS;

    const suppliesCost =
      (decision.fertilizer ? numParcels * GAME_CONSTANTS.EXPENSES.RUNNING.FERTILIZE : 0) +
      (decision.pesticide ? numParcels * GAME_CONSTANTS.EXPENSES.RUNNING.PESTICIDE : 0) +
      (decision.organisms ? numParcels * GAME_CONSTANTS.EXPENSES.RUNNING.ORGANISMS : 0);

    const totalExpenses = seedCost + laborCost + machineInvestment + runningCost + animalMaintenance + suppliesCost;

    let subsidies = 0;
    if (options?.subsidiesEnabled) {
      const baseSubsidy = 150 * numParcels;
      const organicSubsidy = decision.organic ? 200 * numParcels : 0;
      subsidies = baseSubsidy + organicSubsidy;
    }

    let income = 0;
    const marketPricesUsed: Record<string, number> = {};
    Object.entries(harvestSummary).forEach(([cropKey, amount]) => {
      const cropConfig = GAME_CONSTANTS.CROPS[cropKey];
      if (cropConfig) {
        let price: number;
        const isFixed = decision.priceFixing?.[cropKey];

        if (isFixed || !options?.marketPrices?.[cropKey]) {
          price = decision.organic ? cropConfig.marketValue.organic : cropConfig.marketValue.conventional;
          if (isFixed && options?.marketPrices?.[cropKey]) {
            price *= 0.95;
          }
        } else {
          price = decision.organic ? options.marketPrices[cropKey].organic : options.marketPrices[cropKey].conventional;
        }

        income += amount * price;
        marketPricesUsed[cropKey] = price;
      }
    });

    const profit = income + subsidies - totalExpenses;
    const result: RoundResult = {
      profit,
      capital: currentCapital + profit,
      harvestSummary: harvestSummary as Record<CropType, number>,
      expenses: {
        seeds: seedCost,
        labor: laborCost,
        running: runningCost + animalMaintenance,
        investments: machineInvestment + suppliesCost,
        total: totalExpenses,
      },
      income,
      subsidies,
      marketPrices: marketPricesUsed,
      events,
      bioSiegel,
      machineRealLevel: currentMachineLevel,
    };

    return {
      number: currentRoundNumber,
      decision,
      result,
      parcelsSnapshot: parcelupdates,
    };
  }

  static createInitialParcels(): Parcel[] {
    return Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Fallow',
        soil: GAME_CONSTANTS.SOIL.START,
        nutrition: GAME_CONSTANTS.NUTRITION.START,
        yield: 0,
      }));
  }
}
