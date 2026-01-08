import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Game } from '../../../types';

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
      'dashboard.delete.permanent': $localize`:@@dashboard.delete.permanent:Dauerhaftes Löschen`,
      'dashboard.delete.confirm': $localize`:@@dashboard.delete.confirm:Löschen bestätigen`,
      'dashboard.delete.questionPermanent': $localize`:@@dashboard.delete.questionPermanent:Dauerhaft löschen?`,
      'dashboard.delete.question': $localize`:@@dashboard.delete.question:Löschen?`,
      'dashboard.delete.questionBatchPermanent': $localize`:@@dashboard.delete.questionBatchPermanent:Ausgewählte dauerhaft löschen?`,
      'dashboard.delete.questionBatch': $localize`:@@dashboard.delete.questionBatch:Ausgewählte löschen?`,
      'dashboard.delete.games': $localize`:@@dashboard.delete.games:Spiel(e)`,
      'dashboard.delete.soft.title': $localize`:@@dashboard.delete.soft.title:Papierkorb:`,
      'dashboard.delete.soft.desc': $localize`:@@dashboard.delete.soft.desc:Spiele werden in den Papierkorb verschoben. Du kannst sie jederzeit wiederherstellen innerhalb von`,
      'dashboard.delete.days': $localize`:@@dashboard.delete.days:Tagen`,
      'dashboard.delete.warning': $localize`:@@dashboard.delete.warning:WARNUNG:`,
      'dashboard.delete.permanentDesc': $localize`:@@dashboard.delete.permanentDesc:Diese Aktion kann nicht rückgängig gemacht werden. Alle Spieldaten werden sofort zerstört.`,
      'dashboard.delete.typeConfirm': $localize`:@@dashboard.delete.typeConfirm:Tippe <span class="font-mono font-bold text-red-400">DELETE</span> zur Bestätigung:`,
      'dashboard.delete.cancel': $localize`:@@dashboard.delete.cancel:Abbrechen`,
      'dashboard.delete.btnPermanent': $localize`:@@dashboard.delete.btnPermanent:Dauerhaft löschen`,
      'dashboard.delete.btnGame': $localize`:@@dashboard.delete.btnGame:Spiel löschen`,
    };
    return translations[key] || key;
  }

  onConfirm() {
    this.confirm.emit(this.deleteConfirmInput);
  }
}
