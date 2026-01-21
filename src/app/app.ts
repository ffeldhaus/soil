import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected languageService = inject(LanguageService);
  protected readonly title = signal('soil');
  version = (import.meta as { env: { APP_VERSION?: string } }).env.APP_VERSION || 'dev';

  constructor() {
    console.warn(`Soil Version ${this.version} (app.ts)`);
  }
}
