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
          <source srcset="assets/bauernhof-portrait-hd.webp" media="(orientation: portrait)" />
          <img
            src="assets/bauernhof-landscape-hd.webp"
            alt="Farm Background"
            class="w-full h-full object-cover portrait:object-center landscape:object-center"
          />
        </picture>
        <div class="absolute inset-0 bg-gray-900/80 backdrop-blur-[2px]"></div>
      </div>

      <!-- Navigation Bar -->
      <nav
        class="bg-gray-900/95 border-b border-gray-700 backdrop-blur shadow-lg px-6 py-1 sticky top-0 z-50 flex items-center justify-between shrink-0 h-10 print:hidden"
      >
        <div class="flex items-center gap-4">
          <h1 class="text-xl font-bold font-serif text-emerald-500 tracking-wider">SOIL IMPRESSUM</h1>
        </div>

        <div class="flex items-center gap-3">
          @defer (hydrate on interaction) {
            <app-language-switcher></app-language-switcher>
          }

          <a
            routerLink="/"
            class="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
            title="Back to Landing Page"
            i18n-title="Action Label|Tooltip to go back to landing page@@nav.backToLanding"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      <div class="relative z-10 max-w-4xl mx-auto p-6 md:p-12 space-y-8 animate-fade-in">
        <!-- Header -->
        <header class="bg-gray-900/80 backdrop-blur-md p-8 rounded-3xl border border-gray-700 shadow-2xl flex justify-between items-center">
          <div>
            <h1 i18n="Main Heading|Title of the imprint page@@impressum.title" class="text-4xl font-serif font-bold text-emerald-500 mb-2">Impressum</h1>
            <p i18n="Subheading|Legal information and contact subtitle@@impressum.subtitle" class="text-gray-400">Rechtliche Informationen & Kontakt</p>
          </div>
        </header>

        <!-- Kontakt -->
        <section class="bg-gray-900/80 backdrop-blur-md p-8 rounded-3xl border border-gray-700 shadow-2xl space-y-4">
          <h2 i18n="Heading|Contact information section@@impressum.contact" class="text-2xl font-bold text-white">Kontakt</h2>
          <div class="bg-gray-950/50 p-6 rounded-xl border border-white/5">
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
        <section class="bg-gray-900/80 backdrop-blur-md p-8 rounded-3xl border border-gray-700 shadow-2xl space-y-4">
          <h2 i18n="Heading|Section identifying the person responsible for content@@impressum.responsible" class="text-2xl font-bold text-white">Verantwortlich</h2>
          <div class="bg-gray-950/50 p-6 rounded-xl border border-white/5">
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

        <!-- Bilder -->
        <section class="bg-gray-900/80 backdrop-blur-md p-8 rounded-3xl border border-gray-700 shadow-2xl space-y-4">
          <h2 i18n="Heading|Section for image source credits@@impressum.imageSources" class="text-2xl font-bold text-white">Bildnachweise</h2>
          <ul
            class="space-y-2 list-disc list-inside text-gray-400 bg-gray-950/50 p-6 rounded-xl border border-white/5"
          >
            <li>
              <a
                i18n="Source Info|Credit for drought image@@impressum.source.drought"
                href="https://commons.wikimedia.org/wiki/File:Drought.jpg"
                class="hover:text-emerald-400 transition underline"
                >Drought by USDA (Public Domain)</a
              >
            </li>
            <li>
              <a
                i18n="Source Info|Credit for corn borer image@@impressum.source.borer"
                href="https://commons.wikimedia.org/wiki/File:Ostrinia.nubilalis.7771.jpg"
                class="hover:text-emerald-400 transition underline"
                >Maiszünsler by Keith Weller (Public Domain)</a
              >
            </li>
            <li>
              <a
                i18n="Source Info|Credit for ladybug image@@impressum.source.ladybug"
                href="https://commons.wikimedia.org/wiki/File:Marienk%C3%A4fer_0241.jpg"
                class="hover:text-emerald-400 transition underline"
                >Marienkäfer by Olei (CC BY-SA 3.0)</a
              >
            </li>
            <li>
              <a
                i18n="Source Info|Credit for Oekolandbau.de@@impressum.source.oekolandbau"
                href="http://www.oekolandbau.de"
                class="hover:text-emerald-400 transition underline"
                >Oekolandbau.de</a
              >
            </li>
            <li>
              <a
                i18n="Source Info|Credit for Organic Logo@@impressum.source.logo"
                href="https://commons.wikimedia.org/wiki/File:Organic-Logo.svg"
                class="hover:text-emerald-400 transition underline"
                >Organic Logo (Public Domain)</a
              >
            </li>
            <li>
              <a
                i18n="Source Info|Credit for Landwirtschaftskammer NRW@@impressum.source.chamber"
                href="https://www.landwirtschaftskammer.de"
                class="hover:text-emerald-400 transition underline"
                >Landwirtschaftskammer NRW</a
              >
            </li>
            <li>
              <a
                i18n="Source Info|Credit for Bio-Siegel.de@@impressum.source.bioSiegel"
                href="https://www.bio-siegel.de/"
                class="hover:text-emerald-400 transition underline"
                >Bio-Siegel.de</a
              >
            </li>
          </ul>
        </section>

        <!-- Disclaimer -->
        <section class="bg-gray-900/80 backdrop-blur-md p-8 rounded-3xl border border-gray-700 shadow-2xl space-y-4">
          <h2 i18n="Heading|Title for the disclaimer section@@impressum.disclaimer.title" class="text-2xl font-bold text-white">Haftungsausschluss</h2>
          <div class="bg-gray-950/50 p-6 rounded-xl border border-white/5 text-sm leading-relaxed space-y-4">
            <p i18n="Legal Text|Disclaimer regarding external links@@impressum.disclaimer.p1">
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für
              den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
            </p>
            <p i18n="Legal Text|Disclaimer regarding game data and pedagogical purpose@@impressum.disclaimer.p2">
              Alle in diesem Spiel (SOIL) verwendeten Daten, Erträge und Berechnungen dienen ausschließlich dem
              pädagogischen Zweck und der Spielmechanik. Sie stellen keine professionelle landwirtschaftliche Beratung
              dar.
            </p>
            <p i18n="Legal Text|Disclaimer regarding copyrights and open source nature@@impressum.disclaimer.p3">
              Die Urheberrechte für die im Spiel verwendeten Grafiken liegen bei den jeweiligen Urhebern (siehe
              Bildnachweise). Das Spiel selbst ist ein Open-Source-Projekt.
            </p>
          </div>
        </section>

        <footer class="mt-24 text-center text-gray-500 text-sm">
          <p i18n="Footer Text|Copyright and project info@@landing.footer">© {{ year }} Soil Projekt. Entwickelt für Bildungszwecke.</p>
        </footer>
      </div>
    </div>
  `,
})
export class ImpressumComponent {
  year = new Date().getFullYear();
}
