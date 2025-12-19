/// <reference types="@angular/localize" />
import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Parcel as ParcelType, CropType } from '../../types';

@Component({
  selector: 'app-parcel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parcel.html',
  styleUrl: './parcel.scss',
})
export class Parcel {
  @Input() parcel!: ParcelType;
  @Input() @HostBinding('class.selected') selected: boolean = false;
  @Input() showLabels: boolean = true;
  @Input() showNutrition: boolean = false;
  @Input() showHarvest: boolean = false;
  @Input() showSoil: boolean = false;

  private cropConfig: Record<string, { label: string, image: string }> = {
    'Wheat': { label: $localize`:@@crop.wheat:Wheat`, image: 'weizen.jpg' },
    'Corn': { label: $localize`:@@crop.corn:Corn`, image: 'mais.jpg' },
    'Potato': { label: $localize`:@@crop.potato:Potato`, image: 'kartoffel.jpg' },
    'Beet': { label: $localize`:@@crop.beet:Beet`, image: 'zuckerruebe.jpg' },
    'Barley': { label: $localize`:@@crop.barley:Barley`, image: 'gerste.jpg' },
    'Oat': { label: $localize`:@@crop.oat:Oat`, image: 'hafer.jpg' },
    'Rye': { label: $localize`:@@crop.rye:Rye`, image: 'roggen.jpg' },
    'Fieldbean': { label: $localize`:@@crop.fieldbean:Fieldbean`, image: 'ackerbohne.jpg' },
    'Grass': { label: $localize`:@@crop.animals:Animals`, image: 'tiere.jpg' },
    'Fallow': { label: $localize`:@@crop.fallow:Fallow`, image: 'brachland.jpg' }
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
