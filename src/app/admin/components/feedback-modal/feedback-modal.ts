import { Component, EventEmitter, inject, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './feedback-modal.html',
})
export class FeedbackModal {
  private authService = inject(AuthService, { optional: true });

  @Output() closeModal = new EventEmitter<void>();
  @Output() feedbackSubmit = new EventEmitter<{
    category: 'interface' | 'mechanics' | 'improvements' | 'suggestions' | 'documentation' | 'other';
    rating: number;
    comment: string;
    email?: string;
  }>();

  feedback: {
    category: 'interface' | 'mechanics' | 'improvements' | 'suggestions' | 'documentation' | 'other';
    rating: number;
    comment: string;
  } = {
    category: 'other',
    rating: 5,
    comment: '',
  };

  includeUserEmail = true;
  guestEmail = '';
  isSubmitting = false;

  get loggedInEmail(): string | null {
    const user = this.authService?.currentUser;
    if (user && !user.isAnonymous && user.email) {
      return user.email;
    }
    return null;
  }

  submitFeedback() {
    this.isSubmitting = true;
    const contactEmail = this.loggedInEmail
      ? this.includeUserEmail
        ? this.loggedInEmail
        : undefined
      : this.guestEmail.trim() || undefined;
    this.feedbackSubmit.emit({
      ...this.feedback,
      ...(contactEmail ? { email: contactEmail } : {}),
    });
  }
}
