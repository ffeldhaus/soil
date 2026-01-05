import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RouterLink, Router } from '@angular/router';
import { GAME_CONSTANTS } from '../game-constants';
import { CropType } from '../types';
import { LanguageSwitcherComponent } from '../shared/language-switcher/language-switcher';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-manual',
  standalone: true,
  imports: [CommonModule, TranslocoPipe, RouterLink, LanguageSwitcherComponent],
  template: `
    <div class="min-h-screen bg-gray-900 text-white font-sans relative flex flex-col overflow-x-hidden">
      <!-- Background Image -->
      <div class="fixed inset-0 z-0 opacity-40 pointer-events-none">
        <img src="assets/images/bauernhof.jpg" class="w-full h-full object-cover">
      </div>

      <!-- Navigation Bar -->
      <nav class="bg-gray-900/95 border-b border-gray-700 backdrop-blur shadow-lg px-6 py-3 sticky top-0 z-50 flex items-center justify-between shrink-0 h-16 print:hidden">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold font-serif text-emerald-500 tracking-wider">SOIL MANUAL</h1>
        </div>

        <div class="flex items-center gap-3">
          <button (click)="print()" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg border border-emerald-500 transition text-xs flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {{ 'manual.print' | transloco }}
          </button>
          
          <app-language-switcher></app-language-switcher>

          <button (click)="logout()" class="p-2 hover:bg-red-900/30 rounded-lg text-red-400 hover:text-red-300 transition" [title]="'board.logout' | transloco">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </nav>

      <div class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <header class="text-center mb-16 bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl">
          <h1 class="text-4xl sm:text-6xl font-black text-white mb-4 tracking-tight">{{ 'manual.title' | transloco }}</h1>
          <p class="text-xl text-gray-400 max-w-2xl mx-auto">{{ 'manual.subtitle' | transloco }}</p>
        </header>

        <!-- General Section -->
        <section class="mb-20 bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl">
          <h2 class="text-3xl font-bold text-emerald-400 mb-8 flex items-center gap-3">
            <span class="bg-emerald-900/50 p-2 rounded-xl text-2xl">📖</span> {{ 'manual.intro.title' | transloco }}
          </h2>
          <div class="grid md:grid-cols-2 gap-12 text-gray-300 leading-relaxed">
            <div>
              <h3 class="text-xl font-bold text-white mb-4">{{ 'manual.intro.goal.title' | transloco }}</h3>
              <p>{{ 'manual.intro.goal.text' | transloco }}</p>
            </div>
            <div>
              <h3 class="text-xl font-bold text-white mb-4">{{ 'manual.intro.mechanics.title' | transloco }}</h3>
              <p>{{ 'manual.intro.mechanics.text' | transloco }}</p>
            </div>
          </div>
        </section>

        <!-- Crops Section -->
        <div class="space-y-12">
          <div *ngFor="let crop of crops" class="bg-gray-900/90 backdrop-blur-md p-6 sm:p-10 rounded-[2.5rem] border border-gray-700 shadow-2xl group break-inside-avoid">
            <div class="flex flex-col lg:flex-row gap-10 items-start">
              <!-- Crop Image & Title -->
              <div class="w-full lg:w-1/3">
                <div class="aspect-square rounded-3xl overflow-hidden shadow-2xl mb-6 border-4 border-gray-800 group-hover:border-emerald-500/50 transition-all duration-500">
                  <img [src]="'assets/images/' + crop.image" [alt]="'crop.' + crop.id.toLowerCase() | transloco" class="w-full h-full object-cover">
                </div>
                <h3 class="text-4xl font-black text-white mb-4 tracking-tight">{{ 'crop.' + crop.id.toLowerCase() | transloco }}</h3>
                
                <!-- Pest Badge -->
                <div class="flex flex-col gap-2">
                  <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{{ 'pest.label' | transloco }}</span>
                  <div class="flex items-center gap-3 bg-red-900/20 border border-red-500/30 p-3 rounded-2xl">
                    <div class="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <span class="font-bold text-red-200">{{ 'pest.' + getPestKey(crop.pest) | transloco }}</span>
                  </div>
                </div>
              </div>

              <!-- Crop Details -->
              <div class="w-full lg:w-2/3 space-y-8">
                
                <!-- Rotation Graph -->
                <div class="bg-black/40 p-6 rounded-3xl border border-white/5">
                  <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">{{ 'manual.crops.rotation' | transloco }}</h4>
                  <div class="flex flex-col gap-8">
                    <div class="flex flex-col gap-3">
                      <div class="flex flex-wrap gap-2 items-center justify-center lg:justify-start">
                        <!-- Previous Crops -->
                        <div class="flex flex-wrap gap-1 items-center max-w-[200px] justify-end">
                           <div *ngFor="let prev of getRotationData(crop.id, 'previous')" 
                               class="w-8 h-8 rounded-lg flex items-center justify-center text-[8px] font-bold text-center border transition-transform hover:scale-110 cursor-help"
                               [ngClass]="getRotationClass(prev.quality)"
                               [title]="'crop.' + prev.id.toLowerCase() | transloco">
                            {{ prev.id.substring(0,2).toUpperCase() }}
                          </div>
                        </div>
                        
                        <div class="mx-2 text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>
                        
                        <!-- Current Crop -->
                        <div class="w-16 h-16 rounded-2xl bg-emerald-600 border-2 border-emerald-400 flex items-center justify-center text-white font-black shadow-lg shadow-emerald-900/50">
                          {{ crop.id.substring(0,3).toUpperCase() }}
                        </div>
                        
                        <div class="mx-2 text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>

                        <!-- Next Crops -->
                        <div class="flex flex-wrap gap-1 items-center max-w-[200px]">
                          <div *ngFor="let next of getRotationData(crop.id, 'next')" 
                               class="w-8 h-8 rounded-lg flex items-center justify-center text-[8px] font-bold text-center border transition-transform hover:scale-110 cursor-help"
                               [ngClass]="getRotationClass(next.quality)"
                               [title]="'crop.' + next.id.toLowerCase() | transloco">
                            {{ next.id.substring(0,2).toUpperCase() }}
                          </div>
                        </div>
                      </div>
                      <div class="flex justify-between px-2 text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-2">
                        <span>{{ 'manual.crops.rotationPrev' | transloco }}</span>
                        <span>{{ 'manual.crops.rotationNext' | transloco }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <!-- Requirements -->
                  <div class="bg-black/40 p-6 rounded-3xl border border-white/5">
                    <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">{{ 'manual.crops.requirements' | transloco }}</h4>
                    <div class="space-y-4">
                      <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-400">{{ 'manual.crops.soil' | transloco }}</span>
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-bold">{{ (crop.soilSensitivity > 1.1 ? 'sensitivity.high' : 'sensitivity.moderate') | transloco }}</span>
                          <div class="w-6 h-6 rounded-lg shadow-inner" [ngClass]="crop.soilSensitivity > 1.1 ? 'bg-red-500' : 'bg-yellow-500'"></div>
                        </div>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-400">{{ 'manual.crops.minerals' | transloco }}</span>
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-bold">{{ (crop.nutritionSensitivity > 1.1 ? 'sensitivity.high' : 'sensitivity.moderate') | transloco }}</span>
                          <div class="w-6 h-6 rounded-lg shadow-inner" [ngClass]="crop.nutritionSensitivity > 1.1 ? 'bg-red-500' : 'bg-yellow-500'"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Weather -->
                  <div class="bg-black/40 p-6 rounded-3xl border border-white/5">
                    <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">{{ 'manual.crops.weather' | transloco }}</h4>
                    <div class="space-y-3">
                      <div *ngFor="let w of ['drought', 'cold', 'flood']" class="flex justify-between items-center">
                        <span class="text-sm text-gray-400">{{ 'manual.crops.' + w | transloco }}</span>
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-bold">{{ 'sensitivity.' + getSensitivityKey(crop.weatherSensitivity[w]) | transloco }}</span>
                          <div class="w-6 h-6 rounded-lg shadow-inner" [ngClass]="getWeatherColor(crop.weatherSensitivity[w])"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Yields -->
                  <div class="sm:col-span-2 bg-black/40 p-6 rounded-3xl border border-white/5">
                    <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">{{ 'manual.crops.yields' | transloco }} (dt/ha)</h4>
                    <div class="grid grid-cols-5 gap-2">
                      <div *ngFor="let level of ['veryHigh', 'high', 'moderate', 'low', 'veryLow']" 
                           class="flex flex-col items-center p-3 rounded-2xl border transition-all"
                           [ngClass]="getYieldClass(level)">
                        <span class="text-sm font-black">{{ crop.yields[level] }}</span>
                        <span class="text-[8px] font-bold uppercase tracking-tighter opacity-80">{{ 'manual.yields.' + level | transloco }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Prices -->
                  <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div class="bg-white/5 p-6 rounded-3xl border border-white/10">
                      <h5 class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4">{{ 'manual.prices.conv' | transloco }}</h5>
                      <div class="space-y-3">
                        <div class="flex justify-between items-center">
                          <span class="text-sm text-gray-400">{{ 'manual.prices.seed' | transloco }}</span>
                          <span class="font-bold text-white">{{ crop.seedPrice.conventional }}€</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-sm text-gray-400">{{ 'manual.prices.sale' | transloco }}</span>
                          <span class="font-bold text-emerald-400">{{ crop.marketValue.conventional }}€</span>
                        </div>
                      </div>
                    </div>
                    <div class="bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/20 shadow-lg shadow-emerald-900/20">
                      <h5 class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4">{{ 'manual.prices.org' | transloco }}</h5>
                      <div class="space-y-3">
                        <div class="flex justify-between items-center">
                          <span class="text-sm text-gray-400">{{ 'manual.prices.seed' | transloco }}</span>
                          <span class="font-bold text-white">{{ crop.seedPrice.organic }}€</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-sm text-gray-400">{{ 'manual.prices.sale' | transloco }}</span>
                          <span class="font-bold text-emerald-400">{{ crop.marketValue.organic }}€</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Special -->
                  <div *ngIf="crop.special" class="sm:col-span-2 bg-blue-500/10 p-6 rounded-3xl border border-blue-500/20 flex gap-4 items-center">
                    <span class="text-2xl">💡</span>
                    <p class="text-sm text-blue-100 italic">
                      {{ 'special.' + crop.id.toLowerCase() | transloco }}
                    </p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="mt-24 pt-12 border-t border-gray-800 text-center text-gray-500 text-sm italic">
          {{ 'manual.footer' | transloco }}
        </footer>
      </div>
    </div>
  `,
  styles: [
    `
    @media print {
      @page {
        margin: 1.5cm;
      }
      body {
        background: white !important;
        color: black !important;
      }
      nav, .bg-gray-900\/95, .bg-black\/40, .bg-gray-900\/90, .bg-emerald-500\/10, .bg-white\/5 {
        background: transparent !important;
        border-color: #ddd !important;
        color: black !important;
        box-shadow: none !important;
      }
      .text-white, .text-gray-300, .text-gray-400, .text-emerald-400, .text-red-200 {
        color: black !important;
      }
      .print\:hidden {
        display: none !important;
      }
      .break-inside-avoid {
        break-inside: avoid;
      }
      img {
        filter: grayscale(100%);
      }
      .fixed {
        display: none !important;
      }
    }
    
    .animate-fade-in {
      animation: fadeIn 0.8s ease-out forwards;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `
  ]
})
export class ManualComponent {
  private transloco = inject(TranslocoService);
  private authService = inject(AuthService);
  private router = inject(Router);

