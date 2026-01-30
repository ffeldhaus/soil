import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GAME_CONSTANTS } from '../game-constants';
import { ManualConceptCardComponent } from './components/manual-concept-card';
import { ManualCropCardComponent } from './components/manual-crop-card';
import { ManualPrintModalComponent } from './components/manual-print-modal';

@Component({
  selector: 'app-manual',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,

    ManualConceptCardComponent,
    ManualCropCardComponent,
    ManualPrintModalComponent,
  ],
  templateUrl: './manual.html',
  styleUrl: './manual.scss',
})
export class ManualComponent {
  year = new Date().getFullYear();

  t(key: string): string {
    const translations: Record<string, string> = {
      'manual.print': 'Drucken',
      'board.logout': 'Abmelden',
      'manual.title': 'Handbuch',
      'manual.subtitle': 'Alles was Sie über nachhaltige Landwirtschaft in Soil wissen müssen',
      'manual.intro.title': 'Einleitung',
      'manual.intro.goal.title': 'Das Ziel',
      'manual.intro.goal.text':
        'In Soil schlüpfst du in die Rolle einer Landwirtin oder eines Landwirts. Dein Ziel ist es, deinen Betrieb wirtschaftlich erfolgreich zu führen und gleichzeitig die langfristige Gesundheit deines Bodens zu erhalten. Du musst die richtige Balance zwischen Ertrag, Kosten und ökologischer Nachhaltigkeit finden.',
      'manual.intro.mechanics.title': 'Mechanik & Finanzen',
      'manual.intro.mechanics.text':
        'Ökologischer Anbau führt zu geringeren Erträgen, wird aber durch höhere Bio-Preise und die Öko-Prämie belohnt. Du musst jedoch die hohen Fixkosten (Personal, Pacht, Maschinen) im Blick behalten, die deinen Gewinn schmälern.',
      'manual.concepts.title': 'Konzepte',
      'manual.crops.title': 'Kulturen',
      'manual.husbandry.title': 'Tierhaltung',
      'manual.husbandry.text':
        'Die Tierhaltung (Wiese) ist ein wichtiger Bestandteil eines nachhaltigen Betriebs. Tiere liefern wertvollen organischen Dünger und sind robust gegenüber extremen Wetterbedingungen. Zudem werden Wiesenflächen als ökologisch wertvolle Grünstreifen gefördert.',
      'manual.toc.title': 'Inhalt',
    };
    return translations[key] || key;
  }

  crops = Object.values(GAME_CONSTANTS.CROPS).filter((c) => c.id !== 'Grass');
  husbandryCrops = Object.values(GAME_CONSTANTS.CROPS).filter((c) => c.id === 'Grass');

  showPrintModal = false;
  printSize = 'A4';
  printOrientation = 'portrait';

  print() {
    this.showPrintModal = false;
    setTimeout(() => {
      window.print();
    }, 100);
  }
}
