import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LanguageSwitcherComponent } from '../shared/language-switcher/language-switcher';

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [CommonModule, RouterLink, LanguageSwitcherComponent],
  template: `
    <div class="min-h-screen relative font-sans text-gray-100 overflow-x-hidden">
      <!-- Language Switcher -->
      <div class="absolute top-6 right-6 z-[100]">
        <app-language-switcher></app-language-switcher>
      </div>

      <!-- Background Image with Overlay -->
      <div class="fixed inset-0 h-screen w-screen z-0 pointer-events-none">
        <img src="assets/bauernhof.jpg" alt="Farm Background" class="w-full h-full object-cover object-center" />
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
            <div class="space-y-4">
              <p class="text-lg font-medium text-white italic">
                "Subjektive Theorien zum Lerngegenstand „Nachhaltigkeit“ - Bedingungen und Möglichkeiten zur Förderung
                eines nachhaltigen Handelns im Biologieunterricht"
              </p>
              <p class="text-gray-400">Dissertation von Dr. Nina Wolf (TU Dortmund)</p>
              <div class="pt-4">
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

            <div class="grid gap-6">
              @for (item of publications; track item.title) {
                <div
                  class="bg-gray-800/20 border border-white/5 rounded-2xl p-6 hover:bg-gray-800/30 transition-colors"
                >
                  <div class="flex gap-4">
                    <span class="text-emerald-500 font-mono font-bold">{{ item.year }}</span>
                    <div>
                      <p class="text-gray-200 leading-relaxed">
                        {{ item.authors }}: <span class="text-white font-medium">{{ item.title }}</span> In:
                        {{ item.source }}
                      </p>
                    </div>
                  </div>
                </div>
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
    },
    {
      year: '2019',
      authors: 'Wolf, N.',
      title: 'SOIL - Ein Planspiel zur Förderung nachhaltigen Denkens und Handelns.',
      source: 'MNU Journal.',
    },
    {
      year: '2014',
      authors: 'Wolf, N.',
      title: 'Bedingungen zur Förderung nachhaltigen Handelns im Biologieunterricht.',
      source: 'Ralle et al. (Hrsg.): Lernaufgaben entwickeln. Waxmann.',
    },
    {
      year: '2013',
      authors: 'Wolf, N. & Graf, D.',
      title: 'Iterative Entwicklung eines Unterrichtsdesigns zum Thema Nachhaltigkeit.',
      source: 'Komorek/Prediger (Hrsg.). Waxmann.',
    },
    {
      year: '2012',
      authors: 'Wolf, N. & Graf, D.',
      title: 'Lernende erfassen Ökosysteme in einem Agrar-Planspiel.',
      source: 'Der mathematische und naturwissenschaftliche Unterricht.',
    },
  ];
}
