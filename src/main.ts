const version = import.meta.env.APP_VERSION || 'dev';
document.querySelector('meta[name="app-version"]')?.setAttribute('content', version);

import { bootstrapApplication } from '@angular/platform-browser';
import { Workbox } from 'workbox-window';

import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

// Register Workbox Service Worker
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  const wb = new Workbox('/service-worker.js');

  wb.addEventListener('installed', (event) => {
    if (event.isUpdate) {
      if (confirm('New update available! Reload to update?')) {
        window.location.reload();
      }
    }
  });

  wb.register();
}
