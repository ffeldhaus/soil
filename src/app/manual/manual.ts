import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';

interface CropDetail {
  id: string;
  name: string;
  image: string;
  rotationGood: string[];
  rotationOkay?: string[];
  rotationBad?: string[];
  minSoil: string;
  minMinerals: string;
  weatherDrought: string;
  weatherCold: string;
  weatherFlood: string;
  yields: {
    veryHigh: string;
    high: string;
    moderate: string;
    low: string;
    veryLow: string;
  };
  prices: {
    seedConv: number;
    seedOrg: number;
    salesConv: number;
    salesOrg: number;
  };
  pest: string;
  special?: string;
}

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
                    <img [src]="'assets/images/' + crop.image" [alt]="crop.name" class="w-full h-full object-cover">
                  </div>
                  <h3 class="text-3xl font-black text-gray-900 mb-2">{{ crop.name }}</h3>
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
                      <span *ngFor="let c of crop.rotationGood" class="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium border border-green-200">
                        {{ c }}
                      </span>
                      <span *ngFor="let c of crop.rotationOkay" class="px-3 py-1 bg-blue-50 text-blue-800 rounded-lg text-sm font-medium border border-blue-100">
                        {{ c }}
                      </span>
                      <span *ngFor="let c of crop.rotationBad" class="px-3 py-1 bg-red-50 text-red-800 rounded-lg text-sm font-medium border border-red-100">
                        {{ c }}
                      </span>
                    </div>
                  </div>

                  <!-- Requirements -->
                  <div>
                    <h4 class="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{{ 'manual.crops.requirements' | transloco }}</h4>
                    <ul class="space-y-3">
                      <li class="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span class="text-gray-600">{{ 'manual.crops.soil' | transloco }}</span>
                        <span class="font-bold text-gray-900">{{ crop.minSoil }}</span>
                      </li>
                      <li class="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span class="text-gray-600">{{ 'manual.crops.minerals' | transloco }}</span>
                        <span class="font-bold text-gray-900">{{ crop.minMinerals }}</span>
                      </li>
                    </ul>
                  </div>

                  <!-- Weather -->
                  <div>
                    <h4 class="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{{ 'manual.crops.weather' | transloco }}</h4>
                    <ul class="space-y-3">
                      <li class="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span class="text-gray-600">{{ 'manual.crops.drought' | transloco }}</span>
                        <span class="font-bold" [ngClass]="getWeatherClass(crop.weatherDrought)">{{ crop.weatherDrought }}</span>
                      </li>
                      <li class="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span class="text-gray-600">{{ 'manual.crops.cold' | transloco }}</span>
                        <span class="font-bold" [ngClass]="getWeatherClass(crop.weatherCold)">{{ crop.weatherCold }}</span>
                      </li>
                      <li class="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span class="text-gray-600">{{ 'manual.crops.flood' | transloco }}</span>
                        <span class="font-bold" [ngClass]="getWeatherClass(crop.weatherFlood)">{{ crop.weatherFlood }}</span>
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
                            <span class="font-bold">{{ crop.prices.seedConv }}€</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-gray-500 text-sm">{{ 'manual.prices.sale' | transloco }}</span>
                            <span class="font-bold">{{ crop.prices.salesConv }}€</span>
                          </div>
                        </div>
                      </div>
                      <div class="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm shadow-emerald-50/50">
                        <h5 class="text-xs font-bold text-emerald-600 uppercase mb-3">{{ 'manual.prices.org' | transloco }}</h5>
                        <div class="space-y-2">
                          <div class="flex justify-between">
                            <span class="text-gray-500 text-sm">{{ 'manual.prices.seed' | transloco }}</span>
                            <span class="font-bold">{{ crop.prices.seedOrg }}€</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-gray-500 text-sm">{{ 'manual.prices.sale' | transloco }}</span>
                            <span class="font-bold">{{ crop.prices.salesOrg }}€</span>
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

  crops: CropDetail[] = [
    {
      id: 'fieldbean',
      name: 'Ackerbohne',
      image: 'ackerbohne.jpg',
      rotationGood: ['Ackerbohne', 'Gerste', 'Hafer', 'Kartoffeln', 'Mais', 'Roggen', 'Weizen', 'Zuckerrübe'],
      minSoil: 'Mäßig',
      minMinerals: 'Niedrig',
      weatherDrought: 'Stark',
      weatherCold: 'Mäßig',
      weatherFlood: 'Stark',
      yields: { veryHigh: '≥ 48', high: '36-47', moderate: '24-35', low: '13-23', veryLow: '< 13' },
      prices: { seedConv: 120, seedOrg: 144, salesConv: 18, salesOrg: 21 },
      pest: 'Blattlaus',
      special: 'Ackerbohnen erhöhen den Mineralstoffgehalt und die Bodenqualität.'
    },
    {
      id: 'barley',
      name: 'Gerste',
      image: 'gerste.jpg',
      rotationGood: ['Ackerbohne', 'Kartoffeln', 'Mais', 'Roggen', 'Weizen'],
      rotationOkay: ['Gerste', 'Zuckerrübe'],
      rotationBad: ['Hafer'],
      minSoil: 'Hoch',
      minMinerals: 'Niedrig',
      weatherDrought: 'Stark',
      weatherCold: 'Stark',
      weatherFlood: 'Stark',
      yields: { veryHigh: '≥ 76', high: '57-75', moderate: '38-56', low: '20-37', veryLow: '< 20' },
      prices: { seedConv: 68, seedOrg: 85, salesConv: 13, salesOrg: 14.5 },
      pest: 'Fritfliege'
    },
    {
      id: 'oat',
      name: 'Hafer',
      image: 'hafer.jpg',
      rotationGood: ['Ackerbohne', 'Gerste', 'Mais', 'Roggen', 'Weizen'],
      rotationOkay: ['Kartoffeln', 'Zuckerrübe'],
      rotationBad: ['Hafer'],
      minSoil: 'Mäßig',
      minMinerals: 'Mäßig',
      weatherDrought: 'Mäßig',
      weatherCold: 'Stark',
      weatherFlood: 'Stark',
      yields: { veryHigh: '≥ 56', high: '42-55', moderate: '28-41', low: '15-27', veryLow: '< 15' },
      prices: { seedConv: 60, seedOrg: 75, salesConv: 12, salesOrg: 14 },
      pest: 'Fritfliege',
      special: 'Hafer verbessert die Bodenqualität.'
    },
    {
      id: 'potato',
      name: 'Kartoffel',
      image: 'kartoffel.jpg',
      rotationGood: ['Ackerbohne'],
      rotationOkay: ['Gerste', 'Hafer', 'Mais', 'Roggen', 'Weizen', 'Zuckerrübe'],
      rotationBad: ['Kartoffeln'],
      minSoil: 'Hoch',
      minMinerals: 'Hoch',
      weatherDrought: 'Mäßig',
      weatherCold: 'Stark',
      weatherFlood: 'Stark',
      yields: { veryHigh: '≥ 296', high: '222-295', moderate: '148-221', low: '75-147', veryLow: '< 75' },
      prices: { seedConv: 110, seedOrg: 133, salesConv: 4, salesOrg: 5 },
      pest: 'Kartoffelkäfer'
    },
    {
      id: 'corn',
      name: 'Mais',
      image: 'mais.jpg',
      rotationGood: ['Ackerbohne', 'Kartoffeln', 'Mais', 'Zuckerrübe'],
      rotationOkay: ['Hafer'],
      rotationBad: ['Gerste', 'Roggen', 'Weizen'],
      minSoil: 'Mäßig',
      minMinerals: 'Mäßig',
      weatherDrought: 'Mäßig',
      weatherCold: 'Stark',
      weatherFlood: 'Stark',
      yields: { veryHigh: '≥ 88', high: '66-87', moderate: '44-65', low: '23-43', veryLow: '< 23' },
      prices: { seedConv: 70, seedOrg: 84, salesConv: 15, salesOrg: 18 },
      pest: 'Maiszünsler'
    },
    {
      id: 'rye',
      name: 'Roggen',
      image: 'roggen.jpg',
      rotationGood: ['Ackerbohne', 'Gerste', 'Hafer', 'Kartoffeln', 'Roggen'],
      rotationOkay: ['Mais', 'Weizen', 'Zuckerrübe'],
      minSoil: 'Mäßig',
      minMinerals: 'Niedrig',
      weatherDrought: 'Mäßig',
      weatherCold: 'Mäßig',
      weatherFlood: 'Stark',
      yields: { veryHigh: '≥ 80', high: '60-79', moderate: '40-59', low: '20-39', veryLow: '< 20' },
      prices: { seedConv: 76, seedOrg: 95, salesConv: 13, salesOrg: 14.5 },
      pest: 'Blattlaus',
      special: 'Roggen verbessert die Bodenqualität.'
    },
    {
      id: 'wheat',
      name: 'Weizen',
      image: 'weizen.jpg',
      rotationGood: ['Ackerbohne', 'Kartoffeln', 'Mais', 'Zuckerrübe'],
      rotationOkay: ['Hafer'],
      rotationBad: ['Gerste', 'Roggen', 'Weizen'],
      minSoil: 'Hoch',
      minMinerals: 'Hoch',
      weatherDrought: 'Mäßig',
      weatherCold: 'Stark',
      weatherFlood: 'Stark',
      yields: { veryHigh: '≥ 92', high: '69-91', moderate: '46-68', low: '24-45', veryLow: '< 24' },
      prices: { seedConv: 72, seedOrg: 90, salesConv: 15, salesOrg: 18 },
      pest: 'Blattlaus'
    },
    {
      id: 'beet',
      name: 'Zuckerrübe',
      image: 'zuckerruebe.jpg',
      rotationGood: ['Ackerbohne', 'Kartoffeln'],
      rotationOkay: ['Gerste', 'Hafer', 'Mais', 'Roggen', 'Weizen'],
      rotationBad: ['Zuckerrübe'],
      minSoil: 'Mäßig',
      minMinerals: 'Hoch',
      weatherDrought: 'Stark',
      weatherCold: 'Stark',
      weatherFlood: 'Stark',
      yields: { veryHigh: '≥ 456', high: '342-455', moderate: '228-341', low: '115-227', veryLow: '< 115' },
      prices: { seedConv: 120, seedOrg: 144, salesConv: 3, salesOrg: 4 },
      pest: 'Drahtwurm',
      special: 'Zuckerrüben verbessern die Bodenqualität.'
    }
  ];

  getWeatherClass(level: string) {
    if (level === 'Stark') return 'text-red-600';
    if (level === 'Mäßig') return 'text-orange-500';
    return 'text-green-600';
  }

  print() {
    window.print();
  }
}
