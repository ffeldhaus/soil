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
    advancedPricingEnabled: boolean;
  }>();
  @Output() playersChange = new EventEmitter<void>();

  newGameConfig = {
    name: '',
    numPlayers: 1,
    numRounds: 20,
    numAi: 0,
    playerLabel: 'Team',
    aiLevel: 'middle' as 'elementary' | 'middle' | 'high',
    advancedPricingEnabled: false,
  };

  t(key: string): string {
    const translations: Record<string, string> = {
      'dashboard.createGame.title': $localize`:Heading|Title for the game creation form@@dashboard.createGame.title:Neues Spiel erstellen`,
      'dashboard.createGame.name': $localize`:Form Label|Label for the game name input@@dashboard.createGame.name:Spielname`,
      'dashboard.createGame.phName': $localize`:Form Placeholder|Placeholder for the game name input@@dashboard.createGame.phName:Spielname`,
      'dashboard.createGame.playerLabel': $localize`:Form Label|Label for the player designation input@@dashboard.createGame.playerLabel:Spieler-Bezeichnung (z. B. Team, Farmer)`,
      'dashboard.createGame.phPlayer': $localize`:Form Placeholder|Placeholder for the player designation input@@dashboard.createGame.phPlayer:Spieler`,
      'dashboard.createGame.players': $localize`:Form Label|Label for number of players input@@dashboard.createGame.players:Spieler (1-10)`,
      'dashboard.createGame.rounds': $localize`:Form Label|Label for number of rounds input@@dashboard.createGame.rounds:Runden`,
      'dashboard.createGame.bots': $localize`:Form Label|Label for number of AI bots input@@dashboard.createGame.bots:KI-Bots`,
      'dashboard.createGame.aiLevel': $localize`:Form Label|Label for AI difficulty level input@@dashboard.createGame.aiLevel:KI-Niveau`,
      'dashboard.createGame.advancedPricing': $localize`:Form Label|Label for advanced pricing checkbox@@dashboard.createGame.advancedPricing:Fortgeschrittener Markt (Preisbildung durch Angebot & Nachfrage)`,
      'dashboard.createGame.submit': $localize`:Action Label|Button to create a new game@@dashboard.createGame.submit:+ Neues Spiel erstellen`,
      'dashboard.createGame.creating': $localize`:Loading State|Text shown while game is being created@@dashboard.createGame.creating:Wird erstellt...`,
      'dashboard.createGame.required': $localize`:Form Error|Text indicating a field is required@@dashboard.createGame.required:Erforderlich`,
      'dashboard.createGame.nameHint': $localize`:Form Hint|Guidance for choosing a game name@@dashboard.createGame.nameHint:Wähle einen aussagekräftigen Namen für dein Spiel.`,
      'dashboard.createGame.playerHint': $localize`:Form Hint|Guidance for choosing player labels@@dashboard.createGame.playerHint:Wie sollen die Teilnehmenden genannt werden?`,
      'ai.level.elementary': $localize`:Difficulty Level|Elementary school level AI@@ai.level.elementary:Grundschule`,
      'ai.level.middle': $localize`:Difficulty Level|Middle school level AI@@ai.level.middle:Mittelstufe`,
      'ai.level.high': $localize`:Difficulty Level|High school level AI@@ai.level.high:Oberstufe`,
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
