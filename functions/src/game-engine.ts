import {
  CROP_SEQUENCE_MATRIX,
  EXPENSES,
  HARVEST_NUTRITION_SENSITIVITY,
  HARVEST_SOIL_SENSITIVITY,
  HARVEST_YIELD,
  MACHINE_FACTORS,
  NUTRITION,
  PRICES,
  SOIL,
  VERMIN_EFFECTS,
  WEATHER_EFFECTS,
} from './constants';
import { CropType, Parcel, Round, RoundDecision, RoundResult } from './types';

export class GameEngine {
  static calculateRound(
    currentRoundNumber: number,
    previousRound: Round | undefined,
    decision: RoundDecision,
    events: { weather: string; vermin: string },
    currentCapital: number,
    totalRounds = 20, // Default to 20
  ): Round {
    const previousParcels = previousRound ? previousRound.parcelsSnapshot : this.createInitialParcels();
    const parcelupdates: Parcel[] = [];
    const harvestSummary: Record<string, number> = {};
    Object.keys(HARVEST_YIELD).forEach((k) => (harvestSummary[k] = 0));

    // -- 1. Pre-calculate global factors --
    const numParcels = previousParcels.length;
    const animalParcels = Object.values(decision.parcels).filter((c) => c === 'Grass').length;

    // Machine Decay & Growth Logic
    // We treat decision.machines as "Investment/Maintenance Effort" (0-4)
    // The actual machine state (machineRealLevel) decays over time if not maintained.
    const prevMachineLevel = previousRound?.result?.machineRealLevel ?? 0;
    const investment = Math.min(4, Math.max(0, decision.machines || 0));

    // Decay increases with level (Higher complexity = faster decay)
    // Base decay 10% + 15% scaled by level/4.
    // Level 0: 10% decay (if any residual)
    // Level 4: 25% decay per round
    const decayRate = 0.1 + (prevMachineLevel / 4) * 0.15;
    const decayAmount = prevMachineLevel * decayRate;

    // Investment Efficiency
    // We want Investment 4 to be able to sustain Level 4.
    // At Level 4, decay is 0.25 * 4 = 1.0.
    // So Investment 4 must provide +1.0 gain.
    // Efficiency = 1.0 / 4 = 0.25.
    const investmentEfficiency = 0.25;
    const investmentGain = investment * investmentEfficiency;

    // Calculate new level, clamped 0-4
    let currentMachineLevel = prevMachineLevel - decayAmount + investmentGain;
    currentMachineLevel = Math.max(0, Math.min(4, currentMachineLevel));

    // For calculations, we use the integer part or rounded value?
    // Let's use the float for smooth transitions, or floor for step benefits.
    // Using floor matches the integer-based factors in constants.ts better.
    // However, to make "small amount" useful (e.g. level 0.5), we might want to interpolate.
    // But currently MACHINE_FACTORS arrays are index-based.
    // Let's use Math.floor() for the factors to prevent out-of-bounds,
    // but maybe interpolate yield bonus?
    // For safety and consistency with existing constants, let's stick to Math.floor or Math.round.
    // Math.round gives a "snap" effect. Math.floor requires >1.0 to see benefit.
    // Let's use a weighted approach for factors if possible, or just index for now.
    // Given "deprecated over time", smooth decay is best visualized by float, but effects might be stepped.
    // Let's use Math.round() effectively "snapping" to nearest level for impact.
    // This allows Level 1.6 -> Level 2 benefit. Level 1.4 -> Level 1 benefit.
    const effectiveMachineLevel = Math.min(4, Math.max(0, Math.round(currentMachineLevel)));

    // Use effective level for impacts
    const machineLevel = effectiveMachineLevel;

    // Dynamic Scaling: Balance the speed of change based on game length
    // Baseline is 20 rounds.
    // In 10 rounds, things happen twice as fast. In 100 rounds, five times slower.
    const timeScale = 20 / totalRounds;
    const costScale = totalRounds / 20;

    // Organic status: Bio-Siegel is lost if synthetic fertilizer or pesticide is used
    const bioSiegel = decision.organic && !decision.fertilizer && !decision.pesticide;

    // Weather and Vermin factors
    const weather = WEATHER_EFFECTS[events.weather] || WEATHER_EFFECTS['Normal'];
    const vermin = VERMIN_EFFECTS[events.vermin] || VERMIN_EFFECTS['None'];

    // Machine factors
    const machineYieldBonus = MACHINE_FACTORS.YIELD_BONUS[machineLevel];
    // Soil impact: scaling should be moderate. High tech should always be risky.
    const machineSoilImpact = SOIL.MACHINE_IMPACT[machineLevel] * Math.pow(timeScale, 0.5);

    // -- 2. Calculate Parcel Updates --
    previousParcels.forEach((prevParcel, index) => {
      const newCrop = decision.parcels[index] || 'Fallow';
      const cropKey = newCrop as CropType;

      let newSoil = prevParcel.soil;
      let newNutrition = prevParcel.nutrition;

      // A. SOIL CALCULATION
      let soilFactor = 0;

      // Base crop impact (scaled)
      if (SOIL.PLANTATION_GAINS[cropKey]) soilFactor += SOIL.PLANTATION_GAINS[cropKey] * timeScale;
      if (SOIL.PLANTATION_LOSSES[cropKey]) soilFactor += SOIL.PLANTATION_LOSSES[cropKey] * timeScale;

      // Fallow recovery (scaled)
      if (cropKey === 'Fallow') {
        const diff = Math.max(SOIL.START - prevParcel.soil, 0);
        soilFactor += (diff / SOIL.START) * SOIL.FALLOW_RECOVERY * timeScale;
      }

      // Crop Sequence (scaled)
      const prevCrop = prevParcel.crop;
      const sequenceQuality = CROP_SEQUENCE_MATRIX[prevCrop]?.[newCrop] || 'ok';
      if (sequenceQuality === 'good') soilFactor += SOIL.CROP_ROTATION_BONUS * timeScale;
      if (sequenceQuality === 'bad') soilFactor += SOIL.CROP_ROTATION_PENALTY * timeScale;

      // Monoculture penalty (scaled)
      if (prevCrop === newCrop && newCrop !== 'Fallow' && newCrop !== 'Grass') {
        soilFactor += SOIL.MONOCULTURE_PENALTY * timeScale;
      }

      // Inputs impact (scaled moderately)
      if (decision.fertilizer) soilFactor += SOIL.FERTILIZER_SYNTHETIC_IMPACT * Math.pow(timeScale, 0.7);
      if (decision.pesticide) soilFactor += SOIL.PESTICIDE_IMPACT * Math.pow(timeScale, 0.7);

      // Machines impact
      soilFactor += machineSoilImpact;

      // Weather impact on soil
      soilFactor += weather.soil * timeScale;

      // Over-fertilization penalties (Nutrition Burn - scaled)
      if (prevParcel.nutrition > (SOIL as any).NUTRITION_OVER_PENALTY_START) {
        soilFactor +=
          (prevParcel.nutrition - (SOIL as any).NUTRITION_OVER_PENALTY_START) *
          (SOIL as any).NUTRITION_OVER_PENALTY_FACTOR *
          timeScale;
      }

      // Chemical burn from synthetic fertilizer
      if (decision.fertilizer && prevParcel.nutrition > (SOIL as any).SYNTHETIC_BURN_THRESHOLD) {
        soilFactor += (SOIL as any).SYNTHETIC_BURN_PENALTY * timeScale;
      }

      // Organisms soil bonus
      if (decision.organisms) {
        soilFactor += (SOIL as any).ORGANISMS_SOIL_BONUS * timeScale;
      }

      // Apply soil change (compounding factor)
      newSoil = prevParcel.soil * (1 + soilFactor);

      // B. NUTRITION CALCULATION
      let nutritionGain = 0;
      if (decision.fertilizer) {
        nutritionGain += NUTRITION.FERTILIZER_SYNTHETIC;
      }

      // Organic nutrition from animals
      if (decision.organic) {
        // Manure contribution scaled by number of animal parcels
        const animalRatio = animalParcels / numParcels;
        const organicGain = NUTRITION.FERTILIZER_ORGANIC * (animalRatio / NUTRITION.ANIMALS_REQUIRED_RATIO);
        nutritionGain += organicGain;
      }

      if (cropKey === 'Fieldbean') {
        nutritionGain += NUTRITION.FIELDBEAN_BONUS;
      }

      // Base nutrition uptake/loss
      if (cropKey === 'Fallow' || cropKey === 'Grass') {
        // Natural stabilization
        if (newNutrition > NUTRITION.START) {
          newNutrition = newNutrition * 0.9 + NUTRITION.START * 0.1;
        } else {
          newNutrition += 5; // Slight recovery
        }
      } else {
        // Scale gain by soil quality (better soil = better nutrient uptake)
        const uptakeEfficiency = Math.max(0.2, Math.min(1.2, newSoil / SOIL.START));
        newNutrition += nutritionGain * uptakeEfficiency;
      }

      // C. HARVEST CALCULATION
      let yieldAmount = 0;
      if (cropKey !== 'Fallow' && cropKey !== 'Grass') {
        const base = HARVEST_YIELD[cropKey];

        // Yield depends on Soil and Nutrition
        const soilEffect = Math.pow(Math.max(0, newSoil) / SOIL.START, HARVEST_SOIL_SENSITIVITY[cropKey] || 1);
        const nutritionEffect = Math.pow(
          Math.max(0, newNutrition) / NUTRITION.START,
          HARVEST_NUTRITION_SENSITIVITY[cropKey] || 1,
        );

        // Weather & Vermin
        let pestImpact = 1.0;
        if (events.vermin === 'Pests') {
          if (decision.pesticide) {
            pestImpact = 0.95; // Small loss even with pesticide
          } else if (decision.organisms) {
            pestImpact = 0.85; // Organic protection is less effective
          } else {
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
        newNutrition -= harvestIntensity * NUTRITION.BASE_DECLINE * NUTRITION.START;

        harvestSummary[cropKey] += Math.round(yieldAmount);
      }

      parcelupdates.push({
        index: index,
        crop: newCrop,
        soil: Math.round(Math.max(0, Math.min(300, newSoil))), // Allow some over-improvement
        nutrition: Math.round(Math.max(0, Math.min(NUTRITION.MAX, newNutrition))),
        yield: Math.round(yieldAmount),
      });
    });

    // -- 3. Financials --
    let seedCost = 0;
    parcelupdates.forEach((p) => {
      if (p.crop && p.crop !== 'Fallow' && p.crop !== 'Grass') {
        const crop = p.crop as keyof typeof EXPENSES.SEEDS;
        if (EXPENSES.SEEDS[crop]) {
          const cost = decision.organic ? EXPENSES.SEEDS[crop].organic : EXPENSES.SEEDS[crop].conventional;
          seedCost += cost;
        }
      }
    });

    // Labor cost: Base - reduction by machines
    const laborCost = MACHINE_FACTORS.BASE_LABOR_COST * MACHINE_FACTORS.LABOR_COST_REDUCTION[machineLevel];

    // Machine investment/running costs (Investment scaled by game length)
    // Cost is based on what the user ordered (investment), not the resulting level.
    const investmentLevel = Math.round(investment); // investment is 0-4 float/int
    const machineInvestment = MACHINE_FACTORS.INVESTMENT_COST[investmentLevel] * costScale;

    const runningCost =
      (decision.organic ? EXPENSES.RUNNING.BASE_ORGANIC : EXPENSES.RUNNING.BASE_CONVENTIONAL) +
      (decision.organic ? EXPENSES.RUNNING.ORGANIC_CONTROL : 0);

    const animalMaintenance = animalParcels * EXPENSES.RUNNING.ANIMALS;

    const suppliesCost =
      (decision.fertilizer ? numParcels * EXPENSES.RUNNING.FERTILIZE : 0) +
      (decision.pesticide ? numParcels * EXPENSES.RUNNING.PESTICIDE : 0) +
      (decision.organisms ? numParcels * EXPENSES.RUNNING.ORGANISMS : 0);

    const totalExpenses = seedCost + laborCost + machineInvestment + runningCost + animalMaintenance + suppliesCost;

    // Income
    let income = 0;
    Object.entries(harvestSummary).forEach(([cropKey, amount]) => {
      const crop = cropKey as keyof typeof PRICES;
      if (PRICES[crop]) {
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
        labor: laborCost,
        running: runningCost + animalMaintenance,
        investments: machineInvestment + suppliesCost,
        total: totalExpenses,
      },
      income,
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
        soil: SOIL.START,
        nutrition: NUTRITION.START,
        yield: 0,
      }));
  }
}
