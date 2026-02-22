import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, type OnInit, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="h-full overflow-y-auto custom-scrollbar relative font-sans text-gray-100 overflow-x-hidden">
          <!-- Background Image -->
          <div class="fixed inset-0 h-screen w-screen z-0 pointer-events-none">
            <picture>
              <source srcset="assets/images/bauernhof-portrait-dunkel.webp" media="(orientation: portrait)" />
              <img
                src="assets/images/bauernhof-landscape-dunkel.webp"
                alt=""
                fetchpriority="high"
                class="w-full h-full object-cover portrait:object-center landscape:object-center"
              />
            </picture>
          </div>
      <!-- Navigation Bar -->
      <nav
        class="bg-gray-900/95 border-b border-gray-700 backdrop-blur shadow-lg px-6 py-1 fixed top-0 left-0 right-0 z-50 flex items-center justify-between shrink-0 h-10 print:hidden"
      >
        <div class="flex items-center gap-4">
          <h1 class="text-xl font-bold font-sans text-emerald-500 tracking-wider">SOIL</h1>
        </div>

        <div class="flex items-center gap-3">
          @defer (hydrate on interaction) {
          }

          <a
            routerLink="/"
            class="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition w-10 h-10 flex items-center justify-center"
            title="Back to Landing Page"

          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </a>
        </div>
      </nav>

      <div class="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-16 animate-fade-in">
        <header class="bg-gray-900/80 backdrop-blur-md p-8 md:p-12 rounded-3xl border border-gray-700 shadow-2xl text-center space-y-4">
          <h1
            class="text-4xl md:text-6xl font-bold text-emerald-500 tracking-tight"

          >
            Hintergrund
          </h1>
          <p class="text-xl text-gray-300 leading-relaxed font-light">
            Die Simulation SOIL basiert auf umfangreichen fachdidaktischen Forschungsarbeiten zur Förderung nachhaltigen
            Handelns.
          </p>
        </header>

        <div class="space-y-12">
          <!-- Design Choices -->
          <section class="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-3xl p-8 shadow-2xl">
            <h2 class="text-2xl font-bold text-emerald-400 mb-6 flex items-center gap-3">
              <span class="p-2 bg-emerald-900/30 rounded-xl text-xl">🎨</span>
              <ng-container>Design-Entscheidungen & Fachliche Grundlagen</ng-container>
            </h2>
            <div class="space-y-6 text-gray-300 leading-relaxed">
              <p>
                Die Simulation SOIL wurde so gestaltet, dass sie zentrale Aspekte der deutschen Landwirtschaft abbildet,
                dabei jedoch die Komplexität auf ein für die Lernenden handhabbares Maß reduziert.
              </p>

              <div class="grid md:grid-cols-2 gap-8">
                <div class="bg-gray-950/50 rounded-xl p-6 border border-white/5">
                  <h3 class="text-emerald-300 font-bold mb-2">Pflanzenauswahl</h3>
                  <p class="text-sm">
                    Die Auswahl der Kulturen (Weizen, Gerste, Roggen, Hafer, Mais, Kartoffel, Zuckerrübe, Raps, Erbse, Ackerbohne)
                    repräsentiert die wichtigsten Anbaufrüchte in Deutschland (Quelle: 
                    <a href="https://www.destatis.de/DE/Themen/Branchen-Unternehmen/Landwirtschaft-Forstwirtschaft-Fischerei/Feldfruechte-Gruenland/Tabellen/ackerland-hauptnutzungsarten-kulturarten.html" target="_blank" class="text-emerald-400 hover:underline">Destatis</a>).
                    Raps ist die bedeutendste Ölsaat, während Leguminosen wie Erbsen und Ackerbohnen für die Stickstofffixierung
                    und Bodenfruchtbarkeit essenziell sind (vgl.
                    <a href="https://www.umweltbundesamt.de/daten/land-forstwirtschaft/stickstoffeintrag-aus-der-landwirtschaft#--3" target="_blank" class="text-emerald-400 hover:underline">Umweltbundesamt</a>).
                  </p>
                </div>
                <div class="bg-gray-950/50 rounded-xl p-6 border border-white/5">
                  <h3 class="text-emerald-300 font-bold mb-2">Preise & Markt</h3>
                  <p class="text-sm">
                    Die Preise für Saatgut und Ernten basieren auf aktuellen Marktdaten für Deutschland (Wirtschaftsjahr 2024/2025).
                    Referenzen für konventionelle Preise stammen von der
                    <a href="https://www.ami-informiert.de/" target="_blank" class="text-emerald-400 hover:underline">AMI</a>,
                    während Bio-Marktprämien auf Informationen von
                    <a href="https://www.oekolandbau.de/bio-in-der-praxis/oekologische-landwirtschaft/" target="_blank" class="text-emerald-400 hover:underline">Ökolandbau.de</a>
                    basieren. Im optionalen "Fortgeschrittenen Markt" werden die Preise dynamisch berechnet: 
                    Ein hohes Gesamtangebot aller Spieler führt zu sinkenden Preisen, während Knappheit die Preise steigen lässt.
                    Betriebswirtschaftliche Datensammlungen des
                    <a href="https://www.ktbl.de/webanwendungen/standarddeckungsbeitraege" target="_blank" class="text-emerald-400 hover:underline">KTBL</a> (Kuratorium für Technik und Bauwesen in der Landwirtschaft)
                    dienen als Grundlage für die Modellierung der Maschinen- und Arbeitskosten.
                  </p>
                </div>
                <div class="bg-gray-950/50 rounded-xl p-6 border border-white/5">
                  <h3 class="text-emerald-300 font-bold mb-2">Wetter & Klima</h3>
                  <p class="text-sm">
                    Das Wettersystem modelliert typische Herausforderungen wie Frühsommertrockenheit oder Spätfrost.
                    Integrierte Landwirtschaft (Mischung aus Schutzmaßnahmen und angepasster Düngung) erweist sich oft als
                    die stabilste Strategie gegenüber extremen Wetterereignissen. Die Ertragsausfälle orientieren sich an den
                    realen Schwankungen der Jahre 2023 und 2024 (Quelle: 
                    <a href="https://www.bmel-statistik.de/landwirtschaft/ernte-und-qualitaet/getreideernte/ergebnisse" target="_blank" class="text-emerald-400 hover:underline">BMEL Erntebericht 2024</a>).
                  </p>
                </div>
                <div class="bg-gray-950/50 rounded-xl p-6 border border-white/5">
                  <h3 class="text-emerald-300 font-bold mb-2">Subventionen</h3>
                  <p class="text-sm">
                    Das vereinfachte Subventionsmodell orientiert sich an der EU-Agrarpolitik (GAP).
                    Es setzt sich aus der Einkommensgrundstützung (Basisprämie inkl. Umverteilung von ca. 220 €/ha) und
                    einer zusätzlichen Öko-Prämie (ca. 210 €/ha) zusammen. Letztere unterstützt den Umstieg auf
                    ökologische Bewirtschaftung finanziell und federt die Risiken geringerer Erträge ab (Quellen:
                    <a href="https://www.bmleh.de/DE/themen/landwirtschaft/eu-agrarpolitik-und-foerderung/direktzahlung/direktzahlungen.html" target="_blank" class="text-emerald-400 hover:underline">BMEL</a>,
                    <a href="https://www.agrarheute.com/management/finanzen/agrarfoerderung-2024-so-viel-geld-pro-hektar-bekommen-landwirte-618981" target="_blank" class="text-emerald-400 hover:underline">Agrarheute</a>).
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- Weather & Pests Section -->
          <section class="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-3xl p-8 shadow-2xl">
            <h2 class="text-2xl font-bold text-emerald-400 mb-6 flex items-center gap-3">
              <span class="p-2 bg-emerald-900/30 rounded-xl text-xl">🐛</span>
              <ng-container>Wissenschaftlicher Hintergrund: Wetter & Schädlinge</ng-container>
            </h2>
            <div class="space-y-8 text-gray-300 leading-relaxed">
              <div class="grid md:grid-cols-2 gap-8">
                <div class="space-y-4">
                  <h3 class="text-white font-bold flex items-center gap-2">
                    <span class="text-emerald-500">⛅</span>
                    <ng-container>Einfluss extremer Wetterereignisse</ng-container>
                  </h3>
                  <p class="text-sm">
                    Der Klimawandel führt in Mitteleuropa zu einer Zunahme von Extremwetterlagen. Die Simulation bildet dies durch
                    verschiedene Szenarien ab (Hintergrundinformationen beim
                    <a href="https://www.julius-kuehn.de/pb/klimaanpassung" target="_blank" class="text-emerald-400 hover:underline">JKI</a>):
                  </p>
                  <ul class="list-disc list-outside ml-5 text-xs space-y-2">
                    <li>
                      <strong class="text-white">Frühsommertrockenheit & Hitzewellen:</strong> Kritisch für Getreide in der Bestockungsphase. Ertragsverluste von 20-40% sind in Trockenjahren realistisch und belasten die Bodenstruktur durch Humusabbau.
                    </li>
                    <li>
                      <strong class="text-white">Spätfrost:</strong> Gefährdet besonders keimende Kulturen wie Mais und Zuckerrüben sowie die Blüte von Raps.
                    </li>
                    <li>
                      <strong class="text-white">Staunässe/Hochwasser:</strong> Führt zu Sauerstoffmangel im Boden, Wurzelfäule und verstärkter Erosion, was insbesondere bei Hackfrüchten zu Totalausfällen führen kann.
                    </li>
                  </ul>
                </div>
                <div class="space-y-4">
                  <h3 class="text-white font-bold flex items-center gap-2">
                    <span class="text-emerald-500">🦗</span>
                    <ng-container>Schädlingsdruck & Tierseuchen</ng-container>
                  </h3>
                  <p class="text-sm">
                    Die Wahl der Schädlinge und Seuchen basiert auf den ökonomisch bedeutendsten Bedrohungen in Deutschland (Referenzen:
                    <a href="https://www.isip.de/" target="_blank" class="text-emerald-400 hover:underline">ISIP</a>, 
                    <a href="https://www.fli.de/de/aktuelles/tierseuchengeschehen/afrikanische-schweinepest/" target="_blank" class="text-emerald-400 hover:underline">FLI</a>):
                  </p>
                  <ul class="list-disc list-outside ml-5 text-xs space-y-2">
                    <li>
                      <strong class="text-white">Maiszünsler:</strong> Der bedeutendste Maisschädling in DE. Ohne Bekämpfung drohen bis zu 50% Ertragsverlust durch Stängelbruch.
                    </li>
                    <li>
                      <strong class="text-white">Kartoffelkäfer:</strong> Ein klassischer Defoliator. Der Kahlfraß kann die Knollenbildung fast vollständig unterbinden.
                    </li>
                    <li>
                      <strong class="text-white">Getreideblattlaus:</strong> Schadet durch Saftentzug und als Vektor für Viren (z.B. Gelbverzwergungsvirus).
                    </li>
                    <li>
                      <strong class="text-white">Afrikanische Schweinepest (ASP):</strong> Eine hochinfektiöse Tierseuche. In der Simulation führt ein Ausbruch zu massiv erhöhten Haltungskosten durch Hygieneauflagen und Restriktionszonen.
                    </li>
                  </ul>
                </div>
              </div>
              <div class="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4 text-xs italic">
                Hinweis: Die Simulation nutzt eine "Integrierte Strategie" (Nützlingsförderung), um den Einsatz chemisch-synthetischer Pflanzenschutzmittel ökologisch und ökonomisch abzuwägen.
              </div>
            </div>
          </section>

          <!-- Data References -->
          <section class="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-3xl p-8 shadow-2xl">
            <h2 class="text-2xl font-bold text-emerald-400 mb-6 flex items-center gap-3">
              <span class="p-2 bg-emerald-900/30 rounded-xl text-xl">📊</span>
              Datenquellen & Referenzen
            </h2>
            <div class="grid gap-6 text-sm text-gray-300 leading-relaxed">
              <p>
                Die Modellierung der Simulation stützt sich auf offizielle Statistiken und Fachpublikationen des Zeitraums 2024/2025, 
                um eine realitätsnahe Balance zwischen Ökonomie und Ökologie zu gewährleisten:
              </p>
              <ul class="list-disc list-outside ml-5 space-y-4">
                <li>
                  <strong class="text-white">Erntemengen & Erträge:</strong> 
                  Daten des Bundesministeriums für Ernährung und Landwirtschaft (BMEL).
                  <br/>
                  <a href="https://www.bmel-statistik.de/landwirtschaft/ernte-und-qualitaet/getreideernte/ergebnisse" target="_blank" class="text-emerald-400 hover:underline">BMEL: Ergebnisse der Getreideernte 2024</a> | 
                  <a href="https://www.bmel-statistik.de/landwirtschaft/ernte-und-qualitaet/kartoffelernte" target="_blank" class="text-emerald-400 hover:underline">BMEL: Kartoffelernte 2024</a>
                </li>
                <li>
                  <strong class="text-white">Marktpreise:</strong> 
                  Aktuelle Erzeugerpreise für konventionelle und ökologische Erzeugnisse.
                  <br/>
                  <a href="https://markt.agrarheute.com/marktfruechte/" target="_blank" class="text-emerald-400 hover:underline">Agrarheute: Marktfrüchte Index</a>
                </li>
                <li>
                  <strong class="text-white">Betriebswirtschaft:</strong> 
                  KTBL-Richtwerte dienen als Grundlage für die Modellierung des Arbeitszeitbedarfs und der Maschinenkosten.
                  <br/>
                  <a href="https://www.ktbl.de/webanwendungen/standarddeckungsbeitraege" target="_blank" class="text-emerald-400 hover:underline">KTBL: Standarddeckungsbeiträge</a>
                </li>
                <li>
                  <strong class="text-white">Pflanzenschutz & Tiergesundheit:</strong> 
                  Informationen zu Schadorganismen und Tierseuchen.
                  <br/>
                  <a href="https://www.isip.de/" target="_blank" class="text-emerald-400 hover:underline">ISIP: Integrierter Pflanzenschutz</a> | 
                  <a href="https://www.fli.de/de/aktuelles/tierseuchengeschehen/afrikanische-schweinepest/" target="_blank" class="text-emerald-400 hover:underline">FLI: Afrikanische Schweinepest</a>
                </li>
                <li>
                  <strong class="text-white">Klimawandel & Wetterfolgen:</strong> 
                  Wissenschaftliche Grundlagen zu den Auswirkungen von Extremwetterereignissen auf den Ackerbau.
                  <br/>
                  <a href="https://www.julius-kuehn.de/pb/klimaanpassung" target="_blank" class="text-emerald-400 hover:underline">JKI: Strategien zur Klimaanpassung</a>
                </li>
              </ul>
            </div>
          </section>

          <!-- Main Reference -->
          <section class="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-3xl p-8 shadow-2xl">
            <h2 class="text-2xl font-bold text-emerald-400 mb-6 flex items-center gap-3">
              <span class="p-2 bg-emerald-900/30 rounded-xl text-xl">🎓</span>
              <ng-container>Zentrale Forschungsarbeit</ng-container>
            </h2>
            <div class="space-y-6">
              <div>
                <p class="text-lg font-medium text-white italic mb-2">
                  "Subjektive Theorien zum Lerngegenstand „Nachhaltigkeit“ - Bedingungen und Möglichkeiten zur Förderung
                  eines nachhaltigen Handelns im Biologieunterricht"
                </p>
                <p class="text-gray-400">Dissertation von Dr. Nina Wolf (TU Dortmund, 2014)</p>
              </div>

              <div class="bg-gray-950/50 rounded-xl p-6 border border-white/5 space-y-6">
                <section>
                  <h3 class="text-emerald-300 font-bold mb-2">1. Kernziel: Überwindung der „Wissens-Handlungs-Lücke“</h3>
                  <p>
                    Die zentrale Herausforderung dieser Forschungsarbeit ist die Diskrepanz zwischen dem theoretischen Wissen
                    der Lernenden über Nachhaltigkeit und ihrem tatsächlichen Verhalten. Trotz jahrelanger „Bildung für nachhaltige
                    Entwicklung“ (BNE) zeigen Studien, dass viele Jugendliche nur über geringes Wissen verfügen und es nicht
                    schaffen, ökologische Werte in konkretes Handeln umzusetzen. Die Dissertation zielt darauf ab, eine
                    Lernumgebung zu gestalten, die Nachhaltigkeit nicht nur „predigt“, sondern es den Lernenden ermöglicht, die
                    systemischen Konsequenzen ihrer Entscheidungen durch ein Simulationsspiel namens „SOIL“ zu erleben.
                  </p>
                </section>

                <section>
                  <h3 class="text-emerald-300 font-bold mb-2">2. Theoretischer Rahmen</h3>
                  <ul class="list-disc list-outside ml-5 text-gray-300 space-y-2">
                    <li>
                      <strong class="text-white">Subjektive Theorien:</strong> Die Forschung unterscheidet zwischen weitreichenden
                      Theorien (abstraktes Wissen, beeinflusst selten das Verhalten) und nahreichweiten Theorien (praktische
                      Handlungsskripte). Nachhaltiges Handeln erfordert die Aktivierung und Modifizierung dieser
                      nahreichweiten Theorien durch Erfahrung.
                    </li>
                    <li>
                      <strong class="text-white">Dust-Bowl-Syndrom:</strong> Das Spiel modelliert die nicht nachhaltige
                      Intensivierung der Landwirtschaft, die zu Bodendegradation, Erosion und wirtschaftlichem Zusammenbruch führt
                      und stellt so eine klare Verbindung zwischen Gewinnstreben und ökologischer Zerstörung her.
                    </li>
                  </ul>
                </section>

                <section>
                  <h3 class="text-emerald-300 font-bold mb-2">3. Gestaltungsprinzipien</h3>
                  <ul class="list-disc list-outside ml-5 text-gray-300 space-y-2">
                    <li>
                      <strong class="text-white">Erfahrungsorientiertes Lernen:</strong> Die Lernenden beginnen mit einer
                      gewinnmaximierenden Einstellung. Wenn sie Ressourcen übermäßig ausbeuten, sinken Variablen wie die
                      „Bodenqualität“, was zu Ertragseinbußen führt. Diese „Scheitererfahrung“ erzwingt Reflexion.
                    </li>
                    <li>
                      <strong class="text-white">Ausgewogene Komplexität:</strong> Um eine kognitive Überlastung zu vermeiden,
                      konzentriert sich das Spiel auf die Pedosphäre (Boden), bleibt aber komplex genug (Wetter, Schädlinge,
                      Marktpreise), um einfache lineare Logik zu verhindern.
                    </li>
                  </ul>
                </section>

                <section>
                  <h3 class="text-emerald-300 font-bold mb-2">4. Wichtige Forschungsergebnisse</h3>
                  <p class="text-gray-300 leading-relaxed mb-2">
                    Die Studie identifizierte drei Argumentationstypen:
                  </p>
                  <ol class="list-decimal list-outside ml-5 text-gray-300 space-y-1">
                    <li><strong>Ökonomie über Ökologie:</strong> Pessimismus, Glaube, dass man nichts ändern kann.</li>
                    <li><strong>Ökologie über Ökonomie:</strong> Ablehnung wirtschaftlicher Nutzung, Schutz wird als Verzicht gesehen.</li>
                    <li><strong>Ökologie für Ökonomie:</strong> Erkenntnis, dass ökologische Gesundheit die Voraussetzung für wirtschaftlichen Erfolg ist.</li>
                  </ol>
                  <p class="text-gray-300 leading-relaxed mt-2">
                    <strong>Fazit:</strong> Die Simulation bewegte die Lernenden erfolgreich in Richtung Typ 3, indem sie die Umwelt
                    als „Partner“ und nicht als Gegner sahen.
                  </p>
                </section>

                <section>
                  <h3 class="text-emerald-300 font-bold mb-2">5. Weiterentwicklung zu soil.app</h3>
                  <p class="text-gray-300 leading-relaxed">
                    Die digitale Version automatisiert komplexe Berechnungen, bietet visuelle Daten (Wirkungsdiagramme) und
                    erleichtert präzise „Debriefing“- und Reflexionsphasen, wodurch abstraktes Bewusstsein in funktionale
                    Kompetenzen für nachhaltiges Management umgewandelt wird.
                  </p>
                </section>
              </div>

              <div class="pt-2">
                <a
                  href="https://eldorado.tu-dortmund.de/items/49a1bf1d-288a-464a-a818-373ef41d7fb1"
                  target="_blank"
                  class="inline-flex items-center gap-2 px-6 py-3 bg-emerald-800/50 hover:bg-emerald-700/50 text-emerald-100 rounded-2xl border border-emerald-500/30 transition-all group"
                >
                  <span>Volltext auf eldorado</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 transform group-hover:translate-x-1 transition-transform"
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
              </div>
            </div>
          </section>

          <!-- Publication List -->
          <section class="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-3xl p-8 shadow-2xl space-y-8">
            <h2 class="text-2xl font-bold text-emerald-400 flex items-center gap-3">
              <span class="p-2 bg-emerald-900/30 rounded-xl text-xl">📚</span>
              Weitere Publikationen
            </h2>

            <div class="grid gap-4">
              @for (item of publications; track item.title) {
                <a
                  [href]="item.link"
                  target="_blank"
                  class="block bg-gray-950/50 border border-white/5 rounded-2xl p-6 hover:bg-gray-900/80 hover:border-emerald-500/30 transition-all group"
                >
                  <div class="flex gap-4 items-start">
                    <span class="text-emerald-500 font-mono font-bold">{{ item.year }}</span>
                    <div class="flex-1">
                      <p class="text-gray-200 leading-relaxed group-hover:text-white transition-colors">
                        {{ item.authors }}: <span class="font-medium">{{ item.title }}</span> In:
                        <span class="italic text-gray-400 group-hover:text-emerald-300/80 transition-colors">{{ item.source }}</span>
                      </p>
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5 text-gray-600 group-hover:text-emerald-400 transform group-hover:translate-x-1 transition-all"
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
          </section>
        </div>
      </div>
    </div>
  `,
})
export class InfoComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  year = new Date().getFullYear();

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo(0, 0);
    }
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
