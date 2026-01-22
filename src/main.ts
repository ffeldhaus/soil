const version = import.meta.env.APP_VERSION || 'dev';
document.querySelector('meta[name="app-version"]')?.setAttribute('content', version);

import { bootstrapApplication } from '@angular/platform-browser';
import { Workbox } from 'workbox-window';
import { isDevMode } from '@angular/core';

import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

// Register Workbox Service Worker
if ('serviceWorker' in navigator && !isDevMode()) {
  const wb = new Workbox('/service-worker.js');

  wb.addEventListener('waiting', () => {
    // A new service worker is waiting to take over.
    // In a real app, we should show a nice toast/banner here.
    // For now, we automatically skip waiting to apply the update on next reload.
    wb.addEventListener('controlling', () => {
      window.location.reload();
    });
    wb.messageSkipWaiting();
  });

  wb.register();
}
