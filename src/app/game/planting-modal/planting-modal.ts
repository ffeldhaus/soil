import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { CropType } from '../../types';

@Component({
  selector: 'app-planting-modal',
  standalone: true,
  imports: [],
  template: `
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      (click)="plantingCancelled.emit()"
    >
      <div
        class="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6 max-w-2xl w-full"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="planting-title"
      >
        <h2 id="planting-title" i18n="Main Heading|Title of the planting selection modal@@planting.title" class="text-2xl font-bold text-white mb-6 font-serif">Was möchtest du anbauen?</h2>

        <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
          @for (crop of crops; track crop) {
            <button
              (click)="select(crop)"
              [attr.data-testid]="'crop-' + crop.toLowerCase()"
              class="group relative aspect-square w-full rounded-lg overflow-hidden border border-gray-700/50 bg-gray-800/80 hover:z-10 hover:shadow-[0_0_20px_5px_rgba(52,211,153,0.7)] hover:border-emerald-400/50 transition-all duration-200"
            >
              <img
                [src]="'assets/images/' + getConfig(crop).image"
                [alt]="t(getConfig(crop).label)"
                class="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <div
                class="absolute top-1 left-0 right-0 text-center pointer-events-none z-20 flex flex-col items-center"
              >
                <span
                  class="text-[10px] sm:text-xs font-serif font-bold text-white tracking-wide"
                  style="-webkit-text-stroke: 0.5px black; paint-order: stroke fill; text-shadow: 0 1px 2px rgba(0,0,0,0.8);"
                >
                  {{ t(getConfig(crop).label) }}
                </span>
              </div>
            </button>
          }
        </div>

        <div class="flex justify-end gap-3 mt-8">
          <button
            (click)="plantingCancelled.emit()"
            i18n="Action Label|Button to cancel planting and close the modal@@planting.cancel"
            class="px-4 py-2 text-gray-400 hover:text-white transition"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PlantingModal {
  @Input() crops: CropType[] = [];
  @Output() cropSelected = new EventEmitter<CropType>();
  @Output() plantingCancelled = new EventEmitter<void>();

  t(key: string): string {
    const translations: Record<string, string> = {
      'crop.wheat': 'Weizen',
      'crop.corn': 'Mais',
      'crop.potato': 'Kartoffel',
      'crop.beet': 'Zuckerrübe',
      'crop.barley': 'Gerste',
      'crop.oat': 'Hafer',
      'crop.rye': 'Roggen',
      'crop.fieldbean': 'Ackerbohne',
      'crop.rapeseed': 'Raps',
      'crop.pea': 'Erbse',
      'crop.animals': 'Tiere',
      'crop.fallow': 'Brachland',
    };
    return translations[key] || key;
  }

  private cropConfig: Record<string, { label: string; image: string }> = {
    Wheat: { label: 'crop.wheat', image: 'weizen.webp' },
    Barley: { label: 'crop.barley', image: 'gerste.webp' },
    Potato: { label: 'crop.potato', image: 'kartoffel.webp' },
    Beet: { label: 'crop.beet', image: 'zuckerruebe.webp' },
    Corn: { label: 'crop.corn', image: 'mais.webp' },
    Oat: { label: 'crop.oat', image: 'hafer.webp' },
    Rye: { label: 'crop.rye', image: 'roggen.webp' },
    Fieldbean: { label: 'crop.fieldbean', image: 'ackerbohne.webp' },
    Rapeseed: { label: 'crop.rapeseed', image: 'raps.webp' },
    Pea: { label: 'crop.pea', image: 'erbse.webp' },
    Grass: { label: 'crop.animals', image: 'hausschwein.webp' },
    Fallow: { label: 'crop.fallow', image: 'acker.webp' },
  };

  getConfig(crop: CropType) {
    return this.cropConfig[crop] || { label: crop, image: 'placeholder.jpg' };
  }

  select(crop: CropType) {
    this.cropSelected.emit(crop);
  }
}
