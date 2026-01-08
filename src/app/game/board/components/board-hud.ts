import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from 'firebase/auth';

import { LanguageSwitcherComponent } from '../../../shared/language-switcher/language-switcher';
import { Game, PlayerState } from '../../../types';

@Component({
  selector: 'app-board-hud',
  standalone: true,
  imports: [CommonModule, FormsModule, LanguageSwitcherComponent],
  templateUrl: './board-hud.html',
})
export class BoardHudComponent {
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

  t(key: string): string {
    const translations: Record<string, string> = {
      'user.photoURL': $localize`:@@user.photoURL:assets/images/ok.jpg`,
      'board.nav.names': $localize`:@@board.nav.names:Namen`,
      'board.nav.nutrition': $localize`:@@board.nav.nutrition:Mineralstoffe`,
      'board.nav.harvest': $localize`:@@board.nav.harvest:Ernte`,
      'board.nav.soil': $localize`:@@board.nav.soil:Bodenqualität`,
      'board.nav.finance': $localize`:@@board.nav.finance:Finanzen`,
      'board.nav.options': $localize`:@@board.nav.options:Optionen`,
      'board.nav.waiting': $localize`:@@board.nav.waiting:Warten...`,
      'board.nav.nextRound': $localize`:@@board.nav.nextRound:Nächste Runde`,
      'board.logout': $localize`:@@board.logout:Abmelden`,
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
}
