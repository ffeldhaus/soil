import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface RoundSettings {
  machines: number;
  organic: boolean;
  fertilizer: boolean;
  pesticide: boolean;
  organisms: boolean;
}

@Component({
  selector: 'app-round-settings-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './round-settings-modal.html',
})
export class RoundSettingsModal {
  @Input() settings: RoundSettings = {
    machines: 0,
    organic: false,
    fertilizer: false,
    pesticide: false,
    organisms: false,
  };

  @Output() save = new EventEmitter<RoundSettings>();
  @Output() settingsCancelled = new EventEmitter<void>();

  t(key: string): string {
    const translations: Record<string, string> = {
      'settings.title': $localize`:@@settings.title:Rundeneinstellungen`,
      'settings.machines': $localize`:@@settings.machines:Maschinen`,
      'settings.machines_desc': $localize`:@@settings.machines_desc:Höherer Maschineneinsatz steigert die Effizienz, laugt aber den Boden langfristig aus.`,
      'settings.organic': $localize`:@@settings.organic:Ökologischer Anbau`,
      'settings.organic_desc': $localize`:@@settings.organic_desc:Verzicht auf Chemie. Höhere Preise, geringere Erträge.`,
      'settings.fertilizer': $localize`:@@settings.fertilizer:Kunstdünger`,
      'settings.fertilizer_desc': $localize`:@@settings.fertilizer_desc:Steigert die Nährstoffe. Verschlechtert langfristig die Bodenqualität.`,
      'settings.pesticide': $localize`:@@settings.pesticide:Pflanzenschutzmittel`,
      'settings.pesticide_desc': $localize`:@@settings.pesticide_desc:Schützt vor Schädlingen. Schadet den Bodenorganismen.`,
      'settings.organisms': $localize`:@@settings.organisms:Nützlinge`,
      'settings.organisms_desc': $localize`:@@settings.organisms_desc:Natürliche Schädlingsbekämpfung. Teuer, aber nachhaltig.`,
      'settings.cancel': $localize`:@@settings.cancel:Abbrechen`,
      'settings.confirm': $localize`:@@settings.confirm:Einstellungen bestätigen`,
    };
    return translations[key] || key;
  }

  submit() {
    this.save.emit(this.settings);
  }
}
