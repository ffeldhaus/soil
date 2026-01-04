import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { GAME_CONSTANTS } from '../game-constants';
import { CropType } from '../types';

@Component({
  selector: 'app-manual',
  standalone: true,
  imports: [CommonModule, TranslocoPipe, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      <!-- Header / Nav -->
      <nav class="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50 print:hidden">
        <div class="max-w-5xl mx-auto flex justify-between items-center">
          <a routerLink="/" class="flex items-center gap-2 text-emerald-600 font-bold text-xl">
            <span class="text-2xl">🌱</span> Soil Manual
          </a>
          <div class="flex gap-4">
            <button (click)="print()" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {{ 'manual.print' | transloco }}
            </button>
            <a routerLink="/" class="px-4 py-2 text-gray-600 hover:text-black transition flex items-center gap-2">
               {{ 'manual.back' | transloco }}
            </a>
          </div>
        </div>
      </nav>

      <div class="max-w-5xl mx-auto px-6 py-12 bg-white shadow-sm my-8 print:my-0 print:shadow-none print:max-w-full">
        <header class="text-center mb-16 border-b-2 border-emerald-100 pb-12">
          <h1 class="text-5xl font-extrabold text-gray-900 mb-4">{{ 'manual.title' | transloco }}</h1>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">{{ 'manual.subtitle' | transloco }}</p>
        </header>

        <!-- General Section -->
        <section class="mb-20">
          <h2 class="text-3xl font-bold text-emerald-700 mb-8 flex items-center gap-3">
            <span class="bg-emerald-100 p-2 rounded-lg">📖</span> {{ 'manual.intro.title' | transloco }}
          </h2>
          <div class="grid md:grid-cols-2 gap-12 text-gray-700 leading-relaxed">
            <div>
              <h3 class="text-xl font-bold mb-4">{{ 'manual.intro.goal.title' | transloco }}</h3>
              <p>{{ 'manual.intro.goal.text' | transloco }}</p>
            </div>
            <div>
              <h3 class="text-xl font-bold mb-4">{{ 'manual.intro.mechanics.title' | transloco }}</h3>
              <p>{{ 'manual.intro.mechanics.text' | transloco }}</p>
            </div>
          </div>
        </section>

        <!-- Crops Section -->
        <section>
          <h2 class="text-3xl font-bold text-emerald-700 mb-12 flex items-center gap-3">
            <span class="bg-emerald-100 p-2 rounded-lg">🌾</span> {{ 'manual.crops.title' | transloco }}
          </h2>

          <div class="space-y-24">
            <div *ngFor="let crop of crops" class="group break-inside-avoid">
              <div class="flex flex-col md:flex-row gap-10 items-start">
                <!-- Crop Image & Title -->
                <div class="w-full md:w-1/3">
                  <div class="aspect-square rounded-2xl overflow-hidden shadow-lg mb-6 border-4 border-white group-hover:border-emerald-200 transition-colors">
                    <img [src]="'assets/images/' + crop.image" [alt]="'crop.' + crop.id.toLowerCase() | transloco" class="w-full h-full object-cover">
                  </div>
                  <h3 class="text-3xl font-black text-gray-900 mb-2">{{ 'crop.' + crop.id.toLowerCase() | transloco }}</h3>
                  <div class="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold border border-emerald-100">
                    {{ crop.pest }}
                  </div>
                </div>

                <!-- Crop Details -->
                <div class="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-8 bg-gray-50/50 p-8 rounded-3xl border border-gray-100">
                  
                  <!-- Rotation -->
                  <div class="sm:col-span-2">
                    <h4 class="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{{ 'manual.crops.rotation' | transloco }}</h4>
                    <div class="flex flex-wrap gap-2">
                      <span *ngFor="let rot of getRotation(crop.id, 'good')" class="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium border border-green-200">
                        {{ 'crop.' + rot.toLowerCase() | transloco }}
                      </span>
                      <span *ngFor="let rot of getRotation(crop.id, 'ok')" class="px-3 py-1 bg-blue-50 text-blue-800 rounded-lg text-sm font-medium border border-blue-100">
                        {{ 'crop.' + rot.toLowerCase() | transloco }}
                      </span>
                      <span *ngFor="let rot of getRotation(crop.id, 'bad')" class="px-3 py-1 bg-red-50 text-red-800 rounded-lg text-sm font-medium border border-red-100">
                        {{ 'crop.' + rot.toLowerCase() | transloco }}
                      </span>
                    </div>
                  </div>

                  <!-- Requirements -->
                  <div>
                    <h4 class="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{{ 'manual.crops.requirements' | transloco }}</h4>
                    <ul class="space-y-3">
                      <li class="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span class="text-gray-600">{{ 'manual.crops.soil' | transloco }}</span>
                        <span class="font-bold text-gray-900">{{ crop.yields.veryHigh ? 'Hoch' : 'Mäßig' }}</span> <!-- Fallback or map based on sensitivity -->
                      </li>
                      <li class="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span class="text-gray-600">{{ 'manual.crops.minerals' | transloco }}</span>
                        <span class="font-bold text-gray-900">{{ crop.id === 'Wheat' || crop.id === 'Potato' || crop.id === 'Beet' ? 'Hoch' : 'Niedrig' }}</span>
                      </li>
                    </ul>
                  </div>

                  <!-- Weather -->
                  <div>
                    <h4 class="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{{ 'manual.crops.weather' | transloco }}</h4>
                    <ul class="space-y-3">
                      <li class="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span class="text-gray-600">{{ 'manual.crops.drought' | transloco }}</span>
                        <span class="font-bold" [ngClass]="getWeatherClass(crop.weatherSensitivity.drought)">{{ crop.weatherSensitivity.drought }}</span>
                      </li>
                      <li class="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span class="text-gray-600">{{ 'manual.crops.cold' | transloco }}</span>
                        <span class="font-bold" [ngClass]="getWeatherClass(crop.weatherSensitivity.cold)">{{ crop.weatherSensitivity.cold }}</span>
                      </li>
                      <li class="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span class="text-gray-600">{{ 'manual.crops.flood' | transloco }}</span>
                        <span class="font-bold" [ngClass]="getWeatherClass(crop.weatherSensitivity.flood)">{{ crop.weatherSensitivity.flood }}</span>
                      </li>
                    </ul>
                  </div>

                  <!-- Yields -->
                  <div class="sm:col-span-2">
                    <h4 class="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{{ 'manual.crops.yields' | transloco }} (dt/ha)</h4>
                    <div class="grid grid-cols-5 gap-2 text-center text-xs">
                      <div class="bg-emerald-600 text-white p-2 rounded-lg">
                        <div class="font-black text-sm">{{ crop.yields.veryHigh }}</div>
                        <div>{{ 'manual.yields.veryHigh' | transloco }}</div>
                      </div>
                      <div class="bg-emerald-500 text-white p-2 rounded-lg">
                        <div class="font-black text-sm">{{ crop.yields.high }}</div>
                        <div>{{ 'manual.yields.high' | transloco }}</div>
                      </div>
                      <div class="bg-emerald-400 text-white p-2 rounded-lg">
                        <div class="font-black text-sm">{{ crop.yields.moderate }}</div>
                        <div>{{ 'manual.yields.moderate' | transloco }}</div>
                      </div>
                      <div class="bg-emerald-300 text-white p-2 rounded-lg">
                        <div class="font-black text-sm">{{ crop.yields.low }}</div>
                        <div>{{ 'manual.yields.low' | transloco }}</div>
                      </div>
                      <div class="bg-emerald-200 text-emerald-900 p-2 rounded-lg">
                        <div class="font-black text-sm">{{ crop.yields.veryLow }}</div>
                        <div>{{ 'manual.yields.veryLow' | transloco }}</div>
                      </div>
                    </div>
                  </div>

                  <!-- Prices -->
                  <div class="sm:col-span-2">
                    <h4 class="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{{ 'manual.crops.prices' | transloco }}</h4>
                    <div class="grid grid-cols-2 gap-6">
                      <div class="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                        <h5 class="text-xs font-bold text-emerald-600 uppercase mb-3">{{ 'manual.prices.conv' | transloco }}</h5>
                        <div class="space-y-2">
                          <div class="flex justify-between">
                            <span class="text-gray-500 text-sm">{{ 'manual.prices.seed' | transloco }}</span>
                            <span class="font-bold">{{ crop.seedPrice.conventional }}€</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-gray-500 text-sm">{{ 'manual.prices.sale' | transloco }}</span>
                            <span class="font-bold">{{ crop.marketValue.conventional }}€</span>
                          </div>
                        </div>
                      </div>
                      <div class="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm shadow-emerald-50/50">
                        <h5 class="text-xs font-bold text-emerald-600 uppercase mb-3">{{ 'manual.prices.org' | transloco }}</h5>
                        <div class="space-y-2">
                          <div class="flex justify-between">
                            <span class="text-gray-500 text-sm">{{ 'manual.prices.seed' | transloco }}</span>
                            <span class="font-bold">{{ crop.seedPrice.organic }}€</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-gray-500 text-sm">{{ 'manual.prices.sale' | transloco }}</span>
                            <span class="font-bold">{{ crop.marketValue.organic }}€</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Special -->
                  <div *ngIf="crop.special" class="sm:col-span-2 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex gap-3 italic text-emerald-800 text-sm">
                    <span>💡</span>
                    <p>{{ crop.special }}</p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </section>

        <footer class="mt-24 pt-12 border-t border-gray-200 text-center text-gray-400 text-sm italic">
          {{ 'manual.footer' | transloco }}
        </footer>
      </div>
    </div>
  `,
  styles: [`
    @media print {
      @page {
        margin: 2cm;
      }
      body {
        background: white;
      }
      .break-inside-avoid {
        break-inside: avoid;
      }
    }
  `]
})
export class ManualComponent {
  private transloco = inject(TranslocoService);

  crops = Object.values(GAME_CONSTANTS.CROPS);

  getRotation(cropId: string, type: 'good' | 'ok' | 'bad'): string[] {
    const matrix = GAME_CONSTANTS.ROTATION_MATRIX;
    const cropType = cropId as CropType;
    
    // Invert search: we want to know what can be planted BEFORE this crop
    // The matrix is [PREVIOUS][NEXT]. So we check all PREVIOUS where NEXT is cropType.
    return Object.keys(matrix).filter(prev => matrix[prev as CropType][cropType] === type);
  }

  getWeatherClass(level: string) {
    if (level === 'Stark') return 'text-red-600';
    if (level === 'Mäßig') return 'text-orange-500';
    return 'text-green-600';
  }

  print() {
    window.print();
  }
}

