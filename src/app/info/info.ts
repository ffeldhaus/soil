import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  type AfterViewInit,
  Component,
  DestroyRef,
  type ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { INFO_FAQ_ITEMS } from '../app.routes';
import { BackButtonComponent } from '../shared/back-button/back-button';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule, RouterLink, BackButtonComponent],
  templateUrl: './info.html',
})
export class InfoComponent implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  year = new Date().getFullYear();

  selectedState = signal<string>('nordrhein-westfalen');
  readonly faqItems = INFO_FAQ_ITEMS;

  scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fragment) => {
        if (fragment) {
          this.scrollToFragment(fragment);
        } else {
          this.scrollContainer()?.nativeElement.scrollTo?.({ top: 0, behavior: 'smooth' });
        }
      });
    }
  }

  selectState(stateIdOrName: string): void {
    const match = this.curriculumStates.find((item) => item.id === stateIdOrName || item.state === stateIdOrName);
    if (match) {
      this.selectedState.set(match.id);
    }
  }

  onStateChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    if (select?.value) {
      this.selectState(select.value);
    }
  }

  scrollToFragment(fragment: string) {
    if (!fragment) return;
    if (fragment.startsWith('land-')) {
      this.selectState(fragment.slice('land-'.length));
    }

    const attemptScroll = () => {
      const element = document.getElementById(fragment);
      const container = this.scrollContainer()?.nativeElement;

      if (element && container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const relativeTop = elementRect.top - containerRect.top;
        const targetScrollTop = container.scrollTop + relativeTop - 100;

        container.scrollTo?.({
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

  printPage(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  curriculumLevels = [
    {
      stage: 'Orientierungs- & Einstiegsniveau',
      preset: 'Einsteiger / Unterstufe',
      topics:
        'Herkunft von Lebensmitteln, natürliche Standortfaktoren wie Boden und Wetter, Vergleich von konventioneller und ökologischer Landwirtschaft sowie Grünland und Tierhaltung.',
      simulation:
        'Alle 40 Parzellen starten mit einheitlicher Bodenqualität von 100 und Nährstoffen von 100, verlässlicher Wettervorhersage und 0% Überziehungszins.',
    },
    {
      stage: 'Vertiefungsniveau (Sekundarstufe I & Berufsfachschule)',
      preset: 'Standard / Mittelstufe',
      topics:
        'Ökosystem Boden, Stickstoffkreislauf mit Leguminosen, Humusaufbau, integrierter Pflanzenschutz, Marktpreisbildung, EU-Agrarförderung und das Nachhaltigkeitsdreieck in der BNE.',
      simulation:
        'Fünf Boden-Zonen von 88 bis 112, saisonaler Wettertrend, 6% Überziehungszins und rotierende Regionalverträge ab Runde 3.',
    },
    {
      stage: 'Systemisches Niveau (Sekundarstufe II, Berufsschule & Hochschule)',
      preset: 'Profi / Oberstufe',
      topics:
        'Dust-Bowl-Syndrom, Bodendegradation und Erosion im Klimawandel, Agrobusiness im Spannungsfeld der Welternährung sowie Umweltökonomie und externe Kosten.',
      simulation:
        'Stark variierende Boden-Zonen von 76 bis 124, zunehmender Klimastress im Spielverlauf, 10% Überziehungszins und ein Insolvenz-Limit ab -50.000 €.',
    },
  ];

  curriculumStates = [
    {
      id: 'baden-wuerttemberg',
      state: 'Baden-Württemberg',
      curriculum: 'Bildungsplan Sekundarstufe I & Kursstufe',
      bneAndBio:
        'Verankert in der Leitperspektive BNE sowie in Biologie und BNT: Nutzpflanzen, Lebensraum Boden, Stickstoffkreislauf, Ökologie und Artenvielfalt auf Agrarflächen.',
      geo: 'Geographie / Erdkunde: Landwirtschaft in Deutschland und globale Herausforderungen in der Sekundarstufe I sowie in der Kursstufe Boden als physiogeographischer Baustein, Bodendegradation und nachhaltige Bodennutzung.',
      econ: 'Wirtschaft / Berufs- und Studienorientierung: Marktpreisbildung, staatliche Subventionen, Produktionskosten und nachhaltiges Wirtschaften.',
    },
    {
      id: 'bayern',
      state: 'Bayern',
      curriculum: 'LehrplanPLUS Sekundarstufe I & Oberstufe',
      bneAndBio:
        'Natur und Technik sowie Biologie: Boden als Ökosystem, Stoffkreisläufe, Knöllchenbakterien bei Leguminosen, Biodiversität und Auswirkungen von Pflanzenschutzmitteln.',
      geo: 'Geographie: ländliche Räume sowie konventioneller und ökologischer Landbau in der Unter- und Mittelstufe, Landwirtschaft und Boden sowie in der Oberstufe Ressource Boden, Erosion und nachhaltiges Ressourcenmanagement.',
      econ: 'Wirtschaft und Recht sowie W- und P-Seminare: unternehmerische Kalkulation, Marktmechanismen, Agrarpolitik und Zielkonflikte zwischen Ökonomie und Ökologie.',
    },
    {
      id: 'berlin',
      state: 'Berlin',
      curriculum: 'Rahmenlehrplan Sekundarstufe I & Gymnasiale Oberstufe',
      bneAndBio:
        'Übergreifendes Thema Nachhaltige Entwicklung sowie Naturwissenschaften und Biologie: Boden und Nutzpflanzen, Stoffkreisläufe und Ökosystemdynamik in Sekundarstufe I und Oberstufe.',
      geo: 'Geografie: Umgang mit Ressourcen und Vergleich landwirtschaftlicher Betriebsweisen in der Sekundarstufe I sowie in der Qualifikationsphase das Kursthema Geoökosysteme im Wandel mit Fokus auf Lithosphäre und Pedosphäre.',
      econ: 'Wirtschaft-Arbeit-Technik und Politische Bildung: Betriebskosten, Einkommenssicherung in der Landwirtschaft und Steuerungswirkung europäischer Agrarsubventionen.',
    },
    {
      id: 'brandenburg',
      state: 'Brandenburg',
      curriculum: 'Rahmenlehrplan Sekundarstufe I & Gymnasiale Oberstufe',
      bneAndBio:
        'Übergreifendes Thema Nachhaltige Entwicklung sowie Naturwissenschaften und Biologie: Nutzpflanzen und Bodenfruchtbarkeit sowie Nahrungsnetze, Stickstoffkreislauf und Agrarökosysteme in Mittel- und Oberstufe.',
      geo: 'Geografie: Ressourcenkonflikte und nachhaltige Landwirtschaft in der Sekundarstufe I sowie in der Qualifikationsphase die Analyse der Pedosphäre, Bodenerosion und Klimafolgen in Agrarräumen.',
      econ: 'Wirtschaft-Arbeit-Technik und Politische Bildung: Marktpreise, Deckungsbeiträge, Strukturwandel im ländlichen Raum und Förderinstrumente der EU-Agrarpolitik.',
    },
    {
      id: 'bremen',
      state: 'Bremen',
      curriculum: 'Rahmenpläne Sekundarstufe I & Gymnasiale Oberstufe',
      bneAndBio:
        'Biologie und Naturwissenschaften: Ökosysteme, Bodenorganismen, Stoffkreisläufe, Erhalt der Biodiversität und Prinzipien nachhaltiger Ressourcennutzung.',
      geo: 'Welt-Umwelt-Kunde und Geographie: Versorgung durch die Landwirtschaft, Bodenerosion und Klimawandel in der Sekundarstufe I sowie Mensch-Umwelt-Systeme und Welternährung in der Oberstufe.',
      econ: 'Politik und Wirtschaft: Preisbildung auf Agrarmärkten, betriebswirtschaftliche Zielkonflikte und umweltökonomische Steuerung durch Prämien und Lieferverträge.',
    },
    {
      id: 'hamburg',
      state: 'Hamburg',
      curriculum: 'Bildungspläne Sekundarstufe I & Studienstufe',
      bneAndBio:
        'Leitperspektive BNE und die 17 Nachhaltigkeitsziele sowie Biologie: Ökosysteme, Stoffkreisläufe, Nährstoffdynamik und der systematische Vergleich von ökologischer und konventioneller Landwirtschaft.',
      geo: 'Geographie: Agrarräume im Wandel in der Sekundarstufe I sowie in der Studienstufe der Oberstufe das verbindliche Modul Nachhaltigkeit als Herausforderung am Beispiel von Entwicklungen in der Landwirtschaft.',
      econ: 'Politik-Gesellschaft-Wirtschaft: unternehmerische Entscheidungen unter Unsicherheit, externe Umweltkosten und staatliche Anreizsysteme in der Europäischen Union.',
    },
    {
      id: 'hessen',
      state: 'Hessen',
      curriculum: 'Lehrpläne Sekundarstufe I & Kerncurricula Oberstufe',
      bneAndBio:
        'Biologie in Mittel- und Oberstufe: Ökologie und Stoffwechsel, Stickstoffbindung, Schädlingsregulierung durch Fruchtfolgen und Schutz der Artenvielfalt in der Kulturlandschaft.',
      geo: 'Erdkunde: Landwirtschaft und Ernährung in der Sekundarstufe I sowie in der gymnasialen Oberstufe die Erde als Mensch-Umwelt-System, Faktor Boden, Drei-Säulen-Modell der Nachhaltigkeit und Ressourcenschutz.',
      econ: 'Politik und Wirtschaft: Markt und Preisbildung, Subventionen in der europäischen Agrarpolitik, Verschuldungsrisiken und nachhaltige Unternehmensführung.',
    },
    {
      id: 'mecklenburg-vorpommern',
      state: 'Mecklenburg-Vorpommern',
      curriculum: 'Rahmenpläne Sekundarstufe I & Gymnasiale Oberstufe',
      bneAndBio:
        'Biologie und BNE: Bodenlebewesen, Humusaufbau, mineralischer Nährstoffhaushalt, biologischer Pflanzenschutz und ökologische Tragfähigkeit landwirtschaftlicher Flächen.',
      geo: 'Geografie: Landwirtschaft im norddeutschen Tiefland in der Orientierungs- und Mittelstufe sowie in Sekundarstufe I und Oberstufe Agrarstrukturen, Bodenschutz, Agrarökosysteme und nachhaltige Raumnutzung.',
      econ: 'Arbeit-Wirtschaft-Technik und Sozialkunde: Kosten-Erlös-Rechnung im Agrarbetrieb, Mechanisierung, Direktzahlungen und regionale Wertschöpfungsketten.',
    },
    {
      id: 'niedersachsen',
      state: 'Niedersachsen',
      curriculum: 'Kerncurricula Sekundarstufe I & Gymnasiale Oberstufe',
      bneAndBio:
        'Biologie und BNE: Ökosysteme, Stickstoffkreislauf, Symbiose bei Leguminosen, Auswirkungen intensiver Düngung und Förderung der Biodiversität durch Brachland (Grünbrache / Blühstreifen) und Grünland.',
      geo: 'Erdkunde: Leben und Wirtschaften in ländlichen Räumen sowie agrarische Gunst- und Ungunsträume, Agrobusiness, nachhaltige Landwirtschaft und Konsumfolgen in Sekundarstufe I und Oberstufe.',
      econ: 'Politik-Wirtschaft: unternehmerisches Handeln zwischen Kosten, Marktpreisen und Zinsen sowie die Steuerungswirkung des europäischen Agrarmarktes und der Umweltpolitik.',
    },
    {
      id: 'nordrhein-westfalen',
      state: 'Nordrhein-Westfalen',
      curriculum: 'Kernlehrpläne Sekundarstufe I & Sekundarstufe II',
      bneAndBio:
        'Biologie und Leitlinie BNE: Ökosystem Boden, Stoffkreisläufe, Liebigsches Minimumgesetz, Einfluss von Pestiziden auf Nahrungsnetze und Biodiversität in Agrarlandschaften.',
      geo: 'Erdkunde und Gesellschaftslehre: Standortfaktoren Boden und Klima sowie ökologischer Landbau in der Sekundarstufe I; in der Sekundarstufe II Landwirtschaft im Spannungsfeld zwischen Ressourcengefährdung, Agrobusiness und dem Dreieck der Nachhaltigkeit.',
      econ: 'Wirtschaft-Politik und Sozialwissenschaften: Marktgleichgewicht, Fixkosten und Deckungsbeiträge, europäische Agrarsubventionen sowie das Dilemma zwischen kurzfristiger Rendite und langfristigem Kapitalerhalt.',
    },
    {
      id: 'rheinland-pfalz',
      state: 'Rheinland-Pfalz',
      curriculum: 'Lehrpläne Orientierungsstufe, Sekundarstufe I & Oberstufe',
      bneAndBio:
        'Naturwissenschaften und Biologie: Bodenbeschaffenheit und Pflanzenwachstum in der Orientierungsstufe sowie Ökosysteme, Artenvielfalt, Stoffflüsse und biologische Schädlingsbekämpfung in Mittel- und Oberstufe.',
      geo: 'Erdkunde und Gesellschaftslehre: in der Orientierungsstufe das Thema Landwirte versorgen uns mit konventionellem und ökologischem Landbau; in Sekundarstufe I und Oberstufe Boden als Ressource, Syndromkonzept und nachhaltige Entwicklung.',
      econ: 'Sozialkunde und Wirtschaft: Preisbildung, Einkommensrisiken durch Ernteschwankungen, Vertragslandwirtschaft und staatliche Förderprogramme.',
    },
    {
      id: 'saarland',
      state: 'Saarland',
      curriculum: 'Lehrpläne Sekundarstufe I & Gymnasiale Oberstufe',
      bneAndBio:
        'Biologie und Naturwissenschaften: in Sekundarstufe I und Oberstufe das Themenfeld Mensch und Umwelt mit Fokus auf ökologischen Fußabdruck, Nachhaltigkeit, natürliche Ressourcen und Agrarökosysteme.',
      geo: 'Gesellschaftswissenschaften und Erdkunde: Landwirtschaft und Versorgung sowie Mensch-Umwelt-Beziehungen, Bodenerosion, Klimawandel und nachhaltiger Bodenschutz in Sekundarstufe I und II.',
      econ: 'Politik und Wirtschaft: betriebliche Kostenstrukturen, Marktpreise für konventionelle und ökologische Erzeugnisse sowie gesellschaftliche Steuerung durch Agrarprämien.',
    },
    {
      id: 'sachsen',
      state: 'Sachsen',
      curriculum: 'Lehrpläne Oberschule & Gymnasium',
      bneAndBio:
        'Übergreifendes Thema BNE und Biologie: Bodenbiologie, Nahrungsbeziehungen im Kulturland, Stickstoffkreislauf und ökologische Folgen intensiver Landnutzung.',
      geo: 'Geographie: Landwirtschaft in Deutschland sowie Böden als Naturpotenzial, Bodenerosion, Strukturwandel in Agrarräumen und nachhaltiges Ressourcenmanagement in Sekundarstufe I und Oberstufe.',
      econ: 'Gemeinschaftskunde / Recht und Wirtschaft: unternehmerische Planungsentscheidungen, Kredit- und Zinsrisiken, EU-Förderkulissen und Umweltökonomie.',
    },
    {
      id: 'sachsen-anhalt',
      state: 'Sachsen-Anhalt',
      curriculum: 'Fachlehrpläne Sekundarschule & Gymnasium',
      bneAndBio:
        'Biologie und BNE: Pflanzenbau, Nährstoffbedarf, Humuswirtschaft, Fruchtfolgegestaltung zur Vermeidung von Bodenmüdigkeit und Erhalt der Artenvielfalt.',
      geo: 'Geographie: landwirtschaftliche Produktion sowie die Bewertung produktionssteigernder Maßnahmen aus ökologischer und ökonomischer Sicht am Beispiel des Schutzguts Boden in Sekundarstufe I und Oberstufe.',
      econ: 'Wirtschaft und Sozialkunde: Betriebsmittelpreise, Arbeits- und Maschinenkosten, Vermarktungswege sowie staatliche Ausgleichszahlungen für Umweltleistungen.',
    },
    {
      id: 'schleswig-holstein',
      state: 'Schleswig-Holstein',
      curriculum: 'Fachanforderungen Sekundarstufe I & Oberstufe',
      bneAndBio:
        'Biologie und Leitperspektive BNE: Agrarökosysteme, Nährstoffkreisläufe, Vermeidung von Nährstoffüberschüssen, Trinkwasserschutz und Förderung von Nützlingen durch vielfältige Fruchtfolgen.',
      geo: 'Geographie in Sekundarstufe I und II: Strukturwandel im ländlichen Raum, Erhalt der Bodenfruchtbarkeit, Klimaanpassung in der Landwirtschaft und globale wie regionale Nachhaltigkeitsstrategien.',
      econ: 'Wirtschaft/Politik: Marktpreisbildung, Kostenkalkulation im landwirtschaftlichen Betrieb, EU-Direktzahlungen und freiwillige Öko-Regelungen.',
    },
    {
      id: 'thueringen',
      state: 'Thüringen',
      curriculum: 'Lehrpläne Regelschule, Gemeinschaftsschule & Gymnasium',
      bneAndBio:
        'Mensch-Natur-Technik mit Schwerpunkt Boden und Nutzpflanzen sowie Biologie in Mittel- und Oberstufe zu Ökosystem Boden, Humusabbau und Stoffkreisläufen.',
      geo: 'Geographie in Mittel- und Oberstufe: Bodendegradation, Erosionsschutz, klimatische Ertragsrisiken sowie der Vergleich von konventioneller und ökologischer Landwirtschaft.',
      econ: 'Wirtschaft und Recht sowie Seminarfach: betriebswirtschaftliche Kennzahlen, Investitions- und Zinsentscheidungen, Agrarförderung und nachhaltige Betriebsführung.',
    },
  ];

  publications = [
    {
      year: '2021',
      authors: 'Wolf, N., & Graf, D.',
      title: 'SOIL–eine Simulation zum nachhaltigen Denken.',
      source: 'Digitale Bildung für Lehramtsstudierende. Springer Fachmedien.',
      link: 'https://link.springer.com/chapter/10.1007/978-3-658-32344-8_24',
    },
    {
      year: '2019',
      authors: 'Wolf, N.',
      title: 'SOIL - Ein Planspiel zur Förderung nachhaltigen Denkens und Handelns.',
      source: 'MNU Journal.',
      link: 'https://www.mnu.de/zeitschriften/508-mnu-heft-2019-05',
    },
    {
      year: '2014',
      authors: 'Wolf, N.',
      title: 'Bedingungen zur Förderung nachhaltigen Handelns im Biologieunterricht.',
      source: 'Ralle et al. (Hrsg.): Lernaufgaben entwickeln, bearbeiten und überprüfen. Waxmann.',
      link: 'https://www.waxmann.com/buch3070',
    },
    {
      year: '2013',
      authors: 'Wolf, N. & Graf, D.',
      title: 'Iterative Entwicklung eines Unterrichtsdesigns zum Thema Nachhaltigkeit.',
      source: 'Komorek/Prediger (Hrsg.). Waxmann.',
      link: 'https://www.waxmann.com/buecher/?tx_p2waxmann_buchliste%5bbuchnr%5d=2943&tx_p2waxmann_buchliste%5baction%5d=show',
    },
    {
      year: '2012',
      authors: 'Wolf, N. & Graf, D.',
      title: 'Lernende erfassen Ökosysteme in einem Agrar-Planspiel.',
      source: 'Der mathematische und naturwissenschaftliche Unterricht.',
      link: 'https://www.fachportal-paedagogik.de/literatur/vollanzeige.html?FId=3176137',
    },
  ];
}
