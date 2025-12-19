import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-1 text-[10px] font-bold tracking-widest text-gray-500">
      <button (click)="setLang('de')" 
              class="hover:text-emerald-400 transition-colors uppercase p-1"
              [class.text-emerald-500]="languageService.currentLang === 'de'">
        DE
      </button>
      <span class="opacity-30">|</span>
      <button (click)="setLang('en')" 
              class="hover:text-emerald-400 transition-colors uppercase p-1"
              [class.text-emerald-500]="languageService.currentLang === 'en'">
        EN
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      vertical-align: middle;
    }
  `]
})
export class LanguageSwitcherComponent {
  protected languageService = inject(LanguageService);

  setLang(lang: 'en' | 'de') {
    this.languageService.setLanguage(lang);
  }
}
