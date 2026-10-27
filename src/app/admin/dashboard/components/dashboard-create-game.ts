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
    difficulty: 'easy' | 'normal' | 'hard';
    advancedPricingEnabled: boolean;
    analyticsEnabled: boolean;
    advisorEnabled: boolean;
  }>();
  @Output() playersChange = new EventEmitter<void>();

  newGameConfig = {
    name: '',
    numPlayers: 4,
    numRounds: 20,
    numAi: 3,
    playerLabel: 'Team',
    aiLevel: 'middle' as 'elementary' | 'middle' | 'high',
    difficulty: 'normal' as 'easy' | 'normal' | 'hard',
    advancedPricingEnabled: true,
    analyticsEnabled: true,
    advisorEnabled: true,
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
        'Anonymisierte Daten für Forschung & Analyse teilen (hilft uns SOIL zu verbessern)',
      'dashboard.createGame.advisor': 'Landwirtschaftlicher Berater (gibt Tipps nach jeder Runde)',
      'dashboard.createGame.submit': '+ Neues Spiel erstellen',
      'dashboard.createGame.creating': 'Wird erstellt...',
      'dashboard.createGame.required': 'Erforderlich',
      'dashboard.createGame.nameHint': 'Wähle einen aussagekräftigen Namen für dein Spiel.',
      'dashboard.createGame.playerHint': 'Wie sollen die Teilnehmenden genannt werden?',
      'ai.level.elementary': 'Unterstufe',
      'ai.level.middle': 'Mittelstufe',
      'ai.level.high': 'Oberstufe',
      'dashboard.createGame.difficulty': 'Zielgruppe & Schwierigkeit',
      'difficulty.easy.title': 'Einsteiger / Unterstufe',
      'difficulty.easy.desc': 'Einheitliche Startfelder (100/100), präzise Wettervorhersage, keine Überziehungszinsen.',
      'difficulty.normal.title': 'Standard / Mittelstufe',
      'difficulty.normal.desc': '5 ausgewogene Boden-Zonen, Wetter-Trend, 6 % Überziehungszins, Regionalverträge.',
      'difficulty.hard.title': 'Profi / Oberstufe',
      'difficulty.hard.desc':
        'Stark variierende Boden-Zonen, zunehmender Klimastress, 10 % Dispozins & Insolvenz-Limit.',
    };
    return translations[key] || key;
  }

  onDifficultyChange(difficulty: 'easy' | 'normal' | 'hard') {
    this.newGameConfig.difficulty = difficulty;
    if (difficulty === 'easy') {
      this.newGameConfig.aiLevel = 'elementary';
      this.newGameConfig.advisorEnabled = true;
      this.newGameConfig.advancedPricingEnabled = false;
    } else if (difficulty === 'normal') {
      this.newGameConfig.aiLevel = 'middle';
      this.newGameConfig.advisorEnabled = true;
      this.newGameConfig.advancedPricingEnabled = true;
    } else if (difficulty === 'hard') {
      this.newGameConfig.aiLevel = 'high';
      this.newGameConfig.advisorEnabled = false;
      this.newGameConfig.advancedPricingEnabled = true;
    }
  }

  onSubmit() {
    this.createGame.emit(this.newGameConfig);
  }

  onPlayersChange() {
    if (this.newGameConfig.numAi > this.newGameConfig.numPlayers - 1) {
      this.newGameConfig.numAi = this.newGameConfig.numPlayers - 1;
    }
    this.playersChange.emit();
  }

  get numHumanPlayers(): number {
    return this.newGameConfig.numPlayers - this.newGameConfig.numAi;
  }
}
