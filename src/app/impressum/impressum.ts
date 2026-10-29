import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackButtonComponent } from '../shared/back-button/back-button';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [RouterLink, BackButtonComponent],
  template: `
    <div class="h-full overflow-y-auto custom-scrollbar relative font-sans text-gray-100">
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

      <div class="relative z-10 max-w-5xl mx-auto pt-4 sm:pt-8 pb-12 px-4 sm:px-6 portrait:px-0 portrait:max-w-none space-y-8 animate-fade-in">
        <!-- Header -->
        <header class="bg-gray-900 p-4 sm:p-6 rounded-xl border border-gray-700 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 portrait:rounded-none portrait:border-x-0">
          <div>
            <h1 class="text-4xl sm:text-6xl font-bold text-emerald-500 mb-4 tracking-tight">Impressum</h1>
            <p class="text-xl text-white max-w-2xl">Rechtliche Informationen & Kontakt</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <app-back-button></app-back-button>
            <a routerLink="/privacy" class="px-6 py-3 bg-emerald-800/40 hover:bg-emerald-700/60 text-emerald-300 hover:text-white rounded-xl border border-emerald-500/30 transition-all font-bold">
              Datenschutzerklärung lesen
            </a>
          </div>
        </header>

        <!-- Projekt -->
        <section class="bg-gray-900 p-4 sm:p-6 rounded-xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 class="text-2xl font-bold text-white">Projekt</h2>
          <p class="text-gray-400">© {{ year }} SOIL Projekt. Entwickelt für Bildungszwecke.</p>
        </section>

        <!-- Kontakt -->
        <section class="bg-gray-900 p-4 sm:p-6 rounded-xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 class="text-2xl font-bold text-white">Kontakt</h2>
          <div class="text-gray-300 space-y-1">
            <p class="font-bold text-white">Florian Feldhaus</p>
            <p>Kanonikerweg 2</p>
            <p>59494 Soest</p>
            <p>
              Email:
              <a href="mailto:florian.feldhaus&#64;gmail.com" class="text-emerald-400 hover:underline"
                >florian.feldhaus&#64;gmail.com</a
              >
            </p>
          </div>
        </section>

        <!-- Disclaimer -->
        <section class="bg-gray-900 p-4 sm:p-6 rounded-xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 class="text-2xl font-bold text-white">Haftungsausschluss</h2>
          <div class="text-sm leading-relaxed space-y-4 text-gray-300">
            <p>
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für
              den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
            </p>
            <p>
              Alle in diesem Spiel (SOIL) verwendeten Daten, Erträge und Berechnungen dienen ausschließlich dem
              pädagogischen Zweck und der Spielmechanik. Sie stellen keine professionelle landwirtschaftliche Beratung
              dar.
            </p>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class ImpressumComponent {
  year = new Date().getFullYear();
}
