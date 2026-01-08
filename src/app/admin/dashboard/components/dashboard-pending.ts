import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { User } from '@angular/fire/auth';

@Component({
  selector: 'app-dashboard-pending',
  standalone: true,
  imports: [],
  templateUrl: './dashboard-pending.html',
})
export class DashboardPendingComponent {
  @Input() user: User | null = null;
  @Output() logout = new EventEmitter<void>();

  t(key: string): string {
    const translations: Record<string, string> = {
      'dashboard.pending.title': $localize`:@@dashboard.pending.title:Konto wartet auf Genehmigung`,
      'dashboard.pending.message': $localize`:@@dashboard.pending.message:Ihr Konto wird derzeit von einem Super-Admin überprüft. Sie erhalten eine E-Mail, sobald Ihr Konto genehmigt wurde.`,
    };
    return translations[key] || key;
  }
}
