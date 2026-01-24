import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-qr-overlay',
  standalone: true,
  imports: [],
  templateUrl: './qr-overlay.html',
})
export class QrOverlayComponent {
  @Input() qrCodeUrl = '';
  @Input() qrCodePlayer = '';
  @Output() closeModal = new EventEmitter<void>();

  t(key: string): string {
    const translations: Record<string, string> = {
      'dashboard.qr.access': 'Zugang',
      'dashboard.qr.scan': 'Scannen zum automatischen Anmelden.',
      'dashboard.qr.print': 'Drucken',
      'dashboard.qr.close': 'Schließen',
    };
    return translations[key] || key;
  }

  print() {
    window.print();
  }
}
