import { inject, PLATFORM_ID, TransferState, makeStateKey, Optional } from '@angular/core'; // Corrected: TransferState and makeStateKey are from @angular/core. Added Optional.
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { REQUEST_LANGUAGE } from './tokens';

export const LANGUAGE_KEY = makeStateKey<string>('language');

export function initializeTranslations(): () => Promise<void> {
  const platformId = inject(PLATFORM_ID);
  const translateService = inject(TranslateService);
  const transferState = inject(TransferState);
  const requestLanguage = inject(REQUEST_LANGUAGE, { optional: true }); // Optional makes it null if not provided, no need for @Optional decorator here

  return async () => {
    translateService.setDefaultLang('en');
    let languageToUse: string | undefined | null = 'en';

    if (isPlatformBrowser(platformId)) {
      console.log('[i18n.initializer] Running in browser');
      const ssrLang = transferState.get(LANGUAGE_KEY, null);
      if (ssrLang) {
        console.log('[i18n.initializer] Using language from TransferState:', ssrLang);
        languageToUse = ssrLang;
      } else {
        const storedLang = localStorage.getItem('preferred_language');
        if (storedLang && translateService.getLangs().includes(storedLang)) {
          console.log('[i18n.initializer] Using language from localStorage:', storedLang);
          languageToUse = storedLang;
        } else {
          const browserLang = translateService.getBrowserLang();
          console.log('[i18n.initializer] Detected browser language:', browserLang);
          if (browserLang && translateService.getLangs().includes(browserLang)) {
            languageToUse = browserLang;
          }
        }
      }
    } else if (isPlatformServer(platformId)) {
      console.log('[i18n.initializer] Running on server');
      if (requestLanguage && translateService.getLangs().includes(requestLanguage)) {
        console.log('[i18n.initializer] Using language from REQUEST_LANGUAGE token:', requestLanguage);
        languageToUse = requestLanguage;
      } else {
        console.log('[i18n.initializer] No valid request language, using default for server.');
      }
      if (languageToUse) {
        transferState.set(LANGUAGE_KEY, languageToUse);
      }
    }

    if (!languageToUse || !translateService.getLangs().includes(languageToUse)) {
        console.warn(`[i18n.initializer] Language '${languageToUse}' not in supported list [${translateService.getLangs().join(', ')}], defaulting to 'en'.`);
        languageToUse = 'en'; 
    }

    console.log(`[i18n.initializer] Attempting to use language: '${languageToUse}'`);
    // Ensure that `use` completes before the app initializes further
    await translateService.use(languageToUse).toPromise(); 
    console.log(`[i18n.initializer] Successfully set language to: '${translateService.currentLang}'`);

    if (isPlatformBrowser(platformId) && languageToUse !== 'en') { 
        localStorage.setItem('preferred_language', languageToUse);
    }
  };
}
