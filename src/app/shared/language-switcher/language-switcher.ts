import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block group">
      <select 
        (change)="onLangChange($event)"
        class="appearance-none bg-gray-900/60 backdrop-blur-xl border border-emerald-500/20 text-emerald-100 text-[10px] font-bold tracking-widest uppercase py-1.5 pl-4 pr-10 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-900/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer shadow-lg shadow-black/20"
        [value]="languageService.currentLang">
        <option value="de" class="bg-gray-900 text-white">Deutsch</option>
        <option value="en" class="bg-gray-900 text-white">English</option>
      </select>
      <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-emerald-400 group-hover:text-emerald-300 transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
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
      -webkit-appearance: none;
      -moz-appearance: none;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    /* Style the dropdown options (limited browser support but helpful where available) */
    option {
      padding: 12px;
      font-weight: bold;
      background-color: #111827; /* gray-900 */
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
