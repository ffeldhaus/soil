import { Component, isDevMode } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LanguageSwitcherComponent } from '../shared/language-switcher/language-switcher';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, LanguageSwitcherComponent],
  template: `
    <div class="min-h-screen relative font-sans text-gray-100 overflow-hidden">
      <!-- Navigation Bar (Matching other pages for consistent switcher position) -->
      <nav
        class="bg-transparent px-6 py-1 fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-10 print:hidden"
      >
        <div class="flex items-center gap-4">
        </div>

        <div class="flex items-center gap-3">
          @defer (hydrate on interaction) {
            <app-language-switcher></app-language-switcher>
          }
          <!-- Spacer to match the back/logout button present on other pages -->
          <div class="w-10 h-10"></div>
        </div>
      </nav>

      <!-- Background Image -->
      <div class="fixed inset-0 h-screen w-screen z-0 pointer-events-none">
        <picture>
          <source srcset="assets/images/bauernhof-portrait-dunkel.webp" media="(orientation: portrait)" />
          <img src="assets/images/bauernhof-landscape-dunkel.webp" alt="Farm Background" class="w-full h-full object-cover portrait:object-center landscape:object-center" />
        </picture>
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
            <span data-testid="landing-intro" i18n="Intro Text|Part of the landing page introduction@@landing.intro">Eine interaktive Simulation über</span>&nbsp;<span
              class="text-emerald-300 font-normal"
              data-testid="landing-agriculture"
              i18n="Topic Label|Agriculture topic@@landing.agriculture"
              >Landwirtschaft</span
            >,
            <span class="text-blue-300 font-normal" data-testid="landing-economics" i18n="Topic Label|Economics topic@@landing.economics"
              >Ökonomie</span
            >, <span><ng-container i18n="Connective|The word 'and'@@landing.and">und</ng-container></span
            >&nbsp;<span
              class="text-yellow-200 font-normal"
              data-testid="landing-sustainability"
              i18n="Topic Label|Sustainability topic@@landing.sustainability"
              >Nachhaltigkeit</span
            >.
          </p>

          <div class="flex flex-col sm:flex-row gap-6 justify-center mt-12 w-full max-w-lg mx-auto">
            <a
              routerLink="/game-login"
              data-testid="landing-enter-game"
              class="group relative px-8 py-5 bg-emerald-800 hover:bg-emerald-700 text-white text-lg font-bold rounded-2xl shadow-[0_0_20px_rgba(6,95,70,0.4)] transition-all transform hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,95,70,0.6)] overflow-hidden"
            >
              <span class="relative z-10 flex items-center justify-center gap-2" i18n="Action Label|Button to join a game@@landing.enterGame"
                >Spiel beitreten</span
              >
            </a>

            <a
              routerLink="/admin/login"
              data-testid="landing-admin-login"
              class="flex items-center justify-center px-8 py-5 bg-gray-800/80 hover:bg-gray-700/90 backdrop-blur-md border border-white/20 text-white text-lg font-semibold rounded-2xl transition-all hover:border-white/40 transform hover:-translate-y-1"
              i18n="Action Label|Link for teachers to log in@@landing.teacherAdmin"
              >Lehrkräfte</a
            >

            <a
              routerLink="/admin/register"
              data-testid="landing-register"
              class="flex items-center justify-center px-8 py-5 bg-emerald-900/80 hover:bg-emerald-800/90 backdrop-blur-md border border-emerald-500/40 text-emerald-100 text-lg font-semibold rounded-2xl transition-all hover:border-emerald-500/60 transform hover:-translate-y-1"
              i18n="Action Label|Link to register as a new teacher@@landing.register"
              >Registrieren</a
            >
          </div>
        </div>

        <!-- Scroll Indicator -->
        <button
          (click)="scrollToInfo()"
          class="absolute bottom-10 animate-bounce text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer"
          aria-label="Scroll to info"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </main>

      <!-- Info Sections -->
      @defer (hydrate on viewport) {
        <div id="info-section" class="relative z-10 py-24 px-6">
          <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
            <section class="bg-gray-900/80 backdrop-blur-md p-8 md:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-6">
              <h2
                class="text-3xl font-bold text-emerald-400 font-sans border-l-4 border-emerald-500 pl-4"
                i18n="Heading|About the game section@@landing.aboutTitle"
              >
                Über das Spiel
              </h2>
              <div class="space-y-4 text-lg leading-relaxed text-gray-400">
                <p i18n="Info Text|Description of the game and its participants@@landing.aboutText1">
                  Soil ist ein interaktives Simulationsspiel, in dem Spielerinnen und Spieler ökologische und
                  ökonomische Entscheidungen treffen und deren unmittelbare Auswirkungen erleben. In Gruppen bauen
                  Schülerinnen und Schüler über zehn Runden einen landwirtschaftlichen Betrieb auf.
                </p>
                <p i18n="Info Text|Goals and strategies of the game@@landing.aboutText2">
                  Ziel ist es, einen profitablen Betrieb nachhaltig zu führen. Strategien wie Fruchtfolgewahl, Düngung
                  und Schädlingsbekämpfung müssen aufeinander abgestimmt werden. Nach jeder Runde erhalten die Gruppen
                  Rückmeldung über die ökologischen und ökonomischen Konsequenzen ihres Handelns.
                </p>
                <p i18n="Info Text|Educational purpose and access information@@landing.educationalInfo">
                  Das Spiel ist für Bildungszwecke konzipiert und dauerhaft kostenlos. Für Lehrkräfte ist eine
                  Registrierung erforderlich, um eigene Spiele zu erstellen. Bei der Registrierung wird die
                  Zugehörigkeit zu einer Bildungseinrichtung verifiziert.
                </p>
              </div>
            </section>

            <section class="bg-gray-900/80 backdrop-blur-md p-8 md:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-6">
              <h2
                class="text-3xl font-bold text-blue-400 font-sans border-l-4 border-blue-500 pl-4"
                i18n="Heading|Background information section@@landing.backgroundTitle"
              >
                Hintergrund
              </h2>
              <div class="space-y-4 text-lg leading-relaxed text-gray-400">
                <p i18n="Info Text|Sustainability as a global development goal@@landing.backgroundText1">
                  Auf der UN-Konferenz 1992 wurde "Nachhaltigkeit" zum globalen Entwicklungsziel erklärt. Dieses Ziel
                  soll durch die Integration von ökonomischen, ökologischen und sozialen Perspektiven erreicht werden.
                </p>
                <p i18n="Info Text|Development purpose of Soil simulation@@landing.backgroundText2">
                  Das Simulationsspiel "Soil" wurde entwickelt, um dieses concept der Nachhaltigkeit begreifbar zu
                  machen. Es ermöglicht Lernenden, die Zentralität ökologischer Variablen als natürliche Grenzen
                  ökonomischen Handelns spielerisch zu entdecken.
                </p>
              </div>
            </section>
          </div>

          <div class="mt-16 flex flex-wrap justify-center gap-6">
            <a
              routerLink="/info"
              class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-medium border border-emerald-500/30 px-6 py-2 rounded-xl bg-gray-900/80 backdrop-blur-md hover:bg-gray-900/40 shadow-lg"
            >
              <span class="p-1 bg-emerald-900/30 rounded-lg">🎓</span>
              <span i18n="Action Label|Link to background details@@landing.background">Hintergrund</span>
            </a>

            <a
              routerLink="/manual"
              class="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium border border-blue-500/30 px-6 py-2 rounded-xl bg-gray-900/80 backdrop-blur-md hover:bg-gray-900/40 shadow-lg"
            >
              <span class="p-1 bg-blue-900/30 rounded-lg">📖</span>
              <span i18n="Action Label|Link to user manual@@landing.manual">Handbuch</span>
            </a>
          </div>

          <!-- Test Mode (Dev Only) -->
          @if (showTestMode) {
            <div class="mt-16 p-6 bg-red-900/20 border border-red-500/30 rounded-2xl max-w-xl mx-auto">
              <h3 class="text-red-400 font-bold mb-4">Test Mode (Dev Only)</h3>
              <div class="flex flex-wrap gap-4 justify-center">
                <button (click)="enableTestMode('player_round_6')" class="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700">Mock Player (R6/12)</button>
                <button (click)="enableTestMode('player_end')" class="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700">Mock Player (End)</button>
                <button (click)="enableTestMode('admin')" class="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700">Mock Admin</button>
                <button (click)="enableTestMode('superadmin')" class="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700">Mock Super Admin</button>
              </div>
              <p class="mt-2 text-xs text-gray-500">Enabling test mode will mock all backend calls and use local data.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class Landing {
  year = new Date().getFullYear();
  showTestMode = isDevMode();

  scrollToInfo() {
    const element = document.getElementById('info-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  enableTestMode(role: string) {
    localStorage.setItem('soil_test_mode', 'true');
    localStorage.setItem('soil_test_role', role);
    alert(`Test Mode enabled as ${role}. Please log in now.`);
    window.location.reload();
  }
}
