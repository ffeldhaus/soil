import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GAME_CONSTANTS } from '../game-constants';
import { AGRICULTURAL_REFERENCES } from '../references';
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
  agriRefs = AGRICULTURAL_REFERENCES;

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
      'manual.teacher.title': $localize`:Heading|Title for the teacher guide section@@manual.teacher.title:Handreichung für Lehrende`,
      'manual.teacher.concept.title': $localize`:Subheading|Title for pedagogical concept@@manual.teacher.concept.title:Pädagogisches Konzept`,
      'manual.teacher.concept.text': $localize`:Info Text|Description of the pedagogical approach@@manual.teacher.concept.text:SOIL ist als problemorientierte Simulation konzipiert. Die Lernenden sollen durch Versuch und Irrtum (Trial & Error) die komplexen Zusammenhänge zwischen ökonomischem Erfolg und ökologischer Nachhaltigkeit begreifen.`,
      'manual.teacher.group.title': $localize`:Subheading|Title for group play instructions@@manual.teacher.group.title:Gruppendynamik`,
      'manual.teacher.group.text': $localize`:Info Text|Instructions for group-based play@@manual.teacher.group.text:Es wird empfohlen, Schüler in Gruppen von 2-4 Personen als ein 'Farmer-Team' spielen zu lassen. Dies fördert den Diskurs über die beste Strategie und zwingt zur Begründung von Entscheidungen.`,
      'manual.teacher.discussion.title': $localize`:Subheading|Title for discussion prompts@@manual.teacher.discussion.title:Diskussionsanregungen`,
      'manual.teacher.discussion.text': $localize`:Info Text|Suggested topics for classroom discussion@@manual.teacher.discussion.text:Nutzen Sie die Rundenergebnisse für Reflexionen: Warum war Gruppe A erfolgreicher? Welchen Einfluss hatte das Wetter? Ist ein hoher Kontostand wichtiger als eine gute Bodenqualität?`,
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
