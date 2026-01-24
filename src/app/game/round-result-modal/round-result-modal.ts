import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { Round } from '../../types';

@Component({
  selector: 'app-round-result-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './round-result-modal.html',
  styleUrl: './round-result-modal.scss',
})
export class RoundResultModal {
  @Input() round!: Round;
  @Output() resultClosed = new EventEmitter<void>();

  t(key: string): string {
    const translations: Record<string, string> = {
      Normal: 'Normal',
      Drought: 'Dürre',
      SummerDrought: 'Sommerdürre',
      LateFrost: 'Spätfrost',
      Flood: 'Flut',
      Storm: 'Sturm',
      None: 'Keine',
      Pests: 'Schädlinge',
      'aphid-black': 'Schwarze Bohnenlaus',
      'aphid-cereal': 'Getreideblattlaus',
      'potato-beetle': 'Kartoffelkäfer',
      'corn-borer': 'Maiszünsler',
      'pollen-beetle': 'Rapsglanzkäfer',
      'pea-moth': 'Erbsenwickler',
      'oat-rust': 'Haferkronenrost',
      nematode: 'Rübennematode',
      fritfly: 'Fritfliege',
      wireworm: 'Drahtwurm',
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
