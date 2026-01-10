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
      'dashboard.delete.permanent': $localize`:Heading|Title for permanent deletion modal@@dashboard.delete.permanent:Dauerhaftes Löschen`,
      'dashboard.delete.confirm': $localize`:Heading|Subheading for confirming deletion@@dashboard.delete.confirm:Löschen bestätigen`,
      'dashboard.delete.questionPermanent': $localize`:Question|Confirmation question for permanent deletion@@dashboard.delete.questionPermanent:Dauerhaft löschen?`,
      'dashboard.delete.question': $localize`:Question|Confirmation question for regular deletion@@dashboard.delete.question:Löschen?`,
      'dashboard.delete.questionBatchPermanent': $localize`:Question|Confirmation question for batch permanent deletion@@dashboard.delete.questionBatchPermanent:Ausgewählte dauerhaft löschen?`,
      'dashboard.delete.questionBatch': $localize`:Question|Confirmation question for batch regular deletion@@dashboard.delete.questionBatch:Ausgewählte löschen?`,
      'dashboard.delete.games': $localize`:Object Label|Label for games being deleted@@dashboard.delete.games:Spiel(e)`,
      'dashboard.delete.soft.title': $localize`:Heading|Title for trash information section@@dashboard.delete.soft.title:Papierkorb:`,
      'dashboard.delete.soft.desc': $localize`:Info Message|Explanation of how the trash feature works@@dashboard.delete.soft.desc:Spiele werden in den Papierkorb verschoben. Du kannst sie jederzeit wiederherstellen innerhalb von`,
      'dashboard.delete.days': $localize`:Unit Label|Label for time duration in days@@dashboard.delete.days:Tagen`,
      'dashboard.delete.warning': $localize`:Alert Label|Warning prefix for permanent deletion@@dashboard.delete.warning:WARNUNG:`,
      'dashboard.delete.permanentDesc': $localize`:Warning Message|Description of the consequences of permanent deletion@@dashboard.delete.permanentDesc:Diese Aktion kann nicht rückgängig gemacht werden. Alle Spieldaten werden sofort zerstört.`,
      'dashboard.delete.typeConfirm': $localize`:Action Instruction|Instruction to type DELETE to confirm@@dashboard.delete.typeConfirm:Tippe <span class="font-mono font-bold text-red-400">DELETE</span> zur Bestätigung:`,
      'dashboard.delete.cancel': $localize`:Action Label|Button to cancel deletion@@dashboard.delete.cancel:Abbrechen`,
      'dashboard.delete.btnPermanent': $localize`:Action Label|Button to confirm permanent deletion@@dashboard.delete.btnPermanent:Dauerhaft löschen`,
      'dashboard.delete.btnGame': $localize`:Action Label|Button to confirm regular deletion@@dashboard.delete.btnGame:Spiel löschen`,
    };
    return translations[key] || key;
  }

  onConfirm() {
    this.confirm.emit(this.deleteConfirmInput);
  }
}
