import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-dashboard-error-modal',
  standalone: true,
  imports: [],
  templateUrl: './dashboard-error-modal.html',
})
export class DashboardErrorModalComponent {
  @Input() errorMessage: string | null = null;
  @Output() closeModal = new EventEmitter<void>();

  t(key: string): string {
    const translations: Record<string, string> = {
      'dashboard.error.title': 'Fehler',
      'dashboard.error.close': 'Schließen',
    };
    return translations[key] || key;
  }
}
