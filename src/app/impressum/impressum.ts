import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LanguageSwitcherComponent } from '../shared/language-switcher/language-switcher';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [RouterLink, LanguageSwitcherComponent],
  template: `
    <div class="min-h-screen relative font-sans text-gray-100 overflow-hidden">
      <!-- Background Image -->
      <div class="fixed inset-0 h-screen w-screen z-0 pointer-events-none">
        <picture>
          <source srcset="assets/images/bauernhof-portrait-dunkel.webp" media="(orientation: portrait)" />
          <img
            src="assets/images/bauernhof-landscape-dunkel.webp"
            alt="Farm Background"
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
            <app-language-switcher></app-language-switcher>
          }

          <a
            routerLink="/"
            class="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition w-10 h-10 flex items-center justify-center"
            title="Back to Landing Page"
            i18n-title="Action Label|Tooltip to go back to landing page@@nav.backToLanding"
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

      <div class="relative z-10 max-w-5xl mx-auto pt-[72px] pb-12 px-4 sm:px-6 portrait:px-0 portrait:max-w-none space-y-8 animate-fade-in">
        <!-- Header -->
        <header class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl flex justify-between items-center portrait:rounded-none portrait:border-x-0">
          <div>
            <h1 i18n="Main Heading|Title of the imprint page@@impressum.title" class="text-4xl font-serif font-bold text-emerald-500 mb-2">Impressum</h1>
            <p i18n="Subheading|Legal information and contact subtitle@@impressum.subtitle" class="text-gray-400">Rechtliche Informationen & Kontakt</p>
          </div>
        </header>

        <!-- Projekt -->
        <section class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 i18n="Heading|Project information section@@impressum.project" class="text-2xl font-bold text-white">Projekt</h2>
          <p i18n="Footer Text|Copyright and project info@@landing.footer" class="text-gray-300">© {{ year }} Soil Projekt. Entwickelt für Bildungszwecke.</p>
        </section>

        <!-- Kontakt -->
        <section class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 i18n="Heading|Contact information section@@impressum.contact" class="text-2xl font-bold text-white">Kontakt</h2>
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

        <!-- Verantwortlich -->
        <section class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 i18n="Heading|Section identifying the person responsible for content@@impressum.responsible" class="text-2xl font-bold text-white">Verantwortlich</h2>
          <div class="text-gray-300 space-y-1">
            <p class="font-bold text-white">Nina Wolf</p>
            <p>Kanonikerweg 2</p>
            <p>59494 Soest</p>
            <p>
              Email:
              <a href="mailto:nina.vanessa.wolf&#64;gmail.com" class="text-emerald-400 hover:underline"
                >nina.vanessa.wolf&#64;gmail.com</a
              >
            </p>
          </div>
        </section>

        <!-- Disclaimer -->
        <section class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 i18n="Heading|Title for the disclaimer section@@impressum.disclaimer.title" class="text-2xl font-bold text-white">Haftungsausschluss</h2>
          <div class="text-sm leading-relaxed space-y-4 text-gray-300">
            <p i18n="Legal Text|Disclaimer regarding external links@@impressum.disclaimer.p1">
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für
              den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
            </p>
            <p i18n="Legal Text|Disclaimer regarding game data and pedagogical purpose@@impressum.disclaimer.p2">
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
