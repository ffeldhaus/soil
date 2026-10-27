import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { GAME_CONSTANTS, STICKER_DEFINITIONS } from '../../game-constants';
import type { CollectibleSticker, Round } from '../../types';
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
