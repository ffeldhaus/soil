import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, inject, isDevMode, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { User } from 'firebase/auth';

import type { Game, PlayerState } from '../../../types';
import { GameService } from '../../game.service';

@Component({
  selector: 'app-board-hud',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './board-hud.html',
})
export class BoardHudComponent {
  private gameService = inject(GameService);
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
