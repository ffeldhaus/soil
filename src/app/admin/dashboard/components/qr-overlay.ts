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
      'dashboard.qr.access': $localize`:Heading|Title for the QR access modal@@dashboard.qr.access:Zugang`,
      'dashboard.qr.scan': $localize`:Info Message|Instruction to scan the QR code@@dashboard.qr.scan:Scannen zum automatischen Anmelden.`,
      'dashboard.qr.print': $localize`:Action Label|Button to print the QR code@@dashboard.qr.print:Drucken`,
      'dashboard.qr.close': $localize`:Action Label|Button to close the QR modal@@dashboard.qr.close:Schließen`,
    };
    return translations[key] || key;
  }

  print() {
    window.print();
  }
}
