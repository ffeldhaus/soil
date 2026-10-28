import { GAME_CONSTANTS } from '../../game-constants';
import type { CropType, Round, RoundDecision } from '../../types';

export class AiAgent {
  static makeDecision(
    level: 'elementary' | 'middle' | 'high' | 'perfect',
    previousRound: Round | undefined,
    aiId?: string,
  ): RoundDecision {
    const decision: RoundDecision = {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: {},
    };

    // Use aiId to create a stable personality if provided, otherwise random per round
    const personality = aiId ? AiAgent.seededRandom(`${aiId}${previousRound?.number || 0}`) : Math.random();
    const strategyVariant = aiId ? AiAgent.seededRandom(aiId) : Math.random();

    if (level === 'elementary') {
      return AiAgent.makeElementaryDecision(decision, aiId, strategyVariant);
    }
    if (level === 'middle') {
      return AiAgent.makeMiddleDecision(decision, previousRound, strategyVariant);
    }
    if (level === 'high') {
      return AiAgent.makeHighDecision(decision, previousRound, personality, strategyVariant);
    }
    if (level === 'perfect') {
      return AiAgent.makePerfectDecision(decision, previousRound);
    }

    return decision;
  }

  private static makeElementaryDecision(
    decision: RoundDecision,
    aiId: string | undefined,
    strategyVariant: number,
  ): RoundDecision {
    const mainCrops: CropType[] = ['Wheat', 'Barley', 'Potato', 'Corn', 'Beet', 'Rapeseed', 'Pea'];
    decision.machines = 0;

    const fertThreshold = 0.3 + strategyVariant * 0.4;
    decision.fertilizer = Math.random() > fertThreshold;
    decision.pesticide = Math.random() > 0.5 + strategyVariant * 0.3;

    const preferredCrops = [
      mainCrops[Math.floor(AiAgent.seededRandom(aiId || 'default') * mainCrops.length)],
      mainCrops[Math.floor(AiAgent.seededRandom(`${aiId || 'default'}2`) * mainCrops.length)],
    ];

    for (let i = 0; i < 40; i++) {
      if (strategyVariant < 0.3) {
        decision.parcels[i] = preferredCrops[Math.random() > 0.8 ? 1 : 0];
      } else {
        decision.parcels[i] = mainCrops[Math.floor(Math.random() * mainCrops.length)];
      }
    }
    return decision;
  }

  private static makeMiddleDecision(
    decision: RoundDecision,
    previousRound: Round | undefined,
    strategyVariant: number,
  ): RoundDecision {
    const crops = Object.keys(GAME_CONSTANTS.CROPS) as CropType[];
    const mainCrops: CropType[] = ['Wheat', 'Barley', 'Potato', 'Corn', 'Beet', 'Rapeseed', 'Pea'];
    const currentCapital = previousRound?.result?.capital ?? 100000;
    const isLowCapital = currentCapital < 10000;

    decision.machines = isLowCapital ? 0 : strategyVariant > 0.5 ? 1 : 0;
    decision.fertilizer = Math.random() > 0.15;
    decision.pesticide = Math.random() > 0.2;

    const snapshots = previousRound?.parcelsSnapshot;
    const hasPrev = Boolean(snapshots && snapshots.length > 0);
    const startOffset = Math.floor(strategyVariant * mainCrops.length);

    for (let i = 0; i < 40; i++) {
      decision.parcels[i] = hasPrev
        ? AiAgent.chooseMiddleCropForParcel(snapshots![i].crop, crops, isLowCapital)
        : mainCrops[(i + startOffset + Math.floor(Math.random() * 3)) % mainCrops.length];
    }
    return decision;
  }

