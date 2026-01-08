import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard-create-game',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './dashboard-create-game.html',
})
export class DashboardCreateGameComponent {
  @Input() isCreatingGame = false;
  @Output() createGame = new EventEmitter<{
    name: string;
    numPlayers: number;
    numRounds: number;
    numAi: number;
    playerLabel: string;
    aiLevel: 'elementary' | 'middle' | 'high';
  }>();
  @Output() playersChange = new EventEmitter<void>();

  newGameConfig = {
    name: '',
    numPlayers: 1,
    numRounds: 20,
    numAi: 0,
    playerLabel: 'Player',
    aiLevel: 'middle' as 'elementary' | 'middle' | 'high',
  };

  t(key: string): string {
    const translations: Record<string, string> = {
      'dashboard.createGame.title': $localize`:@@dashboard.createGame.title:Neues Spiel erstellen`,
      'dashboard.createGame.name': $localize`:@@dashboard.createGame.name:Spielname`,
      'dashboard.createGame.phName': $localize`:@@dashboard.createGame.phName:Spielname`,
      'dashboard.createGame.playerLabel': $localize`:@@dashboard.createGame.playerLabel:Spieler-Bezeichnung (z. B. Team, Farmer)`,
      'dashboard.createGame.phPlayer': $localize`:@@dashboard.createGame.phPlayer:Spieler`,
      'dashboard.createGame.players': $localize`:@@dashboard.createGame.players:Spieler (1-50)`,
      'dashboard.createGame.rounds': $localize`:@@dashboard.createGame.rounds:Runden`,
      'dashboard.createGame.bots': $localize`:@@dashboard.createGame.bots:KI-Bots`,
      'dashboard.createGame.aiLevel': $localize`:@@dashboard.createGame.aiLevel:KI-Niveau`,
      'dashboard.createGame.submit': $localize`:@@dashboard.createGame.submit:+ Neues Spiel erstellen`,
      'dashboard.createGame.creating': $localize`:@@dashboard.createGame.creating:Wird erstellt...`,
      'dashboard.createGame.required': $localize`:@@dashboard.createGame.required:Erforderlich`,
      'dashboard.createGame.nameHint': $localize`:@@dashboard.createGame.nameHint:Wähle einen aussagekräftigen Namen für dein Spiel.`,
      'dashboard.createGame.playerHint': $localize`:@@dashboard.createGame.playerHint:Wie sollen die Teilnehmenden genannt werden?`,
      'ai.level.elementary': $localize`:@@ai.level.elementary:Grundschule`,
      'ai.level.middle': $localize`:@@ai.level.middle:Mittelstufe`,
      'ai.level.high': $localize`:@@ai.level.high:Oberstufe`,
    };
    return translations[key] || key;
  }

  onSubmit() {
    this.createGame.emit(this.newGameConfig);
  }

  onPlayersChange() {
    if (this.newGameConfig.numAi > this.newGameConfig.numPlayers) {
      this.newGameConfig.numAi = this.newGameConfig.numPlayers;
    }
    this.playersChange.emit();
  }
}
