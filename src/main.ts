const version = import.meta.env.APP_VERSION || 'dev';
document.querySelector('meta[name="app-version"]')?.setAttribute('content', version);

import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Workbox } from 'workbox-window';

import { App } from './app/app';
import { appConfig } from './app/app.config';
import { isNativeCapacitorApp } from './app/shared/capacitor-env';

bootstrapApplication(App, appConfig).catch((err) => {
  console.error(err);
});

function isOnActiveGameBoard(): boolean {
  const pathname = window.location.pathname || '';
  return pathname.startsWith('/game') && !pathname.startsWith('/game-login');
}

// Register Workbox Service Worker in web browsers (skip inside native Capacitor iOS/Android bundles)
if ('serviceWorker' in navigator && !isDevMode() && !isNativeCapacitorApp()) {
  const wb = new Workbox('/sw.js');
  let reloadScheduled = false;

  const activateWaitingWorkerAndReload = () => {
    if (reloadScheduled) {
      return;
    }
    reloadScheduled = true;
    wb.addEventListener('controlling', () => {
      window.location.reload();
    });
    wb.messageSkipWaiting();
  };

  wb.addEventListener('waiting', () => {
    if (!isOnActiveGameBoard()) {
      activateWaitingWorkerAndReload();
      return;
    }

    // Defer activation and reload until the user leaves the active game board (/game)
    const checkRouteExit = () => {
      if (!isOnActiveGameBoard()) {
        window.removeEventListener('popstate', checkRouteExit);
        activateWaitingWorkerAndReload();
      }
    };

    window.addEventListener('popstate', checkRouteExit);
    const origPushState = history.pushState.bind(history);
    const origReplaceState = history.replaceState.bind(history);
    history.pushState = (...args) => {
      origPushState(...args);
      checkRouteExit();
    };
    history.replaceState = (...args) => {
      origReplaceState(...args);
      checkRouteExit();
    };
  });

  wb.register({ immediate: true })
    .then((registration) => {
      registration?.update().catch(() => {});

      // Check for Service Worker updates hourly and when returning to the tab
      setInterval(
        () => {
          registration?.update().catch(() => {});
        },
        60 * 60 * 1000,
      );

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration?.update().catch(() => {});
        }
      });
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
