import { ChangeDetectorRef, Component, EventEmitter, Input, inject, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GAME_CONSTANTS } from '../../game-constants';
import { type CropConfig, ManualCropCardComponent } from '../../manual/components/manual-crop-card';
import type { CropType, Parcel, ParcelRoundFactors } from '../../types';

export interface CropEconomics {
  seedPrice: number;
  baseYield: number;
  marketPrice: number;
  laborHours: number;
  isSubsidy: boolean;
}

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
  imports: [ManualCropCardComponent, RouterLink],
  templateUrl: './planting-modal.html',
  styleUrl: './planting-modal.scss',
})
export class PlantingModal {
  @Input() crops: CropType[] = [];
  @Input() selectedParcels: Parcel[] = [];
  @Input() difficulty: 'easy' | 'normal' | 'hard' = 'normal';
  @Output() cropSelected = new EventEmitter<CropType>();
  @Output() plantingCancelled = new EventEmitter<void>();
  private cdr = inject(ChangeDetectorRef);
  readonly nonDraggableImages = true;
  selectedManualCrop: CropConfig | null = null;
  private touchStartPoint: { x: number; y: number } | null = null;
  private lastTouchActionAt = 0;

  onTouchStartRecord(event: TouchEvent) {
    event.stopPropagation();
    const touch = event.touches?.[0];
    if (touch) {
      this.touchStartPoint = { x: touch.clientX, y: touch.clientY };
    }
  }

  private isTapGesture(event: TouchEvent): boolean {
    const touch = event.changedTouches?.[0];
    if (!touch || !this.touchStartPoint) return true;
    const dx = touch.clientX - this.touchStartPoint.x;
    const dy = touch.clientY - this.touchStartPoint.y;
    return Math.hypot(dx, dy) <= 16;
  }

  private shouldIgnoreSyntheticClick(): boolean {
    return Date.now() - this.lastTouchActionAt < 400;
  }

  onBackdropTouchEnd(event: TouchEvent) {
    event.stopPropagation();
    if (event.target !== event.currentTarget || !this.isTapGesture(event)) return;
    if (event.cancelable) event.preventDefault();
    this.lastTouchActionAt = Date.now();
    this.plantingCancelled.emit();
    this.cdr.detectChanges();
  }

  onBackdropClick(event: MouseEvent) {
    if (this.shouldIgnoreSyntheticClick()) return;
    if (event.target === event.currentTarget) {
      this.plantingCancelled.emit();
      this.cdr.detectChanges();
    }
  }

  onCancelTouchEnd(event: TouchEvent) {
    event.stopPropagation();
    if (!this.isTapGesture(event)) return;
    if (event.cancelable) event.preventDefault();
    this.lastTouchActionAt = Date.now();
    this.plantingCancelled.emit();
    this.cdr.detectChanges();
  }

  onCancelClick(event?: Event) {
    event?.stopPropagation();
    if (this.shouldIgnoreSyntheticClick()) return;
    this.plantingCancelled.emit();
    this.cdr.detectChanges();
  }

