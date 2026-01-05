import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Round } from '../../types';

@Component({
  selector: 'app-round-result-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './round-result-modal.html',
  styleUrl: './round-result-modal.scss',
})
export class RoundResultModal {
  t(key: string): string {
    return $localize`:@@${key}:${key}`;
  }
  @Input() round!: Round;
  @Output() resultClosed = new EventEmitter<void>();

  get profit() {
    return this.round.result?.profit ?? 0;
  }

  get capital() {
    return this.round.result?.capital ?? 0;
  }

  get bioSiegel() {
    return this.round.result?.bioSiegel ?? false;
  }

  get events() {
    return this.round.result?.events;
  }

  onClose() {
    this.resultClosed.emit();
  }
}
