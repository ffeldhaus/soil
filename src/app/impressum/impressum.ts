import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackButtonComponent } from '../shared/back-button/back-button';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [RouterLink, BackButtonComponent],
  template: `
    <div class="flex flex-col h-full text-white font-sans overflow-hidden">
      <div class="flex-1 overflow-y-auto custom-scrollbar relative">
        <!-- Background Image -->
        <div class="fixed inset-0 h-screen w-screen -z-10 pointer-events-none">
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

        <main class="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-8 space-y-6">
          <!-- Header -->
          <header
            class="p-4 sm:p-5 bg-gray-900 rounded-xl border border-gray-800 shadow-lg flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
          >
            <div>
              <h1 class="text-2xl sm:text-4xl font-bold text-emerald-500 mb-1.5 tracking-tight">Impressum</h1>
              <p class="text-sm sm:text-base text-gray-200 max-w-2xl">Rechtliche Informationen &amp; Kontakt</p>
            </div>
            <div class="flex flex-wrap items-center gap-2 shrink-0">
              <app-back-button></app-back-button>
              <a
                routerLink="/privacy"
                class="inline-flex items-center px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-emerald-400 hover:text-emerald-300 rounded-lg border border-gray-700 transition-colors text-xs sm:text-sm font-medium"
              >
                Datenschutzerklärung lesen
              </a>
            </div>
          </header>

          <!-- Projekt -->
          <section class="p-4 sm:p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-lg space-y-3">
            <h2 class="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">Projekt</h2>
            <p class="text-sm sm:text-base text-gray-300">© {{ year }} SOIL Projekt. Entwickelt für Bildungszwecke.</p>
          </section>

          <!-- Kontakt -->
          <section class="p-4 sm:p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-lg space-y-3">
            <h2 class="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">Kontakt</h2>
            <div class="text-sm sm:text-base text-gray-300 space-y-1">
              <p class="font-bold text-white">Florian Feldhaus</p>
              <p>Kanonikerweg 2</p>
              <p>59494 Soest</p>
              <p>
                E-Mail:{{ ' ' }}<a
                  href="mailto:florian.feldhaus&#64;gmail.com"
                  class="text-emerald-400 hover:underline"
                  >florian.feldhaus&#64;gmail.com</a
                >
              </p>
            </div>
          </section>

          <!-- Disclaimer -->
          <section class="p-4 sm:p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-lg space-y-3">
            <h2 class="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">Haftungsausschluss</h2>
            <div class="text-xs sm:text-sm leading-relaxed space-y-3 text-gray-300">
              <p>
                Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links.
                Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
              </p>
              <p>
                Alle im Planspiel SOIL verwendeten Daten, Erträge und Berechnungen dienen ausschließlich dem
                pädagogischen Zweck und der Spielmechanik. Sie stellen keine professionelle landwirtschaftliche Beratung
                dar.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  `,
})
export class ImpressumComponent {
  year = new Date().getFullYear();
}
