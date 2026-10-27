import { Component, EventEmitter, Input, Output } from '@angular/core';

import { GAME_CONSTANTS } from '../../game-constants';
import type { CropType, Parcel } from '../../types';

export type ImpactLevel = 'strong-positive' | 'slight-positive' | 'neutral' | 'slight-negative' | 'strong-negative';

export interface CropPreview {
  rotationDelta: number;
  rotationIcon: '▲' | '━' | '▼';
  rotationDetail: string;
  rotationLabel: string;
  rotationClass: ImpactLevel;
  soilDelta: number;
  soilIcon: '▲' | '━' | '▼';
  soilDetail: string;
  soilLabel: string;
  soilClass: ImpactLevel;
  nutritionDelta: number;
  nutritionIcon: '▲' | '━' | '▼';
  nutritionDetail: string;
  nutritionLabel: string;
  nutritionClass: ImpactLevel;
}

@Component({
  selector: 'app-planting-modal',
  standalone: true,
  imports: [],
  templateUrl: './planting-modal.html',
  styleUrl: './planting-modal.scss',
})
export class PlantingModal {
  @Input() crops: CropType[] = [];
  @Input() selectedParcels: Parcel[] = [];
  @Output() cropSelected = new EventEmitter<CropType>();
  @Output() plantingCancelled = new EventEmitter<void>();
  readonly nonDraggableImages = true;

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
    };
    return translations[key] || key;
  }

  private cropConfig: Record<string, { label: string; image: string }> = {
    Wheat: { label: 'crop.wheat', image: 'weizen.webp' },
    Barley: { label: 'crop.barley', image: 'gerste.webp' },
    Potato: { label: 'crop.potato', image: 'kartoffel.webp' },
    Beet: { label: 'crop.beet', image: 'zuckerruebe.webp' },
    Corn: { label: 'crop.corn', image: 'mais.webp' },
    Oat: { label: 'crop.oat', image: 'hafer.webp' },
    Rye: { label: 'crop.rye', image: 'roggen.webp' },
    Fieldbean: { label: 'crop.fieldbean', image: 'ackerbohne.webp' },
    Rapeseed: { label: 'crop.rapeseed', image: 'raps.webp' },
    Pea: { label: 'crop.pea', image: 'erbse.webp' },
    Grass: { label: 'crop.animals', image: 'hausschwein.webp' },
    Fallow: { label: 'crop.fallow', image: 'acker.webp' },
  };

  getConfig(crop: CropType) {
    return this.cropConfig[crop] || { label: crop, image: 'acker.webp' };
  }

  hasUniformPreviousCrop(): boolean {
    if (!this.selectedParcels || this.selectedParcels.length === 0) return false;
    const uniquePrevCrops = new Set(this.selectedParcels.map((p) => p.crop || 'Fallow'));
    return uniquePrevCrops.size === 1;
  }

  getSelectionSummary(): string {
    const count = this.selectedParcels?.length || 0;
    if (count === 0) return '';
    const parcelWord = count === 1 ? 'Parzelle' : 'Parzellen';
    if (this.hasUniformPreviousCrop()) {
      const prevCrop = this.selectedParcels[0]?.crop || 'Fallow';
      const prevCropName = this.t(this.getConfig(prevCrop).label);
      return `Auswahl: ${count} ${parcelWord} (Vorfrucht: ${prevCropName})`;
    }
    return `Auswahl: ${count} ${parcelWord} (Gemischte Vorfrucht)`;
  }

  getImpactBadgeClasses(level: ImpactLevel): string {
    switch (level) {
      case 'strong-positive':
        return 'impact-badge-strong-positive bg-emerald-950 text-emerald-100 border-emerald-400';
      case 'slight-positive':
        return 'impact-badge-slight-positive bg-[#47594e] text-[#dce6df] border-[#759180]';
      case 'slight-negative':
        return 'impact-badge-slight-negative bg-amber-950 text-amber-300 border-amber-500';
      case 'strong-negative':
        return 'impact-badge-strong-negative bg-rose-950 text-rose-300 border-rose-500';
      default:
        return 'impact-badge-neutral bg-slate-900 text-slate-300 border-slate-600';
    }
  }

  getCropPreview(crop: CropType): CropPreview {
    // 1. Fruchtfolge / Vorfrucht-Effekt
    let rotationDelta = 0;
    let rotationClass: ImpactLevel = 'neutral';
    let rotationIcon: '▲' | '━' | '▼' = '━';
    let rotationDetail = 'Fruchtfolge ±0%';

    if (crop !== 'Fallow' && crop !== 'Grass' && this.selectedParcels && this.selectedParcels.length > 0) {
      const totalDelta = this.selectedParcels.reduce((sum, parcel) => {
        const prevCrop = parcel.crop || 'Fallow';
        const matrixEntry = (GAME_CONSTANTS.ROTATION_MATRIX as Record<string, Record<string, unknown>>)[prevCrop]?.[
          crop
        ];
        if (typeof matrixEntry === 'number') {
          return sum + (matrixEntry - 100);
        }
        if (prevCrop === crop) {
          return sum - 15;
        }
        if (matrixEntry === 'good') {
          return sum + 10;
        }
        if (matrixEntry === 'bad') {
          return sum - 10;
        }
        return sum;
      }, 0);

      rotationDelta = Math.round(totalDelta / this.selectedParcels.length);
      if (rotationDelta >= 8) {
        rotationClass = 'strong-positive';
        rotationIcon = '▲';
        rotationDetail = `Fruchtfolge +${rotationDelta}%`;
      } else if (rotationDelta >= 3) {
        rotationClass = 'slight-positive';
        rotationIcon = '▲';
        rotationDetail = `Fruchtfolge +${rotationDelta}%`;
      } else if (rotationDelta <= -12) {
        rotationClass = 'strong-negative';
        rotationIcon = '▼';
        rotationDetail = `Fruchtfolge ${rotationDelta}%`;
      } else if (rotationDelta <= -3) {
        rotationClass = 'slight-negative';
        rotationIcon = '▼';
        rotationDetail = `Fruchtfolge ${rotationDelta}%`;
      }
    }
    const rotationLabel = `${rotationDetail} ${rotationIcon}`;

    // 2. Soil Impact (Boden)
    const customSoilImpact = (GAME_CONSTANTS.SOIL as Record<string, unknown>).CROP_IMPACT as
      | Record<string, number>
      | undefined;
    const soilDelta =
      customSoilImpact?.[crop] !== undefined
        ? customSoilImpact[crop]
        : crop === 'Fallow'
          ? GAME_CONSTANTS.SOIL.FALLOW_RECOVERY
          : (GAME_CONSTANTS.SOIL.PLANTATION_GAINS[crop] ?? 0) + (GAME_CONSTANTS.SOIL.PLANTATION_LOSSES[crop] ?? 0);

    let soilClass: ImpactLevel = 'neutral';
    let soilIcon: '▲' | '━' | '▼' = '━';
    let soilDetail = 'Boden ±0.0';
    if (soilDelta >= 1.5) {
      soilClass = 'strong-positive';
      soilIcon = '▲';
      soilDetail = `Boden +${soilDelta.toFixed(1)}`;
    } else if (soilDelta > 0) {
      soilClass = 'slight-positive';
      soilIcon = '▲';
      soilDetail = `Boden +${soilDelta.toFixed(1)}`;
    } else if (soilDelta <= -1.0) {
      soilClass = 'strong-negative';
      soilIcon = '▼';
      soilDetail = `Boden ${soilDelta.toFixed(1)}`;
    } else if (soilDelta < 0) {
      soilClass = 'slight-negative';
      soilIcon = '▼';
      soilDetail = `Boden ${soilDelta.toFixed(1)}`;
    }
    const soilLabel = `${soilDetail} ${soilIcon}`;

    // 3. Nutrition Impact (Nährst.)
    const customNutritionImpact = (GAME_CONSTANTS.NUTRITION as Record<string, unknown>).CROP_IMPACT as
      | Record<string, number>
      | undefined;
    let nutritionDelta = 0;
    if (customNutritionImpact?.[crop] !== undefined) {
      nutritionDelta = customNutritionImpact[crop];
    } else if (crop === 'Fieldbean') {
      nutritionDelta = GAME_CONSTANTS.NUTRITION.FIELDBEAN_BONUS;
    } else if (crop === 'Pea') {
      nutritionDelta = 10;
    } else if (crop === 'Fallow' || crop === 'Grass') {
      nutritionDelta = 5;
    } else {
      const cropSensitivity = GAME_CONSTANTS.CROPS[crop]?.nutritionSensitivity ?? 1.0;
      nutritionDelta = -Math.round(
        GAME_CONSTANTS.NUTRITION.BASE_DECLINE * GAME_CONSTANTS.NUTRITION.START * cropSensitivity,
      );
    }

    let nutritionClass: ImpactLevel = 'neutral';
    let nutritionIcon: '▲' | '━' | '▼' = '━';
    let nutritionDetail = 'Nährst. ±0';
    if (nutritionDelta >= 15) {
      nutritionClass = 'strong-positive';
      nutritionIcon = '▲';
      nutritionDetail = `Nährst. +${nutritionDelta}`;
    } else if (nutritionDelta > 0) {
      nutritionClass = 'slight-positive';
      nutritionIcon = '▲';
      nutritionDetail = `Nährst. +${nutritionDelta}`;
    } else if (nutritionDelta <= -15) {
      nutritionClass = 'strong-negative';
      nutritionIcon = '▼';
      nutritionDetail = `Nährst. ${nutritionDelta}`;
    } else if (nutritionDelta < 0) {
      nutritionClass = 'slight-negative';
      nutritionIcon = '▼';
      nutritionDetail = `Nährst. ${nutritionDelta}`;
    }
    const nutritionLabel = `${nutritionDetail} ${nutritionIcon}`;

    return {
      rotationDelta,
      rotationIcon,
      rotationDetail,
      rotationLabel,
      rotationClass,
      soilDelta,
      soilIcon,
      soilDetail,
      soilLabel,
      soilClass,
      nutritionDelta,
      nutritionIcon,
      nutritionDetail,
      nutritionLabel,
      nutritionClass,
    };
  }

  select(crop: CropType) {
    if (crop) {
      this.cropSelected.emit(crop);
    }
  }
}
