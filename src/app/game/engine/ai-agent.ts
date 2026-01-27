import { GAME_CONSTANTS } from '../../game-constants';
import type { CropType, Round, RoundDecision } from '../../types';

export class AiAgent {
  static makeDecision(
    level: 'elementary' | 'middle' | 'high',
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
    const crops = Object.keys(GAME_CONSTANTS.CROPS) as CropType[];
    const mainCrops: CropType[] = ['Wheat', 'Barley', 'Potato', 'Corn', 'Beet', 'Rapeseed', 'Pea'];
    const hasParcels = previousRound?.parcelsSnapshot && previousRound.parcelsSnapshot.length === 40;
    const averageSoil = hasParcels ? previousRound.parcelsSnapshot.reduce((acc, p) => acc + p.soil, 0) / 40 : 80;
    const currentCapital = previousRound?.result?.capital ?? 100000;

    const isEcoFriendly = strategyVariant > 0.7;
    const isIndustrialist = strategyVariant < 0.3;

    // Capital-conscious decision making
    const isLowCapital = currentCapital < 20000;
    const isCriticallyLow = currentCapital < 5000;

    const organicThreshold = isEcoFriendly ? 85 : isIndustrialist ? 115 : 100;
    decision.organic = averageSoil > organicThreshold + (personality - 0.5) * 10;

    if (isLowCapital) {
      decision.machines = 0; // Cut costs
    } else {
      decision.machines = isIndustrialist ? (averageSoil > 80 ? 2 : 1) : averageSoil > 95 ? 2 : 1;
    }

    if (!decision.organic) {
      decision.fertilizer = averageSoil < 110 + (personality - 0.5) * 20;
      decision.pesticide = Math.random() > (isIndustrialist ? 0.02 : 0.1);
    } else {
      decision.organisms = isCriticallyLow ? false : Math.random() > (isEcoFriendly ? 0.05 : 0.2);
    }

    for (let i = 0; i < 40; i++) {
      const prevParcel = hasParcels
        ? previousRound!.parcelsSnapshot[i]
        : { soil: 80, nutrition: 80, crop: 'Fallow' as CropType };
      const prevCrop = prevParcel.crop;

      const recoveryThreshold = 75 + personality * 10;
      const nutritionThreshold = 65 + personality * 10;

      if (prevParcel.soil < recoveryThreshold || prevParcel.nutrition < nutritionThreshold) {
        const recoveryCrops: CropType[] = isEcoFriendly ? ['Fieldbean', 'Pea', 'Grass'] : ['Fieldbean', 'Fallow'];
        decision.parcels[i] = recoveryCrops[Math.floor(Math.random() * recoveryCrops.length)];
      } else if (decision.organic && i < 12 && isEcoFriendly) {
        decision.parcels[i] = Math.random() > 0.3 ? 'Grass' : 'Fieldbean';
      } else {
        let candidates = mainCrops.filter((c) => GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] === 'good');

        if (candidates.length === 0) {
          candidates = crops.filter(
            (c) =>
              GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] !== 'bad' &&
              c !== prevCrop &&
              c !== 'Fallow' &&
              c !== 'Grass',
          );
        }

        // Filter high-labor crops if capital is low
        if (isLowCapital) {
          candidates = candidates.filter((c) => (GAME_CONSTANTS.CROPS[c]?.laborHours ?? 100) <= 15);
        }

        if (isIndustrialist && !isLowCapital) {
          const highValue: CropType[] = ['Potato', 'Corn', 'Beet', 'Wheat'];
          const hvCandidates = candidates.filter((c) => highValue.includes(c));
          if (hvCandidates.length > 0) candidates = hvCandidates;
        }

        if (candidates.length > 0) {
          decision.parcels[i] = candidates[Math.floor(Math.random() * candidates.length)];
        } else {
          const neutralCrops: CropType[] = ['Oat', 'Rye'];
          decision.parcels[i] = neutralCrops[Math.floor(Math.random() * neutralCrops.length)];
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
