import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { GAME_CONSTANTS } from '../../game-constants';
import { CropType } from '../../types';

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
      'crop.wheat': $localize`:@@crop.wheat:Weizen`,
      'crop.corn': $localize`:@@crop.corn:Mais`,
      'crop.potato': $localize`:@@crop.potato:Kartoffel`,
      'crop.beet': $localize`:@@crop.beet:Zuckerrübe`,
      'crop.barley': $localize`:@@crop.barley:Gerste`,
      'crop.oat': $localize`:@@crop.oat:Hafer`,
      'crop.rye': $localize`:@@crop.rye:Roggen`,
      'crop.fieldbean': $localize`:@@crop.fieldbean:Ackerbohne`,
      'crop.animals': $localize`:@@crop.animals:Tiere`,
      'crop.fallow': $localize`:@@crop.fallow:Brachland`,
      'pest.label': $localize`:@@pest.label:Hauptschädling`,
      'pest.aphid': $localize`:@@pest.aphid:Blattlaus`,
      'pest.fritfly': $localize`:@@pest.fritfly:Fritfliege`,
      'pest.potato-beetle': $localize`:@@pest.potato-beetle:Kartoffelkäfer`,
      'pest.corn-borer': $localize`:@@pest.corn-borer:Maiszünsler`,
      'pest.wireworm': $localize`:@@pest.wireworm:Drahtwurm`,
      'manual.crops.rotation': $localize`:@@manual.crops.rotation:Fruchtfolgewirkung`,
      'manual.crops.rotationPrev': $localize`:@@manual.crops.rotationPrev:Vorfrucht`,
      'manual.crops.current': $localize`:@@manual.crops.current:Aktuell`,
      'manual.crops.rotationNext': $localize`:@@manual.crops.rotationNext:Nachfrucht`,
      'manual.crops.requirements': $localize`:@@manual.crops.requirements:Ansprüche`,
      'manual.crops.soil': $localize`:@@manual.crops.soil:Bodenqualität`,
      'manual.crops.minerals': $localize`:@@manual.crops.minerals:Mineralstoffe`,
      'sensitivity.high': $localize`:@@sensitivity.high:Hoch`,
      'sensitivity.moderate': $localize`:@@sensitivity.moderate:Mäßig`,
      'manual.crops.weather': $localize`:@@manual.crops.weather:Wetter-Empfindlichkeit`,
      'manual.crops.drought': $localize`:@@manual.crops.drought:Trockenheit`,
      'manual.crops.cold': $localize`:@@manual.crops.cold:Kälte`,
      'manual.crops.flood': $localize`:@@manual.crops.flood:Nässe`,
      'manual.crops.yields': $localize`:@@manual.crops.yields:Ertragspotenzial`,
      'manual.yields.veryHigh': $localize`:@@manual.yields.veryHigh:Sehr Hoch`,
      'manual.yields.high': $localize`:@@manual.yields.high:Hoch`,
      'manual.yields.moderate': $localize`:@@manual.yields.moderate:Mittel`,
      'manual.yields.low': $localize`:@@manual.yields.low:Gering`,
      'manual.yields.veryLow': $localize`:@@manual.yields.veryLow:Sehr Gering`,
      'manual.prices.conv': $localize`:@@manual.prices.conv:Konventionell`,
      'manual.prices.org': $localize`:@@manual.prices.org:Ökologisch (Bio)`,
      'manual.prices.seed': $localize`:@@manual.prices.seed:Saatgutkosten`,
      'manual.prices.sale': $localize`:@@manual.prices.sale:Verkaufspreis`,
      'sensitivity.strong': $localize`:@@sensitivity.strong:Stark`,
      'sensitivity.none': $localize`:@@sensitivity.none:Keine`,
      'special.wheat': $localize`:@@special.wheat:Standardkultur mit ausgeglichenen Werten.`,
      'special.corn': $localize`:@@special.corn:Hoher Ertrag, aber anspruchsvoll für den Boden.`,
      'special.potato': $localize`:@@special.potato:Sehr profitabel, aber extrem schädlingsanfällig.`,
      'special.beet': $localize`:@@special.beet:Gute Fruchtfolgewirkung für Nachfolgekulturen.`,
      'special.barley': $localize`:@@special.barley:Robuste Getreideart für verschiedene Standorte.`,
      'special.oat': $localize`:@@special.oat:Gute Vorfrucht, geringe Ansprüche.`,
      'special.rye': $localize`:@@special.rye:Sehr widerstandsfähig gegen Kälte.`,
      'special.fieldbean': $localize`:@@special.fieldbean:Baut Stickstoff im Boden auf (Leguminose).`,
      'special.animals': $localize`:@@special.animals:Dauerkultur zur Viehhaltung.`,
      'special.fallow': $localize`:@@special.fallow:Regeneration für den Boden.`,
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
