import { CommonModule, isPlatformBrowser } from '@angular/common';
import { type AfterViewInit, Component, type ElementRef, inject, PLATFORM_ID, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { GAME_CONSTANTS } from '../game-constants';
import { BackButtonComponent } from '../shared/back-button/back-button';
import { ManualConceptCardComponent } from './components/manual-concept-card';
import { ManualCropCardComponent } from './components/manual-crop-card';
import { ManualPrintModalComponent } from './components/manual-print-modal';

@Component({
  selector: 'app-manual',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BackButtonComponent,
    ManualConceptCardComponent,
    ManualCropCardComponent,
    ManualPrintModalComponent,
  ],
  templateUrl: './manual.html',
  styleUrl: './manual.scss',
})
export class ManualComponent implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);

  scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Listen to fragment changes
      this.route.fragment.subscribe((fragment) => {
        if (fragment) {
          this.scrollToFragment(fragment);
        } else {
          this.scrollContainer()?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  }

  scrollToFragment(fragment: string) {
    if (!fragment) return;

    // Attempt multiple times to handle rendering delays
    const attemptScroll = () => {
      const element = document.getElementById(fragment);
      const container = this.scrollContainer()?.nativeElement;

      if (element && container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const relativeTop = elementRect.top - containerRect.top;
        const targetScrollTop = container.scrollTop + relativeTop - 100;

        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth',
        });
        return true;
      }
      return false;
    };

    if (!attemptScroll()) {
      setTimeout(attemptScroll, 100);
    }
    setTimeout(attemptScroll, 300);
  }

  t(key: string): string {
    const translations: Record<string, string> = {
      'manual.print': 'Drucken',
      'board.logout': 'Abmelden',
      'manual.title': 'Handbuch',
      'manual.subtitle': 'Alles, was du über nachhaltige Landwirtschaft in SOIL wissen musst',
      'manual.intro.title': 'Einleitung',
      'manual.intro.goal.title': 'Das Ziel',
      'manual.intro.goal.text':
        'In SOIL schlüpfst du in die Rolle einer Landwirtin oder eines Landwirts. Dein Ziel ist es, deinen Betrieb wirtschaftlich erfolgreich zu führen und gleichzeitig die langfristige Gesundheit deines Bodens zu erhalten. Du musst die richtige Balance zwischen Ertrag, Kosten und ökologischer Nachhaltigkeit finden.',
      'manual.intro.mechanics.title': 'Mechanik & Finanzen',
      'manual.intro.mechanics.text':
        'Ökologischer Anbau führt zu geringeren Erträgen, wird aber durch höhere Bio-Preise und die Öko-Prämie belohnt. Du musst jedoch die hohen Fixkosten (Personal, Pacht, Maschinen) sowie mögliche Überziehungszinsen im Blick behalten, die deinen Gewinn schmälern.',
      'manual.difficulty.title': 'Zielgruppen- & Schwierigkeitsgrade',
      'manual.difficulty.easy.title': 'Einsteiger / Unterstufe',
      'manual.difficulty.easy.text':
        'Alle 40 Parzellen starten mit einheitlicher Bodenqualität (100) und Nährstoffversorgung (100). Du erhältst eine präzise Wettervorhersage für die nächste Runde und es fallen keine Überziehungszinsen an.',
      'manual.difficulty.normal.title': 'Standard / Mittelstufe',
      'manual.difficulty.normal.text':
        'Dein Betrieb ist in 5 ausgewogene Boden-Zonen (Boden 88–112, Nährstoffe 90–110) unterteilt. Du siehst einen saisonalen Wetter-Trend, zahlst 6 % Überziehungszins bei negativem Kontostand und kannst ab Runde 3 lukrative Regionalverträge abschließen.',
      'manual.difficulty.hard.title': 'Profi / Oberstufe',
      'manual.difficulty.hard.text':
        'Stark variierende Boden-Zonen (Boden 76–124, Nährstoffe 80–120), zunehmender Klimastress im Spielverlauf mit verstärkten Wetterfolgen, 10 % Dispozins bei Kontoüberziehung sowie ein striktes Insolvenz-Limit ab -50.000 €.',
      'manual.weatherContracts.title': 'Wetter, Schonfrist & Regionalverträge',
      'manual.weatherContracts.grace.title': 'Schonfrist & Wetterereignisse',
      'manual.weatherContracts.grace.text':
        'In den ersten 2 Runden herrscht eine Schonfrist mit garantiert normalem Wetter, damit du deine Fruchtfolge aufbauen kannst. Danach beeinflussen Dürre, Hitzewelle (HeatWave), Kälte und Starkregen (Flood) Erträge und Boden. Vor jeder Runde hilft dir eine saisonale Wettervorhersage bei der Anbauplanung.',
      'manual.weatherContracts.contracts.title': 'Regionalverträge & Förderprogramme',
      'manual.weatherContracts.contracts.text':
        'Ab Runde 2 werden rotierende Regionalverträge angeboten, die realen Förderprogrammen nachempfunden sind: der BMEL-Eiweißpflanzenstrategie & GAP Öko-Regelung 2 (Leguminosen), dem kooperativen Trinkwasserschutz der Wasserwerke (Humus & Grünland/Brache), dem regionalen Mühlen-Vertragsanbau (mehrgliedriger Getreideanbau) sowie der GAP Öko-Regelung 6 / NOcsPS (kompletter Verzicht auf chemisch-synthetische Pestizide).',
      'manual.scoring.title': 'Zukunftsfähiger Hof (Hauptwertung) & Hof-Sticker',
      'manual.scoring.viability.title': 'Zukunftsfähiger Hof & Rangliste',
      'manual.scoring.viability.text':
        'Die Hauptwertung kombiniert deine finanzielle Stabilität (Kapital) und die lebendige Bodengesundheit (ø Bodenqualität) zu einem gemeinsamen Index für einen zukunftsfähigen Hof. Nach jeder Runde zeigt die animierte Rangliste, wer Ökonomie und Ökologie am besten vereint.',
      'manual.scoring.stickers.title': 'Sammelbare Hof-Sticker',
      'manual.scoring.stickers.text':
        'Für besondere Meilensteine in Bodenpflege, Artenvielfalt, Bio-Bewirtschaftung und Krisenfestigkeit schaltest du insgesamt 8 sammelbare Hof-Sticker in deinem Hof-Album frei.',
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
