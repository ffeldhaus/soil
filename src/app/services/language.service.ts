import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly STORAGE_KEY = 'soil_user_language';
  private translocoService = inject(TranslocoService);
  private document = inject(DOCUMENT);

  constructor() {
    this.init();
  }

  init() {
    const savedLang = localStorage.getItem(this.STORAGE_KEY);
    const browserLang = navigator.language.split('-')[0];
    const availableLangs = ['en', 'de'];

    // Determine target language: saved -> browser (if supported) -> default (de)
    let targetLang = savedLang;

    if (!targetLang && availableLangs.includes(browserLang)) {
      targetLang = browserLang;
    }

    if (!targetLang) {
      targetLang = 'de';
    }

    this.setLanguage(targetLang);
  }

  get currentLang(): string {
    return this.translocoService.getActiveLang();
  }

  setLanguage(lang: string) {
    localStorage.setItem(this.STORAGE_KEY, lang);
    this.translocoService.setActiveLang(lang);
    this.document.documentElement.lang = lang;
  }
}
