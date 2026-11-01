import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { GAME_CONSTANTS, STICKER_DEFINITIONS } from '../../game-constants';
import type { CollectibleSticker, CropType, ParcelRoundFactors, Round } from '../../types';
import { GameAdvisorComponent } from '../advisor/advisor';

export interface LeaderboardEntry {
  uid: string;
  name: string;
  isAi?: boolean;
  score: number;
  prevScore: number;
  rank: number;
  prevRank: number;
  rankDelta: number;
  capital: number;
  avgSoil: number;
  isCurrentPlayer: boolean;
}

@Component({
  selector: 'app-round-result-modal',
  standalone: true,
  imports: [CommonModule, GameAdvisorComponent],
  templateUrl: './round-result-modal.html',
  styleUrl: './round-result-modal.scss',
})
export class RoundResultModal {
  @Input() round!: Round;
  @Input() previousRound?: Round;
  @Input() advisorEnabled = true;
  @Input() leaderboard: LeaderboardEntry[] = [];
  @Input() difficulty: 'easy' | 'normal' | 'hard' = 'normal';
  @Output() resultClosed = new EventEmitter<void>();

  selectedCausalCrop: CropType | null = null;
  readonly Math = Math;

  getCausalCrops(): CropType[] {
    const parcels = (this.round?.parcelsSnapshot || []).filter((p) => p.factors !== undefined);
    if (parcels.length === 0) return [];
    const seen = new Set<CropType>();
    for (const p of parcels) {
      if (p.crop !== 'Fallow' && p.crop !== 'Grass') {
        seen.add(p.crop);
      }
    }
    if (seen.size === 0) {
      for (const p of parcels) {
        seen.add(p.crop);
      }
    }
    return Array.from(seen);
  }

  getActiveCausalCrop(): CropType | null {
    const crops = this.getCausalCrops();
    if (crops.length === 0) return null;
    if (this.selectedCausalCrop && crops.includes(this.selectedCausalCrop)) {
      return this.selectedCausalCrop;
    }
    return crops[0];
  }

  selectCausalCrop(crop: CropType) {
    this.selectedCausalCrop = crop;
  }

  getCropName(crop: CropType): string {
    return GAME_CONSTANTS.CROPS[crop]?.name || crop;
  }

  getCausalFactorsForCrop(crop: CropType | null): ParcelRoundFactors | null {
    if (!crop) return null;
    const parcels = (this.round?.parcelsSnapshot || []).filter((p) => p.crop === crop && p.factors !== undefined);
    if (parcels.length === 0) return null;
    const n = parcels.length;
    const avg = (fn: (f: ParcelRoundFactors) => number) => parcels.reduce((sum, p) => sum + fn(p.factors!), 0) / n;

    return {
      baseYield: Math.round(avg((f) => f.baseYield)),
      soilFactor: avg((f) => f.soilFactor),
      nutritionFactor: avg((f) => f.nutritionFactor),
      weatherFactor: avg((f) => f.weatherFactor),
      pestFactor: avg((f) => f.pestFactor),
      machineBonus: avg((f) => f.machineBonus),
      organicFactor: avg((f) => f.organicFactor),
      soilDelta: {
        cropRotation: Number(avg((f) => f.soilDelta.cropRotation).toFixed(1)),
        humusRecovery: Number(avg((f) => f.soilDelta.humusRecovery).toFixed(1)),
        machineCompaction: Number(avg((f) => f.soilDelta.machineCompaction).toFixed(1)),
        fertilizerImpact: Number(avg((f) => f.soilDelta.fertilizerImpact).toFixed(1)),
        pesticideImpact: Number(avg((f) => f.soilDelta.pesticideImpact).toFixed(1)),
        organismsImpact: Number(avg((f) => f.soilDelta.organismsImpact).toFixed(1)),
        weatherErosion: Number(avg((f) => f.soilDelta.weatherErosion).toFixed(1)),
        total: Number(avg((f) => f.soilDelta.total).toFixed(1)),
      },
      nutritionDelta: {
        cropUptake: Number(avg((f) => f.nutritionDelta.cropUptake).toFixed(1)),
        fertilizerAdd: Number(avg((f) => f.nutritionDelta.fertilizerAdd).toFixed(1)),
        leaching: Number(avg((f) => f.nutritionDelta.leaching).toFixed(1)),
        total: Number(avg((f) => f.nutritionDelta.total).toFixed(1)),
      },
    };
  }

  t(key: string): string {
    if (GAME_CONSTANTS.WEATHER_EFFECTS[key]) {
      return GAME_CONSTANTS.WEATHER_EFFECTS[key].name;
    }
    if (GAME_CONSTANTS.VERMIN_EFFECTS[key]) {
      return GAME_CONSTANTS.VERMIN_EFFECTS[key].name;
    }

    const translations: Record<string, string> = {
      None: 'Keine',
      Pests: 'Schädlinge',
    };
    return translations[key] || key;
  }

  get profit() {
    return this.round.result?.profit ?? 0;
  }

  get capital() {
    return this.round.result?.capital ?? 0;
  }

  get bioSiegel() {
    return this.round.result?.bioSiegel ?? false;
  }

  get subsidies() {
    return this.round.result?.subsidies ?? 0;
  }

  get contractBonus(): number {
    const res = this.round?.result;
    if (!res) return 0;
    if (typeof res.contractBonus === 'number') return res.contractBonus;
    const subAny = res.subsidies as unknown as { contractBonus?: number } | undefined;
    return typeof subAny?.contractBonus === 'number' ? subAny.contractBonus : 0;
  }

  get overdraftInterest(): number {
    const res = this.round?.result;
    if (!res) return 0;
    return res.overdraftInterest ?? res.expenses?.overdraftInterest ?? 0;
  }

  get insolvent(): boolean {
    return Boolean(this.round?.result?.insolvent);
  }

  get income() {
    return this.round.result?.income ?? 0;
  }

  get expenses() {
    return this.round.result?.expenses?.total ?? 0;
  }

  get events() {
    return this.round.result?.events;
  }

  get machineLevel() {
    return this.round.result?.machineRealLevel ?? 0;
  }

  getUnlockedStickerDetails(): CollectibleSticker[] {
    const ids = this.round?.result?.unlockedStickers || [];
    return ids
      .map((id) => STICKER_DEFINITIONS.find((s) => s.id === id))
      .filter((s): s is CollectibleSticker => Boolean(s));
  }

  getCategoryLabel(category: CollectibleSticker['category']): string {
    const labels: Record<CollectibleSticker['category'], string> = {
      soil: 'Boden',
      economy: 'Ökonomie',
      resilience: 'Resilienz',
      mastery: 'Meisterschaft',
    };
    return labels[category] || category;
  }

  onClose() {
    this.resultClosed.emit();
  }
}
