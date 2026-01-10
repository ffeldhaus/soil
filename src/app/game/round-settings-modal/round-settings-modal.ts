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
      'settings.title': $localize`:Heading|Title of the round settings modal@@settings.title:Rundeneinstellungen`,
      'settings.machines': $localize`:Form Label|Label for machine usage slider@@settings.machines:Maschinen`,
      'settings.machines_desc': $localize`:Description|Explanation of machine usage impacts@@settings.machines_desc:Höherer Maschineneinsatz steigert die Effizienz, laugt aber den Boden langfristig aus.`,
      'settings.organic': $localize`:Form Label|Label for organic farming toggle@@settings.organic:Ökologischer Anbau`,
      'settings.organic_desc': $localize`:Description|Explanation of organic farming impacts@@settings.organic_desc:Verzicht auf Chemie. Höhere Preise, geringere Erträge.`,
      'settings.fertilizer': $localize`:Form Label|Label for synthetic fertilizer toggle@@settings.fertilizer:Kunstdünger`,
      'settings.fertilizer_desc': $localize`:Description|Explanation of synthetic fertilizer impacts@@settings.fertilizer_desc:Steigert die Nährstoffe. Verschlechtert langfristig die Bodenqualität.`,
      'settings.pesticide': $localize`:Form Label|Label for pesticide usage toggle@@settings.pesticide:Pflanzenschutzmittel`,
      'settings.pesticide_desc': $localize`:Description|Explanation of pesticide usage impacts@@settings.pesticide_desc:Schützt vor Schädlingen. Schadet den Bodenorganismen.`,
      'settings.organisms': $localize`:Form Label|Label for beneficial organisms toggle@@settings.organisms:Nützlinge`,
      'settings.organisms_desc': $localize`:Description|Explanation of beneficial organisms impacts@@settings.organisms_desc:Natürliche Schädlingsbekämpfung. Teuer, aber nachhaltig.`,
      'settings.cancel': $localize`:Action Label|Button to cancel settings and close modal@@settings.cancel:Abbrechen`,
      'settings.confirm': $localize`:Action Label|Button to confirm and save round settings@@settings.confirm:Einstellungen bestätigen`,
    };
    return translations[key] || key;
  }

  submit() {
    this.save.emit(this.settings);
  }
}
