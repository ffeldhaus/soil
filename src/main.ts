import packageJson from '../package.json';
console.log(`Soil Version ${packageJson.version} (main.ts - i18n fix v7 - v1.0.14 FORCE FIX)`);
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
