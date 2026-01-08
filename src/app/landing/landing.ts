import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LanguageSwitcherComponent } from '../shared/language-switcher/language-switcher';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, LanguageSwitcherComponent],
  template: `
    <div class="min-h-screen relative font-sans text-gray-100 overflow-hidden">
      <!-- Language Switcher -->
      <div class="absolute top-6 right-6 z-[100]">
        @defer (hydrate on interaction) {
          <app-language-switcher></app-language-switcher>
        }
      </div>

      <!-- Background Image with Overlay -->
      <div class="fixed inset-0 h-screen w-screen z-0 pointer-events-none">
        <picture>
          <source srcset="assets/bauernhof-portrait-hd.webp" media="(orientation: portrait)" />
          <img src="assets/bauernhof-landscape-hd.webp" alt="Farm Background" class="w-full h-full object-cover object-center" />
        </picture>
        <div
          class="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90 backdrop-blur-[2px]"
        ></div>
      </div>

      <!-- Main Hero Content -->
      <main class="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-4 text-center">
        <div class="max-w-4xl space-y-8 animate-fade-in-up">
          <h1
            class="text-6xl md:text-8xl font-sans font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-100 to-emerald-200 drop-shadow-2xl tracking-tight mb-4"
          >
            SOIL
          </h1>

          <p class="text-xl md:text-3xl text-gray-200 font-light max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            <span data-testid="landing-intro" i18n="@@landing.intro">Eine interaktive Simulation über</span>&nbsp;<span
              class="text-emerald-300 font-normal"
              data-testid="landing-agriculture"
              i18n="@@landing.agriculture"
              >Landwirtschaft</span
            >,
            <span class="text-blue-300 font-normal" data-testid="landing-economics" i18n="@@landing.economics"
              >Ökonomie</span
            >, <span><ng-container i18n="@@landing.and">und</ng-container></span
            >&nbsp;<span
              class="text-yellow-200 font-normal"
              data-testid="landing-sustainability"
              i18n="@@landing.sustainability"
              >Nachhaltigkeit</span
            >.
          </p>

          <div class="flex flex-col sm:flex-row gap-6 justify-center mt-12 w-full max-w-lg mx-auto">
            <a
              routerLink="/game-login"
              data-testid="landing-enter-game"
              class="group relative px-8 py-5 bg-emerald-800 hover:bg-emerald-700 text-white text-lg font-bold rounded-2xl shadow-[0_0_20px_rgba(6,95,70,0.4)] transition-all transform hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,95,70,0.6)] overflow-hidden"
            >
              <span class="relative z-10 flex items-center justify-center gap-2" i18n="@@landing.enterGame"
                >Spiel beitreten</span
              >
            </a>

            <a
              routerLink="/admin/login"
              data-testid="landing-admin-login"
              class="flex items-center justify-center px-8 py-5 bg-gray-800/80 hover:bg-gray-700/90 backdrop-blur-md border border-white/20 text-white text-lg font-semibold rounded-2xl transition-all hover:border-white/40 transform hover:-translate-y-1"
              i18n="@@landing.teacherAdmin"
              >Lehrkräfte</a
            >

            <a
              routerLink="/admin/register"
              data-testid="landing-register"
              class="flex items-center justify-center px-8 py-5 bg-emerald-900/80 hover:bg-emerald-800/90 backdrop-blur-md border border-emerald-500/40 text-emerald-100 text-lg font-semibold rounded-2xl transition-all hover:border-emerald-500/60 transform hover:-translate-y-1"
              i18n="@@landing.register"
              >Registrieren</a
            >
          </div>
        </div>

        <!-- Scroll Indicator -->
        <div class="absolute bottom-10 animate-bounce text-gray-400">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </main>

      <!-- Info Sections -->
      @defer (hydrate on viewport) {
        <div class="relative z-10 bg-gray-900 text-gray-300 py-24 px-6 border-t border-gray-800">
          <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-16">
            <section class="space-y-6">
              <h2
                class="text-3xl font-bold text-emerald-400 font-sans border-l-4 border-emerald-500 pl-4"
                i18n="@@landing.aboutTitle"
              >
                Über das Spiel
              </h2>
              <div class="space-y-4 text-lg leading-relaxed text-gray-400">
                <p i18n="@@landing.aboutText1">
                  Soil ist ein interaktives Simulationsspiel, in dem Spielerinnen und Spieler ökologische und
                  ökonomische Entscheidungen treffen und deren unmittelbare Auswirkungen erleben. In Gruppen bauen
                  Schülerinnen und Schüler über zehn Runden einen landwirtschaftlichen Betrieb auf.
                </p>
                <p i18n="@@landing.aboutText2">
                  Ziel ist es, einen profitablen Betrieb nachhaltig zu führen. Strategien wie Fruchtfolgewahl, Düngung
                  und Schädlingsbekämpfung müssen aufeinander abgestimmt werden. Nach jeder Runde erhalten die Gruppen
                  Rückmeldung über die ökologischen und ökonomischen Konsequenzen ihres Handelns.
                </p>
                <p i18n="@@landing.educationalInfo">
                  Das Spiel ist für Bildungszwecke konzipiert und dauerhaft kostenlos. Für Lehrkräfte ist eine
                  Registrierung erforderlich, um eigene Spiele zu erstellen. Bei der Registrierung wird die
                  Zugehörigkeit zu einer Bildungseinrichtung verifiziert.
                </p>
              </div>
            </section>

            <section class="space-y-6">
              <h2
                class="text-3xl font-bold text-blue-400 font-sans border-l-4 border-blue-500 pl-4"
                i18n="@@landing.backgroundTitle"
              >
                Hintergrund
              </h2>
              <div class="space-y-4 text-lg leading-relaxed text-gray-400">
                <p i18n="@@landing.backgroundText1">
                  Auf der UN-Konferenz 1992 wurde "Nachhaltigkeit" zum globalen Entwicklungsziel erklärt. Dieses Ziel
                  soll durch die Integration von ökonomischen, ökologischen und sozialen Perspektiven erreicht werden.
                </p>
                <p i18n="@@landing.backgroundText2">
                  Das Simulationsspiel "Soil" wurde entwickelt, um dieses Konzept der Nachhaltigkeit begreifbar zu
                  machen. Es ermöglicht Lernenden, die Zentralität ökologischer Variablen als natürliche Grenzen
                  ökonomischen Handelns spielerisch zu entdecken.
                </p>
              </div>
            </section>
          </div>

          <div class="mt-16 text-center">
            <a
              routerLink="/info"
              class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-medium border border-emerald-500/30 px-6 py-2 rounded-xl bg-emerald-900/20 hover:bg-emerald-900/40"
            >
              <span class="p-1 bg-emerald-900/30 rounded-lg">🎓</span>
              <span i18n="@@landing.scientificBackground">Wissenschaftlicher Hintergrund</span>
            </a>
          </div>

          <footer class="mt-24 text-center text-gray-600 text-sm">
            <p i18n="@@landing.footer">© {{ year }} Soil Projekt. Entwickelt für Bildungszwecke.</p>
          </footer>
        </div>
      }
    </div>
  `,
})
export class Landing {
  year = new Date().getFullYear();
}
