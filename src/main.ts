/**
 * @fileoverview Browser and Capacitor client bootstrap entry point.
 *
 * Key invariants:
 * - Synchronizes `<meta name="app-version">` with `import.meta.env.APP_VERSION` and bootstraps `App`.
 * - Lazily registers the Workbox Service Worker (`/sw.js`) after bootstrap in production web browsers only
 *   (skipped in dev mode and inside native Capacitor iOS/Android shells).
 * - Defers automatic `window.location.reload()` on Service Worker updates whenever the user is on `/game`,
 *   processing a single-use token on `/auth/action`, viewing an open modal dialog, or typing in a form field.
 */

import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';
import { isNativeCapacitorApp } from './app/shared/capacitor-env';

const version = import.meta.env.APP_VERSION || 'dev';
document.querySelector('meta[name="app-version"]')?.setAttribute('content', version);

function shouldDeferSwReload(): boolean {
  const pathname = window.location.pathname || '';
  const isActiveGameBoard = pathname.startsWith('/game') && !pathname.startsWith('/game-login');
  const isAuthActionFlow =
    pathname.startsWith('/auth/action') ||
    pathname.startsWith('/_/auth/action') ||
    pathname.startsWith('/__/auth/action');
  if (isActiveGameBoard || isAuthActionFlow) {
    return true;
  }
  if (document.querySelector('[role="dialog"], dialog[open]')) {
    return true;
  }
  const activeEl = document.activeElement;
  return Boolean(activeEl?.matches?.('input, textarea, select, [contenteditable="true"]'));
}

async function initServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  if (isDevMode()) {
    // Unregister any leftover service workers in dev mode so latest changes are always served
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.warn('Unregistered existing service worker in dev mode');
    }
    return;
  }

  if (isNativeCapacitorApp()) {
    return;
  }

  const { Workbox } = await import('workbox-window');
  const wb = new Workbox('/sw.js');
  let reloadScheduled = false;
  let teardownDeferWatchers: (() => void) | null = null;

  const activateWaitingWorkerAndReload = () => {
    if (reloadScheduled) {
      return;
    }
    reloadScheduled = true;
    teardownDeferWatchers?.();
    teardownDeferWatchers = null;
    wb.addEventListener('controlling', () => {
      window.location.reload();
    });
    wb.messageSkipWaiting();
  };

  wb.addEventListener('waiting', () => {
    if (!shouldDeferSwReload()) {
      activateWaitingWorkerAndReload();
      return;
    }
    if (teardownDeferWatchers) {
      return;
    }

    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const origPushState = history.pushState;
    const origReplaceState = history.replaceState;

    const scheduleSafeReloadCheck = () => {
      if (settleTimer !== null) {
        clearTimeout(settleTimer);
      }
      settleTimer = setTimeout(() => {
        settleTimer = null;
        if (!shouldDeferSwReload()) {
          activateWaitingWorkerAndReload();
        }
      }, 150);
    };

    window.addEventListener('popstate', scheduleSafeReloadCheck);
    document.addEventListener('focusout', scheduleSafeReloadCheck);

    history.pushState = function (...args) {
      origPushState.apply(this, args);
      scheduleSafeReloadCheck();
    };
    history.replaceState = function (...args) {
      origReplaceState.apply(this, args);
      scheduleSafeReloadCheck();
    };

    teardownDeferWatchers = () => {
      if (settleTimer !== null) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
      window.removeEventListener('popstate', scheduleSafeReloadCheck);
      document.removeEventListener('focusout', scheduleSafeReloadCheck);
      history.pushState = origPushState;
      history.replaceState = origReplaceState;
    };
  });

  const registration = await wb.register({ immediate: true });
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
}

bootstrapApplication(App, appConfig)
  .then(() => initServiceWorker().catch(() => {}))
  .catch((err) => {
    console.error(err);
  });
