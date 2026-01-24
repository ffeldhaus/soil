import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { CropType, GameConfig } from '../../types';

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
  imports: [FormsModule],
  templateUrl: './round-settings-modal.html',
})
export class RoundSettingsModal {
  @Input() config?: GameConfig;
  @Input() plantedCrops: CropType[] = [];
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
