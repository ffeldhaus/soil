const version = import.meta.env?.APP_VERSION || 'dev';
console.log(`Soil Version ${version} (main.ts)`);
document.querySelector('meta[name="app-version"]')?.setAttribute('content', version);
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
