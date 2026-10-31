import { CommonModule, isPlatformBrowser } from '@angular/common';
import { type AfterViewInit, Component, type ElementRef, inject, PLATFORM_ID, viewChild } from '@angular/core';
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
      stage: 'Unterstufe / Orientierungsstufe (Klasse 5–6, teils Kl. 7)',
      preset: 'Einsteiger / Unterstufe',
      topics:
        '„Landwirte versorgen uns“, Herkunft von Lebensmitteln, Standortfaktoren Boden und Wetter, Vergleich konventionelle vs. ökologische Landwirtschaft, Tierhaltung (Grünland) und Grundprinzipien des Fruchtwechsels.',
      simulation:
        'Einheitliche Start-Bodenqualität (100) und Nährstoffe (100) auf allen 40 Parzellen, verlässliche Wettervorhersage und keine Überziehungszinsen (0 %), damit der Zusammenhang zwischen Anbauwahl, Ernte und Bodenpflege unmittelbar erfahrbar wird.',
    },
    {
      stage: 'Mittelstufe / Sekundarstufe I (Klasse 7–10)',
      preset: 'Standard / Mittelstufe',
      topics:
        'Ökosystem Boden & Stoffkreisläufe (Stickstoffkreislauf, Leguminosen/Knöllchenbakterien, Humusaufbau, Liebigsches Minimumgesetz), Biodiversität & integrierter Pflanzenschutz, Strukturwandel in der Landwirtschaft, Marktpreisbildung (Angebot, Nachfrage, Produktionskosten), staatliche Steuerung (EU-Agrarpolitik / GAP-Subventionen & Öko-Regelungen) sowie das Nachhaltigkeitsdreieck (BNE).',
      simulation:
        '5 realistische Boden-Zonen (88–112), saisonaler Wettertrend, 6 % Dispozins und ab Runde 3 rotierende Regionalverträge (Eiweißpflanzenstrategie, Wasserschutz, Regionalgetreide, pestizidfreier Anbau).',
    },
    {
      stage: 'Gymnasiale Oberstufe / Sekundarstufe II & Berufliche Schulen (Klasse 11–13 / EF, Q1–Q4)',
      preset: 'Profi / Oberstufe',
      topics:
        'Syndromkonzept (Dust-Bowl-Syndrom, Bodendegradation, Erosion), Geoökosysteme & Pedosphäre im Klimawandel, Agrobusiness vs. Agrarökologie, Umweltökonomie (externe Effekte, Allmendeproblematik, True Cost Accounting) sowie empirische Datenauswertung im Seminarfach, W-Seminar oder Informatikunterricht über die offene Forschungsdaten-API (/research).',
      simulation:
        'Stark heterogene Boden-Zonen (76–124), zunehmender Klimastress im Spielverlauf, 10 % Überziehungszins und ein striktes Insolvenz-Limit ab -50.000 €.',
    },
  ];

  curriculumStates = [
    {
      state: 'Baden-Württemberg',
      curriculum: 'Bildungsplan 2016 & Oberstufe',
      details:
        'Leitperspektive BNE; BNT (Kl. 5/6 Nutzpflanzen & Boden); Geographie (Kl. 5/6 Landwirtschaft in Deutschland; Kl. 7–10 Globale Herausforderungen; Leistungs-/Basisfach Sek II: Boden als physiogeographischer Baustein, Bodendegradation, nachhaltige Bodennutzung); Biologie & Agrarbiologie (Ökologie, Stickstoffkreislauf, Lebensraum Boden); WBS (Kl. 7–10 Markt, Staat, Subventionen & Nachhaltigkeit).',
    },
    {
      state: 'Bayern',
      curriculum: 'LehrplanPLUS',
      details:
        'Geographie (Gymnasium Jgst. 5 & Realschule Jgst. 6: Ländliche Räume, Bodeneigenschaften, konventioneller vs. ökologischer Landbau; Realschule Jgst. 9: Landwirtschaft, Ernährung und Boden; Oberstufe Jgst. 11/12: Ressource Boden, Erosion & nachhaltiges Ressourcenmanagement); Natur und Technik / Biologie (Ökosysteme, Stoffkreisläufe, Artenvielfalt); Wirtschaft und Recht (Marktmechanismen, Agrarpolitik); W-Seminar & P-Seminar.',
    },
    {
      state: 'Berlin & Brandenburg',
      curriculum: 'Gemeinsamer Rahmenlehrplan Jgst. 1–10 & GOST',
      details:
        'Übergreifendes Thema Nachhaltige Entwicklung; Naturwissenschaften / NaWi (Jgst. 5/6 Boden & Pflanzen); Geografie (Jgst. 7–10 Umgang mit Ressourcen, konventionelle vs. ökologische Landwirtschaft; Qualifikationsphase Q1–Q4: Geoökosysteme im Wandel – Lithosphäre und Pedosphäre); Biologie (Stoffkreisläufe, Ökologie); WAT (Wirtschaft-Arbeit-Technik) & Politische Bildung.',
    },
    {
      state: 'Bremen',
      curriculum: 'Rahmenpläne Sek I & GyO',
      details:
        'Welt-Umwelt-Kunde (WUK) / Geographie (Kl. 5/6 Versorgung & Landwirtschaft; Kl. 7–10 Ressourcenkonflikte, Bodenerosion, Klimawandel; Oberstufe: Mensch-Umwelt-Systeme & Welternährung); Biologie (Ökosysteme, Biodiversität, Nachhaltigkeit); Politik / Wirtschaft.',
    },
    {
      state: 'Hamburg',
      curriculum: 'Bildungspläne Stadtteilschule & Gymnasium / Studienstufe',
      details:
        'Leitperspektive BNE & 17 SDGs; Geographie (Sek I: Agrarräume im Wandel; Studienstufe: Pflichtmodul Nachhaltigkeit als Herausforderung – Entwicklungen in der Landwirtschaft hin zu mehr Nachhaltigkeit); Biologie (Ökosysteme, Stoffkreisläufe, ökologische vs. konventionelle Landwirtschaft); PGW (Politik-Gesellschaft-Wirtschaft).',
    },
    {
      state: 'Hessen',
      curriculum: 'Lehrpläne Sek I & Kerncurricula Gymnasiale Oberstufe (KCGO)',
      details:
        'Erdkunde (Kl. 5/6 Landwirtschaft und Ernährung; Sek II KCGO: Erde als Mensch-Umwelt-System, Faktor Boden/Vegetation, Drei-Säulen-Modell der Nachhaltigkeit, Nitratbelastung & Ressourcenschutz); Biologie (Ökologie & Stoffwechsel); Politik und Wirtschaft / PoWi (Markt, Subventionen, Umweltökonomie).',
    },
    {
      state: 'Mecklenburg-Vorpommern',
      curriculum: 'Rahmenpläne Sek I & Gymnasiale Oberstufe',
      details:
        'Geografie (Kl. 5–7 Landwirtschaft im norddeutschen Tiefland; Kl. 8–10 & Sek II: Agrarstrukturen, Bodenschutz, Küsten- und Agrarökosysteme, nachhaltige Raumnutzung); Biologie (Bodenorganismen, Stoffkreisläufe, Ökologie); Arbeit-Wirtschaft-Technik (AWT) & Sozialkunde.',
    },
    {
      state: 'Niedersachsen',
      curriculum: 'Kerncurricula Sek I & Gymnasiale Oberstufe',
      details:
        'Erdkunde (Kl. 5/6 Leben und Wirtschaften in ländlichen Räumen; Kl. 7–10 & Sek II: Agrarische Gunst- und Ungunsträume, Agrobusiness, nachhaltige Landwirtschaft & Konsumfolgen); Biologie (Ökosysteme, Stickstoffkreislauf, Biodiversität); Politik-Wirtschaft (Unternehmenshandeln, EU-Agrarmarkt, Umweltpolitik).',
    },
    {
      state: 'Nordrhein-Westfalen (NRW)',
      curriculum: 'Kernlehrpläne Sek I & Sek II',
      details:
        'Erdkunde / Gesellschaftslehre (Kl. 5/6 Inhaltsfeld Arbeit und Versorgung in Wirtschaftsräumen – Standortfaktoren Boden und Klima, ökologischer Landbau; Sek II EF/Q1/Q2: Landwirtschaft im Spannungsfeld zwischen Ressourcengefährdung und Nachhaltigkeit, Agrobusiness, Dreieck der Nachhaltigkeit); Biologie (Ökologie, Stoffkreisläufe, Pestizideinsatz & Biodiversität); Wirtschaft-Politik / Sozialwissenschaften.',
    },
    {
      state: 'Rheinland-Pfalz',
      curriculum: 'Lehrpläne Erdkunde, Biologie & Sozialkunde',
      details:
        'Erdkunde / Gesellschaftslehre (Orientierungsstufe Kl. 5/6: Landwirte versorgen uns – konventioneller vs. ökologischer Landbau; Kl. 7–10 & Sek II: Boden als Ressource, Syndromkonzept, nachhaltige Entwicklung); Biologie (Ökosysteme, Artenvielfalt, Stoffflüsse); Sozialkunde / Wirtschaft.',
    },
    {
      state: 'Saarland',
      curriculum: 'Lehrpläne Gemeinschaftsschule & Gymnasium',
      details:
        'Gesellschaftswissenschaften / Erdkunde (Kl. 5/6 Landwirtschaft & Versorgung; Sek I/II: Mensch-Umwelt-Beziehungen, Bodenschutz); Biologie (Kl. 9/10 & Sek II Themenfeld Mensch und Umwelt: Ökologischer Fußabdruck, Nachhaltigkeit, Ressourcen & Agrarökosysteme); Politik / Wirtschaft.',
    },
    {
      state: 'Sachsen',
      curriculum: 'Lehrpläne Oberschule & Gymnasium',
      details:
        'Übergreifendes Thema BNE; Geographie (Kl. 5/6 Landwirtschaft in Deutschland; Kl. 7–10 & Sek II: Böden als Naturpotenzial, Bodenerosion, Strukturwandel in Agrarräumen, Ressourcenmanagement); Biologie (Bodenbiologie, Nahrungsnetze, Stoffkreisläufe); Gemeinschaftskunde / Recht und Wirtschaft (GRW).',
    },
    {
      state: 'Sachsen-Anhalt',
      curriculum: 'Fachlehrpläne Sekundarschule & Gymnasium',
      details:
        'Geographie & Biologie (Kl. 5/6 Landwirtschaftliche Produktion; Kl. 7/8 & Sek II: Maßnahmen zur Steigerung der landwirtschaftlichen Produktion aus ökologischer und ökonomischer Sicht bewerten, Schutzgut Boden, Schwarzerde-Böden & Wasserhaushalt); Wirtschaft / Sozialkunde.',
    },
    {
      state: 'Schleswig-Holstein',
      curriculum: 'Fachanforderungen Geographie, Biologie & Wirtschaft/Politik',
      details:
        'Geographie (Sek I & II: Strukturwandel im ländlichen Raum, Bodenfruchtbarkeit, Küsten- und Agrarräume, Nachhaltigkeitsstrategien); Biologie (Agrarökosysteme, Nährstoffkreisläufe, Nitratbelastung & Biodiversität); Wirtschaft/Politik (Marktpreisbildung, EU-Subventionen).',
    },
    {
      state: 'Thüringen',
      curriculum: 'Lehrpläne Regelschule, Gemeinschaftsschule & Gymnasium',
      details:
        'Mensch-Natur-Technik / MNT (Kl. 5/6 Boden & Nutzpflanzen); Geographie & Biologie (Kl. 7–10 & Sek II: Ökosystem Boden, Humusabbau, Bodendegradation, konventionelle vs. ökologische Landwirtschaft); Wirtschaft und Recht & Seminarfach.',
    },
  ];

  faqItems = [
    {
      question:
        'Für welche Fächer und Jahrgangsstufen eignet sich das Planspiel SOIL laut den Lehrplänen der Bundesländer?',
      answer:
        'SOIL ist für die Jahrgangsstufen 5 bis 13 (Unterstufe, Mittelstufe und gymnasiale Oberstufe) sowie für berufliche Schulen (Agrarwirtschaft) in allen 16 Bundesländern konzipiert. Es passt unmittelbar in den Unterricht der Fächer Geographie/Erdkunde, Biologie und Naturwissenschaften (NaWi, BNT, MNT), Wirtschaft/Politik/Sozialwissenschaften (WBS, WAT, PGW, PoWi, GRW, AWT) sowie in fächerübergreifende Projekttage zur Bildung für nachhaltige Entwicklung (BNE).',
    },
    {
      question:
        'Wie passen die drei Schwierigkeitsgrade zu Unterstufe (Kl. 5–6), Mittelstufe (Kl. 7–10) und Oberstufe (Kl. 11–13)?',
      answer:
        'Beim Erstellen eines Spiels wählst du zwischen drei didaktisch abgestuften Profilen: „Einsteiger / Unterstufe“ (Kl. 5–6) startet mit einheitlicher Bodenqualität (100) und Nährstoffen (100), verlässlicher Wettervorhersage und 0 % Überziehungszins. „Standard / Mittelstufe“ (Kl. 7–10) führt 5 realistische Boden-Zonen (88–112), saisonale Wettertrends, 6 % Dispozins und rotierende Regionalverträge ein. „Profi / Oberstufe“ (Kl. 11–13) bildet stark heterogene Böden (76–124), zunehmenden Klimastress, 10 % Überziehungszins und ein striktes Insolvenz-Limit ab -50.000 € ab.',
    },
    {
      question: 'Wie läuft eine Unterrichtsstunde (45 Min.) oder Doppelstunde (90 Min.) mit SOIL praktisch ab?',
      answer:
        'Eine Durchführung gliedert sich in drei Phasen: (1) Einstieg (ca. 10 Min.): Kurze Einführung über die interaktive Tour; Start entweder sofort ohne Anmeldung im Einzelspieler-Modus oder als Klassen-Multiplayer per 4-stelliger PIN bzw. QR-Code. (2) Simulationsphase (30–50 Min.): Die Lernenden bewirtschaften ihren Hof über 10 Runden (allein oder in Zweier-/Dreierteams) mit einer kurzen Zwischenreflexion nach Runde 5. (3) Debriefing & Auswertung (15–25 Min.): Gemeinsamer Vergleich der Rangliste („Zukunftsfähiger Hof“), der Boden- und Kapitalverläufe im Finanzbericht sowie Diskussion des Dust-Bowl-Syndroms.',
    },
    {
      question: 'Ist SOIL kostenlos, werbefrei und DSGVO-konform ohne Schüler-Accounts im Browser spielbar?',
      answer:
        'Ja. SOIL ist eine zu 100 % kostenlose und werbefreie Open Educational Resource (OER) und läuft direkt im Browser auf Tablets, Laptops, Smartphones und interaktiven Whiteboards. Lernende benötigen keinerlei eigenes Benutzerkonto und geben weder Namen noch E-Mail-Adressen ein: Einzelspieler-Partien laufen lokal im Browser, und Klassen-Mehrspielerrunden nutzen anonyme 4-stellige Team-PINs auf EU-Servern (europe-west4).',
    },
    {
      question:
        'Welche biologischen Lehrplaninhalte (Ökosystem Boden, Stickstoffkreislauf, Fruchtfolge, Pflanzenschutz) werden abgebildet?',
      answer:
        'Biologisch modelliert SOIL den Humusaufbau und -abbau (Bodenqualität), den mineralischen Nährstoffhaushalt nach dem Liebigschen Minimumgesetz sowie die biologische Stickstofffixierung durch Körnerleguminosen (Ackerbohne und Erbse in Symbiose mit Knöllchenbakterien). Zudem erleben die Lernenden Selbstunverträglichkeit und bodenbürtige Wurzelkrankheiten bei fehlenden Anbaupausen, die Dämpfung von Schaderregern durch vielfältige Fruchtfolgen (≤ 20 % Flächenanteil) im Vergleich zu Monokulturen sowie die Regeln des kontrolliert ökologischen Landbaus.',
    },
    {
      question:
        'Welche Themen aus Geographie, Wirtschaft und Politik (Marktpreise, GAP-Subventionen, Strukturwandel, Dust-Bowl-Syndrom) lernen Schülerinnen und Schüler?',
      answer:
        'Aus geographischer und ökonomischer Sicht verknüpft SOIL reale Deckungsbeitragsrechnungen (Saatgut-, Dünger-, Pflanzenschutz-, Maschinen- und Arbeitskosten nach KTBL) mit der Gemeinsamen Agrarpolitik der EU (GAP-Basisprämie, Öko-Prämie, Öko-Regelungen ÖR 1a/2/6) und regionalen Lieferverträgen. Lernende erfahren das Dust-Bowl-Syndrom am eigenen Betrieb und vollziehen den Perspektivwechsel von kurzfristiger Gewinnmaximierung hin zu „Ökologie für Ökonomie“.',
    },
    {
      question: 'Auf welchen realen Datenquellen basiert die Simulation?',
      answer:
        'Alle agronomischen und ökonomischen Parameter in SOIL sind wissenschaftlich referenziert (sources.json): Erntemengen und Klimaschwankungen stammen vom Statistischen Bundesamt (Destatis) und dem BMEL-Erntebericht, Arbeitszeit- und Maschinenkosten vom KTBL, Markt- und Betriebsmittelpreise von AMI, Agrarheute, Ökolandbau.de und dem LfULG Sachsen, und Schaderreger- sowie Agrarumweltdaten vom Julius Kühn-Institut (JKI), ISIP, FLI und begutachteten Fachstudien.',
    },
    {
      question:
        'Wie können Oberstufenkurse (W-Seminar, Seminarfach, Informatik, Geographie, Biologie) mit den offenen Forschungsdaten arbeiten?',
      answer:
        'Unter /research stellt SOIL einen streng anonymisierten Open-Data-Forschungsdatensatz abgeschlossener Simulationsspiele bereit. Oberstufenkurse können reale Spielverläufe im Browser inspizieren, als CSV- oder JSON-Datensatz über die REST-API (/api/research) für eigene statistische Auswertungen (z. B. in Python, R oder Tabellenkalkulationen) herunterladen oder über den offenen Model Context Protocol Server (/api/mcp) auswerten.',
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
