import { type ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { FIREBASE_AUTH, FIREBASE_FUNCTIONS } from './firebase.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: FIREBASE_AUTH, useValue: { onAuthStateChanged: () => {} } },
    { provide: FIREBASE_FUNCTIONS, useValue: {} },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
