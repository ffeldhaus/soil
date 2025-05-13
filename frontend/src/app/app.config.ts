import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection, inject, PLATFORM_ID } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';

import { routes } from './app.routes';

// Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

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
import { ApiService } from './core/services/api.service'; 
// Import Injection Tokens
import { AUTH_SERVICE_TOKEN, PLAYER_GAME_SERVICE_TOKEN } from './core/services/injection-tokens';

// Factory function for AuthService
export function authServiceFactory(): IAuthService {
  if (environment.useMocks) {
    console.log('app.config: Providing MockAuthService');
    return new MockAuthService(); 
  } else {
    console.log('app.config: Providing AuthService');
    return new AuthService(); 
  }
}

// Factory function for PlayerGameService
export function playerGameServiceFactory(): IPlayerGameService {
  if (environment.useMocks) {
    console.log('app.config: Providing MockPlayerGameService');
    return new MockPlayerGameService();
  } else {
    console.log('app.config: Providing PlayerGameService');
    return new PlayerGameService();
  }
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
    provideClientHydration(),
    provideAnimationsAsync(),

    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),

    importProvidersFrom(MaterialModule),

    // Provide services using factory and TOKEN
    {
      provide: AUTH_SERVICE_TOKEN, // Use Token
      useFactory: authServiceFactory,
    },
    {
      provide: PLAYER_GAME_SERVICE_TOKEN, // Use Token
      useFactory: playerGameServiceFactory,
    },
  ]
};