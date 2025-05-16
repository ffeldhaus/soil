import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server'; // Use the merged server config
import { REQUEST_LANGUAGE } from './app/core/tokens';
import { HttpRequest } from '@angular/common/http'; // For typing Express request

interface LanguageTag {
  lang: string;
  q: number;
}

// Function to extract preferred language from Accept-Language header
function getPreferredLanguage(req: HttpRequest<unknown> | any): string {
  const acceptLanguageHeader = req.headers?.get('accept-language') || req.headers?.['accept-language'];
  if (acceptLanguageHeader) {
    const languages = acceptLanguageHeader.split(',').map((lang: string): LanguageTag => { // Added type for lang and return type
      const parts = lang.trim().split(';');
      const q = parts[1] ? parseFloat(parts[1].split('=S')[1]) : 1;
      return { lang: parts[0].split('-')[0].toLowerCase(), q };
    });
    languages.sort((a: LanguageTag, b: LanguageTag) => b.q - a.q); // Added types for a and b
    const preferred = languages.find((l: LanguageTag) => ['en', 'de'].includes(l.lang)); // Added type for l
    if (preferred) {
      console.log(`[main.server.ts] Detected preferred language from header: ${preferred.lang}`);
      return preferred.lang;
    }
  }
  console.log('[main.server.ts] No preferred language detected or supported from header, defaulting to en');
  return 'en'; // Default language
}

const bootstrap = (req?: HttpRequest<unknown> | any) => {
  const requestLanguage = req ? getPreferredLanguage(req) : 'en';
  
  const serverProviders = [
    ...(config.providers || []),
    { provide: REQUEST_LANGUAGE, useValue: requestLanguage }
  ];

  return bootstrapApplication(AppComponent, { ...config, providers: serverProviders });
};

export default bootstrap;
