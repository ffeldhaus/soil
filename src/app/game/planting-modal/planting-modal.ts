/// <reference types="@angular/localize" />
import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CropType } from '../../types';

@Component({
  selector: 'app-planting-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" (click)="cancel.emit()">
      <div class="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6 max-w-2xl w-full" (click)="$event.stopPropagation()">
        <h2 class="text-2xl font-bold text-white mb-6 font-serif" i18n="@@planting.title">Select Crop to Plant</h2>
        
        <div class="grid grid-cols-4 sm:grid-cols-5 gap-3">
          <button *ngFor="let crop of crops" 
            (click)="select(crop)"
            class="group relative aspect-square w-full rounded-lg overflow-hidden border border-gray-700/50 bg-gray-800/80 hover:z-10 hover:shadow-[0_0_20px_5px_rgba(52,211,153,0.7)] hover:border-emerald-400/50 transition-all duration-200">
            
            <img [src]="'assets/images/' + getConfig(crop).image" 
                 class="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity">
            
            <div class="absolute top-1 left-0 right-0 text-center pointer-events-none z-20 flex flex-col items-center">
                <span class="text-[10px] sm:text-xs font-serif font-bold text-white tracking-wide"
                      style="-webkit-text-stroke: 0.5px black; paint-order: stroke fill; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">
                    {{ getConfig(crop).label }}
                </span>
            </div>
          </button>
        </div>

        <div class="flex justify-end gap-3 mt-8">
            <button (click)="cancel.emit()" class="px-4 py-2 text-gray-400 hover:text-white transition" i18n="@@planting.cancel">Cancel</button>
        </div>
      </div>
    </div>
  `
})
export class PlantingModal {
  @Input() crops: CropType[] = [];
  @Output() selected = new EventEmitter<CropType>();
  @Output() cancel = new EventEmitter<void>();

  private cropConfig: Record<string, { label: string, image: string }> = {
    'Wheat': { label: $localize`:@@crop.wheat:Wheat`, image: 'weizen.jpg' },
    'Corn': { label: $localize`:@@crop.corn:Corn`, image: 'mais.jpg' },
    'Potato': { label: $localize`:@@crop.potato:Potato`, image: 'kartoffel.jpg' },
    'Beet': { label: $localize`:@@crop.beet:Beet`, image: 'zuckerruebe.jpg' },
    'Barley': { label: $localize`:@@crop.barley:Barley`, image: 'gerste.jpg' },
    'Oat': { label: $localize`:@@crop.oat:Oat`, image: 'hafer.jpg' },
    'Rye': { label: $localize`:@@crop.rye:Rye`, image: 'roggen.jpg' },
    'Fieldbean': { label: $localize`:@@crop.fieldbean:Fieldbean`, image: 'ackerbohne.jpg' },
    'Grass': { label: $localize`:@@crop.animals:Animals`, image: 'tiere.jpg' },
    'Fallow': { label: $localize`:@@crop.fallow:Fallow`, image: 'brachland.jpg' }
  };

  getConfig(crop: CropType) {
    return this.cropConfig[crop] || { label: crop, image: 'placeholder.jpg' };
  }

  select(crop: CropType) {
    this.selected.emit(crop);
  }
}
