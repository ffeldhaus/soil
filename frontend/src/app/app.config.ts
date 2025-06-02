import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection, PLATFORM_ID, APP_INITIALIZER, TransferState } from '@angular/core'; // Added TransferState from @angular/core
import { provideRouter, withComponentInputBinding, withViewTransitions, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors, HttpClientModule } from '@angular/common/http';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser'; 
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
// import { Router } from '@angular/router'; // Not used
// import { Auth } from '@angular/fire/auth'; // Not used
import { HttpClient } from '@angular/common/http';

// ngx-translate
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';

// Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth, connectAuthEmulator } from '@angular/fire/auth';
import { getFirestore, provideFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';

import { environment } from '../environments/environment';

// Import Material Module
import { MaterialModule } from './shared/material.module';

// Import Interceptors
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

// Import Services & Interfaces for factories
import { AuthService } from './core/services/auth.service';
import { MockAuthService } from './core/services/auth.service.mock';
import { IAuthService } from './core/services/auth.service.interface';
import { PlayerGameService } from './core/services/player-game.service';
import { MockPlayerGameService } from './core/services/player-game.service.mock';
import { IPlayerGameService } from './core/services/player-game.service.interface';
// Import Injection Tokens
import { AUTH_SERVICE_TOKEN, PLAYER_GAME_SERVICE_TOKEN } from './core/services/injection-tokens';

// I18n Initializer
import { initializeTranslations } from './core/i18n.initializer';

// Factory function for AuthService
export function authServiceFactory(): IAuthService {
  if (environment.useMocks) {
    return new MockAuthService();
  } else {
    return new AuthService();
  }
}

// Factory function for PlayerGameService
export function playerGameServiceFactory(): IPlayerGameService {
  if (environment.useMocks) {
    return new MockPlayerGameService();
  } else {
    return new PlayerGameService();
  }
}

// AoT requires an exported function for factories
export function HttpLoaderFactory(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient, './assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes,
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    provideClientHydration(
      withHttpTransferCacheOptions({
        includePostRequests: true,
      })
    ),
    provideAnimationsAsync(),

    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => {
      const auth = getAuth();
      if (environment.useEmulators) {
        connectAuthEmulator(auth, `http://${environment.emulatorAuthHost}:${environment.emulatorAuthPort}`, { disableWarnings: true });
      }
      return auth;
    }),
    provideFirestore(() => {
      const firestore = getFirestore();
      if (environment.useEmulators) {
        connectFirestoreEmulator(firestore, environment.emulatorFirestoreHost, environment.emulatorFirestorePort);
      }
      return firestore;
    }),

    importProvidersFrom(
      MaterialModule,
      HttpClientModule,
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        },
        defaultLanguage: 'en'
      })
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTranslations,
      multi: true,
      // TransferState is injected into initializeTranslations factory
      // It's from @angular/core. PLATFORM_ID and TranslateService are also direct deps.
      deps: [PLATFORM_ID, TranslateService, TransferState]
    },
    {
      provide: AUTH_SERVICE_TOKEN,
      useFactory: authServiceFactory,
    },
    {
      provide: PLAYER_GAME_SERVICE_TOKEN,
      useFactory: playerGameServiceFactory,
    },
  ]
};