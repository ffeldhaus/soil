import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service';

import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block text-left" (click)="$event.stopPropagation()">
      <!-- Toggle Button -->
      <button 
        type="button"
        (click)="toggle()"
        class="flex items-center gap-2 bg-gray-900/60 backdrop-blur-xl border border-emerald-500/20 text-emerald-100 text-[10px] font-bold tracking-widest uppercase py-1.5 pl-4 pr-3 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-900/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer shadow-lg shadow-black/20 group"
      >
        <span>{{ languageService.currentLang === 'de' ? 'Deutsch' : 'English' }}</span>
        <svg 
          class="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300 transition-transform duration-200" 
          [class.rotate-180]="isOpen()"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown Menu -->
      <div 
        *ngIf="isOpen()"
        class="absolute right-0 mt-2 w-32 origin-top-right rounded-xl bg-gray-900/90 backdrop-blur-2xl border border-emerald-500/20 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-[110] animate-fade-in"
      >
        <div class="py-1">
          <button
            (click)="setLang('de')"
            class="w-full text-left px-4 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors"
            [class.text-emerald-400]="languageService.currentLang === 'de'"
            [class.text-gray-300]="languageService.currentLang !== 'de'"
            [class.bg-emerald-500/10]="languageService.currentLang === 'de'"
            class="hover:bg-emerald-500/20 hover:text-white"
          >
            Deutsch
          </button>
          <button
            (click)="setLang('en')"
            class="w-full text-left px-4 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors"
            [class.text-emerald-400]="languageService.currentLang === 'en'"
            [class.text-gray-300]="languageService.currentLang !== 'en'"
            [class.bg-emerald-500/10]="languageService.currentLang === 'en'"
            class="hover:bg-emerald-500/20 hover:text-white"
          >
            English
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      vertical-align: middle;
    }
    .animate-fade-in {
      animation: fadeIn 0.1s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95) translateY(-4px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `]
})
export class LanguageSwitcherComponent {
  protected languageService = inject(LanguageService);
  private eRef = inject(ElementRef);
  
  isOpen = signal(false);

  toggle() {
    this.isOpen.update(v => !v);
  }

  setLang(lang: string) {
    this.languageService.setLanguage(lang);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
