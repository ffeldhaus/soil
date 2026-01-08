import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Finance } from '../../../game/finance/finance';
import type { Game, PlayerState } from '../../../types';

@Component({
  selector: 'app-dashboard-finance-modal',
  standalone: true,
  imports: [Finance],
  templateUrl: './dashboard-finance-modal.html',
})
export class DashboardFinanceModalComponent {
  @Input() showFinanceModal = false;
  @Input() selectedFinanceGame: Game | null = null;
  @Input() selectedFinancePlayer: PlayerState | null = null;
  @Output() closeModal = new EventEmitter<void>();
}
