import { CommonModule } from '@angular/common';
import { Component, Input, type OnChanges, type SimpleChanges } from '@angular/core';

import { GAME_CONSTANTS } from '../../game-constants';
import type { CropType } from '../../types';

interface CropConfig {
  id: CropType;
  name?: string;
  image: string;
  pest: string;
  yields: {
    veryHigh: string;
    high: string;
    moderate: string;
    low: string;
    veryLow: string;
    [key: string]: string;
  };
  baseYield: number;
  soilSensitivity: number;
  nutritionSensitivity: number;
  weatherSensitivity: {
    drought: string;
    cold: string;
    flood: string;
    [key: string]: string;
  };
  seedPrice: {
    conventional: number;
    organic: number;
  };
  marketValue: {
    conventional: number;
    organic: number;
  };
  special?: string;
}

interface RotationItem {
  id: string;
  quality: 'good' | 'ok' | 'bad';
}

@Component({
  selector: 'app-manual-crop-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manual-crop-card.html',
  host: {
    class: 'block',
  },
})
export class ManualCropCardComponent implements OnChanges {
  @Input() crop!: CropConfig;

  previousCrops: RotationItem[] = [];
  nextCrops: RotationItem[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.crop && this.crop) {
      this.previousCrops = this.calculateRotationData(this.crop.id, 'previous');
      this.nextCrops = this.calculateRotationData(this.crop.id, 'next');
    }
  }

  t(key: string): string {
    const translations: Record<string, string> = {
      'crop.wheat': $localize`:Crop Name|Wheat@@crop.wheat:Weizen`,
      'crop.corn': $localize`:Crop Name|Corn@@crop.corn:Mais`,
      'crop.potato': $localize`:Crop Name|Potato@@crop.potato:Kartoffel`,
      'crop.beet': $localize`:Crop Name|Sugar beet@@crop.beet:Zuckerrübe`,
      'crop.barley': $localize`:Crop Name|Barley@@crop.barley:Gerste`,
      'crop.oat': $localize`:Crop Name|Oat@@crop.oat:Hafer`,
      'crop.rye': $localize`:Crop Name|Rye@@crop.rye:Roggen`,
      'crop.fieldbean': $localize`:Crop Name|Field bean@@crop.fieldbean:Ackerbohne`,
      'crop.rapeseed': $localize`:Crop Name|Rapeseed@@crop.rapeseed:Raps`,
      'crop.pea': $localize`:Crop Name|Pea@@crop.pea:Erbse`,
      'crop.animals': $localize`:Crop Name|Animals (as a land use type)@@crop.animals:Tiere`,
      'crop.fallow': $localize`:Crop Name|Fallow land@@crop.fallow:Brachland`,
      'pest.label': $localize`:Label|Title for the main pest associated with a crop@@pest.label:Hauptschädling`,
      'pest.aphid-black': $localize`:Pest Name|Black bean aphid@@pest.aphid-black:Schwarze Bohnenlaus`,
      'pest.aphid-cereal': $localize`:Pest Name|Cereal aphid@@pest.aphid-cereal:Getreideblattlaus`,
      'pest.potato-beetle': $localize`:Pest Name|Colorado potato beetle@@pest.potato-beetle:Kartoffelkäfer`,
      'pest.corn-borer': $localize`:Pest Name|European corn borer@@pest.corn-borer:Maiszünsler`,
      'pest.pollen-beetle': $localize`:Pest Name|Pollen beetle@@pest.pollen-beetle:Rapsglanzkäfer`,
      'pest.pea-moth': $localize`:Pest Name|Pea moth@@pest.pea-moth:Erbsenwickler`,
      'pest.oat-rust': $localize`:Pest Name|Oat crown rust@@pest.oat-rust:Haferkronenrost`,
      'pest.nematode': $localize`:Pest Name|Beet nematode@@pest.nematode:Rübennematode`,
      'manual.crops.rotation': $localize`:Label|Title for the crop rotation impact section@@manual.crops.rotation:Fruchtfolgewirkung`,
      'manual.crops.rotationPrev': $localize`:Label|Indicator for the previous crop in rotation@@manual.crops.rotationPrev:Vorfrucht`,
      'manual.crops.current': $localize`:Label|Indicator for the current crop being viewed@@manual.crops.current:Aktuell`,
      'manual.crops.rotationNext': $localize`:Label|Indicator for the following crop in rotation@@manual.crops.rotationNext:Nachfrucht`,
      'manual.crops.requirements': $localize`:Label|Title for plant growing requirements@@manual.crops.requirements:Ansprüche`,
      'manual.crops.soil': $localize`:Label|Soil quality requirement@@manual.crops.soil:Bodenqualität`,
      'manual.crops.minerals': $localize`:Label|Mineral/nutrient requirement@@manual.crops.minerals:Mineralstoffe`,
      'sensitivity.high': $localize`:Level|High sensitivity or requirement@@sensitivity.high:Hoch`,
      'sensitivity.moderate': $localize`:Level|Moderate sensitivity or requirement@@sensitivity.moderate:Mäßig`,
      'manual.crops.weather': $localize`:Label|Title for weather sensitivity section@@manual.crops.weather:Wetter-Empfindlichkeit`,
      'manual.crops.drought': $localize`:Label|Sensitivity to drought@@manual.crops.drought:Trockenheit`,
      'manual.crops.cold': $localize`:Label|Sensitivity to cold@@manual.crops.cold:Kälte`,
      'manual.crops.flood': $localize`:Label|Sensitivity to excessive wetness/flooding@@manual.crops.flood:Nässe`,
      'manual.crops.yields': $localize`:Label|Title for yield potential section@@manual.crops.yields:Ertragspotenzial`,
      'manual.yields.veryHigh': $localize`:Level|Very high yield@@manual.yields.veryHigh:Sehr Hoch`,
      'manual.yields.high': $localize`:Level|High yield@@manual.yields.high:Hoch`,
      'manual.yields.moderate': $localize`:Level|Moderate yield@@manual.yields.moderate:Mittel`,
      'manual.yields.low': $localize`:Level|Low yield@@manual.yields.low:Gering`,
      'manual.yields.veryLow': $localize`:Level|Very low yield@@manual.yields.veryLow:Sehr Gering`,
      'manual.prices.conv': $localize`:Type|Conventional farming@@manual.prices.conv:Konventionell`,
      'manual.prices.org': $localize`:Type|Organic farming@@manual.prices.org:Ökologisch (Bio)`,
      'manual.prices.seed': $localize`:Label|Cost of seeds per unit@@manual.prices.seed:Saatgutkosten`,
      'manual.prices.sale': $localize`:Label|Selling price per unit of harvest@@manual.prices.sale:Verkaufspreis`,
      'sensitivity.strong': $localize`:Level|Strong sensitivity@@sensitivity.strong:Stark`,
      'sensitivity.none': $localize`:Level|No sensitivity@@sensitivity.none:Keine`,
      'special.wheat': $localize`:Description|Special properties of wheat@@special.wheat:Standardkultur mit ausgeglichenen Werten.`,
      'special.corn': $localize`:Description|Special properties of corn@@special.corn:Hoher Ertrag, aber anspruchsvoll für den Boden.`,
      'special.potato': $localize`:Description|Special properties of potato@@special.potato:Sehr profitabel, aber extrem schädlingsanfällig.`,
      'special.beet': $localize`:Description|Special properties of sugar beet@@special.beet:Gute Fruchtfolgewirkung für Nachfolgekulturen.`,
      'special.barley': $localize`:Description|Special properties of barley@@special.barley:Robuste Getreideart für verschiedene Standorte.`,
      'special.oat': $localize`:Description|Special properties of oat@@special.oat:Gute Vorfrucht, geringe Ansprüche.`,
      'special.rye': $localize`:Description|Special properties of rye@@special.rye:Sehr widerstandsfähig gegen Kälte.`,
      'special.fieldbean': $localize`:Description|Special properties of field bean@@special.fieldbean:Baut Stickstoff im Boden auf (Leguminose).`,
      'special.rapeseed': $localize`:Description|Special properties of rapeseed@@special.rapeseed:Wichtige Ölsaat, wertvoll für Bienen und Bodenstruktur.`,
      'special.pea': $localize`:Description|Special properties of pea@@special.pea:Fixiert Stickstoff und lockert den Boden auf (Leguminose).`,
      'special.animals': $localize`:Description|Special properties of animal husbandry@@special.animals:Dauerkultur zur Viehhaltung.`,
      'special.fallow': $localize`:Description|Special properties of fallow land@@special.fallow:Regeneration für den Boden.`,
    };
    return translations[key] || key;
  }

  getPestKey(pest: string): string {
    const map: Record<string, string> = {
      'Schwarze Bohnenlaus': 'aphid-black',
      Getreideblattlaus: 'aphid-cereal',
      Kartoffelkäfer: 'potato-beetle',
      Maiszünsler: 'corn-borer',
      Rapsglanzkäfer: 'pollen-beetle',
      Erbsenwickler: 'pea-moth',
      Haferkronenrost: 'oat-rust',
      Rübennematode: 'nematode',
    };
    return map[pest] || 'aphid-black';
  }

  getSensitivityKey(level: string): string {
    const map: Record<string, string> = {
      Stark: 'strong',
      Mäßig: 'moderate',
      Gering: 'low',
      Keine: 'none',
    };
    return map[level] || 'low';
  }

  getWeatherColor(level: string): string {
    if (level === 'Stark') return 'bg-red-500';
    if (level === 'Mäßig') return 'bg-orange-500';
    return 'bg-green-500';
  }

  getYieldClass(level: string): string {
    const map: Record<string, string> = {
      veryHigh: 'bg-green-600/20 border-green-500/50 text-green-400',
      high: 'bg-green-500/10 border-green-500/30 text-green-300',
      moderate: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
      low: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
      veryLow: 'bg-red-500/10 border-red-500/30 text-red-300',
    };
    return map[level] || '';
  }

  calculateRotationData(cropId: string, direction: 'previous' | 'next'): RotationItem[] {
    const matrix = GAME_CONSTANTS.ROTATION_MATRIX;
    const currentCrop = cropId as CropType;
    const results: RotationItem[] = [];

    if (direction === 'previous') {
      Object.keys(matrix).forEach((prev) => {
        const quality = matrix[prev as CropType][currentCrop];
        if (prev !== 'Grass' && prev !== 'Fallow') {
          results.push({ id: prev, quality });
        }
      });
    } else {
      const nextOptions = matrix[currentCrop];
      Object.keys(nextOptions).forEach((next) => {
        const quality = nextOptions[next as CropType];
        if (next !== 'Grass' && next !== 'Fallow') {
          results.push({ id: next, quality });
        }
      });
    }
    return results.sort((a, b) => {
      const score = { good: 3, ok: 2, bad: 1 };
      return score[b.quality] - score[a.quality];
    });
  }

  getRotationClass(quality: 'good' | 'ok' | 'bad'): string {
    const map = {
      good: 'bg-green-500/20 border-green-500/50 text-green-400',
      ok: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
      bad: 'bg-red-500/20 border-red-500/50 text-red-400',
    };
    return map[quality];
  }

  getCropName(cropId: string): string {
    if (!cropId) return '';
    // Try to find the crop in constants (case-sensitive as defined in the object)
    const crop = (GAME_CONSTANTS.CROPS as any)[cropId];
    if (crop?.name) return crop.name;

    // Try case-insensitive fallback for the key if exact match failed
    const crops = GAME_CONSTANTS.CROPS as Record<string, any>;
    const entry = Object.entries(crops).find(([key]) => key.toLowerCase() === cropId.toLowerCase());
    if (entry?.[1].name) return entry[1].name;

    // Final fallback to the translation map in this component
    return this.t(`crop.${cropId.toLowerCase()}`);
  }
}
