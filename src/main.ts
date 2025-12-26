import packageJson from '../package.json';
console.log(`Soil Version ${packageJson.version} (main.ts - cleanup v1.0.16)`);
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