  private static chooseMiddleCropForParcel(prevCrop: CropType, crops: CropType[], isLowCapital: boolean): CropType {
    let candidates = crops.filter(
      (c) => GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] === 'good' && c !== 'Fallow' && c !== 'Grass',
    );
    if (isLowCapital) {
      candidates = candidates.filter((c) => (GAME_CONSTANTS.CROPS[c]?.laborHours ?? 100) <= 15);
    }
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    const okNext = crops.filter((c) => GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] === 'ok');
    return okNext.length > 0 ? okNext[Math.floor(Math.random() * okNext.length)] : 'Wheat';
  }

  private static getRoundAverages(previousRound: Round | undefined): {
    hasParcels: boolean;
    averageSoil: number;
    averageNutrition: number;
    currentCapital: number;
  } {
    const hasParcels = Boolean(previousRound?.parcelsSnapshot && previousRound.parcelsSnapshot.length === 40);
    const averageSoil = hasParcels ? previousRound!.parcelsSnapshot.reduce((acc, p) => acc + p.soil, 0) / 40 : 100;
    const averageNutrition = hasParcels
      ? previousRound!.parcelsSnapshot.reduce((acc, p) => acc + p.nutrition, 0) / 40
      : 100;
    const currentCapital = previousRound?.result?.capital ?? 100000;
    return { hasParcels, averageSoil, averageNutrition, currentCapital };
  }

  private static getHighTargetMachines(isLowCapital: boolean, isIndustrialist: boolean, averageSoil: number): number {
    if (isLowCapital) return 0;
    const twoMachineThreshold = isIndustrialist ? 95 : 110;
    return averageSoil > twoMachineThreshold ? 2 : 1;
  }

  private static configureHighInputs(
    decision: RoundDecision,
    averageSoil: number,
    averageNutrition: number,
    currentCapital: number,
    personality: number,
    strategyVariant: number,
  ): { isLowCapital: boolean; isIndustrialist: boolean } {
    const isEcoFriendly = strategyVariant > 0.7;
    const isIndustrialist = strategyVariant < 0.3;
    const isLowCapital = currentCapital < 15000;

    const organicThreshold = isEcoFriendly ? 85 : isIndustrialist ? 115 : 100;
    decision.organic = averageSoil > organicThreshold + (personality - 0.5) * 10;
    decision.machines = AiAgent.getHighTargetMachines(isLowCapital, isIndustrialist, averageSoil);

    if (!decision.organic) {
      decision.fertilizer = averageNutrition < 90 + (personality - 0.5) * 15;
      decision.pesticide = Math.random() > (isIndustrialist ? 0.05 : 0.15);
    } else {
      decision.fertilizer = averageNutrition < 85;
      decision.organisms = currentCapital >= 5000 && Math.random() > (isEcoFriendly ? 0.1 : 0.3);
    }

    return { isLowCapital, isIndustrialist };
  }

  private static makeHighDecision(
    decision: RoundDecision,
    previousRound: Round | undefined,
    personality: number,
    strategyVariant: number,
  ): RoundDecision {
    const mainCrops: CropType[] = ['Wheat', 'Barley', 'Potato', 'Corn', 'Beet', 'Rapeseed', 'Pea'];
    const { hasParcels, averageSoil, averageNutrition, currentCapital } = AiAgent.getRoundAverages(previousRound);
    const { isLowCapital, isIndustrialist } = AiAgent.configureHighInputs(
      decision,
      averageSoil,
      averageNutrition,
      currentCapital,
      personality,
      strategyVariant,
    );

    const recoveryThreshold = 80 + personality * 10;
    const nutritionThreshold = 70 + personality * 10;

    for (let i = 0; i < 40; i++) {
      const prevParcel = hasParcels
        ? previousRound!.parcelsSnapshot[i]
        : { soil: 100, nutrition: 100, crop: 'Fallow' as CropType };
      const prevCrop = prevParcel.crop;

      if (prevParcel.soil < recoveryThreshold || prevParcel.nutrition < nutritionThreshold) {
        const recoveryCrop = prevCrop === 'Fieldbean' ? 'Grass' : 'Fieldbean';
        decision.parcels[i] = Math.random() > 0.3 ? recoveryCrop : 'Pea';
      } else {
        decision.parcels[i] = AiAgent.chooseBestCropForHigh(prevCrop, mainCrops, isLowCapital, isIndustrialist);
      }
    }
    return decision;
  }

  private static chooseBestCropForHigh(
    prevCrop: CropType,
    mainCrops: CropType[],
    isLowCapital: boolean,
    isIndustrialist: boolean,
  ): CropType {
    const crops = Object.keys(GAME_CONSTANTS.CROPS) as CropType[];
    let candidates = mainCrops.filter((c) => GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] === 'good');

    if (candidates.length === 0) {
      candidates = crops.filter(
        (c) =>
          GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] !== 'bad' && c !== prevCrop && c !== 'Fallow' && c !== 'Grass',
      );
    }

    if (Math.random() > 0.7) {
      const legumes = candidates.filter((c) => c === 'Pea' || c === 'Fieldbean' || c === 'Oat');
      if (legumes.length > 0) candidates = legumes;
      else if (candidates.length === 0) return 'Pea';
    }

    if (isLowCapital && Math.random() > 0.2) {
      candidates = candidates.filter((c) => (GAME_CONSTANTS.CROPS[c]?.laborHours ?? 100) <= 20);
    }

    if (isIndustrialist && !isLowCapital) {
      const highValue: CropType[] = ['Potato', 'Corn', 'Beet', 'Wheat'];
      const hvCandidates = candidates.filter((c) => highValue.includes(c));
      if (hvCandidates.length > 0) candidates = hvCandidates;
    }

    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    const neutralCrops: CropType[] = ['Oat', 'Rye'];
    return neutralCrops[Math.floor(Math.random() * neutralCrops.length)];
  }

  private static makePerfectDecision(decision: RoundDecision, previousRound: Round | undefined): RoundDecision {
    const crops = Object.keys(GAME_CONSTANTS.CROPS) as CropType[];
    const { hasParcels, averageSoil, averageNutrition, currentCapital } = AiAgent.getRoundAverages(previousRound);

    decision.organic = false;
    decision.machines = currentCapital < 30000 ? 0 : averageSoil > 150 && currentCapital > 300000 ? 2 : 1;
    decision.fertilizer = averageNutrition < 90 && currentCapital > 50000;
    decision.pesticide = currentCapital > 40000;

    for (let i = 0; i < 40; i++) {
      const prevParcel = hasParcels
        ? previousRound!.parcelsSnapshot[i]
        : { soil: 100, nutrition: 100, crop: 'Fallow' as CropType };
      decision.parcels[i] = AiAgent.choosePerfectCropForParcel(prevParcel, crops);
    }
    return decision;
  }

  private static choosePerfectCropForParcel(
    prevParcel: { soil: number; nutrition: number; crop: CropType },
    crops: CropType[],
  ): CropType {
    const prevCrop = prevParcel.crop;
    if (prevParcel.soil < 65) return 'Fallow';
    if (prevParcel.soil < 75 || prevParcel.nutrition < 60) {
      return prevCrop === 'Fieldbean' ? 'Grass' : 'Fieldbean';
    }

    let candidates = crops.filter(
      (c) =>
        GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] === 'good' && c !== 'Fallow' && c !== 'Grass' && c !== prevCrop,
    );

    if (candidates.length === 0) {
      candidates = crops.filter(
        (c) =>
          GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] !== 'bad' && c !== prevCrop && c !== 'Fallow' && c !== 'Grass',
      );
    }

    if (prevParcel.soil < 95) {
      candidates = candidates.filter((c) => (GAME_CONSTANTS.CROPS[c]?.soilSensitivity ?? 1) < 1.5);
    }

    if (candidates.length === 0) return 'Wheat';

    candidates.sort((a, b) => {
      const configA = GAME_CONSTANTS.CROPS[a];
      const configB = GAME_CONSTANTS.CROPS[b];
      const profitA = configA.baseYield * configA.marketValue.conventional - configA.seedPrice.conventional;
      const profitB = configB.baseYield * configB.marketValue.conventional - configB.seedPrice.conventional;
      return profitB - profitA;
    });
    const pickIndex = Math.random() > 0.8 ? Math.min(candidates.length - 1, 1) : 0;
    return candidates[pickIndex];
  }

  private static seededRandom(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const x = Math.sin(hash) * 10000;
    return x - Math.floor(x);
  }
}
