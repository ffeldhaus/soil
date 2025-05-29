import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config'; // Import the browser app config
import { TranslateLoader } from '@ngx-translate/core';
import { TranslateServerLoader } from './core/translate-server.loader';
// import { REQUEST_LANGUAGE } from './core/tokens'; // Import the token

export function translateServerLoaderFactory() {
  // console.log('[app.config.server.ts] Creating TranslateServerLoader');
  return new TranslateServerLoader();
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    {
      provide: TranslateLoader, // Override for server-side file loading
      useFactory: translateServerLoaderFactory
    },
    // The REQUEST_LANGUAGE token will be provided in server.ts for each request
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
