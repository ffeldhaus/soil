import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import localeDe from '@angular/common/locales/de';
import { type ApplicationConfig, isDevMode, LOCALE_ID } from '@angular/core';
import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { CustomProvider, initializeAppCheck } from 'firebase/app-check';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

import { routes } from './app.routes';
import { FIREBASE_APP, FIREBASE_AUTH, FIREBASE_FUNCTIONS } from './firebase.config';

registerLocaleData(localeDe, 'de-DE');

const isBrowser = typeof window !== 'undefined';
const currentHostname = isBrowser ? window.location.hostname : '';

// Dynamically use the App Hosting domain if applicable, otherwise fallback to the standard Firebase domain
const dynamicAuthDomain =
  isBrowser && currentHostname.endsWith('apphostingapp.com') ? currentHostname : 'soil-602ea.firebaseapp.com';

const firebaseConfig = {
  apiKey: 'AIzaSyB8miWCLbX3FqBR66W7WmAS8Xb204tCoPU',
  authDomain: dynamicAuthDomain,
  projectId: 'soil-602ea',
  storageBucket: 'soil-602ea.firebasestorage.app',
  messagingSenderId: '167590574128',
  appId: '1:167590574128:web:38c2ffb37bcbc5164f95f5',
  measurementId: 'G-6WGVY5SL49',
};

// Initialize Firebase strictly once
const app = initializeApp(firebaseConfig);

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Initialize AppCheck on client side
if (isBrowser) {
  // Use Debug Provider on localhost
  if (isLocalhost || (window as any).Cypress) {
    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: () =>
          Promise.resolve({
            token: 'debug-token',
            expireTimeMillis: Date.now() + 1000 * 60 * 60,
          }),
      }),
      isTokenAutoRefreshEnabled: true,
    });
  } else {
    // ReCaptchaV3Provider requires a script to be loaded, native SDK handles this if possible
    // For now we skip ReCaptcha in SSR or if not initialized to avoid errors
    // initializeAppCheck(app, { ... }); 
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
    { provide: FIREBASE_APP, useValue: app },
    {
      provide: FIREBASE_AUTH,
      useFactory: () => {
        const auth = getAuth(app);
        if (isDevMode() || isLocalhost) {
          connectAuthEmulator(auth, 'http://localhost:9099');
        }
        return auth;
      },
    },
    {
      provide: FIREBASE_FUNCTIONS,
      useFactory: () => {
        const functions = getFunctions(app, 'europe-west4');
        if (isDevMode() || isLocalhost) {
          connectFunctionsEmulator(functions, 'localhost', 5001);
        }
        return functions;
      },
    },
    provideHttpClient(),
    provideClientHydration(withIncrementalHydration(), withEventReplay()),
    { provide: LOCALE_ID, useValue: 'de-DE' },
  ],
};
