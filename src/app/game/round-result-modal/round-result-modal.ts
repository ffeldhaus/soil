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
      SummerDrought: $localize`:Weather Condition|Severe summer drought@@weather.summerDrought:Sommerdürre`,
      LateFrost: $localize`:Weather Condition|Late frost in spring@@weather.lateFrost:Spätfrost`,
      Flood: $localize`:Weather Condition|Excessive rain affecting yields@@weather.flood:Flut`,
      Storm: $localize`:Weather Condition|Strong winds affecting yields@@weather.storm:Sturm`,
      None: $localize`:Vermin Status|No pest infestation present@@vermin.none:Keine`,
      Pests: $localize`:Vermin Status|Presence of crop-damaging insects@@vermin.pests:Schädlinge`,
      'aphid-black': $localize`:Pest Name|Black bean aphid@@pest.aphid-black:Schwarze Bohnenlaus`,
      'aphid-cereal': $localize`:Pest Name|Cereal aphid@@pest.aphid-cereal:Getreideblattlaus`,
      'potato-beetle': $localize`:Pest Name|Colorado potato beetle@@pest.potato-beetle:Kartoffelkäfer`,
      'corn-borer': $localize`:Pest Name|European corn borer@@pest.corn-borer:Maiszünsler`,
      'pollen-beetle': $localize`:Pest Name|Pollen beetle@@pest.pollen-beetle:Rapsglanzkäfer`,
      'pea-moth': $localize`:Pest Name|Pea moth@@pest.pea-moth:Erbsenwickler`,
      'oat-rust': $localize`:Pest Name|Oat crown rust@@pest.oat-rust:Haferkronenrost`,
      nematode: $localize`:Pest Name|Beet nematode@@pest.nematode:Rübennematode`,
      fritfly: $localize`:Pest Name|Frit fly@@pest.fritfly:Fritfliege`,
      wireworm: $localize`:Pest Name|Wireworm@@pest.wireworm:Drahtwurm`,
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
