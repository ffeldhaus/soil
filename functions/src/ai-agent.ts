import { GAME_CONSTANTS } from './constants';
import type { CropType, Round, RoundDecision } from './types';

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

    for (let i = 0; i < 40; i++) {
      if (!previousRound || !previousRound.parcelsSnapshot || previousRound.parcelsSnapshot.length === 0) {
        const startOffset = Math.floor(strategyVariant * mainCrops.length);
        decision.parcels[i] = mainCrops[(i + startOffset + Math.floor(Math.random() * 3)) % mainCrops.length];
      } else {
        const prevCrop = previousRound.parcelsSnapshot[i].crop;
        let candidates = crops.filter(
          (c) => GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] === 'good' && c !== 'Fallow' && c !== 'Grass',
        );

        if (isLowCapital) {
          candidates = candidates.filter((c) => (GAME_CONSTANTS.CROPS[c]?.laborHours ?? 100) <= 15);
        }

        if (candidates.length > 0) {
          decision.parcels[i] = candidates[Math.floor(Math.random() * candidates.length)];
        } else {
          const okNext = crops.filter((c) => GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] === 'ok');
          decision.parcels[i] = okNext.length > 0 ? okNext[Math.floor(Math.random() * okNext.length)] : 'Wheat';
        }
      }
    }
    return decision;
  }

  private static makeHighDecision(
    decision: RoundDecision,
    previousRound: Round | undefined,
    personality: number,
    strategyVariant: number,
  ): RoundDecision {
    const mainCrops: CropType[] = ['Wheat', 'Barley', 'Potato', 'Corn', 'Beet', 'Rapeseed', 'Pea'];
    const hasParcels = previousRound?.parcelsSnapshot && previousRound.parcelsSnapshot.length === 40;
    const averageSoil = hasParcels ? previousRound.parcelsSnapshot.reduce((acc, p) => acc + p.soil, 0) / 40 : 80;
    const currentCapital = previousRound?.result?.capital ?? 100000;

    const isEcoFriendly = strategyVariant > 0.7;
    const isIndustrialist = strategyVariant < 0.3;
    const isLowCapital = currentCapital < 15000;
    const isCriticallyLow = currentCapital < 5000;

    const organicThreshold = isEcoFriendly ? 85 : isIndustrialist ? 115 : 100;
    decision.organic = averageSoil > organicThreshold + (personality - 0.5) * 10;

    if (isLowCapital) {
      decision.machines = 0;
    } else {
      decision.machines = isIndustrialist ? (averageSoil > 95 ? 2 : 1) : averageSoil > 110 ? 2 : 1;
    }

    if (!decision.organic) {
      decision.fertilizer = averageSoil < 110 + (personality - 0.5) * 20;
      decision.pesticide = Math.random() > (isIndustrialist ? 0.05 : 0.15);
    } else {
      decision.organisms = isCriticallyLow ? false : Math.random() > (isEcoFriendly ? 0.1 : 0.3);
    }

    for (let i = 0; i < 40; i++) {
      const prevParcel = hasParcels
        ? previousRound!.parcelsSnapshot[i]
        : { soil: 80, nutrition: 80, crop: 'Fallow' as CropType };
      const prevCrop = prevParcel.crop;

      const recoveryThreshold = 80 + personality * 10;
      const nutritionThreshold = 70 + personality * 10;

      if (prevParcel.soil < recoveryThreshold || prevParcel.nutrition < nutritionThreshold) {
        // High AI now knows to use Fieldbean for recovery
        // Bias heavily towards Fieldbean/Grass but allow Pea
        const pick = Math.random();
        decision.parcels[i] = pick > 0.3 ? (prevCrop === 'Fieldbean' ? 'Grass' : 'Fieldbean') : 'Pea';
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

    // Mix in legumes for sustainability even when not critical
    if (Math.random() > 0.7) {
      const legumes = candidates.filter((c) => c === 'Pea' || c === 'Fieldbean' || c === 'Oat');
      if (legumes.length > 0) candidates = legumes;
      else if (candidates.length === 0) return 'Pea'; // Force legume if no options
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
    const hasParcels = previousRound?.parcelsSnapshot && previousRound.parcelsSnapshot.length === 40;
    const averageSoil = hasParcels ? previousRound.parcelsSnapshot.reduce((acc, p) => acc + p.soil, 0) / 40 : 80;
    const currentCapital = previousRound?.result?.capital ?? 100000;

    // Perfect AI: Strictly profit-oriented with soil as secondary constraint
    decision.organic = false;

    // Machinery usage - very conservative to ensure profit
    if (currentCapital < 30000) {
      decision.machines = 0; // Don't invest unless we have safety buffer
    } else if (averageSoil > 150 && currentCapital > 300000) {
      decision.machines = 2;
    } else {
      decision.machines = 1;
    }

    decision.fertilizer = averageSoil < 100 && currentCapital > 50000;
    decision.pesticide = currentCapital > 40000; // Only use if we can afford

    // 4. OPTIMAL CROP SELECTION
    for (let i = 0; i < 40; i++) {
      const prevParcel = hasParcels
        ? previousRound!.parcelsSnapshot[i]
        : { soil: 80, nutrition: 80, crop: 'Fallow' as CropType };
      const prevCrop = prevParcel.crop;

      // Perfect recovery logic - prioritize soil stability
      if (prevParcel.soil < 70) {
        decision.parcels[i] = 'Fallow';
      } else if (prevParcel.soil < 85 || prevParcel.nutrition < 70) {
        // Active recovery
        decision.parcels[i] = prevCrop === 'Fieldbean' ? 'Grass' : 'Fieldbean';
      } else {
        // Find best 'good' rotation crop
        let candidates = crops.filter(
          (c) =>
            GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] === 'good' &&
            c !== 'Fallow' &&
            c !== 'Grass' &&
            c !== prevCrop,
        );

        if (candidates.length === 0) {
          candidates = crops.filter(
            (c) =>
              GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] !== 'bad' &&
              c !== prevCrop &&
              c !== 'Fallow' &&
              c !== 'Grass',
          );
        }

        // Gate high-impact crops (Potato/Beet/Corn) behind high soil
        if (prevParcel.soil < 95) {
          candidates = candidates.filter((c) => (GAME_CONSTANTS.CROPS[c]?.soilSensitivity ?? 1) < 1.5);
        }

        if (candidates.length > 0) {
          candidates.sort((a, b) => {
            const configA = GAME_CONSTANTS.CROPS[a];
            const configB = GAME_CONSTANTS.CROPS[b];
            // Simple profit heuristic per hectare
            const profitA = configA.baseYield * configA.marketValue.conventional - configA.seedPrice.conventional;
            const profitB = configB.baseYield * configB.marketValue.conventional - configB.seedPrice.conventional;
            return profitB - profitA;
          });
          decision.parcels[i] = candidates[0];
        } else {
          decision.parcels[i] = 'Wheat';
        }
      }
    }
    return decision;
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
