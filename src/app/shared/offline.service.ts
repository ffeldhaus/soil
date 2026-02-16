import { Injectable, inject, signal } from '@angular/core';
import { SyncService } from '../game/sync.service';

@Injectable({
  providedIn: 'root',
})
export class OfflineService {
  isOnline = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);
  isSyncing = signal(false);
  private syncService = inject(SyncService);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline.set(true);
        this.handleOnline();
      });
      window.addEventListener('offline', () => {
        this.isOnline.set(false);
      });
    }

    // Listen for background sync completion from Service Worker
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMPLETED') {
          this.isSyncing.set(false);
          // Show a notification or update UI
          console.warn('Background sync completed');
        }
        if (event.data && event.data.type === 'SYNC_STARTED') {
          this.isSyncing.set(true);
        }
      });
    }
  }

  private handleOnline() {
    // When coming back online, we trigger a check for local games that need syncing
    this.syncService.syncLocalGames().catch((err: unknown) => {
      if (window.console) console.error('Failed to sync local games on reconnect:', err);
    });
  }
}
