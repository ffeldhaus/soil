import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';

import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected languageService = inject(LanguageService);
  private updates = inject(SwUpdate);
  protected readonly title = signal('soil');
  version = (import.meta as any).env.APP_VERSION || 'dev';

  constructor() {
    console.log(`Soil Version ${this.version} (app.ts)`);

    if (this.updates.isEnabled) {
      console.log('Service Worker is enabled');
      this.updates.versionUpdates.subscribe((evt) => {
        switch (evt.type) {
          case 'VERSION_DETECTED':
            console.log(`Downloading new app version: ${evt.version.hash}`);
            break;
          case 'VERSION_READY':
            console.log(`Current app version: ${evt.currentVersion.hash}`);
            console.log(`New app version ready for use: ${evt.latestVersion.hash}`);
            // Reload the page to update to the latest version.
            document.location.reload();
            break;
          case 'VERSION_INSTALLATION_FAILED':
            console.log(`Failed to install app version '${evt.version.hash}': ${evt.error}`);
            break;
        }
      });
      // Force check for updates
      this.updates.checkForUpdate();
    }
  }
}
