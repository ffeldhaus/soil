import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { filter } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { LocalGameService } from './engine/local-game.service';

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  private authService = inject(AuthService);
  private localGameService = inject(LocalGameService);
  private functions = inject(Functions, { optional: true });

  private migrateLocalGameFn = this.functions
    ? httpsCallable<{ gameData: any }, { success: boolean }>(this.functions, 'migrateLocalGame')
    : null;

  private uploadFinishedGameFn = this.functions
    ? httpsCallable<{ gameData: any }, { success: boolean }>(this.functions, 'uploadFinishedGame')
    : null;

  private isSyncing = false;

  constructor() {
    this.initSyncListener();
  }

  private initSyncListener() {
    // Sync on login
    this.authService.user$.pipe(filter((user) => !!user && !user.isAnonymous)).subscribe(() => {
      this.syncLocalGames();
    });

    // Sync on local state changes
    this.localGameService.state$.pipe(filter((state) => !!state)).subscribe((state) => {
      const user = this.authService.currentUser;
      if (user && !user.isAnonymous) {
        // If logged in, migrate
        this.syncLocalGames();
      } else if (state?.game.status === 'finished') {
        // If guest and finished, upload for research
        this.uploadFinishedGameForResearch(state.game.id);
      }
    });
  }

  async syncLocalGames() {
    if (!this.migrateLocalGameFn || this.isSyncing) return;

    this.isSyncing = true;
    try {
      const allLocalGames = await this.localGameService.getLocalGames();
      // We only migrate active or finished games (not deleted)
      const localGames = allLocalGames.filter((g) => g.status !== 'deleted');
      if (localGames.length === 0) return;

      for (const game of localGames) {
        try {
          const fullState = await this.localGameService.loadGame(game.id);
          if (fullState) {
            // 1. If finished, upload to research collection first
            if (game.status === 'finished' && !game.uploadedAt) {
              await this.uploadFinishedGameForResearch(game.id);
            }

            // 2. Migrate to user's cloud games
            await this.migrateLocalGameFn({ gameData: fullState });

            // 3. Delete locally after successful migration
            await this.localGameService.deleteGame(game.id, true);
            if (window.console) console.warn(`Successfully migrated game ${game.id} to cloud`);
          }
        } catch (error) {
          if (window.console) console.error(`Failed to migrate game ${game.id}:`, error);
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async uploadFinishedGameForResearch(gameId: string) {
    if (!this.uploadFinishedGameFn) return;

    try {
      const fullState = await this.localGameService.loadGame(gameId);
      if (fullState && fullState.game.status === 'finished' && !fullState.game.uploadedAt) {
        const result = await this.uploadFinishedGameFn({ gameData: fullState });
        if (result.data.success) {
          fullState.game.uploadedAt = new Date();
          // Update local storage so we don't try again
          localStorage.setItem(`soil_game_${gameId}`, JSON.stringify(fullState));
          if (window.console) console.warn(`Successfully uploaded finished local game ${gameId} for research`);
        }
      }
    } catch (error) {
      if (window.console) console.error(`Failed to upload finished game ${gameId} for research:`, error);
    }
  }
}
