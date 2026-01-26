import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { Game } from '../../../types';

@Component({
  selector: 'app-dashboard-delete-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './dashboard-delete-modal.html',
})
export class DashboardDeleteModalComponent {
  @Input() gameToDelete: Game | null = null;
  @Input() isDeletingSelected = false;
  @Input() selectedCount = 0;
  @Input() showTrash = false;
  @Input() isDeleting = false;

  @Output() closeModal = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<string>();

  deleteConfirmInput = '';

  t(key: string): string {
    const translations: Record<string, string> = {
      'dashboard.delete.permanent': 'Dauerhaftes Löschen',
      'dashboard.delete.confirm': 'Löschen bestätigen',
      'dashboard.delete.questionPermanent': 'Soll',
      'dashboard.delete.question': 'Soll',
      'dashboard.delete.questionBatchPermanent': 'Sollen',
      'dashboard.delete.questionBatch': 'Sollen',
      'dashboard.delete.questionSuffix': 'wirklich gelöscht werden?',
      'dashboard.delete.questionPermanentSuffix': 'wirklich dauerhaft gelöscht werden?',
      'dashboard.delete.games': 'Spiel(e)',
      'dashboard.delete.soft.title': 'Papierkorb',
      'dashboard.delete.soft.desc':
        'Spiele werden in den Papierkorb verschoben. Du kannst sie jederzeit wiederherstellen innerhalb von ',
      'dashboard.delete.days': 'Tagen',
      'dashboard.delete.warning': 'Achtung!',
      'dashboard.delete.permanentDesc':
        'Diese Aktion kann nicht rückgängig gemacht werden. Alle Spieldaten werden sofort zerstört.',
      'dashboard.delete.typeConfirm': 'Bitte gib <strong>DELETE</strong> ein, um das Löschen zu bestätigen:',
      'dashboard.delete.cancel': 'Abbrechen',
      'dashboard.delete.btnPermanent': 'Dauerhaft löschen',
      'dashboard.delete.btnGame': 'Spiel löschen',
    };
    return translations[key] || key;
  }

  onConfirm() {
    this.confirm.emit(this.deleteConfirmInput);
  }
}
