import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { Feedback } from '../../../types';

@Component({
  selector: 'app-super-admin-feedback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './super-admin-feedback.html',
})
export class SuperAdminFeedbackComponent {
  @Input() feedback: Feedback[] = [];

  @Output() manageFeedback = new EventEmitter<{ item: Feedback; action: 'reply' | 'resolve' | 'reject' }>();

  formatCategory(cat?: string): string {
    switch ((cat || '').toLowerCase()) {
      case 'interface':
      case 'ui':
        return 'Bedienung & Oberfläche';
      case 'gameplay':
      case 'mechanics':
        return 'Spielmechanik';
      case 'bug':
        return 'Fehlerbericht';
      case 'feature':
      case 'suggestion':
      case 'suggestions':
        return 'Idee / Vorschlag';
      case 'improvements':
        return 'Verbesserung';
      case 'documentation':
        return 'Handbuch & Unterricht';
      case 'other':
        return 'Allgemein';
      default:
        return cat || 'Allgemein';
    }
  }

  formatStatus(status?: string): string {
    switch (status) {
      case 'new':
        return 'Neu';
      case 'replied':
        return 'Beantwortet';
      case 'resolved':
        return 'Gelöst';
      case 'rejected':
        return 'Abgelehnt';
      default:
        return status || 'Neu';
    }
  }
}
