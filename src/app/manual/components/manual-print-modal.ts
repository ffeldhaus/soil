import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-manual-print-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manual-print-modal.html',
})
export class ManualPrintModalComponent {
  @Input() printSize = 'A4';
  @Input() printOrientation = 'portrait';

  @Output() cancelPrint = new EventEmitter<void>();
  @Output() print = new EventEmitter<void>();
  @Output() sizeChange = new EventEmitter<string>();
  @Output() orientationChange = new EventEmitter<string>();

  t(key: string): string {
    const translations: Record<string, string> = {
      'manual.printModal.title': 'Druckeinstellungen',
      'manual.printModal.size': 'Papierformat',
      'manual.printModal.orientation': 'Ausrichtung',
      'manual.printModal.portrait': 'Hochformat',
      'manual.printModal.landscape': 'Querformat',
      'manual.printModal.cancel': 'Abbrechen',
      'manual.printModal.print': 'Drucken starten',
    };
    return translations[key] || key;
  }
}
