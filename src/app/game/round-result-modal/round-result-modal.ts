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
      Normal: $localize`:Weather Condition|Standard weather without special effects@@weather.normal:Normal`,
      Drought: $localize`:Weather Condition|Dry weather affecting yields@@weather.drought:Dürre`,
      Flood: $localize`:Weather Condition|Excessive rain affecting yields@@weather.flood:Flut`,
      Storm: $localize`:Weather Condition|Strong winds affecting yields@@weather.storm:Sturm`,
      None: $localize`:Vermin Status|No pest infestation present@@vermin.none:Keine`,
      Pests: $localize`:Vermin Status|Presence of crop-damaging insects@@vermin.pests:Schädlinge`,
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
