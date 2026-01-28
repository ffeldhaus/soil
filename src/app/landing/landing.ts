import { Component, inject, isDevMode } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen relative font-sans text-gray-100 overflow-hidden">
      <!-- Navigation Bar (Matching other pages for consistent switcher position) -->
      <nav
        class="bg-transparent px-6 py-1 fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-10 print:hidden"
      >
        <div class="flex items-center gap-4">
        </div>

        <div class="flex items-center gap-3">
          <!-- Spacer to match the back/logout button present on other pages -->
          <div class="w-10 h-10"></div>
        </div>
      </nav>

      <!-- Background Image -->
      <div class="fixed inset-0 h-screen w-screen z-0 pointer-events-none">
        <picture>
          <source srcset="assets/images/bauernhof-portrait-dunkel.webp" media="(orientation: portrait)" />
          <img src="assets/images/bauernhof-landscape-dunkel.webp" alt="" fetchpriority="high" class="w-full h-full object-cover portrait:object-center landscape:object-center" />
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
            <span data-testid="landing-intro">Eine interaktive Simulation über</span>&nbsp;<span
              class="text-emerald-300 font-normal"
              data-testid="landing-agriculture"

              >Landwirtschaft</span
            >,
            <span class="text-blue-300 font-normal" data-testid="landing-economics"
              >Ökonomie</span
            >, <span><ng-container>und</ng-container></span
            >&nbsp;<span
              class="text-yellow-200 font-normal"
              data-testid="landing-sustainability"

              >Nachhaltigkeit</span
            >.
          </p>

          <div class="flex flex-col sm:flex-row gap-6 justify-center mt-12 w-full max-w-lg mx-auto">
            <a
              routerLink="/admin"
              data-testid="landing-manage-games"
              class="group relative px-8 py-5 bg-emerald-800 hover:bg-emerald-700 text-white text-lg font-bold rounded-2xl shadow-[0_0_20px_rgba(6,95,70,0.4)] transition-all transform hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,95,70,0.6)] overflow-hidden flex-1"
            >
              <span class="relative z-10 flex items-center justify-center gap-2"
                >Spiele erstellen & verwalten</span
              >
            </a>
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
            <section class="bg-gray-900/80 backdrop-blur-md p-8 md:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-8">
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2
                  class="text-3xl font-bold text-emerald-400 font-sans border-l-4 border-emerald-500 pl-4"
                >
                  Über das Spiel
                </h2>
                <a
                  routerLink="/manual"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-800/40 hover:bg-emerald-700/60 text-emerald-300 hover:text-white rounded-xl border border-emerald-500/30 transition-all shadow-lg font-bold text-sm min-w-[220px]"
                >
                  <span class="p-1 bg-emerald-900/30 rounded-lg">📖</span>
                  <span>Handbuch</span>
                </a>
              </div>
              <div class="space-y-4 text-lg leading-relaxed text-gray-400">
                <p>
                  Soil ist ein interaktives Simulationsspiel, in dem Spielerinnen und Spieler ökologische und
                  ökonomische Entscheidungen treffen und deren unmittelbare Auswirkungen erleben. In Gruppen bauen
                  Schülerinnen und Schüler über zehn Runden einen landwirtschaftlichen Betrieb auf.
                </p>
                <p>
                  Ziel ist es, einen profitablen Betrieb nachhaltig zu führen. Strategien wie Fruchtfolgewahl, Düngung
                  und Schädlingsbekämpfung müssen aufeinander abgestimmt werden. Nach jeder Runde erhalten die Gruppen
                  Rückmeldung über die ökologischen und ökonomischen Konsequenzen ihres Handelns.
                </p>
                <p>
                  Das Spiel ist für Bildungszwecke konzipiert und dauerhaft kostenlos. Für Lehrkräfte ist eine
                  Registrierung erforderlich, um eigene Spiele zu erstellen. Bei der Registrierung wird die
                  Zugehörigkeit zu einer Bildungseinrichtung verifiziert.
                </p>
              </div>
            </section>

            <section class="bg-gray-900/80 backdrop-blur-md p-8 md:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-8">
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2
                  class="text-3xl font-bold text-blue-400 font-sans border-l-4 border-blue-500 pl-4"
                >
                  Nachhaltigkeit
                </h2>
                <a
                  routerLink="/info"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-800/40 hover:bg-blue-700/60 text-blue-300 hover:text-white rounded-xl border border-blue-500/30 transition-all shadow-lg font-bold text-sm min-w-[220px]"
                >
                  <span class="p-1 bg-blue-900/30 rounded-lg">🎓</span>
                  <span>Hintergrund</span>
                </a>
              </div>
              <div class="space-y-4 text-lg leading-relaxed text-gray-400">
                <p>
                  Auf der UN-Konferenz 1992 wurde "Nachhaltigkeit" zum globalen Entwicklungsziel erklärt. Dieses Ziel
                  soll durch die Integration von ökonomischen, ökologischen und sozialen Perspektiven erreicht werden.
                </p>
                <p>
                  Das Simulationsspiel "Soil" wurde entwickelt, um dieses concept der Nachhaltigkeit begreifbar zu
                  machen. Es ermöglicht Lernenden, die Zentralität ökologischer Variablen als natürliche Grenzen
                  ökonomischen Handelns spielerisch zu entdecken.
                </p>
              </div>
            </section>
          </div>

          <!-- Test Mode (Dev Only) -->
          @if (showTestMode) {
            <div class="mt-16 p-6 bg-red-900/20 border border-red-500/30 rounded-2xl max-w-xl mx-auto">
              <h3 class="text-red-400 font-bold mb-4">Test Mode (Dev Only)</h3>
              <div class="flex flex-wrap gap-4 justify-center">
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
  private auth = inject(AuthService);
  private router = inject(Router);
  year = new Date().getFullYear();
  showTestMode = isDevMode();

  scrollToInfo() {
    const element = document.getElementById('info-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async playAsGuest() {
    try {
      await this.auth.signInAsGuest();
      this.router.navigate(['/game']);
    } catch (err) {
      console.error('Guest login failed:', err);
    }
  }

  enableTestMode(role: string) {
    localStorage.setItem('soil_test_mode', 'true');
    localStorage.setItem('soil_test_role', role);
    alert(`Test Mode enabled as ${role}. Please log in now.`);
    window.location.reload();
  }
}
