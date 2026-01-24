import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input } from '@angular/core';

import type { CropType, Parcel as ParcelType } from '../../types';

@Component({
  selector: 'app-parcel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parcel.html',
  styleUrl: './parcel.scss',
})
export class Parcel {
  @Input() parcel!: ParcelType;
  @Input() @HostBinding('class.selected') selected = false;
  @Input() showLabels = true;
  @Input() showNutrition = false;
  @Input() showHarvest = false;
  @Input() showSoil = false;
  @Input() isReadOnly = false;

  t(key: string): string {
    const translations: Record<string, string> = {
      'crop.wheat': 'Weizen',
      'crop.corn': 'Mais',
      'crop.potato': 'Kartoffel',
      'crop.beet': 'Zuckerrübe',
      'crop.barley': 'Gerste',
      'crop.oat': 'Hafer',
      'crop.rye': 'Roggen',
      'crop.fieldbean': 'Ackerbohne',
      'crop.rapeseed': 'Raps',
      'crop.pea': 'Erbse',
      'crop.animals': 'Tiere',
      'crop.fallow': 'Brachland',
      'parcel.crop': 'Feldpflanze',
    };
    return translations[key] || key;
  }

  private cropConfig: Record<string, { label: string; image: string }> = {
    Wheat: { label: 'crop.wheat', image: 'weizen.webp' },
    Corn: { label: 'crop.corn', image: 'mais.webp' },
    Potato: { label: 'crop.potato', image: 'kartoffel.webp' },
    Beet: { label: 'crop.beet', image: 'zuckerruebe.webp' },
    Barley: { label: 'crop.barley', image: 'gerste.webp' },
    Oat: { label: 'crop.oat', image: 'hafer.webp' },
    Rye: { label: 'crop.rye', image: 'roggen.webp' },
    Fieldbean: { label: 'crop.fieldbean', image: 'ackerbohne.webp' },
    Rapeseed: { label: 'crop.rapeseed', image: 'raps.webp' },
    Pea: { label: 'crop.pea', image: 'erbse.webp' },
    Grass: { label: 'crop.animals', image: 'hausschwein.webp' },
    Fallow: { label: 'crop.fallow', image: 'acker.webp' },
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
