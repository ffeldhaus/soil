import { Injectable, Inject, LOCALE_ID } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({
    providedIn: 'root'
})
export class LanguageService {
    private readonly STORAGE_KEY = 'soil_user_language';

    constructor(
        private translocoService: TranslocoService,
        @Inject(DOCUMENT) private document: Document
    ) {
        this.init();
    }

    init() {
        const savedLang = localStorage.getItem(this.STORAGE_KEY);
        const browserLang = navigator.language.split('-')[0];
        
        // Determine target language: saved -> browser -> default (en)
        let targetLang = savedLang || (browserLang === 'de' ? 'de' : 'en');
        
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
