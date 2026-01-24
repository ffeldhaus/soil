import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, type OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { Game, PlayerState } from '../../../types';

@Component({
  selector: 'app-dashboard-game-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-game-detail.html',
})
export class DashboardGameDetailComponent implements OnInit {
  @Input() game!: Game;
  @Input() aiLevel = 'middle';

  @Output() convertPlayer = new EventEmitter<{ game: Game; slot: { number: number; isAi: boolean } }>();
  @Output() loginAsPlayer = new EventEmitter<{ gameId: string; password: string }>();
  @Output() generateQrCode = new EventEmitter<{ gameId: string; playerNumber: number; password: string }>();
  @Output() sharePlayer = new EventEmitter<{
    game: Game;
    slot: {
      number: number;
      uid: string;
      player: PlayerState | null;
      isJoined: boolean;
      isAi: boolean;
      password: string;
    };
  }>();
  @Output() printAllQrCodes = new EventEmitter<Game>();
  @Output() updateDeadline = new EventEmitter<{ gameId: string; round: number; dateStr: string }>();

  showDeadlineManager = false;
  selectedDeadlineRound = 1;

  ngOnInit() {
    this.selectedDeadlineRound = this.game.currentRoundNumber || 1;
  }

  t(key: string): string {
    const translations: Record<string, string> = {
      'dashboard.details.players': 'Spieler',
      'dashboard.details.noPlayers': 'Noch keine Spieler beigetreten.',
      'dashboard.deadline.title': 'Runden-Frist-Manager',
      'dashboard.deadline.round': 'Frist für Runde',
      'dashboard.deadline.set': 'Frist setzen',
      'dashboard.deadline.hint':
        '* Wenn eine Frist gesetzt ist, übernimmt die KI automatisch für alle Spieler, die bis dahin nicht abgegeben haben.',
      'dashboard.deadline.toggle': 'Fristen verwalten',
      'dashboard.player.label': 'Spieler',
      'dashboard.player.capital': 'Kapital',
      'dashboard.player.round': 'Runde',
      'dashboard.player.soil': 'Bodenqualität (ø)',
      'dashboard.player.nutrition': 'Nährstoffe (ø)',
      'dashboard.player.submitted': 'Abgegeben?',
      'dashboard.player.toHuman': 'ZU MENSCH',
      'dashboard.player.toAi': 'ZU KI',
      'dashboard.player.login': 'LOGIN',
      'dashboard.player.qrCode': 'QR-CODE',
      'dashboard.player.email': 'E-MAIL',
      'dashboard.player.printAll': 'ALLE QR-CODES DRUCKEN',
    };
    return translations[key] || key;
  }

  getRounds(): number[] {
    const count = this.game.config?.numRounds || 10;
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  getPlayerKeys(players: Record<string, PlayerState>): string[] {
    if (!players) return [];
    return Object.keys(players);
  }

  getSlots(game: Game): {
    number: number;
    uid: string;
    player: PlayerState | null;
    isJoined: boolean;
    isAi: boolean;
    password: string;
  }[] {
    const count = game.config?.numPlayers || 1;
    const slots = [];
    for (let i = 1; i <= count; i++) {
      const uid = `player-${game.id}-${i}`;
      const player = game.players ? game.players[uid] : null;

      let password = '???';
      if (game.playerSecrets?.[String(i)]) {
        password = game.playerSecrets[String(i)].password;
      } else if (game.password) {
        password = game.password;
      }

      slots.push({
        number: i,
        uid: uid,
        player: player,
        isJoined: !!player,
        isAi: player?.isAi || false,
        password: password,
      });
    }
    return slots;
  }

  getDeadlineForRound(game: Game, round: number): string {
    if (!game.roundDeadlines || !game.roundDeadlines[round]) return '';
    const d = game.roundDeadlines[round];
    const date = d && 'seconds' in d ? new Date(d.seconds * 1000) : new Date(d as unknown as string);
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    return (
      date.getFullYear() +
      '-' +
      pad(date.getMonth() + 1) +
      '-' +
      pad(date.getDate()) +
      'T' +
      pad(date.getHours()) +
      ':' +
      pad(date.getMinutes())
    );
  }
}
