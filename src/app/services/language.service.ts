import { Injectable, Inject, LOCALE_ID } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class LanguageService {
    private readonly STORAGE_KEY = 'soil_user_language';

    constructor(
        @Inject(LOCALE_ID) public locale: string,
        @Inject(DOCUMENT) private document: Document
    ) {
        this.init();
    }

    init() {
        const savedLang = localStorage.getItem(this.STORAGE_KEY);
        const browserLang = navigator.language.split('-')[0];

        // Determine target language: saved -> browser -> default (en)
        let targetLang = savedLang || (browserLang === 'de' ? 'de' : 'en');
        const currentIsDe = this.document.location.href.includes('/de/');

        // If specific override is set, force it
        if (savedLang) {
            targetLang = savedLang;
        }

        if (targetLang === 'de' && !currentIsDe) {
            this.redirectTo('de');
        } else if (targetLang === 'en' && currentIsDe) {
            this.redirectTo('en');
        }
    }

    get currentLang(): 'en' | 'de' {
        return this.locale.startsWith('de') ? 'de' : 'en';
    }

    setLanguage(lang: 'en' | 'de') {
        localStorage.setItem(this.STORAGE_KEY, lang);
        this.redirectTo(lang);
    }

    private redirectTo(lang: 'en' | 'de') {
        const origin = this.document.location.origin;
        let currentPath = this.document.location.pathname;

        // Strip known locale prefixes to get clean path
        if (currentPath.startsWith('/de/')) {
            currentPath = currentPath.replace('/de/', '/');
        } else if (currentPath === '/de') {
            currentPath = '/';
        } else if (currentPath.startsWith('/en-US/')) {
            currentPath = currentPath.replace('/en-US/', '/');
        } else if (currentPath === '/en-US') {
            currentPath = '/';
        }

        // Ensure path starts with /
        if (!currentPath.startsWith('/')) {
            currentPath = '/' + currentPath;
        }

        if (lang === 'de') {
            this.document.location.href = origin + '/de' + (currentPath === '/' ? '/' : currentPath) + this.document.location.search;
        } else {
            this.document.location.href = origin + currentPath + this.document.location.search;
        }
    }
}
