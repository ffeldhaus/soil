import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes'; // We will create this file next

// Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
// import { getStorage, provideStorage } from '@angular/fire/storage'; // If using Firebase Storage

import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes,
      withComponentInputBinding(), // Allows binding route params directly to component inputs
      withViewTransitions()        // Enables view transitions API
    ),
    provideHttpClient(
      withFetch(), // Uses the fetch API for HTTP requests
      withInterceptorsFromDi() // Allows DI for HTTP interceptors
    ),
    provideClientHydration(),
    provideAnimationsAsync(),

    // Firebase providers
    importProvidersFrom(
      provideFirebaseApp(() => initializeApp(environment.firebase))
    ),
    importProvidersFrom(
      provideAuth(() => getAuth())
    ),
    importProvidersFrom(
      provideFirestore(() => getFirestore())
    ),
    // importProvidersFrom(provideStorage(() => getStorage())), // Uncomment if Firebase Storage is needed
  ]
};