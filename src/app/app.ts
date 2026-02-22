import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { GameService } from './game/game.service';
import { SyncService } from './game/sync.service';
import { OfflineService } from './shared/offline.service';
import { PerformanceService } from './services/performance.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected syncService = inject(SyncService);
  protected offlineService = inject(OfflineService);
  protected gameService = inject(GameService);
  protected performanceService = inject(PerformanceService);
  protected readonly title = signal('soil');
  version = (import.meta as { env: { APP_VERSION?: string } }).env.APP_VERSION || 'dev';

  constructor() {
    console.warn(`Soil Version ${this.version} (app.ts)`);
  }
}
