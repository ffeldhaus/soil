import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { GAME_CONSTANTS } from '../game-constants';
import { LanguageSwitcherComponent } from '../shared/language-switcher/language-switcher';
import { CropType } from '../types';

@Component({
  selector: 'app-manual',
  standalone: true,
  imports: [CommonModule, LanguageSwitcherComponent],
  template: `
    <div
      class="min-h-screen bg-gray-900 text-white font-sans relative flex flex-col overflow-x-hidden"
      [ngClass]="{
        'print-a4': printSize === 'A4',
        'print-letter': printSize === 'Letter',
        'print-portrait': printOrientation === 'portrait',
        'print-landscape': printOrientation === 'landscape',
      }"
    >
      <!-- Background Image -->
      <div class="fixed inset-0 z-0 opacity-40 pointer-events-none">
        <img src="assets/images/bauernhof.jpg" class="w-full h-full object-cover" />
      </div>

      <!-- Navigation Bar -->
      <nav
        class="bg-gray-900/95 border-b border-gray-700 backdrop-blur shadow-lg px-6 py-3 sticky top-0 z-50 flex items-center justify-between shrink-0 h-16 print:hidden"
      >
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold font-serif text-emerald-500 tracking-wider">SOIL MANUAL</h1>
        </div>

        <div class="flex items-center gap-3">
          <button
            (click)="showPrintModal = true"
            class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg border border-emerald-500 transition text-xs flex items-center gap-2"
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
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            {{ t('manual.print') }}
          </button>

          <app-language-switcher></app-language-switcher>

          <button
            (click)="logout()"
            class="p-2 hover:bg-red-900/30 rounded-lg text-red-400 hover:text-red-300 transition"
            [title]="t('board.logout')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </nav>

      <div class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <header
          class="text-center mb-16 bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl"
        >
          <h1 class="text-4xl sm:text-6xl font-black text-white mb-4 tracking-tight">
            {{ t('manual.title') }}
          </h1>
          <p class="text-xl text-gray-400 max-w-2xl mx-auto">{{ t('manual.subtitle') }}</p>
        </header>

        <!-- General Section -->
        <section
          class="mb-20 bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl print:bg-white print:border-gray-200 print:shadow-none print:m-0 print:mb-8"
        >
          <h2 class="text-3xl font-bold text-emerald-400 mb-8 flex items-center gap-3 print:text-emerald-700">
            <span class="bg-emerald-900/50 p-2 rounded-xl text-2xl print:bg-emerald-100">📖</span>
            {{ t('manual.intro.title') }}
          </h2>
          <div class="grid md:grid-cols-2 gap-12 text-gray-300 leading-relaxed print:text-gray-700">
            <div>
              <h3 class="text-xl font-bold text-white mb-4 print:text-black">{{ t('manual.intro.goal.title') }}</h3>
              <p>{{ t('manual.intro.goal.text') }}</p>
            </div>
            <div>
              <h3 class="text-xl font-bold text-white mb-4 print:text-black">
                {{ t('manual.intro.mechanics.title') }}
              </h3>
              <p>{{ t('manual.intro.mechanics.text') }}</p>
            </div>
          </div>
        </section>

        <!-- Concepts Section -->
        <section
          class="mb-20 bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl print-page-break-after print:bg-white print:border-gray-200 print:shadow-none print:m-0 print:mb-8"
        >
          <h2 class="text-3xl font-bold text-emerald-400 mb-8 flex items-center gap-3 print:text-emerald-700">
            <span class="bg-emerald-900/50 p-2 rounded-xl text-2xl print:bg-emerald-100">💡</span>
            {{ t('manual.concepts.title') }}
          </h2>
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div
              *ngFor="
                let concept of ['units', 'pest', 'rotation', 'requirements', 'weather', 'yield', 'price'];
                let i = index
              "
              class="bg-black/30 p-6 rounded-2xl border border-white/5 h-full print:bg-gray-50 print:border-gray-200"
            >
              <h3 class="text-lg font-bold text-white mb-3 flex items-center gap-2 print:text-black">
                <span class="text-emerald-500">{{ ['📏', '🐛', '🔄', '🧪', '🌦️', '📈', '💰'][i] }}</span>
                {{ t('manual.concepts.' + concept + '.title') }}
              </h3>
              <p
                class="text-sm text-gray-400 leading-relaxed print:text-gray-600"
                [innerHTML]="t('manual.concepts.' + concept + '.text')"
              ></p>
            </div>
          </div>
        </section>

        <!-- Crops Section -->
        <div class="space-y-12">
          <div
            *ngFor="let crop of crops"
            class="bg-gray-900/90 backdrop-blur-md p-6 sm:p-10 rounded-[2.5rem] border border-gray-700 shadow-2xl group break-inside-avoid print-page-break-before print:bg-white print:border-gray-200 print:shadow-none print:p-8"
          >
            <div class="flex flex-col lg:flex-row gap-10 items-start">
              <!-- Crop Image & Title -->
              <div class="w-full lg:w-1/3 print:w-1/4">
                <div
                  class="aspect-square rounded-3xl overflow-hidden shadow-2xl mb-6 border-4 border-gray-800 group-hover:border-emerald-500/50 transition-all duration-500 print:border-gray-200"
                >
                  <img
                    [src]="'assets/images/' + crop.image"
                    [alt]="t('crop.' + crop.id.toLowerCase())"
                    class="w-full h-full object-cover"
                  />
                </div>
                <h3 class="text-4xl font-black text-white mb-4 tracking-tight print:text-black print:text-2xl">
                  {{ t('crop.' + crop.id.toLowerCase()) }}
                </h3>

                <!-- Pest Badge -->
                <div class="flex flex-col gap-2">
                  <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {{ t('pest.label') }}
                  </span>
                  <div
                    class="flex items-center gap-3 bg-red-900/20 border border-red-500/30 p-3 rounded-2xl print:bg-red-50 print:border-red-200"
                  >
                    <div
                      class="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-lg print:shadow-none"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    </div>
                    <span class="font-bold text-red-200 print:text-red-700">
                      {{ t('pest.' + getPestKey(crop.pest)) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Crop Details -->
              <div class="w-full lg:w-2/3 space-y-8 print:w-3/4">
                <!-- Rotation Graph -->
                <div
                  class="bg-black/40 p-4 sm:p-8 rounded-3xl border border-white/5 print:bg-gray-50 print:border-gray-100"
                >
                  <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-8 print:mb-4">
                    {{ t('manual.crops.rotation') }}
                  </h4>

                  <div class="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
                    <!-- Previous Crops Column -->
                    <div class="flex flex-col gap-2 w-full md:w-auto items-center md:items-end flex-1 order-1">
                      <span class="text-[8px] font-bold text-gray-600 uppercase mb-2">
                        {{ t('manual.crops.rotationPrev') }}
                      </span>
                      <div
                        *ngFor="let prev of getRotationData(crop.id, 'previous')"
                        class="px-3 py-2 rounded-xl text-[10px] font-bold border transition-all hover:scale-105 w-full md:w-44 text-center md:text-right print:w-32 print:py-1 print:text-[8px]"
                        [ngClass]="getRotationClass(prev.quality)"
                      >
                        {{ t('crop.' + prev.id.toLowerCase()) }}
                      </div>
                    </div>

                    <!-- Arrow (Mobile: Down, Desktop: Right) -->
                    <div class="flex items-center justify-center text-gray-600 order-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-8 w-8 rotate-90 md:rotate-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </div>

                    <!-- Current Crop (Middle) -->
                    <div class="flex flex-col items-center gap-3 order-3">
                      <span class="text-[8px] font-bold text-emerald-500 uppercase mb-1">
                        {{ t('manual.crops.current') }}
                      </span>
                      <div
                        class="w-32 h-32 rounded-[2.5rem] bg-emerald-600 border-4 border-emerald-400 flex items-center justify-center text-white font-black shadow-xl shadow-emerald-900/50 text-center p-4 text-base leading-tight print:w-24 print:h-24 print:text-xs print:rounded-2xl"
                      >
                        {{ t('crop.' + crop.id.toLowerCase()) }}
                      </div>
                    </div>

                    <!-- Arrow (Mobile: Down, Desktop: Right) -->
                    <div class="flex items-center justify-center text-gray-600 order-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-8 w-8 rotate-90 md:rotate-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </div>

                    <!-- Next Crops Column -->
                    <div class="flex flex-col gap-2 w-full md:w-auto items-center md:items-start flex-1 order-5">
                      <span class="text-[8px] font-bold text-gray-600 uppercase mb-2">
                        {{ t('manual.crops.rotationNext') }}
                      </span>
                      <div
                        *ngFor="let next of getRotationData(crop.id, 'next')"
                        class="px-3 py-2 rounded-xl text-[10px] font-bold border transition-all hover:scale-105 w-full md:w-44 text-center md:text-left print:w-32 print:py-1 print:text-[8px]"
                        [ngClass]="getRotationClass(next.quality)"
                      >
                        {{ t('crop.' + next.id.toLowerCase()) }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 print:gap-4">
                  <!-- Requirements -->
                  <div class="bg-black/40 p-6 rounded-3xl border border-white/5 print:bg-white print:border-gray-200">
                    <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
                      {{ t('manual.crops.requirements') }}
                    </h4>
                    <div class="space-y-4">
                      <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-400 print:text-gray-500">{{ t('manual.crops.soil') }}</span>
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-bold print:text-black">{{
                            t(crop.soilSensitivity > 1.1 ? 'sensitivity.high' : 'sensitivity.moderate')
                          }}</span>
                          <div
                            class="w-6 h-6 rounded-lg shadow-inner print:shadow-none"
                            [ngClass]="crop.soilSensitivity > 1.1 ? 'bg-red-500' : 'bg-yellow-500'"
                          ></div>
                        </div>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-400 print:text-gray-500">{{ t('manual.crops.minerals') }}</span>
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-bold print:text-black">{{
                            t(crop.nutritionSensitivity > 1.1 ? 'sensitivity.high' : 'sensitivity.moderate')
                          }}</span>
                          <div
                            class="w-6 h-6 rounded-lg shadow-inner print:shadow-none"
                            [ngClass]="crop.nutritionSensitivity > 1.1 ? 'bg-red-500' : 'bg-yellow-500'"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Weather -->
                  <div class="bg-black/40 p-6 rounded-3xl border border-white/5 print:bg-white print:border-gray-200">
                    <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
                      {{ t('manual.crops.weather') }}
                    </h4>
                    <div class="space-y-3">
                      <div *ngFor="let w of ['drought', 'cold', 'flood']" class="flex justify-between items-center">
                        <span class="text-sm text-gray-400 print:text-gray-500">{{ t('manual.crops.' + w) }}</span>
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-bold print:text-black">{{
                            t('sensitivity.' + getSensitivityKey(crop.weatherSensitivity[w]))
                          }}</span>
                          <div
                            class="w-6 h-6 rounded-lg shadow-inner print:shadow-none"
                            [ngClass]="getWeatherColor(crop.weatherSensitivity[w])"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Yields -->
                  <div
                    class="sm:col-span-2 bg-black/40 p-6 rounded-3xl border border-white/5 print:bg-white print:border-gray-200"
                  >
                    <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
                      {{ t('manual.crops.yields') }} (dt/ha)
                    </h4>
                    <div class="grid grid-cols-5 gap-2">
                      <div
                        *ngFor="let level of ['veryHigh', 'high', 'moderate', 'low', 'veryLow']"
                        class="flex flex-col items-center p-3 rounded-2xl border transition-all print:py-1"
                        [ngClass]="getYieldClass(level)"
                      >
                        <span class="text-sm font-black print:text-xs">{{ crop.yields[level] }}</span>
                        <span
                          class="text-[8px] font-bold uppercase tracking-tighter opacity-80 print:text-[6px] print:opacity-100"
                          >{{ t('manual.yields.' + level) }}</span
                        >
                      </div>
                    </div>
                  </div>

                  <!-- Prices -->
                  <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 print:gap-4">
                    <div class="bg-white/5 p-6 rounded-3xl border border-white/10 print:bg-white print:border-gray-200">
                      <h5
                        class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4 print:text-emerald-700"
                      >
                        {{ t('manual.prices.conv') }}
                      </h5>
                      <div class="space-y-3">
                        <div class="flex justify-between items-center">
                          <span class="text-sm text-gray-400 print:text-gray-500">{{ t('manual.prices.seed') }}</span>
                          <span class="font-bold text-white print:text-black">{{ crop.seedPrice.conventional }}€</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-sm text-gray-400 print:text-gray-500">{{ t('manual.prices.sale') }}</span>
                          <span class="font-bold text-emerald-400 print:text-emerald-600"
                            >{{ crop.marketValue.conventional }}€</span
                          >
                        </div>
                      </div>
                    </div>
                    <div
                      class="bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/20 shadow-lg shadow-emerald-900/20 print:bg-white print:border-emerald-200 print:shadow-none"
                    >
                      <h5
                        class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4 print:text-emerald-700"
                      >
                        {{ t('manual.prices.org') }}
                      </h5>
                      <div class="space-y-3">
                        <div class="flex justify-between items-center">
                          <span class="text-sm text-gray-400 print:text-gray-500">{{ t('manual.prices.seed') }}</span>
                          <span class="font-bold text-white print:text-black">{{ crop.seedPrice.organic }}€</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-sm text-gray-400 print:text-gray-500">{{ t('manual.prices.sale') }}</span>
                          <span class="font-bold text-emerald-400 print:text-emerald-600"
                            >{{ crop.marketValue.organic }}€</span
                          >
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Special -->
                  <div
                    *ngIf="crop.special"
                    class="sm:col-span-2 bg-blue-500/10 p-6 rounded-3xl border border-blue-500/20 flex gap-4 items-center print:bg-blue-50 print:border-blue-100 print:p-4"
                  >
                    <span class="text-2xl print:text-xl">💡</span>
                    <p class="text-sm text-blue-100 italic print:text-blue-800 print:text-xs">
                      {{ t('special.' + crop.id.toLowerCase()) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="mt-24 pt-12 border-t border-gray-800 text-center text-gray-500 text-sm italic print:mt-8">
          {{ t('manual.footer') }}
        </footer>
      </div>

      <!-- Print Settings Modal -->
      <div
        *ngIf="showPrintModal"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden"
        (click)="showPrintModal = false"
      >
        <div
          class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-8 max-w-md w-full"
          (click)="$event.stopPropagation()"
        >
          <h2 class="text-2xl font-bold text-white mb-6">{{ t('manual.printModal.title') }}</h2>

          <div class="space-y-6">
            <!-- Paper Size -->
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-3">{{ t('manual.printModal.size') }}</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  *ngFor="let size of ['A4', 'Letter']"
                  (click)="printSize = size"
                  class="px-4 py-2 rounded-xl border font-bold transition-all"
                  [ngClass]="
                    printSize === size
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                  "
                >
                  {{ size }}
                </button>
              </div>
            </div>

            <!-- Orientation -->
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-3">{{
                t('manual.printModal.orientation')
              }}</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  *ngFor="let orient of ['portrait', 'landscape']"
                  (click)="printOrientation = orient"
                  class="px-4 py-2 rounded-xl border font-bold transition-all"
                  [ngClass]="
                    printOrientation === orient
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                  "
                >
                  {{ t('manual.printModal.' + orient) }}
                </button>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-10">
            <button
              (click)="showPrintModal = false"
              class="px-6 py-2 text-gray-400 hover:text-white transition font-medium"
            >
              {{ t('manual.printModal.cancel') }}
            </button>
            <button
              (click)="print()"
              class="px-8 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition"
            >
              {{ t('manual.printModal.print') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      @media print {
        @page {
          margin: 1cm;
        }

        .print-a4 {
          /* Defined via @page in component styles doesn't work well dynamically, 
             so we use classes to target specific sizes if needed, but standard 
             browser print dialog handles size. We'll use CSS for orientation. */
        }

        .print-portrait {
          /* Handled by @page */
        }

        .print-landscape {
          /* Handled by @page */
        }

        body {
          background: white !important;
          color: black !important;
        }

        nav,
        .fixed:not(.inset-0),
        .print\:hidden {
          display: none !important;
        }

        .relative {
          position: static !important;
        }

        .z-10 {
          z-index: auto !important;
        }

        .bg-gray-900,
        .bg-gray-900\\/80,
        .bg-gray-900\\/90,
        .bg-black\\/40,
        .bg-black\\/30,
        .bg-white\\/5,
        .bg-emerald-500\\/10,
        .bg-red-900\\/20,
        .bg-blue-500\\/10 {
          background-color: white !important;
          background: white !important;
          backdrop-filter: none !important;
        }

        .border,
        .border-gray-700,
        .border-gray-800,
        .border-white\\/5,
        .border-white\\/10,
        .border-emerald-500\\/20,
        .border-red-500\\/30,
        .border-blue-500\\/20 {
          border-color: #eee !important;
        }

        .text-white,
        .text-gray-300,
        .text-gray-400,
        .text-emerald-400,
        .text-red-200,
        .text-blue-100 {
          color: black !important;
        }

        .shadow-2xl,
        .shadow-lg,
        .shadow-xl {
          box-shadow: none !important;
        }

        .print-page-break-after {
          break-after: page;
          page-break-after: always;
        }

        .print-page-break-before {
          break-before: page;
          page-break-before: always;
        }

        img {
          filter: none !important;
        }

        .max-w-5xl {
          max-width: none !important;
          width: 100% !important;
          padding: 0 !important;
        }
      }

      /* Dynamic @page based on classes */
      :host-context(.print-a4.print-portrait) {
        @media print {
          @page {
            size: A4 portrait;
          }
        }
      }
      :host-context(.print-a4.print-landscape) {
        @media print {
          @page {
            size: A4 landscape;
          }
        }
      }
      :host-context(.print-letter.print-portrait) {
        @media print {
          @page {
            size: letter portrait;
          }
        }
      }
      :host-context(.print-letter.print-landscape) {
        @media print {
          @page {
            size: letter landscape;
          }
        }
      }

      .animate-fade-in {
        animation: fadeIn 0.8s ease-out forwards;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ManualComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  t(key: string): string {
    const translations: Record<string, string> = {
      'manual.print': $localize`:@@manual.print:Drucken`,
      'board.logout': $localize`:@@board.logout:Abmelden`,
      'manual.title': $localize`:@@manual.title:Handbuch`,
      'manual.subtitle': $localize`:@@manual.subtitle:Alles was Sie über nachhaltige Landwirtschaft in Soil wissen müssen`,
      'manual.intro.title': $localize`:@@manual.intro.title:Einleitung`,
      'manual.intro.goal.title': $localize`:@@manual.intro.goal.title:Das Ziel`,
      'manual.intro.goal.text': $localize`:@@manual.intro.goal.text:Erfolgreich wirtschaften und dabei den Boden schützen.`,
      'manual.intro.mechanics.title': $localize`:@@manual.intro.mechanics.title:Mechanik`,
      'manual.intro.mechanics.text': $localize`:@@manual.intro.mechanics.text:In 10 Runden triffst du Entscheidungen über Anbau, Düngung und Schutz.`,
      'manual.concepts.title': $localize`:@@manual.concepts.title:Konzepte`,
      'manual.concepts.units.title': $localize`:@@manual.concepts.units.title:Einheiten`,
      'manual.concepts.units.text': $localize`:@@manual.concepts.units.text:Fläche in Hektar (ha), Ertrag in Dezitonnen (dt).`,
      'manual.concepts.pest.title': $localize`:@@manual.concepts.pest.title:Schädlinge`,
      'manual.concepts.pest.text': $localize`:@@manual.concepts.pest.text:Jede Pflanze hat spezifische natürliche Feinde.`,
      'manual.concepts.rotation.title': $localize`:@@manual.concepts.rotation.title:Fruchtfolge`,
      'manual.concepts.rotation.text': $localize`:@@manual.concepts.rotation.text:Der Vorfruchtwert bestimmt die Bodengesundheit.`,
      'manual.concepts.requirements.title': $localize`:@@manual.concepts.requirements.title:Anforderungen`,
      'manual.concepts.requirements.text': $localize`:@@manual.concepts.requirements.text:Mineralienbedarf und Bodenanspruch variieren.`,
      'manual.concepts.weather.title': $localize`:@@manual.concepts.weather.title:Wetter`,
      'manual.concepts.weather.text': $localize`:@@manual.concepts.weather.text:Trockenheit, Kälte oder Nässe beeinflussen den Ertrag.`,
      'manual.concepts.yield.title': $localize`:@@manual.concepts.yield.title:Ertrag`,
      'manual.concepts.yield.text': $localize`:@@manual.concepts.yield.text:Abhängig von Bodenqualität und Wetter.`,
      'manual.concepts.price.title': $localize`:@@manual.concepts.price.title:Preise`,
      'manual.concepts.price.text': $localize`:@@manual.concepts.price.text:Marktpreise schwanken zwischen Konventionell und Bio.`,
      'crop.wheat': $localize`:@@crop.wheat:Weizen`,
      'crop.corn': $localize`:@@crop.corn:Mais`,
      'crop.potato': $localize`:@@crop.potato:Kartoffel`,
      'crop.beet': $localize`:@@crop.beet:Zuckerrübe`,
      'crop.barley': $localize`:@@crop.barley:Gerste`,
      'crop.oat': $localize`:@@crop.oat:Hafer`,
      'crop.rye': $localize`:@@crop.rye:Roggen`,
      'crop.fieldbean': $localize`:@@crop.fieldbean:Ackerbohne`,
      'crop.animals': $localize`:@@crop.animals:Tiere`,
      'crop.fallow': $localize`:@@crop.fallow:Brachland`,
      'pest.label': $localize`:@@pest.label:Hauptschädling`,
      'pest.aphid': $localize`:@@pest.aphid:Blattlaus`,
      'pest.fritfly': $localize`:@@pest.fritfly:Fritfliege`,
      'pest.potato-beetle': $localize`:@@pest.potato-beetle:Kartoffelkäfer`,
      'pest.corn-borer': $localize`:@@pest.corn-borer:Maiszünsler`,
      'pest.wireworm': $localize`:@@pest.wireworm:Drahtwurm`,
      'manual.crops.rotation': $localize`:@@manual.crops.rotation:Fruchtfolgewirkung`,
      'manual.crops.rotationPrev': $localize`:@@manual.crops.rotationPrev:Vorfrucht`,
      'manual.crops.current': $localize`:@@manual.crops.current:Aktuell`,
      'manual.crops.rotationNext': $localize`:@@manual.crops.rotationNext:Nachfrucht`,
      'manual.crops.requirements': $localize`:@@manual.crops.requirements:Ansprüche`,
      'manual.crops.soil': $localize`:@@manual.crops.soil:Bodenqualität`,
      'manual.crops.minerals': $localize`:@@manual.crops.minerals:Mineralstoffe`,
      'sensitivity.high': $localize`:@@sensitivity.high:Hoch`,
      'sensitivity.moderate': $localize`:@@sensitivity.moderate:Mäßig`,
      'sensitivity.low': $localize`:@@sensitivity.low:Gering`,
      'sensitivity.strong': $localize`:@@sensitivity.strong:Stark`,
      'sensitivity.none': $localize`:@@sensitivity.none:Keine`,
      'manual.crops.weather': $localize`:@@manual.crops.weather:Wetter-Empfindlichkeit`,
      'manual.crops.drought': $localize`:@@manual.crops.drought:Trockenheit`,
      'manual.crops.cold': $localize`:@@manual.crops.cold:Kälte`,
      'manual.crops.flood': $localize`:@@manual.crops.flood:Nässe`,
      'manual.crops.yields': $localize`:@@manual.crops.yields:Ertragspotenzial`,
      'manual.yields.veryHigh': $localize`:@@manual.yields.veryHigh:Sehr Hoch`,
      'manual.yields.high': $localize`:@@manual.yields.high:Hoch`,
      'manual.yields.moderate': $localize`:@@manual.yields.moderate:Mittel`,
      'manual.yields.low': $localize`:@@manual.yields.low:Gering`,
      'manual.yields.veryLow': $localize`:@@manual.yields.veryLow:Sehr Gering`,
      'manual.prices.conv': $localize`:@@manual.prices.conv:Konventionell`,
      'manual.prices.org': $localize`:@@manual.prices.org:Ökologisch (Bio)`,
      'manual.prices.seed': $localize`:@@manual.prices.seed:Saatgutkosten`,
      'manual.prices.sale': $localize`:@@manual.prices.sale:Verkaufspreis`,
      'special.wheat': $localize`:@@special.wheat:Standardkultur mit ausgeglichenen Werten.`,
      'special.corn': $localize`:@@special.corn:Hoher Ertrag, aber anspruchsvoll für den Boden.`,
      'special.potato': $localize`:@@special.potato:Sehr profitabel, aber extrem schädlingsanfällig.`,
      'special.beet': $localize`:@@special.beet:Gute Fruchtfolgewirkung für Nachfolgekulturen.`,
      'special.barley': $localize`:@@special.barley:Robuste Getreideart für verschiedene Standorte.`,
      'special.oat': $localize`:@@special.oat:Gute Vorfrucht, geringe Ansprüche.`,
      'special.rye': $localize`:@@special.rye:Sehr widerstandsfähig gegen Kälte.`,
      'special.fieldbean': $localize`:@@special.fieldbean:Baut Stickstoff im Boden auf (Leguminose).`,
      'special.animals': $localize`:@@special.animals:Dauerkultur zur Viehhaltung.`,
      'special.fallow': $localize`:@@special.fallow:Regeneration für den Boden.`,
      'manual.footer': $localize`:@@manual.footer:Soil Simulation - Ein Bildungsprojekt für nachhaltige Landwirtschaft.`,
      'manual.printModal.title': $localize`:@@manual.printModal.title:Druckeinstellungen`,
      'manual.printModal.size': $localize`:@@manual.printModal.size:Papierformat`,
      'manual.printModal.orientation': $localize`:@@manual.printModal.orientation:Ausrichtung`,
      'manual.printModal.portrait': $localize`:@@manual.printModal.portrait:Hochformat`,
      'manual.printModal.landscape': $localize`:@@manual.printModal.landscape:Querformat`,
      'manual.printModal.cancel': $localize`:@@manual.printModal.cancel:Abbrechen`,
      'manual.printModal.print': $localize`:@@manual.printModal.print:Drucken starten`,
    };
    return translations[key] || key;
  }

  crops = Object.values(GAME_CONSTANTS.CROPS);

  showPrintModal = false;
  printSize = 'A4';
  printOrientation = 'portrait';

  getPestKey(pest: string): string {
    const map: Record<string, string> = {
      Blattlaus: 'aphid',
      Fritfliege: 'fritfly',
      Kartoffelkäfer: 'potato-beetle',
      Maiszünsler: 'corn-borer',
      Drahtwurm: 'wireworm',
    };
    return map[pest] || 'aphid';
  }

  getSensitivityKey(level: string): string {
    const map: Record<string, string> = {
      Stark: 'strong',
      Mäßig: 'moderate',
      Gering: 'low',
      Keine: 'none',
    };
    return map[level] || 'low';
  }

  getWeatherColor(level: string): string {
    if (level === 'Stark') return 'bg-red-500';
    if (level === 'Mäßig') return 'bg-orange-500';
    return 'bg-green-500';
  }

  getYieldClass(level: string): string {
    const map: Record<string, string> = {
      veryHigh: 'bg-green-600/20 border-green-500/50 text-green-400',
      high: 'bg-green-500/10 border-green-500/30 text-green-300',
      moderate: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
      low: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
      veryLow: 'bg-red-500/10 border-red-500/30 text-red-300',
    };
    return map[level] || '';
  }

  getRotationData(cropId: string, direction: 'previous' | 'next') {
    const matrix = GAME_CONSTANTS.ROTATION_MATRIX;
    const currentCrop = cropId as CropType;
    const results: { id: string; quality: 'good' | 'ok' | 'bad' }[] = [];

    if (direction === 'previous') {
      Object.keys(matrix).forEach((prev) => {
        const quality = matrix[prev as CropType][currentCrop];
        if (prev !== 'Grass' && prev !== 'Fallow') {
          results.push({ id: prev, quality });
        }
      });
    } else {
      const nextOptions = matrix[currentCrop];
      Object.keys(nextOptions).forEach((next) => {
        const quality = nextOptions[next as CropType];
        if (next !== 'Grass' && next !== 'Fallow') {
          results.push({ id: next, quality });
        }
      });
    }
    return results.sort((a, b) => {
      const score = { good: 3, ok: 2, bad: 1 };
      return score[b.quality] - score[a.quality];
    });
  }

  getRotationClass(quality: 'good' | 'ok' | 'bad'): string {
    const map = {
      good: 'bg-green-500/20 border-green-500/50 text-green-400',
      ok: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
      bad: 'bg-red-500/20 border-red-500/50 text-red-400',
    };
    return map[quality];
  }

  print() {
    this.showPrintModal = false;
    // Small timeout to allow modal to close and classes to apply before print dialog
    setTimeout(() => {
      window.print();
    }, 100);
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/']);
  }
}
