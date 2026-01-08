import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LanguageSwitcherComponent } from '../shared/language-switcher/language-switcher';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [RouterLink, LanguageSwitcherComponent],
  template: `
    <div class="min-h-screen relative font-sans text-gray-100 overflow-x-hidden">
      <!-- Language Switcher -->
      <div class="absolute top-6 right-6 z-[100]">
        <app-language-switcher></app-language-switcher>
      </div>

      <!-- Background Image with Overlay -->
      <div class="fixed inset-0 h-screen w-screen z-0 pointer-events-none">
        <picture>
          <source srcset="assets/bauernhof-portrait-hd.webp" media="(orientation: portrait)" />
          <img
            src="assets/bauernhof-landscape-hd.webp"
            alt="Farm Background"
            class="w-full h-full object-cover object-center"
          />
        </picture>
        <div
          class="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90 backdrop-blur-[2px]"
        ></div>
      </div>

      <div class="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 lg:py-24">
        <!-- Navigation -->
        <nav class="mb-12">
          <a
            routerLink="/"
            class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clip-rule="evenodd"
              />
            </svg>
            <span i18n="@@info.backToHome">Zurück zur Startseite</span>
          </a>
        </nav>

        <header class="mb-16">
          <h1
            class="text-4xl md:text-6xl font-sans font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-100 to-emerald-200 drop-shadow-2xl tracking-tight mb-6"
            i18n="@@info.title"
          >
            Wissenschaftlicher Hintergrund
          </h1>
          <p class="text-xl text-gray-300 leading-relaxed font-light" i18n="@@info.subtitle">
            Die Simulation SOIL basiert auf umfangreichen fachdidaktischen Forschungsarbeiten zur Förderung nachhaltigen
            Handelns.
          </p>
        </header>

        <div class="space-y-12">
          <!-- Main Reference -->
          <section class="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h2 class="text-2xl font-bold text-emerald-400 mb-6 flex items-center gap-3">
              <span class="p-2 bg-emerald-900/30 rounded-xl text-xl">🎓</span>
              <ng-container i18n="@@info.mainReferenceTitle">Zentrale Forschungsarbeit</ng-container>
            </h2>
            <div class="space-y-6">
              <div>
                <p class="text-lg font-medium text-white italic mb-2">
                  "Subjektive Theorien zum Lerngegenstand „Nachhaltigkeit“ - Bedingungen und Möglichkeiten zur Förderung
                  eines nachhaltigen Handelns im Biologieunterricht"
                </p>
                <p class="text-gray-400">Dissertation von Dr. Nina Wolf (TU Dortmund, 2014)</p>
              </div>

              <div class="bg-gray-900/30 rounded-xl p-6 border border-white/5 space-y-6">
                <section>
                  <h3 class="text-emerald-300 font-bold mb-2">1. Core Objective: Bridging the "Knowledge-Action Gap"</h3>
                  <p class="text-gray-300 leading-relaxed">
                    The central challenge addressed by this research is the discrepancy between students' theoretical knowledge of
                    sustainability and their actual behavior. Despite years of "Education for Sustainable Development" (ESD),
                    studies show that many youths possess only marginal knowledge and fail to translate environmental values into
                    concrete action. The dissertation aims to design a learning environment that does not just "preach"
                    sustainability but allows students to <strong>experience the systemic consequences of their decisions</strong>
                    through a simulation game called "SOIL."
                  </p>
                </section>

                <section>
                  <h3 class="text-emerald-300 font-bold mb-2">2. Theoretical Framework</h3>
                  <ul class="list-disc list-outside ml-5 text-gray-300 space-y-2">
                    <li>
                      <strong class="text-white">Subjective Theories:</strong> The research distinguishes between <em>High-Reach
                      Theories</em> (abstract knowledge, rarely influences behavior) and <em>Low-Reach Theories</em> (practical
                      action scripts). Sustainable action requires activating and modifying these low-reach theories through
                      experience.
                    </li>
                    <li>
                      <strong class="text-white">Dust-Bowl Syndrome:</strong> The game models the non-sustainable intensification
                      of agriculture leading to soil degradation, erosion, and economic collapse, providing a clear link between
                      profit-seeking and ecological destruction.
                    </li>
                  </ul>
                </section>

                <section>
                  <h3 class="text-emerald-300 font-bold mb-2">3. Design Principles</h3>
                  <ul class="list-disc list-outside ml-5 text-gray-300 space-y-2">
                    <li>
                      <strong class="text-white">Experience-Oriented Learning:</strong> Students start with a profit-maximization
                      mindset. As they over-exploit resources, variables like "Soil Quality" drop, leading to yield loss. This
                      "failed experience" forces reflection.
                    </li>
                    <li>
                      <strong class="text-white">Balanced Complexity:</strong> To avoid cognitive overload, the game focuses on
                      the Pedosphere (soil) but remains complex enough (weather, pests, market prices) to prevent simple linear
                      logic.
                    </li>
                  </ul>
                </section>

                <section>
                  <h3 class="text-emerald-300 font-bold mb-2">4. Key Research Findings</h3>
                  <p class="text-gray-300 leading-relaxed mb-2">
                    The study identified three "Argumentation Types":
                  </p>
                  <ol class="list-decimal list-outside ml-5 text-gray-300 space-y-1">
                    <li><strong>Economy over Ecology:</strong> Pessimism, belief that one cannot change anything.</li>
                    <li><strong>Ecology over Economy:</strong> Rejection of economic use, viewing protection as sacrifice.</li>
                    <li><strong>Ecology for Economy:</strong> Recognition that ecological health is the prerequisite for economic success.</li>
                  </ol>
                  <p class="text-gray-300 leading-relaxed mt-2">
                    <strong>Conclusion:</strong> The simulation successfully moved students toward Type 3, viewing the environment
                    as a "partner" rather than an opponent.
                  </p>
                </section>

                <section>
                  <h3 class="text-emerald-300 font-bold mb-2">5. Evolution to soil.app</h3>
                  <p class="text-gray-300 leading-relaxed">
                    The digital version automates complex calculations, provides visual data (impact diagrams), and facilitates
                    precise "debriefing" and reflection phases, transforming abstract awareness into functional sustainable
                    management skills.
                  </p>
                </section>
              </div>

              <div class="pt-2">
                <a
                  href="https://eldorado.tu-dortmund.de/items/49a1bf1d-288a-464a-a818-373ef41d7fb1"
                  target="_blank"
                  class="inline-flex items-center gap-2 px-6 py-3 bg-emerald-800/50 hover:bg-emerald-700/50 text-emerald-100 rounded-2xl border border-emerald-500/30 transition-all group"
                >
                  <span i18n="@@info.viewDissertation">Volltext auf eldorado</span>
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
          <section class="space-y-8">
            <h2 class="text-2xl font-bold text-emerald-400 flex items-center gap-3" i18n="@@info.publicationsTitle">
              <span class="p-2 bg-emerald-900/30 rounded-xl text-xl">📚</span>
              Weitere Publikationen
            </h2>

            <div class="grid gap-4">
              @for (item of publications; track item.title) {
                <a
                  [href]="item.link"
                  target="_blank"
                  class="block bg-gray-800/20 border border-white/5 rounded-2xl p-6 hover:bg-gray-800/40 hover:border-emerald-500/30 transition-all group"
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

        <footer class="mt-24 pt-12 border-t border-gray-800 text-center text-gray-500 text-sm">
          <p i18n="@@info.footer">© {{ year }} Soil Projekt. Entwickelt für Bildungszwecke.</p>
        </footer>
      </div>
    </div>
  `,
})
export class InfoComponent {
  year = new Date().getFullYear();

