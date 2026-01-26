import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { Game, PlayerState } from '../../../types';
import { DashboardGameDetailComponent } from './dashboard-game-detail';

@Component({
  selector: 'app-dashboard-game-list',
  standalone: true,
  imports: [CommonModule, DashboardGameDetailComponent],
  templateUrl: './dashboard-game-list.html',
})
export class DashboardGameListComponent {
  @Input() games: Game[] = [];
  @Input() showTrash = false;
  @Input() selectedGameIds = new Set<string>();
  @Input() isRestoring = false;
  @Input() isDeleting = false;
  @Input() isLoadingGames = false;
  @Input() loadingError: string | null = null;
  @Input() expandedGameId: string | null = null;
  @Input() totalGames = 0;
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() pageSize = 10;
  @Input() aiLevel = 'middle';

  @Output() toggleTrashView = new EventEmitter<void>();
  @Output() loadGames = new EventEmitter<void>();
  @Output() restoreSelected = new EventEmitter<void>();
  @Output() deleteSelected = new EventEmitter<void>();
  @Output() toggleSelectAll = new EventEmitter<Event>();
  @Output() toggleSelection = new EventEmitter<string>();
  @Output() toggleExpand = new EventEmitter<string>();
  @Output() shareGame = new EventEmitter<Game>();
  @Output() restoreGame = new EventEmitter<Game>();
  @Output() deleteGame = new EventEmitter<Game>();
  @Output() prevPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();

  // Detail actions
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

  t(key: string): string {
    const translations: Record<string, string> = {
      'dashboard.list.trash': 'Papierkorb (Gelöschte Spiele)',
      'dashboard.list.active': 'Aktive Spiele',
      'dashboard.list.refresh': 'Liste aktualisieren',
      'dashboard.filter.active': 'Aktiv',
      'dashboard.filter.trash': 'Papierkorb',
      'dashboard.actions.restoreSelected': 'Ausgewählte wiederherstellen',
      'dashboard.actions.deleteSelected': 'Ausgewählte löschen',
      'dashboard.error.retry': 'Erneut versuchen',
      'dashboard.loading.games': 'Spiele werden geladen...',
      'dashboard.table.name': 'Name',
      'dashboard.table.details': 'Details',
      'dashboard.table.round': 'Runde',
      'dashboard.table.deletedAt': 'Gelöscht am',
      'dashboard.table.created': 'Erstellt',
      'dashboard.table.actions': 'Aktionen',
      'dashboard.table.id': 'Spiel ID: ',
      'dashboard.table.email': 'Spieldetails senden',
      'dashboard.table.restore': 'Spiel wiederherstellen',
      'dashboard.table.delete': 'Spiel löschen',
      'dashboard.empty.title': 'Keine Spiele gefunden.',
      'dashboard.empty.subtitle': 'Erstelle ein neues Spiel, um zu beginnen!',
      'dashboard.pagination.showing': 'Zeige',
      'dashboard.pagination.of': 'von',
      'dashboard.pagination.prev': 'Zurück',
      'dashboard.pagination.page': 'Seite',
      'dashboard.pagination.next': 'Weiter',
    };
    return translations[key] || key;
  }

  isAllSelected(): boolean {
    return this.games.length > 0 && this.selectedGameIds.size === this.games.length;
  }

  isSelected(gameId: string): boolean {
    return this.selectedGameIds.has(gameId);
  }

  formatDate(d: { seconds: number; nanoseconds: number } | Date | string | null | undefined): Date | null {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d === 'string') return new Date(d);
    if ('seconds' in d) return new Date(d.seconds * 1000);
    return null;
  }
}
