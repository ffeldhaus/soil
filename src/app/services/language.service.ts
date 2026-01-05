import { DOCUMENT } from '@angular/common';
import { inject, Injectable, LOCALE_ID } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly STORAGE_KEY = 'soil_user_language';
  private localeId = inject(LOCALE_ID);
  private document = inject(DOCUMENT);

  constructor() {
    // Initialization is mostly handled by Angular native i18n
  }

  get currentLang(): string {
    return this.localeId.split('-')[0];
  }

  setLanguage(lang: string) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, lang);
    }

    const currentLang = this.currentLang;
    if (currentLang !== lang) {
      // Skip path-based redirect during local development with ng serve
      // as it doesn't support localized paths by default
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost' &&
        window.location.port === '4200'
      ) {
        window.location.reload();
        return;
      }

      // Redirect to the new locale
      const url = this.document.location.pathname;
      const newUrl = url.replace(`/${currentLang}/`, `/${lang}/`);

      if (newUrl !== url) {
        this.document.location.pathname = newUrl;
      } else {
        // If the current URL doesn't have the locale prefix, try adding it or just reload at root of locale
        this.document.location.pathname = `/${lang}${url}`;
      }
    }
  }
}
