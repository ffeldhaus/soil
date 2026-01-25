import { GAME_CONSTANTS } from './constants';
import type { CropType, Round, RoundDecision } from './types';

export class AiAgent {
  static makeDecision(level: 'elementary' | 'middle' | 'high', previousRound: Round | undefined): RoundDecision {
    const decision: RoundDecision = {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: {},
    };

    const crops = Object.keys(GAME_CONSTANTS.CROPS) as CropType[];
    const mainCrops: CropType[] = ['Wheat', 'Barley', 'Potato', 'Corn', 'Beet', 'Rapeseed', 'Pea'];

    // 1. Level Specific Strategy
    if (level === 'elementary') {
      // Elementary: Simple conventional farming, random main crops, no machines.
      decision.machines = 0;
      decision.fertilizer = Math.random() > 0.4; // Often fertilize
      decision.pesticide = Math.random() > 0.6;

      for (let i = 0; i < 40; i++) {
        decision.parcels[i] = mainCrops[Math.floor(Math.random() * mainCrops.length)];
      }
    } else if (level === 'middle') {
      // Middle: Follows rotation, basic machine usage, mostly conventional.
      decision.machines = Math.random() > 0.2 ? 1 : 0;
      decision.fertilizer = Math.random() > 0.1; // Mostly fertilize
      decision.pesticide = Math.random() > 0.1; // Mostly use pesticides

      for (let i = 0; i < 40; i++) {
        if (!previousRound || !previousRound.parcelsSnapshot || previousRound.parcelsSnapshot.length === 0) {
          decision.parcels[i] = mainCrops[(i + Math.floor(Math.random() * mainCrops.length)) % mainCrops.length];
        } else {
          const prevCrop = previousRound.parcelsSnapshot[i].crop;
          const goodNext = crops.filter(
            (c) => GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] === 'good' && c !== 'Fallow' && c !== 'Grass',
          );
          if (goodNext.length > 0) {
            decision.parcels[i] = goodNext[Math.floor(Math.random() * goodNext.length)];
          } else {
            const okNext = crops.filter((c) => GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] === 'ok');
            decision.parcels[i] = okNext.length > 0 ? okNext[Math.floor(Math.random() * okNext.length)] : 'Wheat';
          }
        }
      }
    } else if (level === 'high') {
      // High: Strategic. Uses rotation, optimizes machines, considers organic if soil allows.
      const hasParcels = previousRound?.parcelsSnapshot && previousRound.parcelsSnapshot.length === 40;
      const averageSoil = hasParcels ? previousRound.parcelsSnapshot.reduce((acc, p) => acc + p.soil, 0) / 40 : 80;

      // Randomize thresholds slightly to create different AI "personalities"
      const organicThreshold = 95 + Math.random() * 10;
      const machinesThreshold = 85 + Math.random() * 10;

      decision.organic = averageSoil > organicThreshold;
      decision.machines = averageSoil > machinesThreshold ? 2 : 1;

      if (!decision.organic) {
        decision.fertilizer = averageSoil < 115 + Math.random() * 10;
        decision.pesticide = Math.random() > 0.05; // 95% usage
      } else {
        decision.organisms = Math.random() > 0.1; // High organic usage
      }

      for (let i = 0; i < 40; i++) {
        const prevParcel = hasParcels
          ? previousRound!.parcelsSnapshot[i]
          : { soil: 80, nutrition: 80, crop: 'Fallow' as CropType };
        const prevCrop = prevParcel.crop;

        // Condition-based variety
        if (prevParcel.soil < 65 + Math.random() * 10 || prevParcel.nutrition < 55 + Math.random() * 10) {
          const recoveryCrops: CropType[] = ['Fieldbean', 'Pea', 'Fallow'];
          decision.parcels[i] = recoveryCrops[Math.floor(Math.random() * recoveryCrops.length)];
        } else if (decision.organic && i < 8) {
          decision.parcels[i] = Math.random() > 0.2 ? 'Grass' : 'Fallow'; // Variation in organic recovery
        } else {
          const goodNext = mainCrops.filter((c) => GAME_CONSTANTS.ROTATION_MATRIX[prevCrop]?.[c] === 'good');
          if (goodNext.length > 0) {
            decision.parcels[i] = goodNext[Math.floor(Math.random() * goodNext.length)];
          } else {
            const neutralCrops: CropType[] = ['Oat', 'Rye'];
            decision.parcels[i] = neutralCrops[Math.floor(Math.random() * neutralCrops.length)];
          }
        }
      }
    }

    return decision;
  }
}
