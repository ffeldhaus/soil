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
      'manual.intro.goal.text': $localize`:Info Text|Description of the game's main goal@@manual.intro.goal.text:Erfolgreich wirtschaften und dabei den Boden schützen.`,
      'manual.intro.mechanics.title': $localize`:Subheading|Title for the game mechanics section@@manual.intro.mechanics.title:Mechanik`,
      'manual.intro.mechanics.text': $localize`:Info Text|Description of how the game works@@manual.intro.mechanics.text:In 10 Runden triffst du Entscheidungen über Anbau, Düngung und Schutz.`,
      'manual.concepts.title': $localize`:Heading|Title for the game concepts section@@manual.concepts.title:Konzepte`,
      'manual.footer': $localize`:Footer Text|Copyright and project info@@landing.footer:© ${this.year}:INTERPOLATION: Soil Projekt. Entwickelt für Bildungszwecke.`,
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
