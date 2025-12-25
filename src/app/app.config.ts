import { ApplicationConfig, isDevMode, APP_INITIALIZER, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideFirebaseApp } from '@angular/fire/app';
import { initializeApp } from 'firebase/app';
import { provideAuth } from '@angular/fire/auth';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { provideFirestore } from '@angular/fire/firestore';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { provideFunctions } from '@angular/fire/functions';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { registerLocaleData, formatDate } from '@angular/common';
import localeDe from '@angular/common/locales/de';

import { routes } from './app.routes';

const firebaseConfig = {
  apiKey: "AIzaSyB8miWCLbX3FqBR66W7WmAS8Xb204tCoPU",
  authDomain: "soil-602ea.firebaseapp.com",
  projectId: "soil-602ea",
  storageBucket: "soil-602ea.firebasestorage.app",
  messagingSenderId: "167590574128",
  appId: "1:167590574128:web:38c2ffb37bcbc5164f95f5",
  measurementId: "G-6WGVY5SL49"
};

// Initialize Firebase strictly once
const app = initializeApp(firebaseConfig);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: (localeId: string) => () => {
        // Robust I18n Fix v1.0.13: Verification
        try {
          console.log(`[v1.0.13 DEBUG] Current LOCALE_ID: "${localeId}"`);

          registerLocaleData(localeDe, 'de');
          registerLocaleData(localeDe, 'de-DE');
          console.log('Locale "de" and "de-DE" registered via APP_INITIALIZER (v1.0.13)');

          // Verify immediately
          const testDate = new Date();
          const formatted = formatDate(testDate, 'short', 'de');
          console.log(`[v1.0.13 DEBUG] Verification SUCCESS: formatDate('de') result: ${formatted}`);
        } catch (e) {
          console.error('[v1.0.13 DEBUG] Verification FAILED:', e);
        }
      },
      deps: [LOCALE_ID],
      multi: true
    },
    // Explicitly provide LOCALE_ID to ensure it matches the registered data
    // { provide: LOCALE_ID, useValue: 'de' }, // Removed in v1.0.13 to see if "de" is inferred correctly or if hardcoding caused issues
    provideFirebaseApp(() => app),
    provideAuth(() => {
      const auth = getAuth(app);
      if (isDevMode()) {
        connectAuthEmulator(auth, 'http://localhost:9099');
      }
      return auth;
    }),
    provideFirestore(() => {
      const firestore = getFirestore(app);
      if (isDevMode()) {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }
      return firestore;
    }),
    provideFunctions(() => {
      const functions = getFunctions(app, 'europe-west1');
      if (isDevMode()) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      }
      return functions;
    })
  ]
};
