import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GAME_CONSTANTS } from '../../game-constants';
import type { CropType, GameConfig, Parcel, Round } from '../../types';
import { GameAdvisorComponent } from '../advisor/advisor';

export interface RoundSettings {
  machines: number;
  organic: boolean;
  fertilizer: boolean;
  pesticide: boolean;
  organisms: boolean;
  priceFixing?: Record<string, boolean>;
}

@Component({
  selector: 'app-round-settings-modal',
  standalone: true,
  imports: [FormsModule, GameAdvisorComponent],
  templateUrl: './round-settings-modal.html',
})
export class RoundSettingsModal {
  @Input() config?: GameConfig;
  @Input() plantedCrops: CropType[] = [];
  @Input() parcels: Parcel[] = [];
  @Input() currentRound?: Round;
  @Input() previousRound?: Round;
  @Input() advisorEnabled = true;
  @Input() difficulty: 'easy' | 'normal' | 'hard' = 'normal';
  @Input() settings: RoundSettings = {
    machines: 0,
    organic: false,
    fertilizer: false,
    pesticide: false,
    organisms: false,
    priceFixing: {},
  };

  @Output() save = new EventEmitter<RoundSettings>();
  @Output() settingsCancelled = new EventEmitter<void>();

  readonly constants = GAME_CONSTANTS;
  readonly Math = Math;

  get grassParcelCount(): number {
    return (this.parcels || []).filter((p) => p.crop === 'Grass').length;
  }

  get requiredGrassParcels(): number {
    const total = this.parcels?.length || 40;
    return Math.round(total * GAME_CONSTANTS.NUTRITION.ANIMALS_REQUIRED_RATIO);
  }

  get activeParcelCount(): number {
    return (this.parcels || []).filter((p) => p.crop !== 'Fallow' && p.crop !== 'Grass').length;
  }

  get machineInvestmentCost(): number {
    const level = Math.max(0, Math.min(4, this.settings.machines || 0));
    return GAME_CONSTANTS.MACHINE_FACTORS.INVESTMENT_COST[level] ?? 0;
  }

  get machineMaintenanceCost(): number {
    const level = Math.max(0, Math.min(4, this.settings.machines || 0));
    return GAME_CONSTANTS.MACHINE_FACTORS.MAINTENANCE_COST[level] ?? 0;
  }

  get machineYieldBonusPct(): number {
    const level = Math.max(0, Math.min(4, this.settings.machines || 0));
    return Math.round((GAME_CONSTANTS.MACHINE_FACTORS.YIELD_BONUS[level] ?? 0) * 100);
  }

  get machineSoilCompaction(): number {
    const level = Math.max(0, Math.min(4, this.settings.machines || 0));
    return GAME_CONSTANTS.SOIL.MACHINE_IMPACT[level] ?? 0;
  }

  t(key: string): string {
    const translations: Record<string, string> = {
      'settings.title': 'Rundeneinstellungen',
      'settings.machines': 'Maschinen',
      'settings.machines_desc':
        'Höherer Maschineneinsatz steigert die Effizienz, laugt aber den Boden langfristig aus.',
      'settings.organic': 'Ökologischer Anbau',
      'settings.organic_desc': 'Verzicht auf Chemie. Höhere Preise, geringere Erträge.',
      'settings.fertilizer': 'Kunstdünger',
      'settings.fertilizer_desc': 'Steigert die Nährstoffe. Verschlechtert langfristig die Bodenqualität.',
      'settings.pesticide': 'Pflanzenschutzmittel',
      'settings.pesticide_desc': 'Schützt vor Schädlingen. Schadet den Bodenorganismen.',
      'settings.organisms': 'Nützlinge',
      'settings.organisms_desc': 'Natürliche Schädlingsbekämpfung. Teuer, aber nachhaltig.',
      'settings.priceFixing': 'Preise fixieren',
      'settings.priceFixing_desc':
        'Sichere dir jetzt den aktuellen Basispreis für deine Ernte. Schützt vor Preisschwankungen, kostet aber 5% Gebühr.',
      'settings.cancel': 'Abbrechen',
      'settings.confirm': 'Einstellungen bestätigen',
    };
    return translations[key] || key;
  }

  submit() {
    this.save.emit(this.settings);
  }

  togglePriceFixing(crop: string) {
    if (!this.settings.priceFixing) this.settings.priceFixing = {};
    this.settings.priceFixing[crop] = !this.settings.priceFixing[crop];
  }

  isPriceFixed(crop: string): boolean {
    return !!this.settings.priceFixing?.[crop];
  }

  getCropName(crop: string): string {
    const names: Record<string, string> = {
      Wheat: 'Weizen',
      Barley: 'Gerste',
      Oat: 'Hafer',
      Potato: 'Kartoffel',
      Corn: 'Mais',
      Rye: 'Roggen',
      Beet: 'Zuckerrübe',
      Fieldbean: 'Ackerbohne',
      Rapeseed: 'Raps',
      Pea: 'Erbse',
    };
    return names[crop] || crop;
  }
}
