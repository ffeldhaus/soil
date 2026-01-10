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
  @Output() copyLoginUrl = new EventEmitter<{ gameId: string; password: string }>();
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
  @Output() openFinance = new EventEmitter<{
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
      'dashboard.list.trash': $localize`:List Header|Title for the trash view of games@@dashboard.list.trash:Papierkorb (Gelöschte Spiele)`,
      'dashboard.list.active': $localize`:List Header|Title for the active games list@@dashboard.list.active:Aktive Spiele`,
      'dashboard.list.refresh': $localize`:Action Label|Button to refresh the games list@@dashboard.list.refresh:Liste aktualisieren`,
      'dashboard.filter.active': $localize`:Filter Label|Filter for active games@@dashboard.filter.active:Aktiv`,
      'dashboard.filter.trash': $localize`:Filter Label|Filter for games in trash@@dashboard.filter.trash:Papierkorb`,
      'dashboard.actions.restoreSelected': $localize`:Action Label|Button to restore selected games from trash@@dashboard.actions.restoreSelected:Ausgewählte wiederherstellen`,
      'dashboard.actions.deleteSelected': $localize`:Action Label|Button to delete selected games@@dashboard.actions.deleteSelected:Ausgewählte löschen`,
      'dashboard.error.retry': $localize`:Action Label|Button to retry an action after error@@dashboard.error.retry:Erneut versuchen`,
      'dashboard.loading.games': $localize`:Loading State|Text shown while loading the list of games@@dashboard.loading.games:Spiele werden geladen...`,
      'dashboard.table.name': $localize`:Column Header|Table header for game name@@dashboard.table.name:Name`,
      'dashboard.table.details': $localize`:Column Header|Table header for game details@@dashboard.table.details:Details`,
      'dashboard.table.round': $localize`:Column Header|Table header for current round@@dashboard.table.round:Runde`,
      'dashboard.table.deletedAt': $localize`:Column Header|Table header for deletion date@@dashboard.table.deletedAt:Gelöscht am`,
      'dashboard.table.created': $localize`:Column Header|Table header for creation date@@dashboard.table.created:Erstellt`,
      'dashboard.table.actions': $localize`:Column Header|Table header for available actions@@dashboard.table.actions:Aktionen`,
      'dashboard.table.id': $localize`:Field Label|Prefix for game ID@@dashboard.table.id:ID:`,
      'dashboard.table.email': $localize`:Action Label|Action to send game details via email@@dashboard.table.email:Spieldetails senden`,
      'dashboard.table.restore': $localize`:Action Label|Action to restore a single game@@dashboard.table.restore:Spiel wiederherstellen`,
      'dashboard.table.delete': $localize`:Action Label|Action to delete a single game@@dashboard.table.delete:Spiel löschen`,
      'dashboard.empty.title': $localize`:Heading|Title shown when the games list is empty@@dashboard.empty.title:Keine Spiele gefunden.`,
      'dashboard.empty.subtitle': $localize`:Info Message|Suggestion to create a game when list is empty@@dashboard.empty.subtitle:Erstelle ein neues Spiel, um zu beginnen!`,
      'dashboard.pagination.showing': $localize`:Pagination Info|Text prefix for currently shown items@@dashboard.pagination.showing:Zeige`,
      'dashboard.pagination.of': $localize`:Pagination Info|Text separator for total items count@@dashboard.pagination.of:von`,
      'dashboard.pagination.prev': $localize`:Action Label|Previous page button text@@dashboard.pagination.prev:Zurück`,
      'dashboard.pagination.page': $localize`:Pagination Info|Label for current page@@dashboard.pagination.page:Seite`,
      'dashboard.pagination.next': $localize`:Action Label|Next page button text@@dashboard.pagination.next:Weiter`,
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
