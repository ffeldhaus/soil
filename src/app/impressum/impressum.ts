import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LanguageSwitcherComponent } from '../shared/language-switcher/language-switcher';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [RouterLink, LanguageSwitcherComponent],
  template: `
    <div class="min-h-screen bg-gray-900 text-gray-300 font-sans p-6 md:p-12 relative">
      <!-- Language Switcher -->
      <div class="absolute top-6 right-6 z-[100]">
        @defer (hydrate on interaction) {
          <app-language-switcher></app-language-switcher>
        }
      </div>

      <div class="max-w-3xl mx-auto space-y-12 animate-fade-in">
        <!-- Header -->
        <header class="border-b border-gray-700 pb-8 flex justify-between items-center">
          <div>
            <h1 i18n="@@impressum.title" class="text-4xl font-serif font-bold text-emerald-500 mb-2">Impressum</h1>
            <p i18n="@@impressum.subtitle" class="text-gray-400">Rechtliche Informationen & Kontakt</p>
          </div>
          <a
            routerLink="/"
            class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            <ng-container i18n="@@impressum.backToHome">Zurück zur Startseite</ng-container>
          </a>
        </header>

        <!-- Kontakt -->
        <section class="space-y-4">
          <h2 i18n="@@impressum.contact" class="text-2xl font-bold text-white">Kontakt</h2>
          <div class="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
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
        <section class="space-y-4">
          <h2 i18n="@@impressum.responsible" class="text-2xl font-bold text-white">Verantwortlich</h2>
          <div class="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
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
        <section class="space-y-4">
          <h2 i18n="@@impressum.imageSources" class="text-2xl font-bold text-white">Bildnachweise</h2>
          <ul
            class="space-y-2 list-disc list-inside text-gray-400 bg-gray-800/30 p-6 rounded-xl border border-gray-800"
          >
            <li>
              <a
                i18n="@@impressum.source.farmstead"
                href="https://commons.wikimedia.org/wiki/File:Farmstead_in_winter,_Windsor_Township,_Berks_County,_Pennsylvania.jpg"
                class="hover:text-emerald-400 transition underline"
                >Farmstead by Smallbones (Public Domain)</a
              >
            </li>
            <li>
              <a
                i18n="@@impressum.source.drought"
                href="https://commons.wikimedia.org/wiki/File:Drought.jpg"
                class="hover:text-emerald-400 transition underline"
                >Drought by USDA (Public Domain)</a
              >
            </li>
            <li>
              <a
                i18n="@@impressum.source.borer"
                href="https://commons.wikimedia.org/wiki/File:Ostrinia.nubilalis.7771.jpg"
                class="hover:text-emerald-400 transition underline"
                >Maiszünsler by Keith Weller (Public Domain)</a
              >
            </li>
            <li>
              <a
                i18n="@@impressum.source.ladybug"
                href="https://commons.wikimedia.org/wiki/File:Marienk%C3%A4fer_0241.jpg"
                class="hover:text-emerald-400 transition underline"
                >Marienkäfer by Olei (CC BY-SA 3.0)</a
              >
            </li>
            <li>
              <a
                i18n="@@impressum.source.oekolandbau"
                href="http://www.oekolandbau.de"
                class="hover:text-emerald-400 transition underline"
                >Oekolandbau.de</a
              >
            </li>
            <li>
              <a
                i18n="@@impressum.source.logo"
                href="https://commons.wikimedia.org/wiki/File:Organic-Logo.svg"
                class="hover:text-emerald-400 transition underline"
                >Organic Logo (Public Domain)</a
              >
            </li>
            <li>
              <a
                i18n="@@impressum.source.chamber"
                href="https://www.landwirtschaftskammer.de"
                class="hover:text-emerald-400 transition underline"
                >Landwirtschaftskammer NRW</a
              >
            </li>
            <li>
              <a
                i18n="@@impressum.source.bioSiegel"
                href="https://www.bio-siegel.de/"
                class="hover:text-emerald-400 transition underline"
                >Bio-Siegel.de</a
              >
            </li>
          </ul>
        </section>

        <!-- Disclaimer -->
        <section class="space-y-4">
          <h2 i18n="@@impressum.disclaimer.title" class="text-2xl font-bold text-white">Haftungsausschluss</h2>
          <div class="bg-gray-800/50 p-6 rounded-xl border border-gray-700 text-sm leading-relaxed space-y-4">
            <p i18n="@@impressum.disclaimer.p1">
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für
              den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
            </p>
            <p i18n="@@impressum.disclaimer.p2">
              Alle in diesem Spiel (SOIL) verwendeten Daten, Erträge und Berechnungen dienen ausschließlich dem
              pädagogischen Zweck und der Spielmechanik. Sie stellen keine professionelle landwirtschaftliche Beratung
              dar.
            </p>
            <p i18n="@@impressum.disclaimer.p3">
              Die Urheberrechte für die im Spiel verwendeten Grafiken liegen bei den jeweiligen Urhebern (siehe
              Bildnachweise). Das Spiel selbst ist ein Open-Source-Projekt.
            </p>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class ImpressumComponent {}
