const version = (import.meta as any).env.APP_VERSION || 'dev';
console.log(`Soil Version ${version} (main.ts)`);
document.querySelector('meta[name="app-version"]')?.setAttribute('content', version);
import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