  onCropTileTouchEnd(event: TouchEvent, crop: CropType) {
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('[data-testid^="crop-manual-trigger-"]')) {
      return;
    }
    event.stopPropagation();
    if (!this.isTapGesture(event)) return;
    if (event.cancelable) event.preventDefault();
    this.lastTouchActionAt = Date.now();
    this.select(crop);
  }

  onCropTileClick(event: Event, crop: CropType) {
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('[data-testid^="crop-manual-trigger-"]')) {
      return;
    }
    if (this.shouldIgnoreSyntheticClick()) return;
    this.select(crop);
  }

  onManualTriggerTouchEnd(event: TouchEvent, crop: CropType) {
    event.stopPropagation();
    if (!this.isTapGesture(event)) return;
    if (event.cancelable) event.preventDefault();
    this.lastTouchActionAt = Date.now();
    this.activateCropDetails(crop);
  }

  openCropDetails(event: Event, crop: CropType) {
    event.stopPropagation();
    event.preventDefault();
    if (this.shouldIgnoreSyntheticClick()) return;
    this.activateCropDetails(crop);
  }

  private activateCropDetails(crop: CropType) {
    const found = GAME_CONSTANTS.CROPS[crop];
    if (found) {
      this.selectedManualCrop = found;
      this.cdr.detectChanges();
      return;
    }
    if (crop === 'Fallow') {
      this.selectedManualCrop = {
        id: 'Fallow',
        name: 'Brachland',
        image: 'acker.webp',
        pest: 'Keine',
        yields: { veryHigh: '0', high: '0', moderate: '0', low: '0', veryLow: '0' },
        baseYield: 0,
        soilSensitivity: 0,
        nutritionSensitivity: 0,
        weatherSensitivity: { drought: 'Keine', cold: 'Keine', flood: 'Keine' },
        seedPrice: { conventional: 0, organic: 0 },
        marketValue: { conventional: 0, organic: 0 },
        laborHours: 2,
        special:
          'Regeneration für den Boden (Grünbrache / Blühstreifen). Für bis zu 5 Felder mit Brachland oder Tieren erhältst du die hohe EU-Grünstreifen-Prämie (1.200 €/ha).',
      };
      this.cdr.detectChanges();
    }
  }

  onManualCloseTouchEnd(event: TouchEvent) {
    event.stopPropagation();
    if (!this.isTapGesture(event)) return;
    if (event.cancelable) event.preventDefault();
    this.lastTouchActionAt = Date.now();
    this.closeCropDetails();
  }

  onManualCloseClick(event?: Event) {
    event?.stopPropagation();
    if (this.shouldIgnoreSyntheticClick()) return;
    this.closeCropDetails();
  }

  onManualBackdropTouchEnd(event: TouchEvent) {
    event.stopPropagation();
    if (event.target !== event.currentTarget || !this.isTapGesture(event)) return;
    if (event.cancelable) event.preventDefault();
    this.lastTouchActionAt = Date.now();
    this.closeCropDetails();
  }

  onManualBackdropClick(event: MouseEvent) {
    event.stopPropagation();
    if (this.shouldIgnoreSyntheticClick()) return;
    if (event.target === event.currentTarget) {
      this.closeCropDetails();
    }
  }

  closeCropDetails() {
    this.selectedManualCrop = null;
    this.cdr.detectChanges();
  }

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

  readonly Math = Math;

  getCropEconomics(crop: CropType): CropEconomics {
    const cfg = GAME_CONSTANTS.CROPS[crop];
    if (!cfg) {
      return { seedPrice: 0, baseYield: 0, marketPrice: 0, laborHours: 0, isSubsidy: false };
    }
    if (crop === 'Fallow') {
      return {
        seedPrice: 0,
        baseYield: 0,
        marketPrice: GAME_CONSTANTS.SUBSIDIES.GREEN_STRIP,
        laborHours: cfg.laborHours,
        isSubsidy: true,
      };
    }
    const baseMarket = Array.isArray(cfg.marketValue?.conventional)
      ? cfg.marketValue.conventional[0]
      : (cfg.marketValue?.conventional ?? 0);
    return {
      seedPrice: cfg.seedPrice?.conventional ?? 0,
      baseYield: cfg.baseYield ?? 0,
      marketPrice: baseMarket,
      laborHours: cfg.laborHours ?? 0,
      isSubsidy: false,
    };
  }

  getSelectedCausalFactors(): ParcelRoundFactors | null {
    const withFactors = (this.selectedParcels || []).filter((p) => p.factors !== undefined);
    if (withFactors.length === 0) return null;
    const n = withFactors.length;
    const avg = (fn: (f: ParcelRoundFactors) => number) => withFactors.reduce((sum, p) => sum + fn(p.factors!), 0) / n;
    return {
      baseYield: Math.round(avg((f) => f.baseYield)),
      soilFactor: avg((f) => f.soilFactor),
      nutritionFactor: avg((f) => f.nutritionFactor),
      weatherFactor: avg((f) => f.weatherFactor),
      pestFactor: avg((f) => f.pestFactor),
      machineBonus: avg((f) => f.machineBonus),
      organicFactor: avg((f) => f.organicFactor),
      soilDelta: {
        cropRotation: Number(avg((f) => f.soilDelta.cropRotation).toFixed(1)),
        humusRecovery: Number(avg((f) => f.soilDelta.humusRecovery).toFixed(1)),
        machineCompaction: Number(avg((f) => f.soilDelta.machineCompaction).toFixed(1)),
        fertilizerImpact: Number(avg((f) => f.soilDelta.fertilizerImpact).toFixed(1)),
        pesticideImpact: Number(avg((f) => f.soilDelta.pesticideImpact).toFixed(1)),
        organismsImpact: Number(avg((f) => f.soilDelta.organismsImpact).toFixed(1)),
        weatherErosion: Number(avg((f) => f.soilDelta.weatherErosion).toFixed(1)),
        total: Number(avg((f) => f.soilDelta.total).toFixed(1)),
      },
      nutritionDelta: {
        cropUptake: Number(avg((f) => f.nutritionDelta.cropUptake).toFixed(1)),
        fertilizerAdd: Number(avg((f) => f.nutritionDelta.fertilizerAdd).toFixed(1)),
        leaching: Number(avg((f) => f.nutritionDelta.leaching).toFixed(1)),
        total: Number(avg((f) => f.nutritionDelta.total).toFixed(1)),
      },
    };
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
      this.cdr.detectChanges();
    }
  }
}
