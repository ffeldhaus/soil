import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { LanguageSwitcherComponent } from '../shared/language-switcher/language-switcher';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [TranslocoPipe, CommonModule, RouterLink, LanguageSwitcherComponent],
  template: `
    <div class="min-h-screen relative font-sans text-gray-100 overflow-hidden">
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

      <!-- Navigation Bar (Simple) -->
      <!-- <nav class="absolute top-0 w-full p-6 flex justify-between items-center z-20">
        <div class="text-2xl font-bold text-white tracking-widest drop-shadow-md">SOIL</div>
      </nav> -->

      <!-- Main Hero Content -->
      <main class="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-4 text-center">
        <div class="max-w-4xl space-y-8 animate-fade-in-up">
          <h1
            class="text-6xl md:text-8xl font-sans font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-100 to-emerald-200 drop-shadow-2xl tracking-tight mb-4"
          >
            SOIL
          </h1>

          <p class="text-xl md:text-3xl text-gray-200 font-light max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            <span data-testid="landing-intro">{{ 'landing.intro' | transloco }}</span
            >&nbsp;<span class="text-emerald-300 font-normal" data-testid="landing-agriculture">{{
              'landing.agriculture' | transloco
            }}</span
            >,
            <span class="text-blue-300 font-normal" data-testid="landing-economics">{{
              'landing.economics' | transloco
            }}</span
            >, <span>{{ 'landing.and' | transloco }}</span
            >&nbsp;<span class="text-yellow-200 font-normal" data-testid="landing-sustainability">{{
              'landing.sustainability' | transloco
            }}</span
            >.
          </p>

          <div class="flex flex-col sm:flex-row gap-6 justify-center mt-12 w-full max-w-lg mx-auto">
            <a
              routerLink="/game-login"
              data-testid="landing-enter-game"
              class="group relative px-8 py-5 bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-bold rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all transform hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] overflow-hidden"
            >
              <span class="relative z-10 flex items-center justify-center gap-2">{{
                'landing.enterGame' | transloco
              }}</span>
            </a>

            <a
              routerLink="/admin/login"
              data-testid="landing-admin-login"
              class="flex items-center justify-center px-8 py-5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white text-lg font-semibold rounded-2xl transition-all hover:border-white/30 transform hover:-translate-y-1"
              >{{ 'landing.teacherAdmin' | transloco }}</a
            >

            <a
              routerLink="/admin/register"
              data-testid="landing-register"
              class="flex items-center justify-center px-8 py-5 bg-emerald-900/40 hover:bg-emerald-800/60 backdrop-blur-md border border-emerald-500/30 text-emerald-200 text-lg font-semibold rounded-2xl transition-all hover:border-emerald-500/50 transform hover:-translate-y-1"
              >{{ 'landing.register' | transloco }}</a
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
      <div class="relative z-10 bg-gray-900 text-gray-300 py-24 px-6 border-t border-gray-800">
        <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-16">
          <section class="space-y-6">
            <h2 class="text-3xl font-bold text-emerald-400 font-sans border-l-4 border-emerald-500 pl-4">
              {{ 'landing.aboutTitle' | transloco }}
            </h2>
            <div class="space-y-4 text-lg leading-relaxed text-gray-400">
              <p>{{ 'landing.aboutText1' | transloco }}</p>
              <p>{{ 'landing.aboutText2' | transloco }}</p>
            </div>
          </section>

          <section class="space-y-6">
            <h2 class="text-3xl font-bold text-blue-400 font-sans border-l-4 border-blue-500 pl-4">
              {{ 'landing.backgroundTitle' | transloco }}
            </h2>
            <div class="space-y-4 text-lg leading-relaxed text-gray-400">
              <p>{{ 'landing.backgroundText1' | transloco }}</p>
              <p>{{ 'landing.backgroundText2' | transloco }}</p>
            </div>
          </section>
        </div>

        <footer class="mt-24 text-center text-gray-600 text-sm">
          <p>{{ 'landing.footer' | transloco: { year: year } }}</p>
        </footer>
      </div>
    </div>
  `,
})
export class Landing {
  year = new Date().getFullYear();
}
