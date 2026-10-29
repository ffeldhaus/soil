import { CONTRACT_DEFINITIONS, GAME_CONSTANTS } from '../../game-constants';
import type {
  CropType,
  Parcel,
  RegionalContract,
  Round,
  RoundDecision,
  RoundResult,
  WeatherForecast,
  WeatherType,
} from '../../types';

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
      difficulty?: 'easy' | 'normal' | 'hard';
      nextWeather?: WeatherType;
    },
  ): Round {
    const difficulty = options?.difficulty ?? 'normal';
    const previousParcels = previousRound
      ? previousRound.parcelsSnapshot
      : GameEngine.createInitialParcels(options?.difficulty ?? 'easy');
    const parcelupdates: Parcel[] = [];
    const harvestSummary: Record<string, number> = {};

    // Initialize harvest summary for all crops
    Object.keys(GAME_CONSTANTS.CROPS).forEach((cropId) => {
      harvestSummary[cropId] = 0;
    });

    // -- 1. Pre-calculate global factors --
    const numParcels = previousParcels.length;
    const prevAvgSoil = previousParcels.reduce((sum, p) => sum + p.soil, 0) / numParcels;
    const animalParcels = Object.values(decision.parcels).filter((c) => c === 'Grass').length;

    // Machine Decay & Growth Logic
    const { machineLevel, currentMachineLevel } = GameEngine.calculateMachineLevel(
      previousRound?.result?.machineRealLevel ?? 0,
      decision.machines || 0,
    );

    const timeScale = GAME_CONSTANTS.DEFAULT_ROUNDS / totalRounds;
    const costScale = totalRounds / GAME_CONSTANTS.DEFAULT_ROUNDS;

    const bioSiegel = decision.organic && !decision.fertilizer && !decision.pesticide;

    const baseWeather = GAME_CONSTANTS.WEATHER_EFFECTS[events.weather] || GAME_CONSTANTS.WEATHER_EFFECTS.Normal;
    const climateEscalation =
      difficulty === 'hard' && currentRoundNumber > 2 && events.weather !== 'Normal'
        ? 1 + 0.35 * Math.min(1, Math.max(0, (currentRoundNumber - 2) / Math.max(1, totalRounds - 2)))
        : 1.0;
    const weather = {
      ...baseWeather,
      soil: baseWeather.soil < 0 ? baseWeather.soil * climateEscalation : baseWeather.soil,
    };

    const machineYieldBonus = GAME_CONSTANTS.MACHINE_FACTORS.YIELD_BONUS[machineLevel];
    const machineSoilImpact = GAME_CONSTANTS.SOIL.MACHINE_IMPACT[machineLevel];

    const cropParcelCounts: Record<string, number> = {};
    previousParcels.forEach((_, idx) => {
      const c = decision.parcels[idx] || 'Fallow';
      cropParcelCounts[c] = (cropParcelCounts[c] || 0) + 1;
    });

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

      newSoil = prevParcel.soil + soilFactor;

      // B. NUTRITION CALCULATION
      const nutritionGain = GameEngine.calculateNutritionGain(cropKey, decision, animalParcels, numParcels) * timeScale;
      newNutrition = GameEngine.calculateNutritionUpdate(
        prevParcel.nutrition,
        nutritionGain,
        cropKey,
        newSoil,
        timeScale,
      );

      // C. HARVEST CALCULATION
      let yieldAmount = 0;
      if (cropKey !== 'Fallow' && cropKey !== 'Grass' && cropConfig) {
        const cropShare = (cropParcelCounts[cropKey] || 1) / numParcels;
        yieldAmount = GameEngine.calculateYield(
          cropConfig,
          prevParcel.soil,
          prevParcel.nutrition,
          events,
          decision,
          weather,
          machineYieldBonus,
          climateEscalation,
          cropShare,
        );

        const harvestIntensity = yieldAmount / cropConfig.baseYield;
        newNutrition -=
          harvestIntensity * GAME_CONSTANTS.NUTRITION.BASE_DECLINE * GAME_CONSTANTS.NUTRITION.START * timeScale;

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

    const avgSoil = parcelupdates.reduce((sum, p) => sum + p.soil, 0) / numParcels;
    const avgNutrition = parcelupdates.reduce((sum, p) => sum + p.nutrition, 0) / numParcels;
    const roundedAvgSoil = Math.round(avgSoil);
    const roundedAvgNutrition = Math.round(avgNutrition);

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
      timeScale,
      currentCapital,
      currentRoundNumber,
      roundedAvgSoil,
      difficulty,
      options,
    );

    result.sustainabilityScore = GameEngine.calculateSustainabilityScore(result.capital, avgSoil);
    result.unlockedStickers = GameEngine.evaluateRoundStickers(
      previousParcels,
      decision,
      events,
      result,
      avgSoil,
      prevAvgSoil,
      previousRound !== undefined,
    );

    const nextWeather = options?.nextWeather ?? GameEngine.rollWeather(currentRoundNumber + 1, totalRounds, difficulty);
    const weatherForecast = GameEngine.generateWeatherForecast(currentRoundNumber + 1, nextWeather, difficulty);
    const activeContract = GameEngine.getActiveContract(currentRoundNumber + 1, timeScale) ?? undefined;

    return {
      number: currentRoundNumber,
      decision,
      result,
      parcelsSnapshot: parcelupdates,
      avgSoil: roundedAvgSoil,
      avgNutrition: roundedAvgNutrition,
      nextWeather,
      weatherForecast,
      activeContract,
    };
  }

  static createInitialParcels(difficulty: 'easy' | 'normal' | 'hard' = 'easy', seedIndex = 0): Parcel[] {
    if (difficulty === 'easy') {
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

    const soilZones = difficulty === 'hard' ? [76, 88, 100, 112, 124] : [88, 94, 100, 106, 112];
    const nutritionZones = difficulty === 'hard' ? [80, 90, 100, 110, 120] : [90, 95, 100, 105, 110];
    const shift = Math.abs(seedIndex) % 5;

    return Array(40)
      .fill(null)
      .map((_, i) => {
        const row = Math.floor(i / 8);
        const soilIdx = (row * 2 + shift) % 5;
        const nutrIdx = (row * 2 + 1 + shift) % 5;
        return {
          index: i,
          crop: 'Fallow',
          soil: soilZones[soilIdx],
          nutrition: nutritionZones[nutrIdx],
          yield: 0,
        };
      });
  }

  static seededRandom(seed: string, key: string): number {
    const input = `${seed}:${key}`;
    let h = 2166136261 >>> 0;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
  }

  static rollWeather(
    roundNumber: number,
    totalRounds = GAME_CONSTANTS.DEFAULT_ROUNDS,
    difficulty: 'easy' | 'normal' | 'hard' = 'normal',
    randomValue = Math.random(),
    seed?: string,
  ): WeatherType {
    if (roundNumber <= 2) {
      return 'Normal';
    }

    const r = seed ? GameEngine.seededRandom(seed, `weather:${roundNumber}`) : randomValue;

    const progress =
      difficulty === 'hard' ? Math.min(1, Math.max(0, (roundNumber - 2) / Math.max(1, totalRounds - 2))) : 0;
    const normalProb = Math.max(0.1, 0.35 - 0.25 * progress);
    const extremeScale = (1 - normalProb) / 0.65;

    const droughtProb = 0.2 * extremeScale;
    const heatWaveProb = 0.15 * extremeScale;
    const lateFrostProb = 0.12 * extremeScale;
    const stormProb = 0.1 * extremeScale;

    if (r < normalProb) return 'Normal';
    if (r < normalProb + droughtProb) return 'Drought';
    if (r < normalProb + droughtProb + heatWaveProb) return 'HeatWave';
    if (r < normalProb + droughtProb + heatWaveProb + lateFrostProb) return 'LateFrost';
    if (r < normalProb + droughtProb + heatWaveProb + lateFrostProb + stormProb) return 'Storm';
    return 'Flood';
  }

  static rollRoundEvents(
    roundNumber: number,
    totalRounds = GAME_CONSTANTS.DEFAULT_ROUNDS,
    difficulty: 'easy' | 'normal' | 'hard' = 'normal',
    preRolledWeather?: WeatherType,
    seed?: string,
  ): { weather: WeatherType; vermin: string[] } {
    if (roundNumber <= 2) {
      return { weather: 'Normal', vermin: [] };
    }

    const weather = preRolledWeather ?? GameEngine.rollWeather(roundNumber, totalRounds, difficulty, undefined, seed);
    const vermin: string[] = [];
    const pestRoll = seed ? GameEngine.seededRandom(seed, `pestCount:${roundNumber}`) : Math.random();
    const numPests = pestRoll < 0.2 ? 0 : pestRoll < 0.6 ? 1 : 2;

    if (numPests > 0) {
      const availablePests = [
        'aphid-black',
        'aphid-cereal',
        'potato-beetle',
        'corn-borer',
        'pollen-beetle',
        'pea-moth',
        'oat-rust',
        'nematode',
        'swine-fever',
      ];
      for (let i = 0; i < numPests; i++) {
        const pickRoll = seed ? GameEngine.seededRandom(seed, `pestPick:${roundNumber}:${i}`) : Math.random();
        const p = availablePests[Math.floor(pickRoll * availablePests.length)];
        if (!vermin.includes(p)) vermin.push(p);
      }
    }

    return { weather, vermin };
  }

  static generateWeatherForecast(
    nextRoundNumber: number,
    targetWeather: WeatherType,
    difficulty: 'easy' | 'normal' | 'hard' = 'normal',
  ): WeatherForecast {
    if (nextRoundNumber <= 2) {
      return {
        hintText: 'Ruhige Wetterlage erwartet.',
        likelyWeathers: ['Normal'],
        confidence: 'exact',
      };
    }

    const labelMap: Record<WeatherType, string> = {
      Normal: 'Ruhige Wetterlage',
      Drought: 'Dürre',
      HeatWave: 'Hitzewelle',
      LateFrost: 'Spätfrost',
      Storm: 'Sturm',
      Flood: 'Starkregen',
    };

    if (difficulty === 'easy') {
      return {
        hintText: `${labelMap[targetWeather] || labelMap.Normal} erwartet.`,
        likelyWeathers: [targetWeather],
        confidence: 'exact',
      };
    }

    if (difficulty === 'normal') {
      const canonicalOrder: WeatherType[] = ['Normal', 'Drought', 'HeatWave', 'LateFrost', 'Storm', 'Flood'];
      const alternatives = canonicalOrder.filter((w) => w !== targetWeather);
      const altWeather =
        alternatives[(nextRoundNumber * 3 + canonicalOrder.indexOf(targetWeather)) % alternatives.length];
      const likelyWeathers = canonicalOrder.filter((w) => w === targetWeather || w === altWeather);
      const names = likelyWeathers.map((w) => labelMap[w] || w);
      return {
        hintText: `${names.join(' oder ')} möglich.`,
        likelyWeathers,
        confidence: 'tendency',
      };
    }

    return {
      hintText: 'Wechselhafte Wetterlage möglich.',
      likelyWeathers: [],
      confidence: 'uncertain',
    };
  }

  static getActiveContract(roundNumber: number, timeScale = 1): RegionalContract | null {
    if (roundNumber < 2) return null;
    const totalRounds = Math.round(GAME_CONSTANTS.DEFAULT_ROUNDS / Math.max(0.2, timeScale));
    const interval = totalRounds > 20 ? 3 : 2;
    if ((roundNumber - 2) % interval !== 0) return null;

    const contractSlot = Math.floor((roundNumber - 2) / interval);
    const contractIndex = contractSlot % CONTRACT_DEFINITIONS.length;
    const baseContract = CONTRACT_DEFINITIONS[contractIndex];
    return {
      ...baseContract,
      reward: Math.round(baseContract.reward * timeScale),
    };
  }

  static evaluateContractFulfillment(
    contractId: string,
    parcels: Parcel[],
    decision: RoundDecision,
    avgSoil: number,
  ): boolean {
    switch (contractId) {
      case 'legume-initiative': {
        const count = parcels.filter((p) => p.crop === 'Fieldbean' || p.crop === 'Pea').length;
        return count >= 6;
      }
      case 'humus-steward': {
        const greenCount = parcels.filter((p) => p.crop === 'Grass' || p.crop === 'Fallow').length;
        return avgSoil >= 100 && greenCount >= 5;
      }
      case 'regional-grain': {
        const grainParcels = parcels.filter(
          (p) => p.crop === 'Rye' || p.crop === 'Wheat' || p.crop === 'Barley' || p.crop === 'Oat',
        );
        const distinctGrainTypes = new Set(grainParcels.map((p) => p.crop));
        return grainParcels.length >= 12 && distinctGrainTypes.size >= 2 && avgSoil >= 95;
      }
      case 'eco-pioneer': {
        const cultivatedCount = parcels.filter((p) => p.crop !== 'Fallow').length;
        return !decision.pesticide && cultivatedCount >= 30 && avgSoil >= 95;
      }
      default:
        return false;
    }
  }

  static calculateSustainabilityScore(capital: number, avgSoil: number): number {
    const financialPoints = GameEngine.getFinancialScorePoints(capital);
    const soilPoints = avgSoil <= 100 ? Math.max(0, (avgSoil - 50) * 10) : 500 + (avgSoil - 100) * 18;
    const soilViability = GameEngine.getSoilViabilityMultiplier(avgSoil);
    const capitalViability = GameEngine.getCapitalViabilityMultiplier(capital);
    return Math.round((financialPoints + soilPoints) * soilViability * capitalViability);
  }

  private static getFinancialScorePoints(capital: number): number {
    if (capital < 0) return Math.max(0, 350 + capital / 150);
    if (capital < 100000) return 350 + (capital / 100000) * 150;
    return 500 + Math.sqrt((capital - 100000) / 1000) * 15;
  }

  private static getSoilViabilityMultiplier(avgSoil: number): number {
    if (avgSoil < 75) return 0.45;
    if (avgSoil < 85) return 0.7;
    if (avgSoil < 95) return 0.85 + ((avgSoil - 85) / 10) * 0.15;
    return 1.0;
  }

  private static getCapitalViabilityMultiplier(capital: number): number {
    if (capital < -50000) return 0.35;
    if (capital < 0) return 0.65;
    if (capital < 50000) return 0.85 + (capital / 50000) * 0.15;
    return 1.0;
  }

  static evaluateRoundStickers(
    previousParcels: Parcel[],
    decision: RoundDecision,
    events: { weather: string; vermin: string[] },
    result: RoundResult,
    avgSoil: number,
    prevAvgSoil: number,
    hasPreviousRound = true,
  ): string[] {
    const severeWeather = ['Drought', 'HeatWave', 'Flood', 'LateFrost'].includes(events.weather);
    const rules: [string, boolean][] = [
      ['humus-pionier', avgSoil >= 105],
      ['fruchtfolge-meister', hasPreviousRound && GameEngine.countOptimalRotations(previousParcels, decision) >= 25],
      ['krisenfest', severeWeather && result.profit > 5000],
      ['bio-leuchtturm', Boolean(result.bioSiegel && result.profit > 0 && avgSoil >= 98)],
      ['vertrags-partner', (result.contractBonus ?? 0) > 0],
      ['boden-retter', hasPreviousRound && avgSoil - prevAvgSoil >= 1.0],
      ['nuetzlings-allianz', Boolean(events.vermin.length > 0 && decision.organisms && !decision.pesticide)],
      ['zukunfts-hof', hasPreviousRound && avgSoil >= 95 && (result.sustainabilityScore ?? 0) >= 1150],
    ];
    return rules.filter(([, earned]) => earned).map(([id]) => id);
  }

  private static countOptimalRotations(previousParcels: Parcel[], decision: RoundDecision): number {
    return previousParcels.filter((prevP, idx) => {
      const nextCrop = (decision.parcels[idx] || 'Fallow') as CropType;
      return (
        prevP.crop !== 'Fallow' &&
        nextCrop !== 'Fallow' &&
        prevP.crop !== nextCrop &&
        GAME_CONSTANTS.ROTATION_MATRIX[prevP.crop]?.[nextCrop] === 'good'
      );
    }).length;
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
    let soilFactor =
      GameEngine.calculateCropSoilDelta(prevParcel, cropKey, timeScale) +
      GameEngine.calculateRotationSoilDelta(prevParcel, cropKey, timeScale);

    if (decision.fertilizer) soilFactor += GAME_CONSTANTS.SOIL.FERTILIZER_SYNTHETIC_IMPACT * timeScale;
    if (decision.pesticide) soilFactor += GAME_CONSTANTS.SOIL.PESTICIDE_IMPACT * timeScale;

    soilFactor += (machineSoilImpact + weather.soil) * timeScale;

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

  private static calculateCropSoilDelta(prevParcel: Parcel, cropKey: CropType, timeScale: number): number {
    let delta = 0;
    if (GAME_CONSTANTS.SOIL.PLANTATION_GAINS[cropKey]) {
      const soilRatio = prevParcel.soil / GAME_CONSTANTS.SOIL.START;
      const gainMultiplier = soilRatio > 1.5 ? 0.2 : soilRatio > 1.2 ? 0.5 : 1.0;
      delta += GAME_CONSTANTS.SOIL.PLANTATION_GAINS[cropKey] * gainMultiplier * timeScale;
    }
    if (GAME_CONSTANTS.SOIL.PLANTATION_LOSSES[cropKey]) {
      delta += GAME_CONSTANTS.SOIL.PLANTATION_LOSSES[cropKey] * timeScale;
    }
    if (cropKey === 'Fallow') {
      const diff = Math.max(GAME_CONSTANTS.SOIL.START - prevParcel.soil, 0);
      delta += (diff / GAME_CONSTANTS.SOIL.START) * GAME_CONSTANTS.SOIL.FALLOW_RECOVERY * 10 * timeScale;
    }
    return delta;
  }

  private static calculateRotationSoilDelta(prevParcel: Parcel, cropKey: CropType, timeScale: number): number {
    let delta = 0;
    const prevCrop = prevParcel.crop;
    const sequenceQuality = GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[cropKey] || 'ok';
    if (sequenceQuality === 'good' && !(prevCrop === 'Fallow' && cropKey === 'Fallow')) {
      const soilRatio = prevParcel.soil / GAME_CONSTANTS.SOIL.START;
      const bonusMultiplier = soilRatio > 1.2 ? 0.5 : 1.0;
      delta += GAME_CONSTANTS.SOIL.CROP_ROTATION_BONUS * bonusMultiplier * timeScale;
    }
    if (sequenceQuality === 'bad') {
      delta += GAME_CONSTANTS.SOIL.CROP_ROTATION_PENALTY * timeScale;
    }
    if (prevCrop === cropKey && cropKey !== 'Fallow' && cropKey !== 'Grass') {
      delta += GAME_CONSTANTS.SOIL.MONOCULTURE_PENALTY * timeScale;
    }
    return delta;
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
    timeScale: number,
  ): number {
    if (cropKey === 'Fallow' || cropKey === 'Grass') {
      if (prevNutrition > GAME_CONSTANTS.NUTRITION.START) {
        const recoverySpeed = 0.1 * timeScale;
        return prevNutrition * (1 - recoverySpeed) + GAME_CONSTANTS.NUTRITION.START * recoverySpeed;
      }
      return prevNutrition + 5 * timeScale;
    }
    const uptakeEfficiency = Math.max(0.2, Math.min(1.2, newSoil / GAME_CONSTANTS.SOIL.START));
    return prevNutrition + nutritionGain * uptakeEfficiency;
  }

  static calculatePestIntensityMultiplier(cropShare: number): number {
    const {
      DIVERSITY_THRESHOLD_SHARE,
      MONOCULTURE_THRESHOLD_SHARE,
      DIVERSE_INTENSITY_MULTIPLIER,
      MONOCULTURE_INTENSITY_MULTIPLIER,
    } = GAME_CONSTANTS.PEST_INTENSITY;
    if (cropShare <= DIVERSITY_THRESHOLD_SHARE) {
      return DIVERSE_INTENSITY_MULTIPLIER;
    }
    if (cropShare >= MONOCULTURE_THRESHOLD_SHARE) {
      return MONOCULTURE_INTENSITY_MULTIPLIER;
    }
    const progress =
      (cropShare - DIVERSITY_THRESHOLD_SHARE) / (MONOCULTURE_THRESHOLD_SHARE - DIVERSITY_THRESHOLD_SHARE);
    return DIVERSE_INTENSITY_MULTIPLIER + progress * (MONOCULTURE_INTENSITY_MULTIPLIER - DIVERSE_INTENSITY_MULTIPLIER);
  }

  private static calculatePestImpact(
    cropConfig: any,
    events: { vermin: string[] },
    decision: RoundDecision,
    cropShare: number,
  ): number {
    const cropPestKey = GameEngine.getPestKey(cropConfig.pest);
    if (!events.vermin.includes(cropPestKey)) {
      return 1.0;
    }
    const {
      BASE_PENALTY,
      ORGANIC_MULTIPLIER,
      PESTICIDE_YIELD_FACTOR,
      ORGANISMS_YIELD_FACTOR,
      ORGANISMS_DIVERSITY_BONUS,
      DIVERSITY_THRESHOLD_SHARE,
    } = GAME_CONSTANTS.PEST_INTENSITY;
    if (decision.pesticide) {
      return PESTICIDE_YIELD_FACTOR;
    }
    if (decision.organisms) {
      const diversityBonus = cropShare <= DIVERSITY_THRESHOLD_SHARE ? ORGANISMS_DIVERSITY_BONUS : 0;
      return Math.min(PESTICIDE_YIELD_FACTOR, ORGANISMS_YIELD_FACTOR + diversityBonus);
    }
    const organicMultiplier = decision.organic ? ORGANIC_MULTIPLIER : 1.0;
    const intensityMultiplier = GameEngine.calculatePestIntensityMultiplier(cropShare);
    return Math.max(0, 1.0 - BASE_PENALTY * organicMultiplier * intensityMultiplier);
  }

  private static calculateWeatherYieldEffect(
    cropConfig: any,
    events: { weather: string },
    weather: { yield: number },
    climateEscalation: number,
  ): number {
    if (weather.yield >= 1.0) {
      return weather.yield;
    }
    const penalty = 1.0 - weather.yield;
    const sensitivityLevel = GameEngine.getWeatherSensitivityLevel(cropConfig, events.weather);
    const sensitivityMultiplierMap: Record<string, number> = { Stark: 1.0, Mäßig: 0.6, Gering: 0.3, Keine: 0 };
    const multiplier = sensitivityMultiplierMap[sensitivityLevel] ?? 0.6;
    return Math.max(0, 1.0 - penalty * multiplier * climateEscalation);
  }

  private static getWeatherSensitivityLevel(cropConfig: any, weatherType: string): string {
    if (weatherType === 'Drought' || weatherType === 'HeatWave') {
      return cropConfig.weatherSensitivity.drought;
    }
    if (weatherType === 'LateFrost') {
      return cropConfig.weatherSensitivity.cold;
    }
    if (weatherType === 'Flood' || weatherType === 'Storm') {
      return cropConfig.weatherSensitivity.flood;
    }
    return 'Mäßig';
  }

  private static calculateYield(
    cropConfig: any,
    newSoil: number,
    newNutrition: number,
    events: { vermin: string[]; weather: string },
    decision: RoundDecision,
    weather: { yield: number },
    machineYieldBonus: number,
    climateEscalation = 1.0,
    cropShare = 1.0,
  ): number {
    const soilEffect = Math.min(
      1.2,
      (Math.max(0, newSoil) / GAME_CONSTANTS.SOIL.START) ** (cropConfig.soilSensitivity || 1),
    );
    const nutritionEffect = Math.min(
      1.2,
      (Math.max(0, newNutrition) / GAME_CONSTANTS.NUTRITION.START) ** (cropConfig.nutritionSensitivity || 1),
    );
    const pestImpact = GameEngine.calculatePestImpact(cropConfig, events, decision, cropShare);
    const weatherYieldEffect = GameEngine.calculateWeatherYieldEffect(cropConfig, events, weather, climateEscalation);

    let yieldAmount =
      cropConfig.baseYield * soilEffect * nutritionEffect * weatherYieldEffect * pestImpact * (1 + machineYieldBonus);
    if (decision.organic) yieldAmount *= 0.4;
    return yieldAmount;
  }

  private static tallySeedsAndCropCounts(
    parcelupdates: Parcel[],
    isOrganic: boolean,
  ): { seedCost: number; cropCounts: Record<string, number> } {
    let seedCost = 0;
    const cropCounts: Record<string, number> = {};

    for (const p of parcelupdates) {
      if (!p.crop) continue;
      cropCounts[p.crop] = (cropCounts[p.crop] || 0) + 1;
      if (p.crop !== 'Fallow' && p.crop !== 'Grass') {
        const cropConfig = GAME_CONSTANTS.CROPS[p.crop];
        if (cropConfig) {
          seedCost += isOrganic ? cropConfig.seedPrice.organic : cropConfig.seedPrice.conventional;
        }
      }
    }

    return { seedCost, cropCounts };
  }

  private static calculateEfficientLaborHours(cropCounts: Record<string, number>): number {
    let efficientLaborHours = 0;
    for (const [crop, count] of Object.entries(cropCounts)) {
      const unitHours =
        crop === 'Grass'
          ? GAME_CONSTANTS.CROPS.Grass.laborHours || 0
          : crop === 'Fallow'
            ? 2
            : GAME_CONSTANTS.CROPS[crop as CropType]?.laborHours || 0;
      const efficiencyFactor = Math.max(0.7, 1.0 - (count - 1) * 0.0077);
      efficientLaborHours += count * unitHours * efficiencyFactor;
    }
    return efficientLaborHours;
  }

  private static resolveCropSalePrice(
    cropKey: string,
    cropConfig: any,
    decision: RoundDecision,
    bioSiegel: boolean,
    marketPrices?: Record<string, { organic: number; conventional: number }>,
  ): number {
    const isFixed = Boolean(decision.priceFixing?.[cropKey]);
    const customPrice = marketPrices?.[cropKey];
    if (isFixed || !customPrice) {
      const basePrice = bioSiegel ? cropConfig.marketValue.organic : cropConfig.marketValue.conventional;
      return isFixed && customPrice ? basePrice * 0.95 : basePrice;
    }
    return bioSiegel ? customPrice.organic : customPrice.conventional;
  }

  private static calculateHarvestIncome(
    harvestSummary: Record<CropType, number>,
    decision: RoundDecision,
    bioSiegel: boolean,
    marketPrices?: Record<string, { organic: number; conventional: number }>,
  ): { income: number; marketPricesUsed: Record<string, number> } {
    let income = 0;
    const marketPricesUsed: Record<string, number> = {};
    for (const [cropKey, amount] of Object.entries(harvestSummary)) {
      const cropConfig = GAME_CONSTANTS.CROPS[cropKey];
      if (!cropConfig) continue;
      const price = GameEngine.resolveCropSalePrice(cropKey, cropConfig, decision, bioSiegel, marketPrices);
      income += amount * price;
      marketPricesUsed[cropKey] = price;
    }
    return { income, marketPricesUsed };
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
    timeScale: number,
    currentCapital: number,
    currentRoundNumber: number,
    avgSoil: number,
    difficulty: 'easy' | 'normal' | 'hard',
    options?: { marketPrices?: Record<string, { organic: number; conventional: number }> },
  ): RoundResult {
    const { seedCost, cropCounts } = GameEngine.tallySeedsAndCropCounts(parcelupdates, decision.organic);
    const totalLaborHours = GameEngine.calculateEfficientLaborHours(cropCounts);

    const laborCost =
      GAME_CONSTANTS.MACHINE_FACTORS.PERSONNEL_COST +
      totalLaborHours * GAME_CONSTANTS.MACHINE_FACTORS.LABOR_COST_PER_HOUR;
    const machineInvestment =
      GAME_CONSTANTS.MACHINE_FACTORS.INVESTMENT_COST[Math.round(decision.machines || 0)] * costScale;
    const machineMaintenance = GAME_CONSTANTS.MACHINE_FACTORS.MAINTENANCE_COST[machineLevel];
    const runningCost =
      (decision.organic ? GAME_CONSTANTS.EXPENSES.RUNNING.ORGANIC_CONTROL : 0) + machineMaintenance + laborCost;
    let animalMaintenance = animalParcels * GAME_CONSTANTS.EXPENSES.RUNNING.ANIMALS * timeScale;
    if (events.vermin.includes('swine-fever')) {
      animalMaintenance *= 2.0; // Significant increase due to hygiene and restriction zones
    }
    const suppliesCost =
      (decision.fertilizer ? numParcels * GAME_CONSTANTS.EXPENSES.RUNNING.FERTILIZE * timeScale : 0) +
      (decision.pesticide ? numParcels * GAME_CONSTANTS.EXPENSES.RUNNING.PESTICIDE * timeScale : 0) +
      (decision.organisms ? numParcels * GAME_CONSTANTS.EXPENSES.RUNNING.ORGANISMS * timeScale : 0);

    const overdraftRate = difficulty === 'hard' ? 0.1 : difficulty === 'normal' ? 0.06 : 0;
    const overdraftInterest =
      currentCapital < 0 && overdraftRate > 0 ? Math.round(Math.abs(currentCapital) * overdraftRate * timeScale) : 0;

    const totalExpenses =
      seedCost + machineInvestment + runningCost + animalMaintenance + suppliesCost + overdraftInterest;

    // Subsidies Calculation
    const greenParcels = parcelupdates.filter((p) => p.crop === 'Fallow' || p.crop === 'Grass').length;
    const greenStripParcels = Math.min(greenParcels, GAME_CONSTANTS.SUBSIDIES.GREEN_STRIP_MAX_PARCELS);
    const regularParcels = numParcels - greenStripParcels;
    const bioEligibleParcels = parcelupdates.filter((p) => p.crop !== 'Fallow').length;

    const activeContract = GameEngine.getActiveContract(currentRoundNumber, timeScale);
    const contractBonus =
      activeContract && GameEngine.evaluateContractFulfillment(activeContract.id, parcelupdates, decision, avgSoil)
        ? activeContract.reward
        : 0;

    const subsidies =
      regularParcels * GAME_CONSTANTS.SUBSIDIES.BASE +
      greenStripParcels * GAME_CONSTANTS.SUBSIDIES.GREEN_STRIP +
      (bioSiegel ? bioEligibleParcels * GAME_CONSTANTS.SUBSIDIES.BIO : 0) +
      contractBonus;

    const { income, marketPricesUsed } = GameEngine.calculateHarvestIncome(
      harvestSummary,
      decision,
      bioSiegel,
      options?.marketPrices,
    );

    const profit = income + subsidies - totalExpenses;
    const finalCapital = currentCapital + profit;
    const insolvent = difficulty !== 'easy' && finalCapital < -50000;

    return {
      profit,
      capital: finalCapital,
      harvestSummary,
      expenses: {
        seeds: seedCost,
        labor: laborCost,
        running: runningCost + animalMaintenance - laborCost,
        investments: machineInvestment + suppliesCost,
        overdraftInterest,
        total: totalExpenses,
      },
      income,
      subsidies,
      contractBonus,
      overdraftInterest,
      insolvent,
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
      Rübennematode: 'nematode',
      Haferkronenrost: 'oat-rust',
      'Afrikanische Schweinepest': 'swine-fever',
    };
    return map[p] || 'aphid-black';
  }
}
