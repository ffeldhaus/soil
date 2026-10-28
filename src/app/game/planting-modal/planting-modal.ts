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

  private getParcelRotationDelta(prevCrop: string, crop: CropType): number {
    const matrixEntry = (GAME_CONSTANTS.ROTATION_MATRIX as Record<string, Record<string, unknown>>)[prevCrop]?.[crop];
    if (typeof matrixEntry === 'number') return matrixEntry - 100;
    if (prevCrop === crop) return -15;
    if (matrixEntry === 'good') return 10;
    if (matrixEntry === 'bad') return -10;
    return 0;
  }

  private classifyImpact(
    value: number,
    strongPos: number,
    slightPos: number,
    strongNeg: number,
    slightNeg: number,
    prefix: string,
    formatValue: (v: number) => string,
    neutralDetail: string,
  ): { impactClass: ImpactLevel; icon: '▲' | '━' | '▼'; detail: string; label: string } {
    let impactClass: ImpactLevel = 'neutral';
    let icon: '▲' | '━' | '▼' = '━';
    let detail = neutralDetail;
    if (value >= strongPos) {
      impactClass = 'strong-positive';
      icon = '▲';
      detail = `${prefix} +${formatValue(value)}`;
    } else if (value > slightPos) {
      impactClass = 'slight-positive';
      icon = '▲';
      detail = `${prefix} +${formatValue(value)}`;
    } else if (value <= strongNeg) {
      impactClass = 'strong-negative';
      icon = '▼';
      detail = `${prefix} ${formatValue(value)}`;
    } else if (value < slightNeg) {
      impactClass = 'slight-negative';
      icon = '▼';
      detail = `${prefix} ${formatValue(value)}`;
    }
    return { impactClass, icon, detail, label: `${detail} ${icon}` };
  }

  private computeSoilDelta(crop: CropType): number {
    const customSoilImpact = (GAME_CONSTANTS.SOIL as Record<string, unknown>).CROP_IMPACT as
      | Record<string, number>
      | undefined;
    if (customSoilImpact?.[crop] !== undefined) return customSoilImpact[crop];
    if (crop === 'Fallow') return GAME_CONSTANTS.SOIL.FALLOW_RECOVERY;
    return (GAME_CONSTANTS.SOIL.PLANTATION_GAINS[crop] ?? 0) + (GAME_CONSTANTS.SOIL.PLANTATION_LOSSES[crop] ?? 0);
  }

  private computeNutritionDelta(crop: CropType): number {
    const customNutritionImpact = (GAME_CONSTANTS.NUTRITION as Record<string, unknown>).CROP_IMPACT as
      | Record<string, number>
      | undefined;
    if (customNutritionImpact?.[crop] !== undefined) return customNutritionImpact[crop];
    if (crop === 'Fieldbean') return GAME_CONSTANTS.NUTRITION.FIELDBEAN_BONUS;
    if (crop === 'Pea') return 10;
    if (crop === 'Fallow' || crop === 'Grass') return 5;
    const cropSensitivity = GAME_CONSTANTS.CROPS[crop]?.nutritionSensitivity ?? 1.0;
    return -Math.round(GAME_CONSTANTS.NUTRITION.BASE_DECLINE * GAME_CONSTANTS.NUTRITION.START * cropSensitivity);
  }

  getCropPreview(crop: CropType): CropPreview {
    let rotationDelta = 0;
    if (crop !== 'Fallow' && crop !== 'Grass' && this.selectedParcels && this.selectedParcels.length > 0) {
      const totalDelta = this.selectedParcels.reduce(
        (sum, parcel) => sum + this.getParcelRotationDelta(parcel.crop || 'Fallow', crop),
        0,
      );
      rotationDelta = Math.round(totalDelta / this.selectedParcels.length);
    }
    const rot = this.classifyImpact(rotationDelta, 8, 2, -12, -2, 'Fruchtfolge', (v) => `${v}%`, 'Fruchtfolge ±0%');

    const soilDelta = this.computeSoilDelta(crop);
    const soil = this.classifyImpact(soilDelta, 1.5, 0, -1.0, 0, 'Boden', (v) => v.toFixed(1), 'Boden ±0.0');

    const nutritionDelta = this.computeNutritionDelta(crop);
    const nutr = this.classifyImpact(nutritionDelta, 15, 0, -15, 0, 'Nährst.', (v) => `${v}`, 'Nährst. ±0');

    return {
      rotationDelta,
      rotationIcon: rot.icon,
      rotationDetail: rot.detail,
      rotationLabel: rot.label,
      rotationClass: rot.impactClass,
      soilDelta,
      soilIcon: soil.icon,
      soilDetail: soil.detail,
      soilLabel: soil.label,
      soilClass: soil.impactClass,
      nutritionDelta,
      nutritionIcon: nutr.icon,
      nutritionDetail: nutr.detail,
      nutritionLabel: nutr.label,
      nutritionClass: nutr.impactClass,
    };
  }

  select(crop: CropType) {
    if (crop) {
      this.cropSelected.emit(crop);
    }
  }
}
