import { CommonModule, isPlatformBrowser } from '@angular/common';
import { type AfterViewInit, Component, type ElementRef, inject, PLATFORM_ID, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="flex flex-col h-full bg-gray-900 text-white font-sans overflow-hidden">
      <!-- Navigation Bar -->
      <nav
        class="bg-gray-900/95 border-b border-gray-700 backdrop-blur shadow-lg px-6 py-1 fixed top-0 left-0 right-0 z-[101] flex items-center justify-between shrink-0 h-10 print:hidden"
      >
        <div class="flex items-center gap-4">
          <h1 class="text-xl font-bold font-sans text-emerald-500 tracking-wider">SOIL</h1>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/"
            class="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition w-10 h-10 flex items-center justify-center"
            title="Zur Startseite"
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

      <div #scrollContainer class="flex-1 overflow-y-auto custom-scrollbar relative">
        <!-- Background Image -->
        <div class="fixed inset-0 h-screen w-screen z-0 pointer-events-none print:hidden">
          <picture>
            <source srcset="assets/images/bauernhof-portrait-dunkel.webp" media="(orientation: portrait)" />
            <img src="assets/images/bauernhof-landscape-dunkel.webp" alt="" fetchpriority="high" class="w-full h-full object-cover portrait:object-center landscape:object-center" />
          </picture>
        </div>

        <div class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-[72px] pb-12 portrait:px-0 portrait:max-w-none flex flex-col gap-8">
          <header class="order-1 text-left bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl portrait:rounded-none portrait:border-x-0 relative">
            <h1 class="text-4xl sm:text-6xl font-bold text-emerald-500 mb-4 tracking-tight">
              Hintergrund
            </h1>
            <p class="text-xl text-white max-w-2xl">Die Simulation SOIL basiert auf umfangreichen fachdidaktischen Forschungsarbeiten zur Förderung nachhaltigen Handelns.</p>
          </header>

          <!-- Table of Contents -->
          <aside
            class="order-2 w-full min-[1400px]:w-52 min-[1400px]:absolute min-[1400px]:left-full min-[1400px]:ml-2 min-[1400px]:top-[72px] min-[1400px]:order-none print:hidden shrink-0 z-40 portrait:border-x-0"
          >
            <div class="min-[1400px]:sticky min-[1400px]:top-12 bg-gray-900/80 backdrop-blur-md p-6 rounded-3xl border border-gray-700 shadow-xl h-fit portrait:rounded-none portrait:border-x-0">
              <h2 class="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <span>📋</span>
                Inhalt
              </h2>
              <nav class="flex flex-col gap-2">
                <a routerLink="." fragment="design" (click)="scrollToFragment('design')" class="text-white hover:text-white hover:bg-white/5 px-3 py-2 rounded-xl transition flex items-center gap-2">
                  <span class="text-sm">🎨</span> Grundlagen
                </a>
                <a routerLink="." fragment="science" (click)="scrollToFragment('science')" class="text-white hover:text-white hover:bg-white/5 px-3 py-2 rounded-xl transition flex items-center gap-2">
                  <span class="text-sm">🐛</span> Wissenschaft
                </a>
                <a routerLink="." fragment="sources" (click)="scrollToFragment('sources')" class="text-white hover:text-white hover:bg-white/5 px-3 py-2 rounded-xl transition flex items-center gap-2">
                  <span class="text-sm">📊</span> Datenquellen
                </a>
                <a routerLink="." fragment="research" (click)="scrollToFragment('research')" class="text-white hover:text-white hover:bg-white/5 px-3 py-2 rounded-xl transition flex items-center gap-2">
                  <span class="text-sm">🎓</span> Forschung
                </a>
                <a routerLink="." fragment="publications" (click)="scrollToFragment('publications')" class="text-white hover:text-white hover:bg-white/5 px-3 py-2 rounded-xl transition flex items-center gap-2">
                  <span class="text-sm">📚</span> Publikationen
                </a>
              </nav>
            </div>
          </aside>

          <div class="order-3 relative flex flex-col gap-8">
            <div class="flex-1 flex flex-col gap-8 w-full min-w-0">
              <!-- Design Choices -->
              <section id="design" class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl scroll-mt-24 portrait:rounded-none portrait:border-x-0">
                <h2 class="text-2xl font-bold text-emerald-400 mb-6 flex items-center gap-3">
                  <span class="p-2 bg-emerald-900/30 rounded-xl text-xl">🎨</span>
                  Design-Entscheidungen & Fachliche Grundlagen
                </h2>
                <div class="space-y-6 text-gray-300 leading-relaxed">
                  <p>Die Simulation SOIL wurde so gestaltet, dass sie zentrale Aspekte der deutschen Landwirtschaft abbildet, dabei jedoch die Komplexität auf ein für die Lernenden handhabbares Maß reduziert.</p>
                  <div class="grid md:grid-cols-2 gap-8">
                    <div class="bg-gray-950/50 rounded-xl p-6 border border-white/5">
                      <h3 class="text-emerald-300 font-bold mb-2">Pflanzenauswahl</h3>
                      <p class="text-sm">Die Auswahl der Kulturen repräsentiert die wichtigsten Anbaufrüchte in Deutschland (Quelle: Destatis). Leguminosen wie Erbsen und Ackerbohnen sind für die Stickstofffixierung essenziell (vgl. Umweltbundesamt).</p>
                    </div>
                    <div class="bg-gray-950/50 rounded-xl p-6 border border-white/5">
                      <h3 class="text-emerald-300 font-bold mb-2">Preise & Markt</h3>
                      <p class="text-sm">Die Preise basieren auf aktuellen Marktdaten (2024/2025). Konventionelle Preise stammen von der AMI, Bio-Prämien von Ökolandbau.de. KTBL-Datensammlungen dienen als Grundlage für Kostenmodellierung.</p>
                    </div>
                    <div class="bg-gray-950/50 rounded-xl p-6 border border-white/5">
                      <h3 class="text-emerald-300 font-bold mb-2">Wetter & Klima</h3>
                      <p class="text-sm">Das Wettersystem modelliert Herausforderungen wie Frühsommertrockenheit. Die Ertragsausfälle orientieren sich an den realen Schwankungen der Jahre 2023 und 2024 (BMEL Erntebericht 2024).</p>
                    </div>
                    <div class="bg-gray-950/50 rounded-xl p-6 border border-white/5">
                      <h3 class="text-emerald-300 font-bold mb-2">Subventionen</h3>
                      <p class="text-sm">Das Subventionsmodell orientiert sich an der EU-Agrarpolitik (GAP), bestehend aus Einkommensgrundstützung und einer zusätzlichen Öko-Prämie (BMEL, Agrarheute).</p>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Weather & Pests Section -->
              <section id="science" class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl scroll-mt-24 portrait:rounded-none portrait:border-x-0">
                <h2 class="text-2xl font-bold text-emerald-400 mb-6 flex items-center gap-3">
                  <span class="p-2 bg-emerald-900/30 rounded-xl text-xl">🐛</span>
                  Wissenschaftlicher Hintergrund: Wetter & Schädlinge
                </h2>
                <div class="space-y-8 text-gray-300 leading-relaxed">
                  <div class="grid md:grid-cols-2 gap-8">
                    <div class="space-y-4">
                      <h3 class="text-white font-bold flex items-center gap-2">
                        <span class="text-emerald-500">⛅</span> Einfluss extremer Wetterereignisse
                      </h3>
                      <p class="text-sm">Der Klimawandel führt zu einer Zunahme von Extremwetterlagen (JKI). Ertragsverluste von 20-40% sind in Trockenjahren realistisch.</p>
                    </div>
                    <div class="space-y-4">
                      <h3 class="text-white font-bold flex items-center gap-2">
                        <span class="text-emerald-500">🦗</span> Schädlingsdruck & Tierseuchen
                      </h3>
                      <p class="text-sm">Die Wahl der Schädlinge basiert auf den ökonomisch bedeutendsten Bedrohungen in Deutschland (ISIP, FLI).</p>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Data References -->
              <section id="sources" class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl scroll-mt-24 portrait:rounded-none portrait:border-x-0">
                <h2 class="text-2xl font-bold text-emerald-400 mb-6 flex items-center gap-3">
                  <span class="p-2 bg-emerald-900/30 rounded-xl text-xl">📊</span>
                  Datenquellen & Referenzen
                </h2>
                <div class="grid gap-6 text-sm text-gray-300 leading-relaxed">
                  <ul class="list-disc list-outside ml-5 space-y-4">
                    <li><strong class="text-white">Erntemengen:</strong> Daten des Bundesministeriums für Ernährung und Landwirtschaft (BMEL).</li>
                    <li><strong class="text-white">Marktpreise:</strong> Aktuelle Erzeugerpreise für konventionelle und ökologische Erzeugnisse (Agrarheute).</li>
                    <li><strong class="text-white">Betriebswirtschaft:</strong> KTBL-Richtwerte dienen als Grundlage für Arbeitszeit und Maschinenkosten.</li>
                    <li><strong class="text-white">Klimawandel:</strong> Wissenschaftliche Grundlagen zu Extremwetterereignissen (JKI).</li>
                  </ul>
                </div>
              </section>

              <!-- Main Reference -->
              <section id="research" class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl scroll-mt-24 portrait:rounded-none portrait:border-x-0">
                <h2 class="text-2xl font-bold text-emerald-400 mb-6 flex items-center gap-3">
                  <span class="p-2 bg-emerald-900/30 rounded-xl text-xl">🎓</span>
                  Zentrale Forschungsarbeit
                </h2>
                <div class="space-y-6">
                  <p class="text-lg font-medium text-white italic">"Subjektive Theorien zum Lerngegenstand Nachhaltigkeit" – Dissertation von Dr. Nina Wolf (TU Dortmund, 2014)</p>
                  <div class="bg-gray-950/50 rounded-xl p-6 border border-white/5 space-y-4">
                    <p class="text-gray-300">Die Dissertation zielt darauf ab, eine Lernumgebung zu gestalten, die es Lernenden ermöglicht, die systemischen Konsequenzen ihrer Entscheidungen durch ein Simulationsspiel zu erleben.</p>
                  </div>
                </div>
              </section>

              <!-- Publication List -->
              <section id="publications" class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-8 scroll-mt-24 portrait:rounded-none portrait:border-x-0">
                <h2 class="text-2xl font-bold text-emerald-400 flex items-center gap-3">
                  <span class="p-2 bg-emerald-900/30 rounded-xl text-xl">📚</span>
                  Weitere Publikationen
                </h2>
                <div class="grid gap-4">
                  @for (item of publications; track item.title) {
                    <a [href]="item.link" target="_blank" class="block bg-gray-950/50 border border-white/5 rounded-2xl p-6 hover:bg-gray-900/80 hover:border-emerald-500/30 transition-all group">
                      <div class="flex gap-4 items-start">
                        <span class="text-emerald-500 font-mono font-bold">{{ item.year }}</span>
                        <div class="flex-1">
                          <p class="text-gray-200 group-hover:text-white transition-colors">{{ item.authors }}: <span class="font-medium">{{ item.title }}</span></p>
                        </div>
                      </div>
                    </a>
                  }
                </div>
              </section>
            </div>
          </div>
        </div>
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
      link: 'https://link.springer.com/chapter/10.1007/978-3-658-32344-8_24',
    },
    {
      year: '2019',
      authors: 'Wolf, N.',
      title: 'SOIL - Ein Planspiel zur Förderung nachhaltigen Denkens und Handelns.',
      link: 'https://www.mnu.de/zeitschriften/508-mnu-heft-2019-05',
    },
    {
      year: '2014',
      authors: 'Wolf, N.',
      title: 'Bedingungen zur Förderung nachhaltigen Handelns im Biologieunterricht.',
      link: 'https://www.waxmann.com/buch3070',
    },
    {
      year: '2013',
      authors: 'Wolf, N. & Graf, D.',
      title: 'Iterative Entwicklung eines Unterrichtsdesigns zum Thema Nachhaltigkeit.',
      link: 'https://www.waxmann.com/buecher/?tx_p2waxmann_buchliste%5bbuchnr%5d=2943&tx_p2waxmann_buchliste%5baction%5d=show',
    },
    {
      year: '2012',
      authors: 'Wolf, N. & Graf, D.',
      title: 'Lernende erfassen Ökosysteme in einem Agrar-Planspiel.',
      link: 'https://www.fachportal-paedagogik.de/literatur/vollanzeige.html?FId=3176137',
    },
  ];
}
