import { Injectable, inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { filter } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { FIREBASE_FUNCTIONS } from '../firebase.config';
import { LocalGameService } from './engine/local-game.service';

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  private authService = inject(AuthService);
  private localGameService = inject(LocalGameService);
  private functions = inject(FIREBASE_FUNCTIONS, { optional: true });

  private migrateLocalGameFn = this.functions
    ? httpsCallable<{ gameData: any }, { success: boolean }>(this.functions, 'migrateLocalGame')
    : null;

  private uploadFinishedGameFn = this.functions
    ? httpsCallable<{ gameData: any }, { success: boolean }>(this.functions, 'uploadFinishedGame')
    : null;

  private isSyncing = false;
  private migratingGameIds = new Set<string>();
  private uploadingGameIds = new Set<string>();

  constructor() {
    this.initSyncListener();
  }

  private initSyncListener() {
    // Sync dormant or finished local games on login
    this.authService.user$.pipe(filter((user) => !!user && !user.isAnonymous)).subscribe(() => {
      this.syncLocalGames();
    });

    // Only migrate or upload once a local game finishes; never migrate an actively played in_progress game on saveDraft/round updates
    this.localGameService.state$.pipe(filter((state) => !!state)).subscribe((state) => {
      if (state?.game.status !== 'finished') {
        return;
      }
      const user = this.authService.currentUser;
      if (user && !user.isAnonymous) {
        this.migrateSingleLocalGame(state.game);
      } else {
        this.uploadFinishedGameForResearch(state.game.id);
      }
    });
  }

  private async migrateSingleLocalGame(game: any): Promise<void> {
    if (!this.migrateLocalGameFn || !game?.id || this.migratingGameIds.has(game.id)) return;
    this.migratingGameIds.add(game.id);
    try {
      const fullState = await this.localGameService.loadGame(game.id);
      if (!fullState) return;
      if (game.status === 'finished' && !game.uploadedAt) {
        await this.uploadFinishedGameForResearch(game.id);
      }
      await this.migrateLocalGameFn({ gameData: fullState });
      await this.localGameService.deleteGame(game.id, true, { emitTelemetry: false });
      if (window.console) console.warn(`Successfully migrated game ${game.id} to cloud`);
    } catch (error) {
      if (window.console) console.error(`Failed to migrate game ${game.id}:`, error);
    } finally {
      this.migratingGameIds.delete(game.id);
    }
  }

  async syncLocalGames() {
    if (!this.migrateLocalGameFn || this.isSyncing) return;

    this.isSyncing = true;
    try {
      const allLocalGames = await this.localGameService.getLocalGames();
      const activeGameId = this.localGameService.activeGameId;
      const localGames = allLocalGames.filter(
        (g) => g.status !== 'deleted' && !(g.id === activeGameId && g.status !== 'finished'),
      );
      for (const game of localGames) {
        await this.migrateSingleLocalGame(game);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private isEligibleForResearchUpload(fullState: any): boolean {
    return Boolean(
      fullState &&
        fullState.game.status === 'finished' &&
        !fullState.game.uploadedAt &&
        fullState.game.config?.analyticsEnabled !== false,
    );
  }

  private logUploadError(gameId: string, error: any): void {
    if (!window.console) return;
    window.console.error(`Failed to upload finished game ${gameId} for research:`, error);
    if (error.code) window.console.error(`Error Code: ${error.code}`);
    if (error.message) window.console.error(`Error Message: ${error.message}`);
    if (error.details) window.console.error(`Error Details:`, error.details);
  }

  async uploadFinishedGameForResearch(gameId: string) {
    if (!this.uploadFinishedGameFn || this.uploadingGameIds.has(gameId)) return;

    this.uploadingGameIds.add(gameId);
    try {
      const fullState = await this.localGameService.loadGame(gameId);
      if (!this.isEligibleForResearchUpload(fullState)) return;

      if (window.console) {
        // biome-ignore lint/suspicious/noConsole: Background sync logging
        window.console.log(`Attempting to upload finished local game ${gameId} for research...`);
      }
      const result = await this.uploadFinishedGameFn({ gameData: fullState });
      if (result.data.success) {
        fullState!.game.uploadedAt = new Date();
        localStorage.setItem(`soil_game_${gameId}`, JSON.stringify(fullState));
        if (window.console) {
          window.console.warn(`Successfully uploaded finished local game ${gameId} for research`);
        }
      } else if (window.console) {
        window.console.error(`Failed to upload finished game ${gameId}: Server returned success=false`);
      }
    } catch (error: any) {
      this.logUploadError(gameId, error);
    } finally {
      this.uploadingGameIds.delete(gameId);
    }
  }
}
