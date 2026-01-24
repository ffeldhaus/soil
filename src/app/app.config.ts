import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import localeDe from '@angular/common/locales/de';
import { type ApplicationConfig, isDevMode, LOCALE_ID } from '@angular/core';
import { provideFirebaseApp } from '@angular/fire/app';
import { provideAuth } from '@angular/fire/auth';
import { provideFunctions } from '@angular/fire/functions';
import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

import { routes } from './app.routes';

registerLocaleData(localeDe, 'de-DE');

const firebaseConfig = {
  apiKey: 'AIzaSyB8miWCLbX3FqBR66W7WmAS8Xb204tCoPU',
  authDomain: 'soil-602ea.firebaseapp.com',
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
    provideFirebaseApp(() => app),
    provideAuth(() => {
      const auth = getAuth(app);
      if (isDevMode() || isLocalhost) {
        connectAuthEmulator(auth, 'http://localhost:9099');
      }
      return auth;
    }),
    provideFunctions(() => {
      const functions = getFunctions(app, 'europe-west4');
      if (isDevMode() || isLocalhost) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      }
      return functions;
    }),
    provideHttpClient(),
    provideClientHydration(withIncrementalHydration(), withEventReplay()),
    { provide: LOCALE_ID, useValue: 'de-DE' },
  ],
};
