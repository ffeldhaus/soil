import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block">
      <select 
        (change)="onLangChange($event)"
        class="appearance-none bg-gray-800/50 backdrop-blur-md border border-gray-600/50 text-gray-300 text-[10px] font-bold tracking-widest uppercase py-1.5 pl-3 pr-8 rounded-lg hover:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all cursor-pointer"
        [value]="languageService.currentLang">
        <option value="de">Deutsch</option>
        <option value="en">English</option>
      </select>
      <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      vertical-align: middle;
    }
    select {
      /* Reset default appearance for cleaner styling */
      -webkit-appearance: none;
      -moz-appearance: none;
    }
  `]
})
export class LanguageSwitcherComponent {
  protected languageService = inject(LanguageService);

  onLangChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.languageService.setLanguage(select.value);
  }
}
