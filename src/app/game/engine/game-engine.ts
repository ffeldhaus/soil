import { GAME_CONSTANTS } from '../../game-constants';
import type { CropType, Parcel, Round, RoundDecision, RoundResult } from '../../types';

export class GameEngine {
  static calculateRound(
    currentRoundNumber: number,
    previousRound: Round | undefined,
    decision: RoundDecision,
    events: { weather: string; vermin: string[] },
    currentCapital: number,
    totalRounds = GAME_CONSTANTS.DEFAULT_ROUNDS,
    options?: {
      marketPrices?: Record<string, { organic: number; conventional: number }>;
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
    const { machineLevel, currentMachineLevel } = GameEngine.calculateMachineLevel(
      previousRound?.result?.machineRealLevel ?? 0,
      decision.machines || 0,
    );

    const timeScale = GAME_CONSTANTS.DEFAULT_ROUNDS / totalRounds;
    const costScale = totalRounds / GAME_CONSTANTS.DEFAULT_ROUNDS;

    const bioSiegel = decision.organic && !decision.fertilizer && !decision.pesticide;

    const weather = GAME_CONSTANTS.WEATHER_EFFECTS[events.weather] || GAME_CONSTANTS.WEATHER_EFFECTS.Normal;

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
      const soilFactor = GameEngine.calculateSoilFactor(
        prevParcel,
        cropKey,
        decision,
        weather,
        machineSoilImpact,
        timeScale,
      );

      newSoil = prevParcel.soil * (1 + soilFactor);

      // B. NUTRITION CALCULATION
      const nutritionGain = GameEngine.calculateNutritionGain(cropKey, decision, animalParcels, numParcels);
      newNutrition = GameEngine.calculateNutritionUpdate(prevParcel.nutrition, nutritionGain, cropKey, newSoil);

      // C. HARVEST CALCULATION
      let yieldAmount = 0;
      if (cropKey !== 'Fallow' && cropKey !== 'Grass' && cropConfig) {
        yieldAmount = GameEngine.calculateYield(
          cropConfig,
          newSoil,
          newNutrition,
          events,
          decision,
          weather,
          machineYieldBonus,
        );

        const harvestIntensity = yieldAmount / cropConfig.baseYield;
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
    const result = GameEngine.calculateFinancials(
      parcelupdates,
      harvestSummary as Record<CropType, number>,
      decision,
      machineLevel,
      currentMachineLevel,
      animalParcels,
      numParcels,
      events,
      bioSiegel,
      costScale,
      currentCapital,
      options,
    );

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

  private static calculateMachineLevel(
    prevRealLevel: number,
    investment: number,
  ): { machineLevel: number; currentMachineLevel: number } {
    const inv = Math.min(4, Math.max(0, investment));
    const decayRate = 0.1 + (prevRealLevel / 4) * 0.15;
    const decayAmount = prevRealLevel * decayRate;
    const investmentGain = inv * 0.25;

    let currentMachineLevel = prevRealLevel - decayAmount + investmentGain;
    currentMachineLevel = Math.max(0, Math.min(4, currentMachineLevel));
    const machineLevel = Math.min(4, Math.max(0, Math.round(currentMachineLevel)));

    return { machineLevel, currentMachineLevel };
  }

  private static calculateSoilFactor(
    prevParcel: Parcel,
    cropKey: CropType,
    decision: RoundDecision,
    weather: { soil: number },
    machineSoilImpact: number,
    timeScale: number,
  ): number {
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
    const sequenceQuality = GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[cropKey] || 'ok';
    if (sequenceQuality === 'good') soilFactor += GAME_CONSTANTS.SOIL.CROP_ROTATION_BONUS * timeScale;
    if (sequenceQuality === 'bad') soilFactor += GAME_CONSTANTS.SOIL.CROP_ROTATION_PENALTY * timeScale;

    if (prevCrop === cropKey && cropKey !== 'Fallow' && cropKey !== 'Grass') {
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

    return soilFactor;
  }

  private static calculateNutritionGain(
    cropKey: CropType,
    decision: RoundDecision,
    animalParcels: number,
    numParcels: number,
  ): number {
    let nutritionGain = 0;
    if (decision.fertilizer) nutritionGain += GAME_CONSTANTS.NUTRITION.FERTILIZER_SYNTHETIC;

    if (decision.organic) {
      const animalRatio = animalParcels / numParcels;
      nutritionGain +=
        GAME_CONSTANTS.NUTRITION.FERTILIZER_ORGANIC * (animalRatio / GAME_CONSTANTS.NUTRITION.ANIMALS_REQUIRED_RATIO);
    }

    if (cropKey === 'Fieldbean') nutritionGain += GAME_CONSTANTS.NUTRITION.FIELDBEAN_BONUS;

    return nutritionGain;
  }

  private static calculateNutritionUpdate(
    prevNutrition: number,
    nutritionGain: number,
    cropKey: CropType,
    newSoil: number,
  ): number {
    if (cropKey === 'Fallow' || cropKey === 'Grass') {
      if (prevNutrition > GAME_CONSTANTS.NUTRITION.START) {
        return prevNutrition * 0.9 + GAME_CONSTANTS.NUTRITION.START * 0.1;
      }
      return prevNutrition + 5;
    }
    const uptakeEfficiency = Math.max(0.2, Math.min(1.2, newSoil / GAME_CONSTANTS.SOIL.START));
    return prevNutrition + nutritionGain * uptakeEfficiency;
  }

  private static calculateYield(
    cropConfig: any,
    newSoil: number,
    newNutrition: number,
    events: { vermin: string[]; weather: string },
    decision: RoundDecision,
    weather: { yield: number },
    machineYieldBonus: number,
  ): number {
    const soilEffect = (Math.max(0, newSoil) / GAME_CONSTANTS.SOIL.START) ** (cropConfig.soilSensitivity || 1);
    const nutritionEffect =
      (Math.max(0, newNutrition) / GAME_CONSTANTS.NUTRITION.START) ** (cropConfig.nutritionSensitivity || 1);

    let pestImpact = 1.0;
    const cropPestKey = GameEngine.getPestKey(cropConfig.pest);
    if (events.vermin.includes(cropPestKey)) {
      if (decision.pesticide) {
        pestImpact = 0.95;
      } else if (decision.organisms) {
        pestImpact = 0.85;
      } else {
        const basePenalty = 1.0 - 0.7;
        const multiplier = decision.organic ? 1.2 : 1.0;
        pestImpact = Math.max(0, 1.0 - basePenalty * multiplier);
      }
    }

    let weatherYieldEffect = weather.yield;
    if (weatherYieldEffect < 1.0) {
      const penalty = 1.0 - weatherYieldEffect;
      let sensitivityLevel = 'Mäßig';
      if (events.weather === 'Drought' || events.weather === 'SummerDrought') {
        sensitivityLevel = cropConfig.weatherSensitivity.drought;
      } else if (events.weather === 'LateFrost') {
        sensitivityLevel = cropConfig.weatherSensitivity.cold;
      } else if (events.weather === 'Flood' || events.weather === 'Storm') {
        sensitivityLevel = cropConfig.weatherSensitivity.flood;
      }
      const sensitivityMultiplierMap: Record<string, number> = { Stark: 1.5, Mäßig: 1.0, Gering: 0.5, Keine: 0 };
      const multiplier = sensitivityMultiplierMap[sensitivityLevel] ?? 1.0;
      weatherYieldEffect = Math.max(0, 1.0 - penalty * multiplier);
    }

    let yieldAmount =
      cropConfig.baseYield * soilEffect * nutritionEffect * weatherYieldEffect * pestImpact * (1 + machineYieldBonus);
    if (decision.organic) yieldAmount *= 0.4;
    return yieldAmount;
  }

  private static calculateFinancials(
    parcelupdates: Parcel[],
    harvestSummary: Record<CropType, number>,
    decision: RoundDecision,
    machineLevel: number,
    currentMachineLevel: number,
    animalParcels: number,
    numParcels: number,
    events: { weather: string; vermin: string[] },
    bioSiegel: boolean,
    costScale: number,
    currentCapital: number,
    options?: { marketPrices?: Record<string, { organic: number; conventional: number }> },
  ): RoundResult {
    let seedCost = 0;
    parcelupdates.forEach((p) => {
      if (p.crop && p.crop !== 'Fallow' && p.crop !== 'Grass') {
        const cropConfig = GAME_CONSTANTS.CROPS[p.crop];
        if (cropConfig) {
          seedCost += decision.organic ? cropConfig.seedPrice.organic : cropConfig.seedPrice.conventional;
        }
      }
    });

    const laborCost = GAME_CONSTANTS.MACHINE_FACTORS.PERSONNEL_COST;
    const machineInvestment =
      GAME_CONSTANTS.MACHINE_FACTORS.INVESTMENT_COST[Math.round(decision.machines || 0)] * costScale;
    const machineMaintenance = GAME_CONSTANTS.MACHINE_FACTORS.MAINTENANCE_COST[machineLevel];
    const runningCost =
      (decision.organic ? GAME_CONSTANTS.EXPENSES.RUNNING.ORGANIC_CONTROL : 0) + machineMaintenance + laborCost;
    let animalMaintenance = animalParcels * GAME_CONSTANTS.EXPENSES.RUNNING.ANIMALS;
    if (events.vermin.includes('swine-fever')) {
      animalMaintenance *= 2.0; // Significant increase due to hygiene and restriction zones
    }
    const suppliesCost =
      (decision.fertilizer ? numParcels * GAME_CONSTANTS.EXPENSES.RUNNING.FERTILIZE : 0) +
      (decision.pesticide ? numParcels * GAME_CONSTANTS.EXPENSES.RUNNING.PESTICIDE : 0) +
      (decision.organisms ? numParcels * GAME_CONSTANTS.EXPENSES.RUNNING.ORGANISMS : 0);
    const totalExpenses = seedCost + machineInvestment + runningCost + animalMaintenance + suppliesCost;

    const subsidies = 220 * numParcels + (bioSiegel ? 210 * numParcels : 0);

    let income = 0;
    const marketPricesUsed: Record<string, number> = {};
    Object.entries(harvestSummary).forEach(([cropKey, amount]) => {
      const cropConfig = GAME_CONSTANTS.CROPS[cropKey];
      if (cropConfig) {
        let price: number;
        const isFixed = decision.priceFixing?.[cropKey];
        const useOrganicPrice = bioSiegel;
        if (isFixed || !options?.marketPrices?.[cropKey]) {
          price = useOrganicPrice ? cropConfig.marketValue.organic : cropConfig.marketValue.conventional;
          if (isFixed && options?.marketPrices?.[cropKey]) price *= 0.95;
        } else {
          price = useOrganicPrice ? options.marketPrices[cropKey].organic : options.marketPrices[cropKey].conventional;
        }
        income += amount * price;
        marketPricesUsed[cropKey] = price;
      }
    });

    const profit = income + subsidies - totalExpenses;
    return {
      profit,
      capital: currentCapital + profit,
      harvestSummary,
      expenses: {
        seeds: seedCost,
        labor: 0,
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
  }

  private static getPestKey(p: string): string {
    const map: Record<string, string> = {
      'Schwarze Bohnenlaus': 'aphid-black',
      Getreideblattlaus: 'aphid-cereal',
      Kartoffelkäfer: 'potato-beetle',
      Maiszünsler: 'corn-borer',
      Rapsglanzkäfer: 'pollen-beetle',
      Erbsenwickler: 'pea-moth',
      Haferkronenrost: 'oat-rust',
      Rübennematode: 'nematode',
    };
    return map[p] || 'aphid-black';
  }
}
