import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { GAME_CONSTANTS } from '../../game-constants';
import type { Round } from '../../types';
import { GameAdvisorComponent } from '../advisor/advisor';

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

  onClose() {
    this.resultClosed.emit();
  }
}
