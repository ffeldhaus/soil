import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { DashboardGameDetailComponent } from './dashboard-game-detail';

@Component({
  selector: 'app-dashboard-game-list',
  standalone: true,
  imports: [CommonModule, DashboardGameDetailComponent],
  templateUrl: './dashboard-game-list.html',
})
export class DashboardGameListComponent {
  @Input() games: any[] = [];
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
  @Output() toggleSelectAll = new EventEmitter<any>();
  @Output() toggleSelection = new EventEmitter<string>();
  @Output() toggleExpand = new EventEmitter<string>();
  @Output() shareGame = new EventEmitter<any>();
  @Output() restoreGame = new EventEmitter<any>();
  @Output() deleteGame = new EventEmitter<any>();
  @Output() prevPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();

  // Detail actions
  @Output() convertPlayer = new EventEmitter<{ game: any; slot: any }>();
  @Output() loginAsPlayer = new EventEmitter<{ gameId: string; password: string }>();
  @Output() copyLoginUrl = new EventEmitter<{ gameId: string; password: string }>();
  @Output() generateQrCode = new EventEmitter<{ gameId: string; playerNumber: number; password: string }>();
  @Output() sharePlayer = new EventEmitter<{ game: any; slot: any }>();
  @Output() openFinance = new EventEmitter<{ game: any; slot: any }>();
  @Output() printAllQrCodes = new EventEmitter<any>();
  @Output() updateDeadline = new EventEmitter<{ gameId: string; round: number; dateStr: string }>();

  t(key: string): string {
    const translations: Record<string, string> = {
      'dashboard.list.trash': $localize`:@@dashboard.list.trash:Papierkorb (Gelöschte Spiele)`,
      'dashboard.list.active': $localize`:@@dashboard.list.active:Aktive Spiele`,
      'dashboard.list.refresh': $localize`:@@dashboard.list.refresh:Liste aktualisieren`,
      'dashboard.filter.active': $localize`:@@dashboard.filter.active:Aktiv`,
      'dashboard.filter.trash': $localize`:@@dashboard.filter.trash:Papierkorb`,
      'dashboard.actions.restoreSelected': $localize`:@@dashboard.actions.restoreSelected:Ausgewählte wiederherstellen`,
      'dashboard.actions.deleteSelected': $localize`:@@dashboard.actions.deleteSelected:Ausgewählte löschen`,
      'dashboard.error.retry': $localize`:@@dashboard.error.retry:Erneut versuchen`,
      'dashboard.loading.games': $localize`:@@dashboard.loading.games:Spiele werden geladen...`,
      'dashboard.table.name': $localize`:@@dashboard.table.name:Name`,
      'dashboard.table.details': $localize`:@@dashboard.table.details:Details`,
      'dashboard.table.round': $localize`:@@dashboard.table.round:Runde`,
      'dashboard.table.deletedAt': $localize`:@@dashboard.table.deletedAt:Gelöscht am`,
      'dashboard.table.created': $localize`:@@dashboard.table.created:Erstellt`,
      'dashboard.table.actions': $localize`:@@dashboard.table.actions:Aktionen`,
      'dashboard.table.id': $localize`:@@dashboard.table.id:ID:`,
      'dashboard.table.email': $localize`:@@dashboard.table.email:Spieldetails senden`,
      'dashboard.table.restore': $localize`:@@dashboard.table.restore:Spiel wiederherstellen`,
      'dashboard.table.delete': $localize`:@@dashboard.table.delete:Spiel löschen`,
      'dashboard.empty.title': $localize`:@@dashboard.empty.title:Keine Spiele gefunden.`,
      'dashboard.empty.subtitle': $localize`:@@dashboard.empty.subtitle:Erstelle ein neues Spiel, um zu beginnen!`,
      'dashboard.pagination.showing': $localize`:@@dashboard.pagination.showing:Zeige`,
      'dashboard.pagination.of': $localize`:@@dashboard.pagination.of:von`,
      'dashboard.pagination.prev': $localize`:@@dashboard.pagination.prev:Zurück`,
      'dashboard.pagination.page': $localize`:@@dashboard.pagination.page:Seite`,
      'dashboard.pagination.next': $localize`:@@dashboard.pagination.next:Weiter`,
    };
    return translations[key] || key;
  }

  isAllSelected(): boolean {
    return this.games.length > 0 && this.selectedGameIds.size === this.games.length;
  }

  isSelected(gameId: string): boolean {
    return this.selectedGameIds.has(gameId);
  }
}
