import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, inject, isDevMode, Output, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { User } from 'firebase/auth';

import type { Game, PlayerState, Round } from '../../../types';
import { GameService } from '../../game.service';

@Component({
  selector: 'app-board-hud',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './board-hud.html',
})
export class BoardHudComponent {
  private gameService = inject(GameService);
  private cdr = inject(ChangeDetectorRef);
  @Input() user: User | null = null;
  @Input() gameState: { game: Game | null; playerState: PlayerState | null } | null = null;
  @Input() isPlayer = false;
  @Input() playerLabel = 'Player';
  @Input() playerNumber: string | null = null;

  @Input() showLabels = true;
  @Input() showNutritionOverlay = false;
  @Input() showHarvestOverlay = false;
  @Input() showSoilOverlay = false;
  @Input() showFinance = false;
  @Input() maxRoundNumber = 0;

  @Input() isReadOnly = false;
  @Input() isSubmitted = false;
  @Input() viewingRound = 0;
  @Input() pendingNextRound = false;

  @Output() logout = new EventEmitter<void>();
  @Output() toggleMobileMenu = new EventEmitter<void>();
  @Output() updateName = new EventEmitter<string>();

  @Output() toggleLabels = new EventEmitter<void>();
  @Output() toggleNutrition = new EventEmitter<void>();
  @Output() toggleHarvest = new EventEmitter<void>();
  @Output() toggleSoil = new EventEmitter<void>();
  @Output() toggleFinance = new EventEmitter<void>();

  @Output() openRoundSettings = new EventEmitter<void>();
  @Output() nextRound = new EventEmitter<void>();
  @Output() showGameEnd = new EventEmitter<void>();

  isEditingName = false;
  tempName = '';
  isDev = isDevMode();

  private fetchingRound: number | null = null;

  getDisplayCapital(): number {
    if (!this.gameState?.playerState) return 0;

    const currentRoundNum = this.gameState.game?.currentRoundNumber || 0;

    // If we are viewing a historical round, try to get the capital from that round's result
    if (this.viewingRound < currentRoundNum) {
      const histRound = this.gameState.playerState.history?.find((r) => r.number === this.viewingRound);
      
      // If we have the round but no result (lightweight history), or no round at all, fetch it
      if (!histRound || !histRound.result) {
        this.lazyFetchRound(this.viewingRound);
        // Fallback: search for the last available round in history that HAS a result
        const lastWithResult = [...(this.gameState.playerState.history || [])]
          .reverse()
          .find(r => r.number <= this.viewingRound && r.result);
        return lastWithResult?.result?.capital || 0;
      }
      
      if (histRound.result.capital !== undefined) {
        return histRound.result.capital;
      }
    }

    return this.gameState.playerState.capital || 0;
  }

  private async lazyFetchRound(roundNum: number) {
    if (this.fetchingRound === roundNum || !this.gameState?.game?.id) return;
    
    this.fetchingRound = roundNum;
    try {
      const fullRound = await this.gameService.getRoundData(this.gameState.game.id, roundNum);
      
      // Inject the full round into the local history if missing or lightweight
      if (this.gameState.playerState) {
        const history = this.gameState.playerState.history || [];
        const index = history.findIndex(r => r.number === roundNum);
        
        if (index >= 0) {
          history[index] = fullRound;
        } else {
          history.push(fullRound);
          history.sort((a, b) => a.number - b.number);
        }
        this.gameState.playerState.history = history;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Failed to lazy fetch round data:', error);
    } finally {
      this.fetchingRound = null;
    }
  }

  t(key: string): string {
    const translations: Record<string, string> = {
      'user.photoURL': 'assets/images/gut.jpg',
      'board.nav.names': 'Namen',
      'board.nav.nutrition': 'Mineralstoffe',
      'board.nav.harvest': 'Ernte',
      'board.nav.soil': 'Bodenqualität',
      'board.nav.finance': 'Finanzen',
      'board.nav.options': 'Optionen',
      'board.nav.waiting': 'Warten...',
      'board.nav.nextRound': 'Nächste Runde',
      'board.logout': 'Abmelden',
      'board.logout.title': 'Logout',
      'board.nav.copyState': 'JSON',
    };
    return translations[key] || key;
  }

  startEditName() {
    this.tempName = this.user?.displayName || '';
    this.isEditingName = true;
  }

  saveName() {
    this.updateName.emit(this.tempName);
    this.isEditingName = false;
  }

  async copyGameState() {
    if (!this.gameState?.game) return;

    const fullGame = await this.gameService.exportFullGameState(this.gameState.game.id);
    const json = JSON.stringify(fullGame, null, 2);

    navigator.clipboard.writeText(json).then(() => {
      alert('Full game state copied to clipboard!');
    });
  }
}
