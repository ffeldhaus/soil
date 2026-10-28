import { CommonModule, isPlatformBrowser } from '@angular/common';
import { type AfterViewInit, Component, type ElementRef, inject, PLATFORM_ID, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="flex flex-col h-full text-white font-sans overflow-hidden">
      <!-- Navigation Bar -->
      <nav
        class="bg-gray-900 border-b border-gray-800 shadow-md px-4 sm:px-6 py-1 fixed top-0 left-0 right-0 z-[101] flex items-center justify-between shrink-0 h-10 print:hidden"
      >
        <div class="flex items-center gap-4">
          <a routerLink="/" class="text-xl font-bold font-sans text-emerald-500 tracking-wider hover:text-emerald-400 transition-colors cursor-pointer" title="Zur Startseite">SOIL</a>
        </div>

        <div class="flex items-center gap-3">
        </div>
      </nav>

      <div #scrollContainer class="flex-1 overflow-y-auto custom-scrollbar relative">
        <!-- Background Image -->
        <div class="fixed inset-0 h-screen w-screen -z-10 pointer-events-none print:hidden">
          <picture>
            <source srcset="assets/images/bauernhof-portrait-dunkel.webp" media="(orientation: portrait)" />
            <img src="assets/images/bauernhof-landscape-dunkel.webp" alt="" fetchpriority="high" class="w-full h-full object-cover portrait:object-center landscape:object-center" />
          </picture>
        </div>

        <main class="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 pt-14 pb-8">
          <header class="mb-5 p-4 sm:p-5 bg-gray-900 rounded-xl border border-gray-800 shadow-lg">
            <h1 class="text-2xl sm:text-4xl font-bold text-emerald-500 mb-1.5 tracking-tight">
              Hintergrund
            </h1>
            <p class="text-sm sm:text-base text-gray-200 max-w-2xl">Die Simulation SOIL basiert auf umfangreichen fachdidaktischen Forschungsarbeiten zur Förderung nachhaltigen Handelns.</p>
          </header>

          <div class="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-6 items-start">
            <!-- Table of Contents -->
            <aside
              class="mb-5 lg:mb-0 lg:sticky lg:top-14 bg-gray-900 border border-gray-800 rounded-xl p-3 print:hidden"
            >
              <h2 class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 px-2">
                Inhalt
              </h2>
              <nav class="flex flex-row flex-wrap lg:flex-col gap-1">
                <a routerLink="." fragment="research" (click)="scrollToFragment('research')" class="text-xs sm:text-sm text-gray-200 hover:text-white hover:bg-gray-800 px-2.5 py-1.5 rounded-lg transition">
                  Forschung & Publikationen
                </a>
                <a routerLink="." fragment="design" (click)="scrollToFragment('design')" class="text-xs sm:text-sm text-gray-200 hover:text-white hover:bg-gray-800 px-2.5 py-1.5 rounded-lg transition">
                  Grundlagen
                </a>
                <a routerLink="." fragment="science" (click)="scrollToFragment('science')" class="text-xs sm:text-sm text-gray-200 hover:text-white hover:bg-gray-800 px-2.5 py-1.5 rounded-lg transition">
                  Wissenschaft
                </a>
                <a routerLink="." fragment="sources" (click)="scrollToFragment('sources')" class="text-xs sm:text-sm text-gray-200 hover:text-white hover:bg-gray-800 px-2.5 py-1.5 rounded-lg transition">
                  Datenquellen
                </a>
              </nav>
            </aside>

            <div class="space-y-6 min-w-0">
              <!-- Combined Main Reference & Publication List -->
              <section id="research" class="p-4 sm:p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-lg space-y-6 scroll-mt-16">
                <div class="space-y-4">
                  <h2 class="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">
                    Zentrale Forschungsarbeit & Publikationen
                  </h2>
                  <div>
                    <p class="text-base sm:text-lg font-medium text-white italic mb-1">
                      "Subjektive Theorien zum Lerngegenstand „Nachhaltigkeit“ – Bedingungen und Möglichkeiten zur Förderung eines nachhaltigen Handelns im Biologieunterricht"
                    </p>
                    <p class="text-xs sm:text-sm text-gray-400">Dissertation von Dr. Nina Wolf (TU Dortmund, 2014)</p>
                  </div>

                  <div class="bg-gray-950 rounded-lg p-4 sm:p-5 border border-gray-800 space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
                    <section>
                      <h3 class="text-emerald-300 font-bold mb-1.5 text-sm sm:text-base">1. Kernziel: Überwindung der „Wissens-Handlungs-Lücke“</h3>
                      <p>
                        Die zentrale Herausforderung dieser Forschungsarbeit ist die Diskrepanz zwischen dem theoretischen Wissen der Lernenden über Nachhaltigkeit und ihrem tatsächlichen Verhalten. Trotz jahrelanger „Bildung für nachhaltige Entwicklung“ (BNE) zeigen Studien, dass viele Jugendliche nur über geringes Wissen verfügen und es nicht schaffen, ökologische Werte in konkretes Handeln umzusetzen. Die Dissertation zielt darauf ab, eine Lernumgebung zu gestalten, die Nachhaltigkeit nicht nur „predigt“, sondern es den Lernenden ermöglicht, die systemischen Konsequenzen ihrer Entscheidungen durch ein Simulationsspiel namens „SOIL“ zu erleben.
                      </p>
                    </section>

                    <section>
                      <h3 class="text-emerald-300 font-bold mb-1.5 text-sm sm:text-base">2. Theoretischer Rahmen</h3>
                      <ul class="list-disc list-outside ml-5 space-y-1.5">
                        <li>
                          <strong class="text-white">Subjektive Theorien:</strong> Die Forschung unterscheidet zwischen weitreichenden Theorien (abstraktes Wissen, beeinflusst selten das Verhalten) und nahreichweiten Theorien (praktische Handlungsskripte). Nachhaltiges Handeln erfordert die Aktivierung und Modifizierung dieser nahreichweiten Theorien durch Erfahrung.
                        </li>
                        <li>
                          <strong class="text-white">Dust-Bowl-Syndrom:</strong> Das Spiel modelliert die nicht nachhaltige Intensivierung der Landwirtschaft, die zu Bodendegradation, Erosion und wirtschaftlichem Zusammenbruch führt und stellt so eine klare Verbindung zwischen Gewinnstreben und ökologischer Zerstörung her.
                        </li>
                      </ul>
                    </section>

                    <section>
                      <h3 class="text-emerald-300 font-bold mb-1.5 text-sm sm:text-base">3. Gestaltungsprinzipien</h3>
                      <ul class="list-disc list-outside ml-5 space-y-1.5">
                        <li>
                          <strong class="text-white">Erfahrungsorientiertes Lernen:</strong> Die Lernenden beginnen mit einer gewinnmaximierenden Einstellung. Wenn sie Ressourcen übermäßig ausbeuten, sinken Variablen wie die „Bodenqualität“, was zu Ertragseinbußen führt. Diese „Scheitererfahrung“ erzwingt Reflexion.
                        </li>
                        <li>
                          <strong class="text-white">Ausgewogene Komplexität:</strong> Um eine kognitive Überlastung zu vermeiden, konzentriert sich das Spiel auf die Pedosphäre (Boden), bleibt aber komplex genug (Wetter, Schädlinge, Marktpreise), um einfache lineare Logik zu verhindern.
                        </li>
                      </ul>
                    </section>

                    <section>
                      <h3 class="text-emerald-300 font-bold mb-1.5 text-sm sm:text-base">4. Wichtige Forschungsergebnisse</h3>
                      <p class="mb-1.5">
                        Die Studie identifizierte drei Argumentationstypen:
                      </p>
                      <ol class="list-decimal list-outside ml-5 space-y-1">
                        <li><strong class="text-white">Ökonomie über Ökologie:</strong> Pessimismus, Glaube, dass man nichts ändern kann.</li>
                        <li><strong class="text-white">Ökologie über Ökonomie:</strong> Ablehnung wirtschaftlicher Nutzung, Schutz wird als Verzicht gesehen.</li>
                        <li><strong class="text-white">Ökologie für Ökonomie:</strong> Erkenntnis, dass ökologische Gesundheit die Voraussetzung für wirtschaftlichen Erfolg ist.</li>
                      </ol>
                      <p class="mt-2">
                        <strong class="text-white">Fazit:</strong> Die Simulation bewegte die Lernenden erfolgreich in Richtung Typ 3, indem sie die Umwelt als „Partner“ und nicht als Gegner sahen.
                      </p>
                    </section>

                    <section>
                      <h3 class="text-emerald-300 font-bold mb-1.5 text-sm sm:text-base">5. Weiterentwicklung zu soil.app</h3>
                      <p>
                        Die digitale Version automatisiert komplexe Berechnungen, bietet visuelle Daten (Wirkungsdiagramme) und erleichtert präzise „Debriefing“- und Reflexionsphasen, wodurch abstraktes Bewusstsein in funktionale Kompetenzen für nachhaltiges Management umgewandelt wird.
                      </p>
                    </section>
                  </div>

                  <div class="pt-1 flex flex-wrap items-center gap-3">
                    <a
                      href="https://eldorado.tu-dortmund.de/items/49a1bf1d-288a-464a-a818-373ef41d7fb1"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-lg border border-emerald-600/50 transition-colors group"
                    >
                      <span>Volltext auf eldorado (TU Dortmund)</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                    <a
                      routerLink="/research"
                      data-testid="info-research-data-link"
                      class="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-emerald-400 hover:text-emerald-300 text-xs sm:text-sm font-bold rounded-lg border border-gray-700 transition-colors"
                    >
                      <span>Offene Forschungsdaten, API &amp; MCP-Server ansehen →</span>
                    </a>
                  </div>
                </div>

                <div id="publications" class="pt-4 border-t border-gray-800 space-y-3 scroll-mt-16">
                  <h3 class="text-base sm:text-lg font-bold text-emerald-300 tracking-tight">
                    Weitere Publikationen
                  </h3>
                  <div class="grid gap-3">
                    @for (item of publications; track item.title) {
                      <a [href]="item.link" target="_blank" rel="noopener noreferrer" class="block bg-gray-950 border border-gray-800 rounded-lg p-4 hover:bg-gray-800 hover:border-emerald-500/40 transition-colors group">
                        <div class="flex gap-3 items-start text-xs sm:text-sm">
                          <span class="text-emerald-500 font-mono tabular-nums font-bold shrink-0">{{ item.year }}</span>
                          <div class="flex-1 min-w-0">
                            <p class="text-gray-200 group-hover:text-white transition-colors">
                              {{ item.authors }}: <span class="font-medium">{{ item.title }}</span> In:
                              <span class="italic text-gray-400 group-hover:text-emerald-300/80 transition-colors">{{ item.source }}</span>
                            </p>
                          </div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4 text-gray-500 group-hover:text-emerald-400 shrink-0 mt-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </div>
                      </a>
                    }
                  </div>
                </div>
              </section>

              <!-- Design Choices -->
              <section id="design" class="p-4 sm:p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-lg scroll-mt-16">
                <h2 class="text-xl sm:text-2xl font-bold text-emerald-400 mb-4 tracking-tight">
                  Design-Entscheidungen & Fachliche Grundlagen
                </h2>
                <div class="space-y-4 text-sm sm:text-base text-gray-300 leading-relaxed">
                  <p>Die Simulation SOIL wurde so gestaltet, dass sie zentrale Aspekte der deutschen Landwirtschaft abbildet, dabei jedoch die Komplexität auf ein für die Lernenden handhabbares Maß reduziert.</p>
                  <div class="grid md:grid-cols-2 gap-4">
                    <div class="bg-gray-950 rounded-lg p-4 border border-gray-800">
                      <h3 class="text-emerald-300 font-bold mb-1.5 text-sm sm:text-base">Pflanzenauswahl & Fruchtfolge</h3>
                      <p class="text-xs sm:text-sm">Die 10 Kulturen repräsentieren die wichtigsten Anbaufrüchte in Deutschland (<a href="https://www.destatis.de/DE/Themen/Branchen-Unternehmen/Landwirtschaft-Forstwirtschaft-Fischerei/Feldfruechte-Gruenland/Tabellen/gtz-zeitreihe-erntemengen-augewaehlter-anbaukulturen.html" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Destatis-Zeitreihe</a>). Körnerleguminosen wie Erbsen (+1,5 Boden) und Ackerbohnen (+2,0 Boden, +15 Nährstoffe) binden Luftstickstoff (<a href="https://www.umweltbundesamt.de/themen/boden-landwirtschaft/umweltbelastungen-der-landwirtschaft/stickstoff" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Umweltbundesamt</a>), benötigen jedoch mehrjährige Anbaupausen gegen Wurzelkrankheiten (<a href="https://doi.org/10.3389/fpls.2022.1009906" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Šišić et al., 2022</a>; <a href="https://doi.org/10.3389/fpls.2023.1120435" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Hubbard et al., 2023</a>).</p>
                    </div>
                    <div class="bg-gray-950 rounded-lg p-4 border border-gray-800">
                      <h3 class="text-emerald-300 font-bold mb-1.5 text-sm sm:text-base">Preise, Betriebsmittel & Markt</h3>
                      <p class="text-xs sm:text-sm">Erzeugerpreise und Saatgutkosten basieren auf Marktdaten (2024/2025) der <a href="https://www.ami-informiert.de/" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">AMI</a>, <a href="https://www.agrarheute.com/markt" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Agrarheute</a> und <a href="https://www.oekolandbau.de/" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Ökolandbau.de</a>. Arbeitszeitbedarf (8–60 h/ha bei 25 €/h) und Maschinenkosten folgen den <a href="https://www.ktbl.de/webanwendungen/standarddeckungsbeitraege" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">KTBL-Standarddeckungsbeiträgen</a>, Düngemittelkosten den Richtwerten des <a href="https://www.landwirtschaft.sachsen.de/duengerpreise-54093.asp" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">LfULG Sachsen</a>.</p>
                    </div>
                    <div class="bg-gray-950 rounded-lg p-4 border border-gray-800">
                      <h3 class="text-emerald-300 font-bold mb-1.5 text-sm sm:text-base">Wetter & Klima</h3>
                      <p class="text-xs sm:text-sm">Das Wettersystem bildet reale Ertragsschwankungen ab (<a href="https://www.bmel-statistik.de/fileadmin/daten/1002000-2024.pdf" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">BMEL-Erntebericht 2024</a>): Dürre (-10 bis -30 % Ertrag), Hitzewelle (-20 % Ertrag, -1,2 Boden), Starkregen (-30 % Ertrag, -2,0 Boden durch Erosion), Sturm (-15 % Ertrag) und Spätfrost (-15 % Ertrag, aber +0,3 Boden durch Frostgare).</p>
                    </div>
                    <div class="bg-gray-950 rounded-lg p-4 border border-gray-800">
                      <h3 class="text-emerald-300 font-bold mb-1.5 text-sm sm:text-base">Subventionen & Regionalverträge</h3>
                      <p class="text-xs sm:text-sm">1 Parzelle entspricht 1 Hektar (40 ha Gesamtbetrieb). Die Förderung bildet die <a href="https://agriculture.ec.europa.eu/common-agricultural-policy/income-support_de" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">GAP-Direktzahlungen</a> (220 €/ha Basisprämie, +210 €/ha Öko-Prämie) sowie die <a href="https://agriculture.ec.europa.eu/common-agricultural-policy/income-support/eco-schemes_de" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">GAP-Öko-Regelungen</a> (ÖR 1a Grünstreifen/Brache mit 1.200 €/ha bis 5 ha, ÖR 2 und ÖR 6) ab.</p>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Weather & Pests Section -->
              <section id="science" class="p-4 sm:p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-lg scroll-mt-16 space-y-4">
                <h2 class="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">
                  Wissenschaftlicher Hintergrund: Klima, Schädlinge & Förderprogramme
                </h2>
                <div class="grid md:grid-cols-2 gap-4 text-gray-300 leading-relaxed">
                  <div class="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-2">
                    <h3 class="text-white font-bold text-sm sm:text-base">
                      Einfluss extremer Wetterereignisse
                    </h3>
                    <p class="text-xs sm:text-sm">Der Klimawandel verdreifacht die Ertragsverluste durch Hitze- und Dürrewellen in Europa (<a href="https://doi.org/10.1088/1748-9326/abf004" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Brás et al., 2021</a>; <a href="https://doi.org/10.1016/j.foodpol.2022.102359" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Schmitt et al., 2022</a>). Staunässe und Starkregen zählen in Deutschland zu den stärksten negativen Ertragsfaktoren (<a href="https://doi.org/10.1088/1748-9326/aba2a4" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Webber et al., 2020</a>), während Spätfröste durch verfrühten Vegetationsbeginn zunehmen (<a href="https://www.bgc-jena.mpg.de/en/late-frost-crop-failures" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">MPI für Biogeochemie</a>).</p>
                  </div>
                  <div class="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-2">
                    <h3 class="text-white font-bold text-sm sm:text-base">
                      Schädlingsdruck & Tierseuchen
                    </h3>
                    <p class="text-xs sm:text-sm">Die modellierten Schaderreger (u. a. Schwarze Bohnenlaus, Getreideblattlaus, Kartoffelkäfer, Maiszünsler, Rapsglanzkäfer, Erbsenwickler, Rübennematode, Haferkronenrost) und die Afrikanische Schweinepest orientieren sich an den Monitoringdaten von <a href="https://www.isip.de/" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">ISIP</a>, dem <a href="https://www.julius-kuehn.de/" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Julius Kühn-Institut (JKI)</a> und dem <a href="https://www.fli.de/" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Friedrich-Loeffler-Institut (FLI)</a>.</p>
                  </div>
                </div>

                <div class="grid md:grid-cols-2 gap-4 text-gray-300 leading-relaxed">
                  <div class="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-1.5">
                    <h3 class="text-emerald-300 font-bold text-sm sm:text-base">
                      Regionale Eiweiß-Initiative (+3.500 €)
                    </h3>
                    <p class="text-xs sm:text-sm">Mindestens 6 Parzellen (15 % der Fläche) Ackerbohne oder Erbse. Vorbild sind die <a href="https://www.bmel.de/DE/themen/landwirtschaft/pflanzenbau/ackerbau/eiweisspflanzenstrategie.html" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">BMEL-Eiweißpflanzenstrategie</a> und die <a href="https://agriculture.ec.europa.eu/common-agricultural-policy/income-support/eco-schemes_de" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">GAP Öko-Regelung 2</a> (~60 €/ha für vielfältige Kulturen mit ≥ 10 % Leguminosen, ergänzt um Länder-AUKM). Langzeitstudien zeigen, dass Parzellenwechsel essenziell ist, um bodenbürtige Wurzelfäulen zu vermeiden (<a href="https://doi.org/10.3389/fpls.2022.1009906" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Šišić et al., 2022</a>; <a href="https://doi.org/10.3389/fpls.2023.1120435" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Hubbard et al., 2023</a>).</p>
                  </div>
                  <div class="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-1.5">
                    <h3 class="text-emerald-300 font-bold text-sm sm:text-base">
                      Humus-Programm der Wasserwerke (+4.000 €)
                    </h3>
                    <p class="text-xs sm:text-sm">Durchschnittliche Bodenqualität ≥ 100 und mindestens 5 Parzellen (12,5 %) Wiese oder Brachland (100 €/ha betriebsweit). Vorbild sind Kooperationen deutscher Wasserversorger zum Trinkwasserschutz (80–250 €/ha Ausgleichszahlungen). Ökonometrische Analysen aus Bayern belegen, dass grünlandbasierte Schutzverträge Nitrat im Grundwasser signifikant senken (<a href="https://doi.org/10.1016/j.jrurstud.2022.03.006" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Tzemi et al., 2022</a>; <a href="https://doi.org/10.1007/s10113-024-02324-2" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Hagemann et al., 2024</a>).</p>
                  </div>
                  <div class="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-1.5">
                    <h3 class="text-emerald-300 font-bold text-sm sm:text-base">
                      Mühlenvertrag Regionalgetreide (+3.500 €)
                    </h3>
                    <p class="text-xs sm:text-sm">Mindestens 12 Parzellen aus mindestens 2 verschiedenen Getreidearten bei Bodenqualität ≥ 95. Vorbild sind regionale Mühlen-Qualitätsprogramme (15–40 €/t Aufschlag). Die Vorgabe mehrerer Getreidearten verhindert Mitnahmeeffekte reiner Weizen-Monokulturen (<a href="https://doi.org/10.1016/j.ecolecon.2023.107876" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Weituschat et al., 2023</a>; <a href="https://doi.org/10.1016/j.foodpol.2019.101790" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Bertoni et al., 2019</a>).</p>
                  </div>
                  <div class="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-1.5">
                    <h3 class="text-emerald-300 font-bold text-sm sm:text-base">
                      Pionier-Prämie Pflanzenschutz (+4.000 €)
                    </h3>
                    <p class="text-xs sm:text-sm">Kompletter Verzicht auf chemisch-synthetische Pestizide auf mindestens 30 bewirtschafteten Parzellen bei Bodenqualität ≥ 95 (100 €/ha betriebsweit). Vorbild sind die <a href="https://agriculture.ec.europa.eu/common-agricultural-policy/income-support/eco-schemes_de" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">GAP Öko-Regelung 6</a> (50–150 €/ha) sowie mineralisch-ökologische Anbausysteme (<em>NOcsPS</em>), die in deutschen Feldversuchen konventionelle Ertragsniveaus ohne Herbizide/Fungizide erreichen (<a href="https://doi.org/10.1007/s13593-023-00931-7" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Colnenne-David et al., 2023</a>).</p>
                  </div>
                </div>
              </section>

              <!-- Data References -->
              <section id="sources" class="p-4 sm:p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-lg scroll-mt-16">
                <h2 class="text-xl sm:text-2xl font-bold text-emerald-400 mb-4 tracking-tight">
                  Datenquellen & Referenzen
                </h2>
                <div class="grid gap-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
                  <ul class="list-disc list-outside ml-5 space-y-2.5">
                    <li><strong class="text-white">Erntemengen & Zeitreihen:</strong> <a href="https://www.destatis.de/DE/Themen/Branchen-Unternehmen/Landwirtschaft-Forstwirtschaft-Fischerei/Feldfruechte-Gruenland/Tabellen/gtz-zeitreihe-erntemengen-augewaehlter-anbaukulturen.html" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Statistisches Bundesamt (Destatis)</a> sowie der <a href="https://www.bmel-statistik.de/fileadmin/daten/1002000-2024.pdf" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">BMEL-Erntebericht 2024 (PDF)</a>.</li>
                    <li><strong class="text-white">Marktpreise & Betriebsmittel:</strong> Konventionelle und ökologische Erzeugerpreise von <a href="https://www.agrarheute.com/markt" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Agrarheute</a>, <a href="https://www.ami-informiert.de/" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">AMI</a> und <a href="https://www.oekolandbau.de/" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Ökolandbau.de</a>; Düngerpreise des <a href="https://www.landwirtschaft.sachsen.de/duengerpreise-54093.asp" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">LfULG Sachsen</a>.</li>
                    <li><strong class="text-white">Betriebswirtschaft & Maschinenkosten:</strong> <a href="https://www.ktbl.de/webanwendungen/standarddeckungsbeitraege" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">KTBL-Standarddeckungsbeiträge</a> für Arbeitszeitbedarf (h/ha), Lohnansatz (25 €/h) und Mechanisierungsstufen.</li>
                    <li><strong class="text-white">Klimawandel & Pflanzenschutz:</strong> Forschungsarbeiten des <a href="https://www.julius-kuehn.de/" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Julius Kühn-Instituts (JKI)</a>, des <a href="https://www.bgc-jena.mpg.de/en/late-frost-crop-failures" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Max-Planck-Instituts für Biogeochemie</a>, von <a href="https://www.isip.de/" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">ISIP</a> und dem <a href="https://www.fli.de/" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Friedrich-Loeffler-Institut (FLI)</a>.</li>
                    <li><strong class="text-white">Agrarförderung & Regionalverträge:</strong> <a href="https://agriculture.ec.europa.eu/common-agricultural-policy/income-support_de" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">GAP-Direktzahlungen</a> und <a href="https://agriculture.ec.europa.eu/common-agricultural-policy/income-support/eco-schemes_de" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">GAP-Öko-Regelungen</a>, <a href="https://www.bmel.de/DE/themen/landwirtschaft/pflanzenbau/ackerbau/eiweisspflanzenstrategie.html" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">BMEL-Eiweißpflanzenstrategie</a> sowie begutachtete Fachstudien zu Agrarumwelt- und Vertragsprogrammen (<a href="https://doi.org/10.1007/s13593-023-00931-7" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Colnenne-David et al., 2023</a>; <a href="https://doi.org/10.1016/j.jrurstud.2022.03.006" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Tzemi et al., 2022</a>; <a href="https://doi.org/10.1007/s10113-024-02324-2" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Hagemann et al., 2024</a>; <a href="https://doi.org/10.1016/j.ecolecon.2023.107876" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:underline">Weituschat et al., 2023</a>).</li>
                  </ul>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
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
