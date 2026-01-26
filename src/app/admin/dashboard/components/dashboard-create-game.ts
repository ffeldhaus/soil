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
  @Input() isGuest = false;
  @Output() createGame = new EventEmitter<{
    name: string;
    numPlayers: number;
    numRounds: number;
    numAi: number;
    playerLabel: string;
    aiLevel: 'elementary' | 'middle' | 'high';
    advancedPricingEnabled: boolean;
    analyticsEnabled: boolean;
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
    analyticsEnabled: true,
  };

  t(key: string): string {
    const translations: Record<string, string> = {
      'dashboard.createGame.title': 'Neues Spiel erstellen',
      'dashboard.createGame.name': 'Spielname',
      'dashboard.createGame.phName': 'Spielname',
      'dashboard.createGame.playerLabel': 'Spieler-Bezeichnung (z. B. Team, Farmer)',
      'dashboard.createGame.phPlayer': 'Spieler',
      'dashboard.createGame.players': 'Spieler (1-10)',
      'dashboard.createGame.rounds': 'Runden',
      'dashboard.createGame.bots': 'Davon KI-Bots',
      'dashboard.createGame.aiLevel': 'KI-Niveau',
      'dashboard.createGame.advancedPricing': 'Fortgeschrittener Markt (Preisbildung durch Angebot & Nachfrage)',
      'dashboard.createGame.analytics':
        'Anonymisierte Daten für Forschung & Analyse teilen (hilft uns Soil zu verbessern)',
      'dashboard.createGame.submit': '+ Neues Spiel erstellen',
      'dashboard.createGame.creating': 'Wird erstellt...',
      'dashboard.createGame.required': 'Erforderlich',
      'dashboard.createGame.nameHint': 'Wähle einen aussagekräftigen Namen für dein Spiel.',
      'dashboard.createGame.playerHint': 'Wie sollen die Teilnehmenden genannt werden?',
      'ai.level.elementary': 'Unterstufe',
      'ai.level.middle': 'Mittelstufe',
      'ai.level.high': 'Oberstufe',
    };
    return translations[key] || key;
  }

  onSubmit() {
    this.createGame.emit(this.newGameConfig);
  }

  onPlayersChange() {
    // If we increased players, make the new ones AI by default
    // We always keep 1 human (the creator)
    if (this.newGameConfig.numAi < this.newGameConfig.numPlayers - 1) {
      this.newGameConfig.numAi = this.newGameConfig.numPlayers - 1;
    }

    if (this.newGameConfig.numAi > this.newGameConfig.numPlayers - 1) {
      this.newGameConfig.numAi = this.newGameConfig.numPlayers - 1;
    }
    this.playersChange.emit();
  }

  get numHumanPlayers(): number {
    return this.newGameConfig.numPlayers - this.newGameConfig.numAi;
  }
}
