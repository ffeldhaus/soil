const version = import.meta.env.APP_VERSION || 'dev';
document.querySelector('meta[name="app-version"]')?.setAttribute('content', version);

import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Workbox } from 'workbox-window';

import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((err) => {
  console.error(err);
});

// Register Workbox Service Worker
if ('serviceWorker' in navigator && !isDevMode()) {
  const wb = new Workbox('/sw.js');

  wb.addEventListener('waiting', () => {
    wb.addEventListener('controlling', () => {
      window.location.reload();
    });
    wb.messageSkipWaiting();
  });

  wb.register({ immediate: true })
    .then((registration) => {
      registration?.update().catch(() => {});
    })
    .catch(() => {});
} else if ('serviceWorker' in navigator && isDevMode()) {
  // In dev mode, unregister any existing service workers to ensure we see latest changes
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.warn('Unregistered existing service worker in dev mode');
    }
  });
}
