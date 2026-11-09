import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import localeDe from '@angular/common/locales/de';
import { type ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

import { routes } from './app.routes';
import { FIREBASE_APP, FIREBASE_AUTH, FIREBASE_FUNCTIONS } from './firebase.config';
import { isLocalBrowserDevServer, isNativeCapacitorApp } from './shared/capacitor-env';

registerLocaleData(localeDe, 'de-DE');

const isBrowser = typeof window !== 'undefined';
const currentHostname = isBrowser ? window.location.hostname : '';

// Dynamically use the App Hosting domain if applicable, otherwise fallback to the standard Firebase domain
const dynamicAuthDomain =
  isBrowser && currentHostname.endsWith('apphostingapp.com') ? currentHostname : 'soil-602ea.firebaseapp.com';

const firebaseConfig = {
  apiKey: isNativeCapacitorApp()
    ? 'AIzaSyAa8bW53Pd8vva0sYUW5nhD3JU445_zHxw'
    : 'AIzaSyB8miWCLbX3FqBR66W7WmAS8Xb204tCoPU',
  authDomain: dynamicAuthDomain,
  projectId: 'soil-602ea',
  storageBucket: 'soil-602ea.firebasestorage.app',
  messagingSenderId: '167590574128',
  appId: '1:167590574128:web:38c2ffb37bcbc5164f95f5',
};

// Initialize Firebase strictly once
const app = initializeApp(firebaseConfig);

const isLocalhost = isLocalBrowserDevServer();

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
        if (isLocalhost) {
          connectAuthEmulator(auth, 'http://localhost:9099');
        }
        return auth;
      },
    },
    {
      provide: FIREBASE_FUNCTIONS,
      useFactory: () => {
        const functions = getFunctions(app, 'europe-west4');
        if (isLocalhost) {
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