  publications = [
    {
      year: '2021',
      authors: 'Wolf, N., & Graf, D.',
      title: 'SOIL–eine Simulation zum nachhaltigen Denken.',
      source: 'Digitale Bildung für Lehramtsstudierende. Springer Fachmedien.',
      link: 'https://link.springer.com/book/10.1007/978-3-662-62627-7',
    },
    {
      year: '2019',
      authors: 'Wolf, N.',
      title: 'SOIL - Ein Planspiel zur Förderung nachhaltigen Denkens und Handelns.',
      source: 'MNU Journal.',
      link: 'https://www.mnu.de/publikationen/zeitschrift-mnu',
    },
    {
      year: '2014',
      authors: 'Wolf, N.',
      title: 'Bedingungen zur Förderung nachhaltigen Handelns im Biologieunterricht.',
      source: 'Ralle et al. (Hrsg.): Lernaufgaben entwickeln. Waxmann.',
      link: 'https://www.waxmann.com/buch3070',
    },
    {
      year: '2013',
      authors: 'Wolf, N. & Graf, D.',
      title: 'Iterative Entwicklung eines Unterrichtsdesigns zum Thema Nachhaltigkeit.',
      source: 'Komorek/Prediger (Hrsg.). Waxmann.',
      link: 'https://www.waxmann.com/waxmann-buecher/?no_cache=1&tx_p2waxmann_pi2%5Bbuch%5D=BUC12377&tx_p2waxmann_pi2%5Baction%5D=show',
    },
    {
      year: '2012',
      authors: 'Wolf, N. & Graf, D.',
      title: 'Lernende erfassen Ökosysteme in einem Agrar-Planspiel.',
      source: 'Der mathematische und naturwissenschaftliche Unterricht.',
      link: 'https://www.mnu.de/publikationen/zeitschrift-mnu',
    },
  ];
}
