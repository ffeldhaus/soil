import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';

// Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

import { environment } from '../environments/environment';

// Import Material Module (for MatSnackBar from NotificationService if provided in root, etc.)
import { MaterialModule } from './shared/material.module';

// Import Interceptors
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

// Core Services are typically providedIn: 'root' directly in their @Injectable decorator.
// No need to list AuthService, ApiService, NotificationService here if they use providedIn: 'root'.

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes,
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }) // For better scroll behavior on navigation
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    provideClientHydration(), // For SSR hydration
    provideAnimationsAsync(), // For Angular Material animations

    // Firebase providers - Should be listed directly
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),

    // Import MaterialModule to make MatSnackBar available for NotificationService
    // and other Material components that might be used in AppComponent or globally.
    // Using importProvidersFrom is correct here as MaterialModule is an NgModule
    importProvidersFrom(MaterialModule),
  ]
};