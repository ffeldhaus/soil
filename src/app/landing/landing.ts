import { Component, inject, isDevMode } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { GameService } from '../game/game.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="h-full relative font-sans text-gray-100 overflow-y-auto custom-scrollbar">
      <!-- Background Image -->
      <div class="fixed inset-0 h-screen w-screen -z-10 pointer-events-none">
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

          <p class="text-xl md:text-3xl text-white max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            <span data-testid="landing-intro">Eine interaktive Simulation über</span>&nbsp;<span
              class="text-emerald-300 font-normal"
              data-testid="landing-agriculture"

              >Landwirtschaft</span
            >,
            <span class="text-blue-300 font-normal" data-testid="landing-economics"
              >Ökonomie</span
            >, <span>und</span>&nbsp;<span
              class="text-yellow-200 font-normal"
              data-testid="landing-sustainability"

              >Nachhaltigkeit</span
            >.
          </p>

          @if (challengeSeed) {
            <div
              data-testid="challenge-banner"
              class="max-w-xl mx-auto mt-6 px-5 py-3.5 rounded-xl bg-gray-900 border border-emerald-500/60 shadow-lg text-sm sm:text-base text-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2"
            >
              <span class="font-mono font-bold text-emerald-400">Herausforderung: Seed #{{ challengeSeed }}</span>
              @if (challengeTargetScore !== undefined) {
                <span class="text-gray-200">
                  Schlage <strong>{{ challengeTargetName || 'den Herausforderer' }}</strong>
                  (<span class="font-mono tabular-nums font-bold text-emerald-300">{{ challengeTargetScore }} Pkt</span>)
                </span>
              } @else {
                <span class="text-gray-300">Gleiche Wetter- & Schädlingsfolge ({{ challengeRounds }} Runden)</span>
              }
            </div>
          }

          <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mt-12 w-full max-w-2xl mx-auto">
            <button
              type="button"
              (click)="startQuickGame()"
              [disabled]="isStartingGame"
              data-testid="landing-quick-play"
              class="px-8 py-5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-lg font-bold rounded-xl shadow-lg border border-emerald-500 transition-colors flex-1 cursor-pointer flex items-center justify-center gap-2"
            >
              @if (isStartingGame) {
                <span>Wird gestartet...</span>
              } @else if (challengeSeed) {
                <span>Herausforderung starten</span>
              } @else {
                <span>Sofort spielen</span>
              }
            </button>
            <a
              routerLink="/admin"
              data-testid="landing-manage-games"
              class="px-8 py-5 bg-gray-900/90 hover:bg-gray-800 text-emerald-300 hover:text-white text-lg font-bold rounded-xl shadow-lg border border-emerald-500/40 transition-colors flex-1 flex items-center justify-center gap-2"
            >
              <span>Spiele erstellen & verwalten</span>
            </a>
          </div>

          <div class="flex justify-center mt-4">
            <button
              type="button"
              (click)="showTrailerModal = true"
              data-testid="landing-watch-trailer"
              class="bg-gray-900/90 hover:bg-gray-800 text-slate-200 hover:text-white border border-gray-700 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 text-emerald-400 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>Trailer ansehen</span>
            </button>
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
      <div id="info-section" class="relative z-10 py-24 px-6 portrait:px-0">
        <div class="max-w-6xl mx-auto grid min-[860px]:grid-cols-2 gap-8 portrait:max-w-none">
          <section class="bg-gray-900 p-5 md:p-6 rounded-xl border border-gray-700 shadow-2xl space-y-8 portrait:rounded-none portrait:border-x-0">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2
                class="text-3xl font-bold text-emerald-400 font-sans border-l-4 border-emerald-500 pl-4"
              >
                Über das Spiel
              </h2>
              <a
                routerLink="/manual"
                class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-800/40 hover:bg-emerald-700/60 text-emerald-300 hover:text-white rounded-xl border border-emerald-500/30 transition-all shadow-lg font-bold text-lg min-w-[220px]"
              >
                <span>📖</span>
                <span>Handbuch</span>
              </a>
            </div>
            <div class="space-y-4 text-lg leading-relaxed text-white">
              <p>
                SOIL ist ein interaktives Simulationsspiel für den Unterricht in Biologie, Geographie (Erdkunde) und
                Wirtschaft in der Sekundarstufe I & II sowie an Hochschulen. Über zehn Runden steuern Lernende einen
                landwirtschaftlichen Betrieb und erleben die unmittelbaren ökologischen und ökonomischen Folgen ihrer
                Entscheidungen.
              </p>
              <p>
                Ziel ist es, einen zukunftsfähigen Hof nachhaltig zu bewirtschaften. Strategien rund um Fruchtfolge,
                Bodenqualität (Humus), Düngung, Pflanzenschutz und Agrarökonomie müssen aufeinander abgestimmt werden.
                Nach jeder Runde erhalten die Spielenden detaillierte Rückmeldungen zu Erträgen, Bodenleben und
                Finanzen.
              </p>
              <p>
                Das Spiel ist dauerhaft kostenlos und werbefrei. Einzelspieler-Runden gegen KI-Betriebe können sofort
                ohne Registrierung gestartet werden. Für Lehrkräfte steht nach kurzer Verifizierung ihrer
                Bildungseinrichtung ein kostenloses Konto bereit, um Multiplayer-Spiele für ganze Kurse und
                Schulklassen zu erstellen.
              </p>
            </div>
          </section>

          <section class="bg-gray-900 p-5 md:p-6 rounded-xl border border-gray-700 shadow-2xl space-y-8 portrait:rounded-none portrait:border-x-0 flex flex-col justify-between">
            <div class="space-y-8">
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2
                  class="text-3xl font-bold text-blue-400 font-sans border-l-4 border-blue-500 pl-4"
                >
                  Nachhaltigkeit
                </h2>
                <a
                  routerLink="/info"
                  class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-800/40 hover:bg-blue-700/60 text-blue-300 hover:text-white rounded-xl border border-blue-500/30 transition-all shadow-lg font-bold text-lg min-w-[220px]"
                >
                  <span>🎓</span>
                  <span>Hintergrund</span>
                </a>
              </div>
              <div class="space-y-4 text-lg leading-relaxed text-white">
                <p>
                  Auf der UN-Konferenz 1992 wurde „Nachhaltigkeit“ zum globalen Entwicklungsziel erklärt, das
                  ökonomische, ökologische und soziale Perspektiven integriert. Im Sinne einer Bildung für nachhaltige
                  Entwicklung (BNE) wurde SOIL entwickelt, um dieses Konzept der Nachhaltigkeit im Unterricht
                  erfahrbar zu machen.
                </p>
                <p>
                  Das Simulationsspiel adressiert gezielt die Wissens-Handlungs-Lücke: Es ermöglicht Lernenden,
                  systemische Wechselwirkungen zwischen Bodenfruchtbarkeit, Biodiversität und Betriebswirtschaft zu
                  erproben und ökologische Variablen als natürliche Grundlagen ökonomischen Handelns spielerisch zu
                  entdecken.
                </p>
              </div>
            </div>
            <div class="pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-gray-300">
              <span>Anonymisierte Spielverläufe für Didaktik & Agrarökonomie:</span>
              <a
                routerLink="/research"
                data-testid="landing-research-link"
                class="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-blue-300 hover:text-white rounded-lg border border-gray-700 transition-colors font-semibold shrink-0"
              >
                <span>Forschungsdaten</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </section>
        </div>

        <!-- Test Mode (Dev Only) -->
        @if (showTestMode) {
          <div class="mt-16 p-6 bg-red-900/20 border border-red-500/30 rounded-xl max-w-xl mx-auto">
            <h3 class="text-red-400 font-bold mb-4">Test Mode (Dev Only)</h3>
            <div class="flex flex-wrap gap-4 justify-center">
              <button (click)="enableTestMode('admin')" class="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700">Mock Admin</button>
              <button (click)="enableTestMode('superadmin')" class="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700">Mock Super Admin</button>
            </div>
            <p class="mt-2 text-xs text-gray-500">Enabling test mode will mock all backend calls and use local data.</p>
          </div>
        }
      </div>

      @if (showTrailerModal) {
        <div
          data-testid="trailer-modal"
          class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          (click)="showTrailerModal = false"
        >
          <div
            class="max-w-5xl w-full bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="SOIL – Spielvorstellung"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950">
              <h2 class="text-sm sm:text-base font-bold text-white tracking-tight">SOIL – Spielvorstellung</h2>
              <button
                type="button"
                (click)="showTrailerModal = false"
                data-testid="close-trailer-modal"
                class="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
                aria-label="Trailer schließen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <video
              controls
              autoplay
              playsinline
              preload="metadata"
              poster="/SOIL-screenshot.jpg"
              class="w-full aspect-video bg-black"
            >
              <source src="/assets/video/soil-marketing-trailer.mp4" type="video/mp4" />
              <track kind="captions" src="/assets/video/soil-marketing-trailer.vtt" srclang="de" label="Deutsch" />
            </video>
          </div>
        </div>
      }
    </div>
  `,
})
export class Landing {
  private auth = inject(AuthService);
  private gameService = inject(GameService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  year = new Date().getFullYear();
  showTestMode = isDevMode();
  isStartingGame = false;
  showTrailerModal = false;

  challengeSeed: string | null = null;
  challengeDifficulty: 'easy' | 'normal' | 'hard' = 'normal';
  challengeRounds = 10;
  challengeTargetScore?: number;
  challengeTargetName?: string;

  constructor() {
    this.route.queryParams.subscribe((params) => {
      const seed = typeof params.challenge === 'string' ? params.challenge.trim().toUpperCase().slice(0, 12) : '';
      this.challengeSeed = seed || null;
      const diff = params.difficulty;
      this.challengeDifficulty = diff === 'easy' || diff === 'normal' || diff === 'hard' ? diff : 'normal';
      const parsedRounds = parseInt(params.rounds, 10);
      this.challengeRounds =
        Number.isFinite(parsedRounds) && parsedRounds >= 3 && parsedRounds <= 30 ? parsedRounds : 10;
      const parsedTargetScore = parseInt(params.targetScore, 10);
      this.challengeTargetScore = Number.isFinite(parsedTargetScore) ? parsedTargetScore : undefined;
      this.challengeTargetName =
        typeof params.targetName === 'string' && params.targetName.trim()
          ? params.targetName.trim().slice(0, 40)
          : undefined;
    });
  }

  scrollToInfo() {
    const element = document.getElementById('info-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async startQuickGame() {
    if (this.isStartingGame) return;
    this.isStartingGame = true;
    try {
      const result = await this.gameService.createGame(`Hof ${new Date().toLocaleDateString('de-DE')}`, {
        numPlayers: 4,
        numRounds: this.challengeSeed ? this.challengeRounds : 10,
        numAi: 3,
        aiLevel: 'middle',
        difficulty: this.challengeSeed ? this.challengeDifficulty : 'normal',
        playerLabel: 'Team',
        advancedPricingEnabled: true,
        analyticsEnabled: true,
        advisorEnabled: true,
        ...(this.challengeSeed
          ? {
              seed: this.challengeSeed,
              ...(this.challengeTargetScore !== undefined ? { challengeTargetScore: this.challengeTargetScore } : {}),
              ...(this.challengeTargetName ? { challengeTargetName: this.challengeTargetName } : {}),
            }
          : {}),
      });
      if (result.password) {
        await this.auth.loginAsPlayer(result.gameId, result.password);
      }
      await this.router.navigate(['/game']);
    } catch (err) {
      console.error('Quick play failed:', err);
      await this.router.navigate(['/admin']);
    } finally {
      this.isStartingGame = false;
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
