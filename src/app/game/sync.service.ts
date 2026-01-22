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

  constructor() {
    this.initSyncListener();
  }

  private initSyncListener() {
    // Sync on login
    this.authService.user$.pipe(filter((user) => !!user && !user.isAnonymous)).subscribe(() => {
      this.syncLocalGames();
    });

    // Sync on local state changes if logged in
    this.localGameService.state$
      .pipe(
        filter((state) => !!state),
        filter(() => {
          const user = this.authService.currentUser;
          return !!user && !user.isAnonymous;
        }),
      )
      .subscribe(() => {
        this.syncLocalGames();
      });
  }

  async syncLocalGames() {
    if (!this.functions) return;

    const localGames = await this.localGameService.getLocalGames();
    if (localGames.length === 0) return;

    const migrateLocalGameFn = httpsCallable<{ gameData: any }, { success: boolean }>(
      this.functions,
      'migrateLocalGame',
    );

    for (const game of localGames) {
      try {
        const fullState = await this.localGameService.loadGame(game.id);
        if (fullState) {
          await migrateLocalGameFn({ gameData: fullState });
          await this.localGameService.deleteGame(game.id);
          if (window.console) console.warn(`Successfully migrated game ${game.id} to cloud`);
        }
      } catch (error) {
        if (window.console) console.error(`Failed to migrate game ${game.id}:`, error);
      }
    }
  }
}
