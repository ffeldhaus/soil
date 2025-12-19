import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { LanguageService } from './services/language.service';

import packageJson from '../../package.json';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected languageService = inject(LanguageService);
  protected readonly title = signal('soil');
  version = packageJson.version;

  constructor() {
    console.log(` Soil Version ${this.version} `);
  }
}
