import { CommonModule } from '@angular/common';
import { Component, Input, type OnChanges, type SimpleChanges } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  laborHours: number;
  special?: string;
}

interface RotationItem {
  id: string;
  quality: 'good' | 'ok' | 'bad';
}

@Component({
  selector: 'app-manual-crop-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
      'pest.label': 'Hauptschädling',
      'pest.aphid-black': 'Schwarze Bohnenlaus',
      'pest.aphid-cereal': 'Getreideblattlaus',
      'pest.potato-beetle': 'Kartoffelkäfer',
      'pest.corn-borer': 'Maiszünsler',
      'pest.pollen-beetle': 'Rapsglanzkäfer',
      'pest.pea-moth': 'Erbsenwickler',
      'pest.oat-rust': 'Haferkronenrost',
      'pest.nematode': 'Rübennematode',
      'manual.crops.rotation': 'Fruchtfolgewirkung',
      'manual.crops.rotationPrev': 'Vorfrucht',
      'manual.crops.current': 'Aktuell',
      'manual.crops.rotationNext': 'Nachfrucht',
      'manual.crops.requirements': 'Ansprüche',
      'manual.crops.soil': 'Bodenqualität',
      'manual.crops.minerals': 'Mineralstoffe',
      'manual.crops.labor': 'Arbeitsaufwand',
      'sensitivity.high': 'Hoch',
      'sensitivity.moderate': 'Mäßig',
      'manual.crops.weather': 'Wetter-Empfindlichkeit',
      'manual.crops.drought': 'Trockenheit',
      'manual.crops.cold': 'Kälte',
      'manual.crops.flood': 'Nässe',
      'manual.crops.yields': 'Ertragspotenzial',
      'manual.yields.veryHigh': 'Sehr Hoch',
      'manual.yields.high': 'Hoch',
      'manual.yields.moderate': 'Mittel',
      'manual.yields.low': 'Gering',
      'manual.yields.veryLow': 'Sehr Gering',
      'manual.prices.conv': 'Konventionell',
      'manual.prices.org': 'Ökologisch (Bio)',
      'manual.prices.seed': 'Saatgutkosten',
      'manual.prices.sale': 'Verkaufspreis',
      'sensitivity.strong': 'Stark',
      'sensitivity.none': 'Keine',
      'special.wheat': 'Standardkultur mit ausgeglichenen Werten.',
      'special.corn': 'Hoher Ertrag, aber anspruchsvoll für den Boden.',
      'special.potato': 'Sehr profitabel, aber extrem schädlingsanfällig.',
      'special.beet': 'Gute Fruchtfolgewirkung für Nachfolgekulturen.',
      'special.barley': 'Robuste Getreideart für verschiedene Standorte.',
      'special.oat': 'Gute Vorfrucht, geringe Ansprüche.',
      'special.rye': 'Sehr widerstandsfähig gegen Kälte.',
      'special.fieldbean': 'Baut Stickstoff im Boden auf (Leguminose).',
      'special.rapeseed': 'Wichtige Ölsaat, wertvoll für Bienen und Bodenstruktur.',
      'special.pea': 'Fixiert Stickstoff und lockert den Boden auf (Leguminose).',
      'special.animals': 'Dauerkultur zur Viehhaltung.',
      'special.fallow': 'Regeneration für den Boden.',
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
    if (level === 'Mäßig') return 'bg-yellow-500';
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
