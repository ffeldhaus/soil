import { CommonModule, isPlatformBrowser } from '@angular/common';
import { type AfterViewInit, Component, type ElementRef, inject, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  year = new Date().getFullYear();

  selectedState = signal<string>('Nordrhein-Westfalen');

  scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.route.fragment.subscribe((fragment) => {
        if (fragment) {
          this.scrollToFragment(fragment);
        } else {
          this.scrollContainer()?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  }

  onStateChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    if (select?.value) {
      this.selectedState.set(select.value);
    }
  }

  scrollToFragment(fragment: string) {
    if (!fragment) return;

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

  printPage(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  curriculumLevels = [
    {
      stage: 'Unterstufe (Klasse 5–6)',
      preset: 'Einsteiger / Unterstufe',
      topics:
        'Herkunft von Lebensmitteln, natürliche Standortfaktoren wie Boden und Wetter, Vergleich von konventioneller und ökologischer Landwirtschaft sowie Grünland und Tierhaltung.',
      simulation:
        'Alle 40 Parzellen starten mit einheitlicher Bodenqualität von 100 und Nährstoffen von 100, verlässlicher Wettervorhersage und 0% Überziehungszins.',
    },
    {
      stage: 'Mittelstufe (Klasse 7–10)',
      preset: 'Standard / Mittelstufe',
      topics:
        'Ökosystem Boden, Stickstoffkreislauf mit Leguminosen, Humusaufbau, integrierter Pflanzenschutz, Marktpreisbildung, EU-Agrarförderung und das Nachhaltigkeitsdreieck in der BNE.',
      simulation:
        'Fünf Boden-Zonen von 88 bis 112, saisonaler Wettertrend, 6% Überziehungszins und rotierende Regionalverträge ab Runde 3.',
    },
    {
      stage: 'Oberstufe (Klasse 11–13)',
      preset: 'Profi / Oberstufe',
      topics:
        'Dust-Bowl-Syndrom, Bodendegradation und Erosion im Klimawandel, Agrobusiness im Spannungsfeld der Welternährung sowie Umweltökonomie und externe Kosten.',
      simulation:
        'Stark variierende Boden-Zonen von 76 bis 124, zunehmender Klimastress im Spielverlauf, 10% Überziehungszins und ein Insolvenz-Limit ab -50.000 €.',
    },
  ];

  curriculumStates = [
    {
      state: 'Baden-Württemberg',
      curriculum: 'Bildungsplan 2016 & Oberstufe',
      bneAndBio:
        'Verankert in der Leitperspektive BNE sowie in Biologie und BNT: Nutzpflanzen, Lebensraum Boden, Stickstoffkreislauf, Ökologie und Artenvielfalt auf Agrarflächen.',
      geo: 'Klasse 5/6 Landwirtschaft in Deutschland, Klasse 7–10 globale Herausforderungen sowie in der Kursstufe Boden als physiogeographischer Baustein, Bodendegradation und nachhaltige Bodennutzung.',
      econ: 'Im Fach Wirtschaft / Berufs- und Studienorientierung ab Klasse 7: Marktpreisbildung, staatliche Subventionen, Produktionskosten und nachhaltiges Wirtschaften.',
    },
    {
      state: 'Bayern',
      curriculum: 'LehrplanPLUS',
      bneAndBio:
        'Natur und Technik sowie Biologie: Boden als Ökosystem, Stoffkreisläufe, Knöllchenbakterien bei Leguminosen, Biodiversität und Auswirkungen von Pflanzenschutzmitteln.',
      geo: 'Jahrgangsstufe 5 und 6 ländliche Räume sowie konventioneller und ökologischer Landbau, Jahrgangsstufe 9 Landwirtschaft und Boden, Jahrgangsstufe 11/12 Ressource Boden, Erosion und nachhaltiges Ressourcenmanagement.',
      econ: 'Wirtschaft und Recht sowie W- und P-Seminare: unternehmerische Kalkulation, Marktmechanismen, Agrarpolitik und Zielkonflikte zwischen Ökonomie und Ökologie.',
    },
    {
      state: 'Berlin',
      curriculum: 'Rahmenlehrplan Jgst. 1–10 & Gymnasiale Oberstufe',
      bneAndBio:
        'Übergreifendes Thema Nachhaltige Entwicklung sowie Naturwissenschaften und Biologie: Boden und Pflanzen in Jahrgangsstufe 5/6, Stoffkreisläufe und Ökosystemdynamik in Klasse 7–10 und in der Oberstufe.',
      geo: 'Jahrgangsstufe 7–10 Umgang mit Ressourcen und Vergleich landwirtschaftlicher Betriebsweisen sowie in der Qualifikationsphase Q1–Q4 das Kursthema Geoökosysteme im Wandel mit Fokus auf Lithosphäre und Pedosphäre.',
      econ: 'Wirtschaft-Arbeit-Technik und Politische Bildung: Betriebskosten, Einkommenssicherung in der Landwirtschaft und Steuerungswirkung europäischer Agrarsubventionen.',
    },
    {
      state: 'Brandenburg',
      curriculum: 'Rahmenlehrplan Jgst. 1–10 & Gymnasiale Oberstufe',
      bneAndBio:
        'Übergreifendes Thema Nachhaltige Entwicklung sowie Naturwissenschaften und Biologie: Nutzpflanzen und Bodenfruchtbarkeit in Jahrgangsstufe 5/6, Nahrungsnetze, Stickstoffkreislauf und Agrarökosysteme in der Mittel- und Oberstufe.',
      geo: 'Jahrgangsstufe 7–10 Ressourcenkonflikte und nachhaltige Landwirtschaft sowie in der Qualifikationsphase Q1–Q4 die Analyse der Pedosphäre, Bodenerosion und Klimafolgen in Agrarräumen.',
      econ: 'Wirtschaft-Arbeit-Technik und Politische Bildung: Marktpreise, Deckungsbeiträge, Strukturwandel im ländlichen Raum und Förderinstrumente der EU-Agrarpolitik.',
    },
    {
      state: 'Bremen',
      curriculum: 'Rahmenpläne Sekundarstufe I & Gymnasiale Oberstufe',
      bneAndBio:
        'Biologie und Naturwissenschaften: Ökosysteme, Bodenorganismen, Stoffkreisläufe, Erhalt der Biodiversität und Prinzipien nachhaltiger Ressourcennutzung.',
      geo: 'Welt-Umwelt-Kunde und Geographie: Versorgung durch die Landwirtschaft in Klasse 5/6, Bodenerosion und Klimawandel in Klasse 7–10 sowie Mensch-Umwelt-Systeme und Welternährung in der Oberstufe.',
      econ: 'Politik und Wirtschaft: Preisbildung auf Agrarmärkten, betriebswirtschaftliche Zielkonflikte und umweltökonomische Steuerung durch Prämien und Lieferverträge.',
    },
    {
      state: 'Hamburg',
      curriculum: 'Bildungspläne Sekundarstufe I & Studienstufe',
      bneAndBio:
        'Leitperspektive BNE und die 17 Nachhaltigkeitsziele sowie Biologie: Ökosysteme, Stoffkreisläufe, Nährstoffdynamik und der systematische Vergleich von ökologischer und konventioneller Landwirtschaft.',
      geo: 'Sekundarstufe I Agrarräume im Wandel sowie in der Studienstufe der Oberstufe das verbindliche Modul Nachhaltigkeit als Herausforderung am Beispiel von Entwicklungen in der Landwirtschaft.',
      econ: 'Politik-Gesellschaft-Wirtschaft: unternehmerische Entscheidungen unter Unsicherheit, externe Umweltkosten und staatliche Anreizsysteme in der Europäischen Union.',
    },
    {
      state: 'Hessen',
      curriculum: 'Lehrpläne Sekundarstufe I & Kerncurricula Oberstufe',
      bneAndBio:
        'Biologie in Mittel- und Oberstufe: Ökologie und Stoffwechsel, Stickstoffbindung, Schädlingsregulierung durch Fruchtfolgen und Schutz der Artenvielfalt in der Kulturlandschaft.',
      geo: 'Erdkunde Klasse 5/6 Landwirtschaft und Ernährung sowie in der gymnasialen Oberstufe die Erde als Mensch-Umwelt-System, Faktor Boden, Drei-Säulen-Modell der Nachhaltigkeit und Ressourcenschutz.',
      econ: 'Politik und Wirtschaft: Markt und Preisbildung, Subventionen in der europäischen Agrarpolitik, Verschuldungsrisiken und nachhaltige Unternehmensführung.',
    },
    {
      state: 'Mecklenburg-Vorpommern',
      curriculum: 'Rahmenpläne Sekundarstufe I & Gymnasiale Oberstufe',
      bneAndBio:
        'Biologie und BNE: Bodenlebewesen, Humusaufbau, mineralischer Nährstoffhaushalt, biologischer Pflanzenschutz und ökologische Tragfähigkeit landwirtschaftlicher Flächen.',
      geo: 'Geografie Klasse 5–7 Landwirtschaft im norddeutschen Tiefland sowie in Klasse 8–10 und der Oberstufe Agrarstrukturen, Bodenschutz, Agrarökosysteme und nachhaltige Raumnutzung.',
      econ: 'Arbeit-Wirtschaft-Technik und Sozialkunde: Kosten-Erlös-Rechnung im Agrarbetrieb, Mechanisierung, Direktzahlungen und regionale Wertschöpfungsketten.',
    },
    {
      state: 'Niedersachsen',
      curriculum: 'Kerncurricula Sekundarstufe I & Gymnasiale Oberstufe',
      bneAndBio:
        'Biologie und BNE: Ökosysteme, Stickstoffkreislauf, Symbiose bei Leguminosen, Auswirkungen intensiver Düngung und Förderung der Biodiversität durch Blüh- und Grünstreifen.',
      geo: 'Erdkunde Klasse 5/6 Leben und Wirtschaften in ländlichen Räumen sowie in Klasse 7–10 und der Oberstufe agrarische Gunst- und Ungunsträume, Agrobusiness, nachhaltige Landwirtschaft und Konsumfolgen.',
      econ: 'Politik-Wirtschaft: unternehmerisches Handeln zwischen Kosten, Marktpreisen und Zinsen sowie die Steuerungswirkung des europäischen Agrarmarktes und der Umweltpolitik.',
    },
    {
      state: 'Nordrhein-Westfalen',
      curriculum: 'Kernlehrpläne Sekundarstufe I & Sekundarstufe II',
      bneAndBio:
        'Biologie und Leitlinie BNE: Ökosystem Boden, Stoffkreisläufe, Liebigsches Minimumgesetz, Einfluss von Pestiziden auf Nahrungsnetze und Biodiversität in Agrarlandschaften.',
      geo: 'Erdkunde und Gesellschaftslehre: in Klasse 5/6 Standortfaktoren Boden und Klima sowie ökologischer Landbau; in der Oberstufe Landwirtschaft im Spannungsfeld zwischen Ressourcengefährdung, Agrobusiness und dem Dreieck der Nachhaltigkeit.',
      econ: 'Wirtschaft-Politik und Sozialwissenschaften: Marktgleichgewicht, Fixkosten und Deckungsbeiträge, europäische Agrarsubventionen sowie das Dilemma zwischen kurzfristiger Rendite und langfristigem Kapitalerhalt.',
    },
    {
      state: 'Rheinland-Pfalz',
      curriculum: 'Lehrpläne Orientierungsstufe, Sekundarstufe I & Oberstufe',
      bneAndBio:
        'Naturwissenschaften und Biologie: Bodenbeschaffenheit und Pflanzenwachstum in Klasse 5/6 sowie Ökosysteme, Artenvielfalt, Stoffflüsse und biologische Schädlingsbekämpfung in der Mittel- und Oberstufe.',
      geo: 'Erdkunde und Gesellschaftslehre: in der Orientierungsstufe das Thema Landwirte versorgen uns mit konventionellem und ökologischem Landbau; in Klasse 7–10 und der Oberstufe Boden als Ressource, Syndromkonzept und nachhaltige Entwicklung.',
      econ: 'Sozialkunde und Wirtschaft: Preisbildung, Einkommensrisiken durch Ernteschwankungen, Vertragslandwirtschaft und staatliche Förderprogramme.',
    },
    {
      state: 'Saarland',
      curriculum: 'Lehrpläne Sekundarstufe I & Gymnasiale Oberstufe',
      bneAndBio:
        'Biologie und Naturwissenschaften: in Klasse 9/10 sowie in der Oberstufe das Themenfeld Mensch und Umwelt mit Fokus auf ökologischen Fußabdruck, Nachhaltigkeit, natürliche Ressourcen und Agrarökosysteme.',
      geo: 'Gesellschaftswissenschaften und Erdkunde: Landwirtschaft und Versorgung in Klasse 5/6 sowie Mensch-Umwelt-Beziehungen, Bodenerosion, Klimawandel und nachhaltiger Bodenschutz in Sekundarstufe I und II.',
      econ: 'Politik und Wirtschaft: betriebliche Kostenstrukturen, Marktpreise für konventionelle und ökologische Erzeugnisse sowie gesellschaftliche Steuerung durch Agrarprämien.',
    },
    {
      state: 'Sachsen',
      curriculum: 'Lehrpläne Oberschule & Gymnasium',
      bneAndBio:
        'Übergreifendes Thema BNE und Biologie: Bodenbiologie, Nahrungsbeziehungen im Kulturland, Stickstoffkreislauf und ökologische Folgen intensiver Landnutzung.',
      geo: 'Geographie Klasse 5/6 Landwirtschaft in Deutschland sowie in Klasse 7–10 und der Oberstufe Böden als Naturpotenzial, Bodenerosion, Strukturwandel in Agrarräumen und nachhaltiges Ressourcenmanagement.',
      econ: 'Gemeinschaftskunde / Recht und Wirtschaft: unternehmerische Planungsentscheidungen, Kredit- und Zinsrisiken, EU-Förderkulissen und Umweltökonomie.',
    },
    {
      state: 'Sachsen-Anhalt',
      curriculum: 'Fachlehrpläne Sekundarschule & Gymnasium',
      bneAndBio:
        'Biologie und BNE: Pflanzenbau, Nährstoffbedarf, Humuswirtschaft, Fruchtfolgegestaltung zur Vermeidung von Bodenmüdigkeit und Erhalt der Artenvielfalt.',
      geo: 'Geographie Klasse 5/6 landwirtschaftliche Produktion sowie in Klasse 7/8 und der Oberstufe die Bewertung produktionssteigernder Maßnahmen aus ökologischer und ökonomischer Sicht am Beispiel des Schutzguts Boden.',
      econ: 'Wirtschaft und Sozialkunde: Betriebsmittelpreise, Arbeits- und Maschinenkosten, Vermarktungswege sowie staatliche Ausgleichszahlungen für Umweltleistungen.',
    },
    {
      state: 'Schleswig-Holstein',
      curriculum: 'Fachanforderungen Sekundarstufe I & Oberstufe',
      bneAndBio:
        'Biologie und Leitperspektive BNE: Agrarökosysteme, Nährstoffkreisläufe, Vermeidung von Nährstoffüberschüssen, Trinkwasserschutz und Förderung von Nützlingen durch vielfältige Fruchtfolgen.',
      geo: 'Geographie in Sekundarstufe I und II: Strukturwandel im ländlichen Raum, Erhalt der Bodenfruchtbarkeit, Klimaanpassung in der Landwirtschaft und globale wie regionale Nachhaltigkeitsstrategien.',
      econ: 'Wirtschaft/Politik: Marktpreisbildung, Kostenkalkulation im landwirtschaftlichen Betrieb, EU-Direktzahlungen und freiwillige Öko-Regelungen.',
    },
    {
      state: 'Thüringen',
      curriculum: 'Lehrpläne Regelschule, Gemeinschaftsschule & Gymnasium',
      bneAndBio:
        'Mensch-Natur-Technik in Klasse 5/6 mit Schwerpunkt Boden und Nutzpflanzen sowie Biologie in Klasse 7–10 und der Oberstufe zu Ökosystem Boden, Humusabbau und Stoffkreisläufen.',
      geo: 'Geographie in Mittel- und Oberstufe: Bodendegradation, Erosionsschutz, klimatische Ertragsrisiken sowie der Vergleich von konventioneller und ökologischer Landwirtschaft.',
      econ: 'Wirtschaft und Recht sowie Seminarfach: betriebswirtschaftliche Kennzahlen, Investitions- und Zinsentscheidungen, Agrarförderung und nachhaltige Betriebsführung.',
    },
  ];

  faqItems = [
    {
      question: 'Für welche Fächer und Klassenstufen eignet sich das Planspiel SOIL?',
      answer:
        'SOIL ist für die Klassenstufen 5 bis 13 in allen 16 Bundesländern konzipiert. Das Planspiel eignet sich besonders für den Fachunterricht in Geographie und Erdkunde, Biologie und Naturwissenschaften sowie Wirtschaft und Politik. Darüber hinaus lässt es sich flexibel an Projekttagen zur Bildung für nachhaltige Entwicklung einsetzen.',
    },
    {
      question: 'Wie unterscheiden sich die drei Schwierigkeitsgrade für Unter-, Mittel- und Oberstufe?',
      answer:
        'Die Stufe Einsteiger für die Klassen 5 und 6 startet mit einheitlichen Bodenwerten von 100, verlässlicher Wettervorhersage und 0% Überziehungszins. Die Stufe Standard für die Klassen 7 bis 10 ergänzt fünf unterschiedliche Boden-Zonen, saisonale Wettertrends, 6% Überziehungszins und regionale Förderverträge. Die Stufe Profi für die Oberstufe fordert Lernende mit stark heterogenen Böden, zunehmendem Klimastress, 10% Überziehungszins und einer Insolvenzgrenze ab -50.000 €.',
    },
    {
      question: 'Wie läuft eine Einzelstunde oder Doppelstunde im Unterricht praktisch ab?',
      answer:
        'Nach einer zehnminütigen Einführung über die integrierte Spieltour starten die Lernenden ohne Registrierung im Einzelspieler-Modus oder treten per vierstelliger PIN einer gemeinsamen Klassenrunde bei. Anschließend bewirtschaften sie ihren Hof allein oder in Kleingruppen über zehn Spielrunden von insgesamt 30 bis 50 Minuten mit einer kurzen Zwischenbilanz nach Runde 5. Zum Abschluss werden die Rangliste für den zukunftsfähigen Hof sowie die Boden- und Kapitalverläufe gemeinsam ausgewertet.',
    },
    {
      question: 'Welche Themen aus BNE, Biologie, Geographie und Wirtschaft werden konkret simuliert?',
      answer:
        'Biologisch und ökologisch modelliert SOIL den Humusaufbau, den Nährstoffhaushalt, die Stickstofffixierung durch Leguminosen sowie die natürliche Regulierung von Schaderregern durch vielfältige Fruchtfolgen. Geographisch und wirtschaftlich stehen Standortfaktoren, Ertragsrisiken durch Extremwetter, reale Deckungsbeiträge nach KTBL sowie EU-Agrarförderungen und Öko-Regelungen im Mittelpunkt. So erleben die Lernenden unmittelbar, wie kurzfristige Gewinnmaximierung zur Bodendegradation führt und warum ökologische Pflege die Basis für dauerhaften wirtschaftlichen Erfolg bildet.',
    },
    {
      question: 'Ist SOIL kostenlos, werbefrei und DSGVO-konform ohne Schüler-Accounts nutzbar?',
      answer:
        'Ja, SOIL ist als freie Bildungsressource dauerhaft kostenlos, werbefrei und direkt im Browser auf Tablets, Laptops und interaktiven Tafeln spielbar. Schülerinnen und Schüler benötigen kein Benutzerkonto und geben weder Namen noch E-Mail-Adressen ein. Einzelspieler-Runden laufen lokal auf dem Endgerät, während Mehrspieler-Klassenrunden über anonyme vierstellige Team-PINs auf europäischen Servern abgewickelt werden.',
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
