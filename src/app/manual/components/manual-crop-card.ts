import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { GAME_CONSTANTS } from '../../game-constants';
import type { CropType } from '../../types';

interface CropConfig {
  id: CropType;
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

@Component({
  selector: 'app-manual-crop-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manual-crop-card.html',
})
export class ManualCropCardComponent {
  @Input() crop!: CropConfig;

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
      'crop.animals': $localize`:Crop Name|Animals (as a land use type)@@crop.animals:Tiere`,
      'crop.fallow': $localize`:Crop Name|Fallow land@@crop.fallow:Brachland`,
      'pest.label': $localize`:Label|Title for the main pest associated with a crop@@pest.label:Hauptschädling`,
      'pest.aphid': $localize`:Pest Name|Aphid@@pest.aphid:Blattlaus`,
      'pest.fritfly': $localize`:Pest Name|Frit fly@@pest.fritfly:Fritfliege`,
      'pest.potato-beetle': $localize`:Pest Name|Colorado potato beetle@@pest.potato-beetle:Kartoffelkäfer`,
      'pest.corn-borer': $localize`:Pest Name|European corn borer@@pest.corn-borer:Maiszünsler`,
      'pest.wireworm': $localize`:Pest Name|Wireworm@@pest.wireworm:Drahtwurm`,
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
      'special.animals': $localize`:Description|Special properties of animal husbandry@@special.animals:Dauerkultur zur Viehhaltung.`,
      'special.fallow': $localize`:Description|Special properties of fallow land@@special.fallow:Regeneration für den Boden.`,
    };
    return translations[key] || key;
  }

  getPestKey(pest: string): string {
    const map: Record<string, string> = {
      Blattlaus: 'aphid',
      Fritfliege: 'fritfly',
      Kartoffelkäfer: 'potato-beetle',
      Maiszünsler: 'corn-borer',
      Drahtwurm: 'wireworm',
    };
    return map[pest] || 'aphid';
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

  getRotationData(cropId: string, direction: 'previous' | 'next') {
    const matrix = GAME_CONSTANTS.ROTATION_MATRIX;
    const currentCrop = cropId as CropType;
    const results: { id: string; quality: 'good' | 'ok' | 'bad' }[] = [];

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
}
