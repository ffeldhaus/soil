import { type ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { Auth } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: Auth, useValue: { onAuthStateChanged: () => {} } },
    { provide: Functions, useValue: {} },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