  crops = Object.values(GAME_CONSTANTS.CROPS);

  getPestKey(pest: string): string {
    const map: Record<string, string> = {
      'Blattlaus': 'aphid',
      'Fritfliege': 'fritfly',
      'Kartoffelkäfer': 'potato-beetle',
      'Maiszünsler': 'corn-borer',
      'Drahtwurm': 'wireworm'
    };
    return map[pest] || 'aphid';
  }

  getSensitivityKey(level: string): string {
    const map: Record<string, string> = {
      'Stark': 'strong',
      'Mäßig': 'moderate',
      'Gering': 'low',
      'Keine': 'none'
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
      'veryHigh': 'bg-green-600/20 border-green-500/50 text-green-400',
      'high': 'bg-green-500/10 border-green-500/30 text-green-300',
      'moderate': 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
      'low': 'bg-orange-500/10 border-orange-500/30 text-orange-300',
      'veryLow': 'bg-red-500/10 border-red-500/30 text-red-300'
    };
    return map[level] || '';
  }

  getRotationData(cropId: string, direction: 'previous' | 'next') {
    const matrix = GAME_CONSTANTS.ROTATION_MATRIX;
    const currentCrop = cropId as CropType;
    const results: { id: string, quality: 'good' | 'ok' | 'bad' }[] = [];

    if (direction === 'previous') {
      Object.keys(matrix).forEach(prev => {
        const quality = matrix[prev as CropType][currentCrop];
        if (prev !== 'Grass' && prev !== 'Fallow') {
            results.push({ id: prev, quality });
        }
      });
    } else {
      const nextOptions = matrix[currentCrop];
      Object.keys(nextOptions).forEach(next => {
        const quality = nextOptions[next as CropType];
         if (next !== 'Grass' && next !== 'Fallow') {
            results.push({ id: next, quality });
         }
      });
    }
    return results.sort((a,b) => {
        const score = { good: 3, ok: 2, bad: 1 };
        return score[b.quality] - score[a.quality];
    });
  }

  getRotationClass(quality: 'good' | 'ok' | 'bad'): string {
    const map = {
      good: 'bg-green-500/20 border-green-500/50 text-green-400',
      ok: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
      bad: 'bg-red-500/20 border-red-500/50 text-red-400'
    };
    return map[quality];
  }

  print() {
    window.print();
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/']);
  }
}