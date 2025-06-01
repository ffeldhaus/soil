import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server'; // Use the merged server config
import { REQUEST_LANGUAGE } from './app/core/tokens';
import { HttpRequest } from '@angular/common/http'; // For typing Express request

interface LanguageTag {
  lang: string;
  q: number;
}

// Define a type for a request-like object with headers
type RequestLike = { headers?: Record<string, string | string[] | undefined> };

import { HttpHeaders } from '@angular/common/http'; // Import HttpHeaders

// Function to extract preferred language from Accept-Language header
function getPreferredLanguage(req: HttpRequest<unknown> | RequestLike): string {
  let acceptLanguageHeaderValue: string | null | undefined = null;
  if (req.headers) {
    if (typeof (req.headers as HttpHeaders).get === 'function') {
      acceptLanguageHeaderValue = (req.headers as HttpHeaders).get('accept-language');
    } else if ((req.headers as any)['accept-language']) { // Use type assertion
      const headerVal = (req.headers as any)['accept-language']; // Use type assertion
      acceptLanguageHeaderValue = Array.isArray(headerVal) ? headerVal.join(',') : headerVal;
    }
  }

  if (acceptLanguageHeaderValue && typeof acceptLanguageHeaderValue === 'string') {
    const languages = acceptLanguageHeaderValue.split(',').map((langStr: string): LanguageTag => {
      const parts = langStr.trim().split(';');
      // Ensure qValueString is valid before parseFloat
      const qValueString = parts[1]?.split('=')[1];
      const q = qValueString ? parseFloat(qValueString) : 1;
      return { lang: parts[0].split('-')[0].toLowerCase(), q: isNaN(q) ? 1 : q }; // Handle NaN for q
    });
    languages.sort((a, b) => b.q - a.q); // Types inferred
    const preferred = languages.find(l => ['en', 'de'].includes(l.lang)); // Type inferred
    if (preferred) {
      // console.log(`[main.server.ts] Detected preferred language from header: ${preferred.lang}`);
      return preferred.lang;
    }
  }
  // console.log('[main.server.ts] No preferred language detected or supported from header, defaulting to en');
  return 'en'; // Default language
}

const bootstrap = (req?: HttpRequest<unknown> | RequestLike) => {
  const requestLanguage = req ? getPreferredLanguage(req) : 'en';
  
  const serverProviders = [
    ...(config.providers || []),
    { provide: REQUEST_LANGUAGE, useValue: requestLanguage }
  ];

  return bootstrapApplication(AppComponent, { ...config, providers: serverProviders });
};

export default bootstrap;
