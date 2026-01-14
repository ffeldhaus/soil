import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GAME_CONSTANTS } from '../game-constants';
import { LanguageSwitcherComponent } from '../shared/language-switcher/language-switcher';
import { ManualConceptCardComponent } from './components/manual-concept-card';
import { ManualCropCardComponent } from './components/manual-crop-card';
import { ManualPrintModalComponent } from './components/manual-print-modal';

@Component({
  selector: 'app-manual',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LanguageSwitcherComponent,
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
      'manual.print': $localize`:Action Label|Button to open print dialog@@manual.print:Drucken`,
      'board.logout': $localize`:Action Label|Logout button text@@board.logout:Abmelden`,
      'manual.title': $localize`:Main Heading|Title of the user manual@@manual.title:Handbuch`,
      'manual.subtitle': $localize`:Subheading|Description of the manual's content@@manual.subtitle:Alles was Sie über nachhaltige Landwirtschaft in Soil wissen müssen`,
      'manual.intro.title': $localize`:Heading|Title for the introduction section@@manual.intro.title:Einleitung`,
      'manual.intro.goal.title': $localize`:Subheading|Title for the game goals section@@manual.intro.goal.title:Das Ziel`,
      'manual.intro.goal.text': $localize`:Info Text|Description of the game's main goal@@manual.intro.goal.text:In Soil schlüpfst du in die Rolle einer Landwirtin oder eines Landwirts. Dein Ziel ist es, deinen Betrieb wirtschaftlich erfolgreich zu führen und gleichzeitig die langfristige Gesundheit deines Bodens zu erhalten. Du musst die richtige Balance zwischen Ertrag, Kosten und ökologischer Nachhaltigkeit finden.`,
      'manual.intro.mechanics.title': $localize`:Subheading|Title for the game mechanics section@@manual.intro.mechanics.title:Mechanik`,
      'manual.intro.mechanics.text': $localize`:Info Text|Description of how the game works@@manual.intro.mechanics.text:Du bewirtschaftest deine Felder über mehrere Jahre. In jeder Runde entscheidest du, welche Kulturen du anbaust und wie du sie pflegst. Dabei beeinflussen Faktoren wie Fruchtfolge, Düngung, Pflanzenschutz und das Wetter deinen Erfolg. Beachte: Ökologischer Anbau (Bio) führt zu ca. 20% geringeren Erträgen, wird aber durch höhere Marktpreise und staatliche Prämien ausgeglichen.`,
      'manual.concepts.title': $localize`:Heading|Title for the game concepts section@@manual.concepts.title:Konzepte`,
      'manual.crops.title': $localize`:Heading|Title for the crops section@@manual.crops.title:Kulturen`,
      'manual.toc.title': $localize`:Heading|Title for the table of contents@@manual.toc.title:Inhalt`,
    };
    return translations[key] || key;
  }

  crops = Object.values(GAME_CONSTANTS.CROPS);

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
