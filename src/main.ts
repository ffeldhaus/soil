import packageJson from '../package.json';
(window as any).global = window;
console.log(`Soil Version ${packageJson.version} (main.ts - i18n fix v5 - v1.0.12 DEBUG)`);
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';

// Robust I18n Fix v1.0.12: Pre-bootstrap safety registration
try {
  registerLocaleData(localeDe, 'de');
  registerLocaleData(localeDe, 'de-DE');
  console.log('Locale "de" and "de-DE" registered successfully (main.ts v1.0.12 safety check)');
} catch (e) {
  console.error('Error registering locales:', e);
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
