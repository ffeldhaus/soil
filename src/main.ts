import packageJson from '../package.json';
(window as any).global = window;
console.log(`Soil Version ${packageJson.version} (main.ts)`);
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
