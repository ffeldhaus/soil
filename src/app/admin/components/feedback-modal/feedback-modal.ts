import { Component, EventEmitter, Input, inject, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';
import { FEEDBACK_CATEGORY_OPTIONS, type FeedbackCategory, type FeedbackSubmission } from '../../../types';

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './feedback-modal.html',
})
export class FeedbackModal {
  private authService = inject(AuthService, { optional: true });

  @Input() isSubmitting = false;
  @Input() errorMessage: string | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() feedbackSubmit = new EventEmitter<FeedbackSubmission>();

  readonly categories = FEEDBACK_CATEGORY_OPTIONS;

  feedback: {
    category: FeedbackCategory;
    rating: number;
    comment: string;
  } = {
    category: 'other',
    rating: 5,
    comment: '',
  };

  includeUserEmail = true;
  guestEmail = '';

  get loggedInEmail(): string | null {
    const user = this.authService?.currentUser;
    if (user && !user.isAnonymous && user.email) {
      return user.email;
    }
    return null;
  }

  submitFeedback(): void {
    if (this.isSubmitting || !this.feedback.rating) {
      return;
    }
    const contactEmail = this.loggedInEmail
      ? this.includeUserEmail
        ? this.loggedInEmail
        : undefined
      : this.guestEmail.trim() || undefined;
    this.feedbackSubmit.emit({
      category: this.feedback.category,
      rating: this.feedback.rating,
      comment: this.feedback.comment,
      ...(contactEmail ? { email: contactEmail } : {}),
    });
  }
}
