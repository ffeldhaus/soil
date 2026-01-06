import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Finance } from '../../../game/finance/finance';

@Component({
  selector: 'app-dashboard-finance-modal',
  standalone: true,
  imports: [CommonModule, Finance],
  templateUrl: './dashboard-finance-modal.html',
})
export class DashboardFinanceModalComponent {
  @Input() showFinanceModal = false;
  @Input() selectedFinanceGame: any = null;
  @Input() selectedFinancePlayer: any = null;
  @Output() closeModal = new EventEmitter<void>();
}
