import { CommonModule } from '@angular/common';
import { Component, HostBinding, inject, Input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

import { CropType, Parcel as ParcelType } from '../../types';

@Component({
  selector: 'app-parcel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parcel.html',
  styleUrl: './parcel.scss',
})
export class Parcel {
  private transloco = inject(TranslocoService);
  @Input() parcel!: ParcelType;
  @Input() @HostBinding('class.selected') selected = false;
  @Input() showLabels = true;
  @Input() showNutrition = false;
  @Input() showHarvest = false;
  @Input() showSoil = false;

  private cropConfig: Record<string, { label: string; image: string }> = {
    Wheat: { label: this.transloco.translate('crop.wheat'), image: 'weizen.jpg' },
    Corn: { label: this.transloco.translate('crop.corn'), image: 'mais.jpg' },
    Potato: { label: this.transloco.translate('crop.potato'), image: 'kartoffel.jpg' },
    Beet: { label: this.transloco.translate('crop.beet'), image: 'zuckerruebe.jpg' },
    Barley: { label: this.transloco.translate('crop.barley'), image: 'gerste.jpg' },
    Oat: { label: this.transloco.translate('crop.oat'), image: 'hafer.jpg' },
    Rye: { label: this.transloco.translate('crop.rye'), image: 'roggen.jpg' },
    Fieldbean: { label: this.transloco.translate('crop.fieldbean'), image: 'ackerbohne.jpg' },
    Grass: { label: this.transloco.translate('crop.animals'), image: 'tiere.jpg' },
    Fallow: { label: this.transloco.translate('crop.fallow'), image: 'brachland.jpg' },
  };

  getConfig(crop: CropType) {
    return this.cropConfig[crop] || { label: crop, image: 'placeholder.jpg' };
  }

  get soilPercentage(): number {
    return Math.min(100, (this.parcel.soil / 200) * 100); // Visual scaling
  }

  get nutritionPercentage(): number {
    return Math.min(100, (this.parcel.nutrition / 200) * 100);
  }

  getOverlayColor(): string {
    if (this.showNutrition) {
      // 0 = red (0), 100 = green (120)
      const hue = Math.min(120, (this.parcel.nutrition / 200) * 120);
      return `hsla(${hue}, 80%, 45%, 0.3)`;
    }
    if (this.showHarvest) {
      // Assume 500 is a good yield for green
      const hue = Math.min(120, ((this.parcel.yield || 0) / 500) * 120);
      return `hsla(${hue}, 80%, 45%, 0.3)`;
    }
    if (this.showSoil) {
      const hue = Math.min(120, (this.parcel.soil / 200) * 120);
      return `hsla(${hue}, 80%, 45%, 0.3)`;
    }
    return 'transparent';
  }
}
