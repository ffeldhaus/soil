import { provideHttpClient } from '@angular/common/http';
import { type ApplicationConfig, isDevMode } from '@angular/core';
import { provideFirebaseApp } from '@angular/fire/app';
import { provideAuth } from '@angular/fire/auth';
import { provideFunctions } from '@angular/fire/functions';
import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

import { routes } from './app.routes';
...
      withEnabledBlockingInitialNavigation(),
    ),
    provideFirebaseApp(() => app),
    provideAuth(() => {
      const auth = getAuth(app);
      if (isDevMode()) {
        connectAuthEmulator(auth, 'http://localhost:9099');
      }
      return auth;
    }),
    provideFunctions(() => {
      const functions = getFunctions(app, 'europe-west4');
      if (isDevMode()) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      }
      return functions;
    }),
    provideHttpClient(),
    provideClientHydration(withIncrementalHydration(), withEventReplay()),
  ],
};
